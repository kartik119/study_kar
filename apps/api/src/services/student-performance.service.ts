// @ts-nocheck
import { prisma } from '@study-karnataka/database';
import { PERFORMANCE_CONSTANTS } from '@study-karnataka/config';
import {
  StudentPerformanceOverview,
  TaxonomyPerformanceSummary,
  FrequentlyWrongQuestionItem,
  PerformanceRecommendationItem,
  UnifiedResultItem,
  AdminPerformanceOverview,
  PerformanceTimeframe,
  PerformanceStatus,
  PerformanceOutcome,
} from '@study-karnataka/shared-types';

export class StudentPerformanceService {
  /**
   * 1. Project a Published Ranked Attempt into StudentPerformanceEvents
   */
  static async recordRankedAttemptPerformance(attemptId: string): Promise<void> {
    const attempt = await prisma.rankedAttempt.findUnique({
      where: { id: attemptId },
      include: {
        rankedTest: true,
        answers: { include: { mockTestQuestion: { include: { question: { include: { category: true, subcategory: true, topic: true, knowledgeArea: true } } } } } },
      },
    });

    if (!attempt) return;

    // Visibility & Validity Gate: If invalidated or results unpublished, retract/skip events
    const isPublished = attempt.rankedTest.resultsPublishedAt && new Date(attempt.rankedTest.resultsPublishedAt) <= new Date();
    const isValid = attempt.status !== 'INVALIDATED';

    if (!isPublished || !isValid) {
      await this.retractPerformanceForAttempt(attemptId);
      return;
    }

    const testQuestions = await prisma.mockTestQuestion.findMany({
      where: { mockTestId: attempt.rankedTest.mockTestId },
      include: { question: { include: { category: true, subcategory: true, topic: true, knowledgeArea: true } } },
    });

    const answersMap = new Map(attempt.answers.map((a) => [a.mockTestQuestionId, a]));

    for (const tq of testQuestions) {
      const mcq = tq.question;
      if (!mcq) continue;

      const answer = answersMap.get(tq.id);
      let outcome: PerformanceOutcome = 'UNANSWERED';

      if (answer && answer.selectedOption) {
        const isCorrect = answer.selectedOption === (tq.snapshotCorrectOption || mcq.correctOption);
        outcome = isCorrect ? 'CORRECT' : 'INCORRECT';
      }

      const sourceKey = `RANKED_ATTEMPT:${attemptId}:${tq.id}`;
      const categoryId = tq.selectedCategoryId || mcq.categoryId || '';
      const subcategoryId = tq.selectedSubcategoryId || mcq.subcategoryId;
      const topicId = mcq.topicId;
      const knowledgeAreaId = mcq.knowledgeAreaId;

      await prisma.studentPerformanceEvent.upsert({
        where: {
          sourceType_sourceKey: {
            sourceType: 'RANKED_TEST',
            sourceKey,
          },
        },
        update: {
          outcome,
          isActive: true,
          retractedAt: null,
        },
        create: {
          studentId: attempt.studentId,
          sourceType: 'RANKED_TEST',
          sourceKey,
          canonicalMcqQuestionId: mcq.id,
          rankedTestId: attempt.rankedTestId,
          rankedAttemptId: attempt.id,
          testQuestionId: tq.id,
          outcome,
          occurredAt: attempt.submittedAt || attempt.createdAt,
          difficulty: mcq.difficulty,
          isPyq: mcq.isPyq,
          categoryId,
          subcategoryId,
          topicId,
          knowledgeAreaId,
          categoryCodeSnapshot: mcq.category?.code,
          categoryNameSnapshot: mcq.category?.nameEn,
          subcategoryCodeSnapshot: mcq.subcategory?.code,
          subcategoryNameSnapshot: mcq.subcategory?.nameEn,
          topicCodeSnapshot: mcq.topic?.code,
          topicNameSnapshot: mcq.topic?.nameEn,
          knowledgeAreaCodeSnapshot: mcq.knowledgeArea?.code,
          knowledgeAreaNameSnapshot: mcq.knowledgeArea?.nameEn,
          isActive: true,
        },
      });
    }

    await this.rebuildTaxonomyPerformanceForStudent(attempt.studentId);
  }

  /**
   * 2. Project a Practice Session into StudentPerformanceEvents
   */
  static async recordPracticeSessionPerformance(sessionId: string): Promise<void> {
    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          include: {
            question: {
              include: {
                category: true,
                subcategory: true,
                topic: true,
                knowledgeArea: true,
              },
            },
          },
        },
      },
    });

    if (!session) return;

    for (const sq of session.questions) {
      const mcq = sq.question;
      if (!mcq) continue;

      let outcome: PerformanceOutcome = 'UNANSWERED';
      if (sq.selectedOption !== null) {
        // Practice First-Answer Rule
        outcome = sq.isCorrect ? 'CORRECT' : 'INCORRECT';
      } else if (sq.isRevealed) {
        // Practice Reveal Rule
        outcome = 'REVEALED';
      }

      const sourceKey = `PRACTICE_SESSION:${sessionId}:${sq.questionId}`;
      const categoryId = mcq.categoryId;
      const subcategoryId = mcq.subcategoryId;
      const topicId = mcq.topicId;
      const knowledgeAreaId = mcq.knowledgeAreaId;

      await prisma.studentPerformanceEvent.upsert({
        where: {
          sourceType_sourceKey: {
            sourceType: 'PRACTICE',
            sourceKey,
          },
        },
        update: {
          outcome,
          isActive: true,
        },
        create: {
          studentId: session.studentId,
          sourceType: 'PRACTICE',
          sourceKey,
          canonicalMcqQuestionId: mcq.id,
          practiceSessionId: session.id,
          practiceSessionQuestionId: sq.id,
          outcome,
          occurredAt: sq.answeredAt || sq.firstAttemptedAt || session.startedAt,
          difficulty: mcq.difficulty,
          isPyq: mcq.isPyq,
          categoryId: categoryId || mcq.categoryId || '',
          subcategoryId,
          topicId,
          knowledgeAreaId,
          categoryCodeSnapshot: mcq.category?.code,
          categoryNameSnapshot: mcq.category?.nameEn,
          subcategoryCodeSnapshot: mcq.subcategory?.code,
          subcategoryNameSnapshot: mcq.subcategory?.nameEn,
          topicCodeSnapshot: mcq.topic?.code,
          topicNameSnapshot: mcq.topic?.nameEn,
          knowledgeAreaCodeSnapshot: mcq.knowledgeArea?.code,
          knowledgeAreaNameSnapshot: mcq.knowledgeArea?.nameEn,
          isActive: true,
        },
      });
    }

    await this.rebuildTaxonomyPerformanceForStudent(session.studentId);
  }

  /**
   * 3. Retract Performance Events for an Invalidated Ranked Attempt
   */
  static async retractPerformanceForAttempt(attemptId: string): Promise<void> {
    const events = await prisma.studentPerformanceEvent.findMany({
      where: { rankedAttemptId: attemptId, isActive: true },
    });

    if (events.length === 0) return;

    const studentId = events[0].studentId;

    await prisma.studentPerformanceEvent.updateMany({
      where: { rankedAttemptId: attemptId },
      data: { isActive: false, retractedAt: new Date() },
    });

    await this.rebuildTaxonomyPerformanceForStudent(studentId);
  }

  /**
   * 4. Rebuild Materialized Taxonomy Performance Projections for a Student
   */
  static async rebuildTaxonomyPerformanceForStudent(studentId: string): Promise<void> {
    const activeEvents = await prisma.studentPerformanceEvent.findMany({
      where: { studentId, isActive: true },
      orderBy: { occurredAt: 'desc' },
    });

    // Group events by Taxonomy Node Key (level + entityId)
    const nodeGroups = new Map<string, { level: 'CATEGORY' | 'SUBCATEGORY' | 'TOPIC' | 'KNOWLEDGE_AREA'; entityId: string; categoryId: string; subcategoryId?: string; topicId?: string; knowledgeAreaId?: string; events: typeof activeEvents }>();

    for (const ev of activeEvents) {
      // Category level
      if (ev.categoryId) {
        const key = `CATEGORY:${ev.categoryId}`;
        if (!nodeGroups.has(key)) {
          nodeGroups.set(key, { level: 'CATEGORY', entityId: ev.categoryId, categoryId: ev.categoryId, events: [] });
        }
        nodeGroups.get(key)!.events.push(ev);
      }

      // Subcategory level
      if (ev.subcategoryId) {
        const key = `SUBCATEGORY:${ev.subcategoryId}`;
        if (!nodeGroups.has(key)) {
          nodeGroups.set(key, { level: 'SUBCATEGORY', entityId: ev.subcategoryId, categoryId: ev.categoryId, subcategoryId: ev.subcategoryId, events: [] });
        }
        nodeGroups.get(key)!.events.push(ev);
      }

      // Topic level
      if (ev.topicId) {
        const key = `TOPIC:${ev.topicId}`;
        if (!nodeGroups.has(key)) {
          nodeGroups.set(key, { level: 'TOPIC', entityId: ev.topicId, categoryId: ev.categoryId, subcategoryId: ev.subcategoryId || undefined, topicId: ev.topicId, events: [] });
        }
        nodeGroups.get(key)!.events.push(ev);
      }

      // Knowledge Area level
      if (ev.knowledgeAreaId) {
        const key = `KNOWLEDGE_AREA:${ev.knowledgeAreaId}`;
        if (!nodeGroups.has(key)) {
          nodeGroups.set(key, { level: 'KNOWLEDGE_AREA', entityId: ev.knowledgeAreaId, categoryId: ev.categoryId, subcategoryId: ev.subcategoryId || undefined, topicId: ev.topicId || undefined, knowledgeAreaId: ev.knowledgeAreaId, events: [] });
        }
        nodeGroups.get(key)!.events.push(ev);
      }
    }

    // Process each taxonomy node
    for (const [key, group] of nodeGroups.entries()) {
      const events = group.events;
      const totalEvents = events.length;

      const answeredEventsList = events.filter((e) => e.outcome === 'CORRECT' || e.outcome === 'INCORRECT');
      const answeredEvents = answeredEventsList.length;

      const correctCount = events.filter((e) => e.outcome === 'CORRECT').length;
      const incorrectCount = events.filter((e) => e.outcome === 'INCORRECT').length;
      const unansweredCount = events.filter((e) => e.outcome === 'UNANSWERED').length;
      const revealedCount = events.filter((e) => e.outcome === 'REVEALED').length;

      const lifetimeAccuracy = answeredEvents > 0 ? Math.round((correctCount / answeredEvents) * 10000) / 100 : null;

      // Recent 20 answered events window
      const recentWindow = answeredEventsList.slice(0, PERFORMANCE_CONSTANTS.RECENT_EVENTS_WINDOW_SIZE);
      const recentAnswered = recentWindow.length;
      const recentCorrect = recentWindow.filter((e) => e.outcome === 'CORRECT').length;
      const recentAccuracy = recentAnswered > 0 ? Math.round((recentCorrect / recentAnswered) * 10000) / 100 : null;

      // Unique Question Analysis
      const mcqMap = new Map<string, { latestOutcome: PerformanceOutcome; wrongCount: number; correctCount: number }>();
      for (const ev of events) {
        if (!mcqMap.has(ev.canonicalMcqQuestionId)) {
          mcqMap.set(ev.canonicalMcqQuestionId, { latestOutcome: ev.outcome, wrongCount: 0, correctCount: 0 });
        }
        const item = mcqMap.get(ev.canonicalMcqQuestionId)!;
        if (ev.outcome === 'INCORRECT') item.wrongCount++;
        if (ev.outcome === 'CORRECT') item.correctCount++;
      }

      const uniqueQuestionCount = mcqMap.size;
      let latestUniqueCorrectCount = 0;
      let latestUniqueIncorrectCount = 0;
      let repeatedWrongCount = 0;

      for (const item of mcqMap.values()) {
        if (item.latestOutcome === 'CORRECT') latestUniqueCorrectCount++;
        if (item.latestOutcome === 'INCORRECT') latestUniqueIncorrectCount++;
        if (item.wrongCount >= 2) repeatedWrongCount++;
      }

      const latestUniqueAccuracy = uniqueQuestionCount > 0 ? Math.round((latestUniqueCorrectCount / uniqueQuestionCount) * 10000) / 100 : null;

      // Status Classification Logic
      let status: PerformanceStatus = 'NOT_STARTED';
      if (uniqueQuestionCount === 0) {
        status = 'NOT_STARTED';
      } else if (uniqueQuestionCount < PERFORMANCE_CONSTANTS.MIN_UNIQUE_QUESTIONS_FOR_CLASSIFICATION) {
        status = 'NEEDS_MORE_DATA';
      } else if (
        (recentAccuracy !== null && recentAccuracy < PERFORMANCE_CONSTANTS.WEAK_ACCURACY_THRESHOLD) ||
        (latestUniqueAccuracy !== null && latestUniqueAccuracy < PERFORMANCE_CONSTANTS.WEAK_ACCURACY_THRESHOLD) ||
        repeatedWrongCount >= 2
      ) {
        status = 'NEEDS_REVIEW';
      } else if (
        uniqueQuestionCount >= PERFORMANCE_CONSTANTS.MIN_UNIQUE_QUESTIONS_FOR_STRONG &&
        recentAccuracy !== null &&
        recentAccuracy >= PERFORMANCE_CONSTANTS.STRONG_ACCURACY_THRESHOLD &&
        latestUniqueAccuracy !== null &&
        latestUniqueAccuracy >= PERFORMANCE_CONSTANTS.STRONG_ACCURACY_THRESHOLD
      ) {
        status = 'STRONG';
      } else {
        status = 'DEVELOPING';
      }

      // Priority Score Formula
      const recentWrongRate = recentAccuracy !== null ? (100 - recentAccuracy) / 100 : 0;
      const latestUniqueWrongRate = latestUniqueAccuracy !== null ? (100 - latestUniqueAccuracy) / 100 : 0;
      const repeatedErrorSignal = Math.min(1.0, repeatedWrongCount / 5);

      const priorityScore =
        PERFORMANCE_CONSTANTS.PRIORITY_WEIGHTS.RECENT_WRONG * recentWrongRate +
        PERFORMANCE_CONSTANTS.PRIORITY_WEIGHTS.LATEST_UNIQUE_WRONG * latestUniqueWrongRate +
        PERFORMANCE_CONSTANTS.PRIORITY_WEIGHTS.REPEATED_ERROR * repeatedErrorSignal;

      const lastActivityAt = events.length > 0 ? events[0].occurredAt : null;

      await prisma.studentTaxonomyPerformance.upsert({
        where: {
          studentId_taxonomyLevel_taxonomyEntityId: {
            studentId,
            taxonomyLevel: group.level,
            taxonomyEntityId: group.entityId,
          },
        },
        update: {
          categoryId: group.categoryId,
          subcategoryId: group.subcategoryId || null,
          topicId: group.topicId || null,
          knowledgeAreaId: group.knowledgeAreaId || null,
          totalEvents,
          answeredEvents,
          correctCount,
          incorrectCount,
          unansweredCount,
          revealedCount,
          uniqueQuestionCount,
          latestUniqueCorrectCount,
          latestUniqueIncorrectCount,
          recentAccuracy,
          lifetimeAccuracy,
          latestUniqueAccuracy,
          repeatedWrongCount,
          status,
          priorityScore,
          lastActivityAt,
        },
        create: {
          studentId,
          taxonomyLevel: group.level,
          taxonomyEntityId: group.entityId,
          categoryId: group.categoryId,
          subcategoryId: group.subcategoryId || null,
          topicId: group.topicId || null,
          knowledgeAreaId: group.knowledgeAreaId || null,
          totalEvents,
          answeredEvents,
          correctCount,
          incorrectCount,
          unansweredCount,
          revealedCount,
          uniqueQuestionCount,
          latestUniqueCorrectCount,
          latestUniqueIncorrectCount,
          recentAccuracy,
          lifetimeAccuracy,
          latestUniqueAccuracy,
          repeatedWrongCount,
          status,
          priorityScore,
          lastActivityAt,
        },
      });
    }
  }

  /**
   * 5. Get Student Performance Dashboard Overview
   */
  static async getPerformanceOverview(
    studentId: string,
    filters?: { timeframe?: PerformanceTimeframe; sourceType?: string }
  ): Promise<StudentPerformanceOverview> {
    const timeframe: PerformanceTimeframe = filters?.timeframe || '30D';
    let dateCutoff: Date | null = new Date();

    if (timeframe === '7D') dateCutoff.setDate(dateCutoff.getDate() - 7);
    else if (timeframe === '30D') dateCutoff.setDate(dateCutoff.getDate() - 30);
    else if (timeframe === '90D') dateCutoff.setDate(dateCutoff.getDate() - 90);
    else dateCutoff = null;

    const where: any = { studentId, isActive: true };
    if (dateCutoff) where.occurredAt = { gte: dateCutoff };
    if (filters?.sourceType && filters.sourceType !== 'ALL') {
      where.sourceType = filters.sourceType;
    }

    const events = await prisma.studentPerformanceEvent.findMany({ where });

    const answeredEvents = events.filter((e) => e.outcome === 'CORRECT' || e.outcome === 'INCORRECT');
    const totalAnswered = answeredEvents.length;
    const correctCount = events.filter((e) => e.outcome === 'CORRECT').length;
    const overallAccuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 10000) / 100 : null;

    const uniqueSet = new Set(events.map((e) => e.canonicalMcqQuestionId));

    // Ranked split
    const rankedEvents = events.filter((e) => e.sourceType === 'RANKED_TEST' && (e.outcome === 'CORRECT' || e.outcome === 'INCORRECT'));
    const rankedCorrect = events.filter((e) => e.sourceType === 'RANKED_TEST' && e.outcome === 'CORRECT').length;
    const rankedAccuracy = rankedEvents.length > 0 ? Math.round((rankedCorrect / rankedEvents.length) * 10000) / 100 : null;

    // Practice split
    const practiceEvents = events.filter((e) => e.sourceType === 'PRACTICE' && (e.outcome === 'CORRECT' || e.outcome === 'INCORRECT'));
    const practiceCorrect = events.filter((e) => e.sourceType === 'PRACTICE' && e.outcome === 'CORRECT').length;
    const practiceAccuracy = practiceEvents.length > 0 ? Math.round((practiceCorrect / practiceEvents.length) * 10000) / 100 : null;

    // Category status counts
    const categoryStats = await prisma.studentTaxonomyPerformance.findMany({
      where: { studentId, taxonomyLevel: 'CATEGORY' },
    });

    const needsReviewCount = categoryStats.filter((s) => s.status === 'NEEDS_REVIEW').length;
    const developingCount = categoryStats.filter((s) => s.status === 'DEVELOPING').length;
    const strongCount = categoryStats.filter((s) => s.status === 'STRONG').length;

    return {
      totalAnswered,
      uniqueQuestionsSeen: uniqueSet.size,
      overallAccuracy,
      rankedAccuracy,
      practiceAccuracy,
      rankedAnswered: rankedEvents.length,
      practiceAnswered: practiceEvents.length,
      needsReviewCount,
      developingCount,
      strongCount,
      timeframe,
    };
  }

  /**
   * 6. Get Taxonomy Performance Summaries (Categories, Subcategories, Topics)
   */
  static async getTaxonomyPerformance(
    studentId: string,
    level: 'CATEGORY' | 'SUBCATEGORY' | 'TOPIC' | 'KNOWLEDGE_AREA',
    entityId?: string
  ): Promise<TaxonomyPerformanceSummary[]> {
    const where: any = { studentId, taxonomyLevel: level };
    if (entityId) {
      if (level === 'CATEGORY') where.categoryId = entityId;
      else if (level === 'SUBCATEGORY') where.subcategoryId = entityId;
      else if (level === 'TOPIC') where.topicId = entityId;
      else if (level === 'KNOWLEDGE_AREA') where.knowledgeAreaId = entityId;
    }

    const records = await prisma.studentTaxonomyPerformance.findMany({
      where,
      orderBy: [{ priorityScore: 'desc' }, { updatedAt: 'desc' }],
    });

    const summaries: TaxonomyPerformanceSummary[] = [];

    for (const r of records) {
      let name = 'Taxonomy Area';
      let code = r.taxonomyEntityId;

      if (level === 'CATEGORY') {
        const cat = await prisma.mcqCategory.findUnique({ where: { id: r.taxonomyEntityId } });
        if (cat) { name = cat.nameEn; code = cat.code; }
      } else if (level === 'SUBCATEGORY') {
        const sub = await prisma.mcqSubcategory.findUnique({ where: { id: r.taxonomyEntityId } });
        if (sub) { name = sub.nameEn; code = sub.code; }
      } else if (level === 'TOPIC') {
        const top = await prisma.mcqTopic.findUnique({ where: { id: r.taxonomyEntityId } });
        if (top) { name = top.nameEn; code = top.code; }
      } else if (level === 'KNOWLEDGE_AREA') {
        const ka = await prisma.academicKnowledgeArea.findUnique({ where: { id: r.taxonomyEntityId } });
        if (ka) { name = ka.nameEn; code = ka.code; }
      }

      summaries.push({
        entityId: r.taxonomyEntityId,
        entityName: name,
        entityCode: code,
        level,
        categoryId: r.categoryId,
        subcategoryId: r.subcategoryId,
        topicId: r.topicId,
        knowledgeAreaId: r.knowledgeAreaId,
        totalEvents: r.totalEvents,
        answeredEvents: r.answeredEvents,
        correctCount: r.correctCount,
        incorrectCount: r.incorrectCount,
        unansweredCount: r.unansweredCount,
        revealedCount: r.revealedCount,
        uniqueQuestionCount: r.uniqueQuestionCount,
        latestUniqueCorrectCount: r.latestUniqueCorrectCount,
        latestUniqueIncorrectCount: r.latestUniqueIncorrectCount,
        recentAccuracy: r.recentAccuracy ? Number(r.recentAccuracy) : null,
        lifetimeAccuracy: r.lifetimeAccuracy ? Number(r.lifetimeAccuracy) : null,
        latestUniqueAccuracy: r.latestUniqueAccuracy ? Number(r.latestUniqueAccuracy) : null,
        repeatedWrongCount: r.repeatedWrongCount,
        status: r.status as PerformanceStatus,
        statusLabel: r.status.replace(/_/g, ' '),
        priorityScore: Number(r.priorityScore),
        lastActivityAt: r.lastActivityAt,
      });
    }

    return summaries;
  }

  /**
   * 7. Get Weak Areas with Priority Ordering
   */
  static async getWeakAreas(studentId: string): Promise<TaxonomyPerformanceSummary[]> {
    const allStats = await this.getTaxonomyPerformance(studentId, 'SUBCATEGORY');
    const weakSubcategories = allStats.filter((s) => s.status === 'NEEDS_REVIEW');

    if (weakSubcategories.length > 0) {
      return weakSubcategories.sort((a, b) => b.priorityScore - a.priorityScore);
    }

    // Fallback to Category level if no subcategory weak areas
    const catStats = await this.getTaxonomyPerformance(studentId, 'CATEGORY');
    return catStats.filter((s) => s.status === 'NEEDS_REVIEW').sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * 8. Get Strong Areas
   */
  static async getStrongAreas(studentId: string): Promise<TaxonomyPerformanceSummary[]> {
    const allStats = await this.getTaxonomyPerformance(studentId, 'SUBCATEGORY');
    const strongSubs = allStats.filter((s) => s.status === 'STRONG');

    if (strongSubs.length > 0) return strongSubs;

    const catStats = await this.getTaxonomyPerformance(studentId, 'CATEGORY');
    return catStats.filter((s) => s.status === 'STRONG');
  }

  /**
   * 9. Get Frequently Wrong Questions
   */
  static async getFrequentlyWrongQuestions(studentId: string): Promise<FrequentlyWrongQuestionItem[]> {
    const histories = await prisma.studentMcqPracticeHistory.findMany({
      where: { studentId, timesWrong: { gte: 2 } },
      include: { question: { include: { category: true, subcategory: true } } },
      orderBy: [{ timesWrong: 'desc' }, { lastAttemptedAt: 'desc' }],
    });

    const items: FrequentlyWrongQuestionItem[] = [];

    for (const h of histories) {
      const lastEvent = await prisma.studentPerformanceEvent.findFirst({
        where: { studentId, canonicalMcqQuestionId: h.mcqQuestionId, isActive: true },
        orderBy: { occurredAt: 'desc' },
      });

      items.push({
        mcqQuestionId: h.mcqQuestionId,
        code: h.question.code,
        questionText: h.question.questionTextEn,
        categoryId: h.question.categoryId || '',
        categoryName: h.question.category?.nameEn || 'Subject',
        subcategoryId: h.question.subcategoryId || undefined,
        subcategoryName: h.question.subcategory?.nameEn,
        timesWrong: h.timesWrong,
        timesCorrect: h.timesCorrect,
        timesSeen: h.timesSeen,
        latestOutcome: lastEvent ? lastEvent.outcome : 'INCORRECT',
        lastAttemptedAt: h.lastAttemptedAt || h.updatedAt,
        difficulty: h.question.difficulty,
        isPyq: h.question.isPyq,
      });
    }

    return items;
  }

  /**
   * 10. Get Deterministic Recommendations with Content Availability Pre-Check
   */
  static async getPerformanceRecommendations(studentId: string): Promise<PerformanceRecommendationItem[]> {
    const recommendations: PerformanceRecommendationItem[] = [];

    // 1. Frequently Wrong Questions Recommendation
    const freqWrong = await this.getFrequentlyWrongQuestions(studentId);
    if (freqWrong.length > 0) {
      recommendations.push({
        id: 'rec-retry-incorrect',
        type: 'RETRY_INCORRECT',
        title: 'Retry Repeatedly Incorrect Questions',
        description: `You have ${freqWrong.length} questions answered incorrectly multiple times across practice sessions.`,
        reason: `Addressing repeated mistakes prevents pattern errors in future exams.`,
        suggestedMode: 'INCORRECT_RETRY',
        isAvailable: true,
      });
    }

    // 2. Weak Areas Recommendation
    const weakAreas = await this.getWeakAreas(studentId);
    for (const weak of weakAreas.slice(0, 2)) {
      // Check content availability in database
      const eligibleCount = await prisma.mcqQuestion.count({
        where: {
          status: 'APPROVED',
          isActive: true,
          categoryId: weak.categoryId,
          ...(weak.subcategoryId ? { subcategoryId: weak.subcategoryId } : {}),
        },
      });

      const isAvailable = eligibleCount > 0;
      recommendations.push({
        id: `rec-weak-${weak.entityId}`,
        type: 'PRACTICE_WEAK_AREA',
        title: `Practice ${weak.entityName}`,
        description: `Your recent accuracy in ${weak.entityName} is ${weak.recentAccuracy ?? 0}% across ${weak.uniqueQuestionCount} unique questions.`,
        reason: `Deterministic weakness detected based on recent practice accuracy (<50%).`,
        categoryId: weak.categoryId,
        subcategoryId: weak.subcategoryId || undefined,
        suggestedMode: 'WEAK_AREA',
        isAvailable,
        availabilityMessage: isAvailable ? undefined : 'Practice content is currently unavailable for this scope.',
      });
    }

    // 3. Continue Practice Recommendation if low volume
    if (recommendations.length === 0) {
      recommendations.push({
        id: 'rec-continue-practice',
        type: 'CONTINUE_PRACTICE',
        title: 'Start Regular Topic Practice',
        description: 'Practice more subject topics to generate personalized weak area insights.',
        reason: 'Build minimum question sample size for dynamic learning analytics.',
        suggestedMode: 'MIXED',
        isAvailable: true,
      });
    }

    return recommendations.slice(0, 5);
  }

  /**
   * 11. Unified Results Discovery History (Ranked + Practice)
   */
  static async getUnifiedResults(
    studentId: string,
    params?: { sourceType?: string; page?: number; pageSize?: number }
  ): Promise<{ results: UnifiedResultItem[]; total: number; page: number; totalPages: number }> {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const sourceType = params?.sourceType || 'ALL';

    const items: UnifiedResultItem[] = [];

    // 1. Fetch Ranked Attempts
    if (sourceType === 'ALL' || sourceType === 'RANKED_TEST') {
      const attempts = await prisma.rankedAttempt.findMany({
        where: { studentId },
        include: { rankedTest: { include: { mockTest: true } }, result: true },
        orderBy: { createdAt: 'desc' },
      });

      for (const att of attempts) {
        const isPublished = att.rankedTest.resultsPublishedAt && new Date(att.rankedTest.resultsPublishedAt) <= new Date();
        const isResultsAwaited = !isPublished || att.status === 'ACTIVE' || att.status === 'SUBMITTED' && !att.result;

        items.push({
          id: `RANKED:${att.id}`,
          sourceType: 'RANKED_TEST',
          sourceRecordId: att.id,
          title: att.rankedTest.mockTest?.titleEn || 'Ranked Mock Test',
          subtitle: `Ranked Mock Test • ${att.preparationLanguage.toUpperCase()}`,
          status: isResultsAwaited ? 'Submitted — Results Awaited' : att.status,
          isResultsAwaited: Boolean(isResultsAwaited),
          score: !isResultsAwaited && att.result ? Number(att.result.rawScore) : null,
          maxScore: Number(att.maximumMarks),
          rank: !isResultsAwaited && att.result ? att.result.rank : null,
          totalParticipants: !isResultsAwaited && att.result ? att.result.totalParticipants : null,
          totalQuestions: att.totalQuestions,
          attemptedCount: att.attemptedCount,
          correctCount: !isResultsAwaited ? att.correctCount : null,
          wrongCount: !isResultsAwaited ? att.wrongCount : null,
          unansweredCount: !isResultsAwaited ? att.unansweredCount : null,
          accuracyPercentage: !isResultsAwaited && att.attemptedCount > 0 ? Math.round((att.correctCount / att.attemptedCount) * 10000) / 100 : null,
          date: att.submittedAt || att.createdAt,
          detailUrl: `/ranked-tests/${att.rankedTestId}/result`,
        });
      }
    }

    // 2. Fetch Practice Sessions
    if (sourceType === 'ALL' || sourceType === 'PRACTICE') {
      const sessions = await prisma.practiceSession.findMany({
        where: { studentId },
        include: { category: true, subcategory: true, questions: true },
        orderBy: { createdAt: 'desc' },
      });

      for (const s of sessions) {
        const total = s.actualQuestionCount;
        const attempted = s.questions.filter((q) => q.selectedOption !== null).length;
        const correct = s.questions.filter((q) => q.isCorrect === true).length;
        const wrong = s.questions.filter((q) => q.isCorrect === false && q.selectedOption !== null).length;
        const unanswered = Math.max(0, total - attempted);
        const accuracy = attempted > 0 ? Math.round((correct / attempted) * 10000) / 100 : null;

        items.push({
          id: `PRACTICE:${s.id}`,
          sourceType: 'PRACTICE',
          sourceRecordId: s.id,
          title: s.category.nameEn,
          subtitle: s.subcategory ? s.subcategory.nameEn : `Mode: ${s.selectionMode}`,
          status: s.status,
          isResultsAwaited: false,
          score: null,
          maxScore: null,
          rank: null,
          totalParticipants: null,
          totalQuestions: total,
          attemptedCount: attempted,
          correctCount: correct,
          wrongCount: wrong,
          unansweredCount: unanswered,
          accuracyPercentage: accuracy,
          date: s.completedAt || s.startedAt,
          detailUrl: `/practice/session/${s.id}/summary`,
        });
      }
    }

    // Sort combined unified results by date desc
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = items.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

    return { results: paginatedItems, total, page, totalPages };
  }

  /**
   * 12. Admin Aggregate Performance Analytics
   */
  static async getAdminPerformanceAnalytics(adminId: string): Promise<AdminPerformanceOverview> {
    const totalStudentsWithActivity = await prisma.studentPerformanceEvent
      .groupBy({ by: ['studentId'], where: { isActive: true } })
      .then((g) => g.length);

    const totalAcademicResponses = await prisma.studentPerformanceEvent.count({
      where: { isActive: true, outcome: { in: ['CORRECT', 'INCORRECT'] } },
    });

    const totalCorrect = await prisma.studentPerformanceEvent.count({
      where: { isActive: true, outcome: 'CORRECT' },
    });

    const overallAccuracy = totalAcademicResponses > 0 ? Math.round((totalCorrect / totalAcademicResponses) * 10000) / 100 : null;

    const rankedCount = await prisma.studentPerformanceEvent.count({
      where: { isActive: true, sourceType: 'RANKED_TEST', outcome: { in: ['CORRECT', 'INCORRECT'] } },
    });
    const rankedCorrect = await prisma.studentPerformanceEvent.count({
      where: { isActive: true, sourceType: 'RANKED_TEST', outcome: 'CORRECT' },
    });
    const rankedAccuracy = rankedCount > 0 ? Math.round((rankedCorrect / rankedCount) * 10000) / 100 : null;

    const practiceCount = await prisma.studentPerformanceEvent.count({
      where: { isActive: true, sourceType: 'PRACTICE', outcome: { in: ['CORRECT', 'INCORRECT'] } },
    });
    const practiceCorrect = await prisma.studentPerformanceEvent.count({
      where: { isActive: true, sourceType: 'PRACTICE', outcome: 'CORRECT' },
    });
    const practiceAccuracy = practiceCount > 0 ? Math.round((practiceCorrect / practiceCount) * 10000) / 100 : null;

    const categoryStats = await prisma.mcqCategory.findMany({
      include: {
        _count: { select: { mcqQuestions: true } },
      },
    });

    const categoryPerfList: { categoryId: string; categoryName: string; accuracy: number; totalAnswered: number }[] = [];

    for (const cat of categoryStats) {
      const catEvents = await prisma.studentPerformanceEvent.count({
        where: { categoryId: cat.id, isActive: true, outcome: { in: ['CORRECT', 'INCORRECT'] } },
      });
      const catCorrect = await prisma.studentPerformanceEvent.count({
        where: { categoryId: cat.id, isActive: true, outcome: 'CORRECT' },
      });
      const accuracy = catEvents > 0 ? Math.round((catCorrect / catEvents) * 10000) / 100 : 0;
      categoryPerfList.push({
        categoryId: cat.id,
        categoryName: cat.nameEn,
        accuracy,
        totalAnswered: catEvents,
      });
    }

    categoryPerfList.sort((a, b) => b.accuracy - a.accuracy);

    return {
      totalStudentsWithActivity,
      totalAcademicResponses,
      overallAccuracy,
      rankedAccuracy,
      practiceAccuracy,
      rankedParticipationCount: rankedCount,
      practiceParticipationCount: practiceCount,
      topCategories: categoryPerfList.slice(0, 5),
      lowestCategories: categoryPerfList.slice(-5).reverse(),
    };
  }

  /**
   * 13. Idempotent Reconciliation & Backfill Engine
   */
  static async reconcileStudentPerformance(studentId: string): Promise<void> {
    // 1. Reconcile Ranked Attempts
    const attempts = await prisma.rankedAttempt.findMany({
      where: { studentId },
    });

    for (const att of attempts) {
      await this.recordRankedAttemptPerformance(att.id);
    }

    // 2. Reconcile Practice Sessions
    const sessions = await prisma.practiceSession.findMany({
      where: { studentId },
    });

    for (const sess of sessions) {
      await this.recordPracticeSessionPerformance(sess.id);
    }
  }
}
