import { prisma } from '@study-karnataka/database';
import {
  PracticeSelectionMode,
  PracticeSessionStatus,
  PracticeAccessClassification,
  PracticeAvailabilityParams,
  PracticeAvailabilityResult,
  StartPracticeSessionPayload,
  PracticeQuestionPayload,
  SubmitPracticeAnswerPayload,
  SubmitPracticeAnswerResult,
  PracticeSessionSummary,
  StudentPracticeProgressStats,
  WeakAreaItem,
  TopicPracticeConfigPayload,
} from '@study-karnataka/shared-types';

export class TopicPracticeService {
  /**
   * 1. Check availability and eligible question counts for practice configuration
   */
  static async checkAvailability(
    studentId: string,
    params: PracticeAvailabilityParams
  ): Promise<PracticeAvailabilityResult> {
    const { categoryId, subcategoryId, topicId, knowledgeAreaId, selectionMode = 'MIXED', difficultyFilter, pyqFilter, requestedQuestionCount = 10 } = params;

    // Validate Category
    const category = await prisma.academicCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category || !category.isActive) {
      throw new Error(`Category not found or inactive: ${categoryId}`);
    }

    let subcategoryName: string | undefined;
    if (subcategoryId) {
      const sub = await prisma.academicSubcategory.findUnique({ where: { id: subcategoryId } });
      if (!sub || sub.categoryId !== categoryId) {
        throw new Error(`Subcategory ${subcategoryId} does not belong to category ${categoryId}`);
      }
      subcategoryName = sub.nameEn;
    }

    let topicName: string | undefined;
    if (topicId) {
      if (!subcategoryId) {
        throw new Error('subcategoryId is required when topicId is provided');
      }
      const top = await prisma.academicTopic.findUnique({ where: { id: topicId } });
      if (!top || top.subcategoryId !== subcategoryId) {
        throw new Error(`Topic ${topicId} does not belong to subcategory ${subcategoryId}`);
      }
      topicName = top.nameEn;
    }

    let knowledgeAreaName: string | undefined;
    if (knowledgeAreaId) {
      if (!topicId) {
        throw new Error('topicId is required when knowledgeAreaId is provided');
      }
      const ka = await prisma.academicKnowledgeArea.findUnique({ where: { id: knowledgeAreaId } });
      if (!ka || ka.topicId !== topicId) {
        throw new Error(`KnowledgeArea ${knowledgeAreaId} does not belong to topic ${topicId}`);
      }
      knowledgeAreaName = ka.nameEn;
    }

    // Build base query for approved bilingual ready questions in scope
    const mcqWhere: any = {
      status: 'APPROVED',
      isActive: true,
      questionTextEn: { not: '' },
      questionTextKn: { not: '' },
      optionA_En: { not: '' },
      optionA_Kn: { not: '' },
      categoryId,
    };

    if (subcategoryId) mcqWhere.subcategoryId = subcategoryId;
    if (topicId) mcqWhere.topicId = topicId;
    if (knowledgeAreaId) mcqWhere.knowledgeAreaId = knowledgeAreaId;

    if (difficultyFilter && ['EASY', 'MEDIUM', 'HARD'].includes(difficultyFilter)) {
      mcqWhere.difficulty = difficultyFilter;
    }

    if (pyqFilter === 'PYQ_ONLY') {
      mcqWhere.isPyq = true;
    } else if (pyqFilter === 'NON_PYQ') {
      mcqWhere.isPyq = false;
    }

    const allApprovedMCQs = await prisma.mcqQuestion.findMany({
      where: mcqWhere,
      select: { id: true },
    });

    const totalApprovedInScope = allApprovedMCQs.length;
    const mcqIds = allApprovedMCQs.map((q) => q.id);

    // Fetch student history for these MCQs
    const historyList = await prisma.studentMcqPracticeHistory.findMany({
      where: {
        studentId,
        mcqQuestionId: { in: mcqIds },
      },
    });

    const historyMap = new Map<string, { timesSeen: number; timesCorrect: number; timesWrong: number; isCurrentlyWeak: boolean }>();
    for (const h of historyList) {
      historyMap.set(h.mcqQuestionId, h);
    }

    let unseenCount = 0;
    let previouslyCorrectCount = 0;
    let previouslyIncorrectCount = 0;
    let weakCount = 0;

    for (const id of mcqIds) {
      const h = historyMap.get(id);
      if (!h || h.timesSeen === 0) {
        unseenCount++;
      } else {
        if (h.timesCorrect > 0) previouslyCorrectCount++;
        if (h.timesWrong > 0) previouslyIncorrectCount++;
        if (h.isCurrentlyWeak || h.timesWrong > h.timesCorrect) weakCount++;
      }
    }

    let eligibleCount = totalApprovedInScope;
    if (selectionMode === 'NEW_ONLY') {
      eligibleCount = unseenCount;
    } else if (selectionMode === 'INCORRECT_RETRY') {
      eligibleCount = previouslyIncorrectCount;
    } else if (selectionMode === 'WEAK_AREA') {
      eligibleCount = weakCount > 0 ? weakCount : (unseenCount + previouslyIncorrectCount);
    } else {
      eligibleCount = totalApprovedInScope;
    }

    const hasShortage = requestedQuestionCount > eligibleCount;
    let shortageMessage: string | undefined;
    if (hasShortage) {
      shortageMessage = `${eligibleCount} eligible questions are currently available for this practice configuration.`;
    }

    return {
      categoryId,
      categoryName: category.nameEn,
      subcategoryId,
      subcategoryName,
      topicId,
      topicName,
      knowledgeAreaId,
      knowledgeAreaName,
      totalApprovedInScope,
      unseenCount,
      previouslyCorrectCount,
      previouslyIncorrectCount,
      eligibleCount,
      requestedQuestionCount,
      hasShortage,
      shortageMessage,
    };
  }

  /**
   * 2. Start a new Practice Session with frozen question order & IDs
   */
  static async startSession(
    studentId: string,
    payload: StartPracticeSessionPayload
  ): Promise<{ session: PracticeSessionSummary; questions: PracticeQuestionPayload[] }> {
    const availability = await this.checkAvailability(studentId, {
      categoryId: payload.categoryId,
      subcategoryId: payload.subcategoryId || undefined,
      topicId: payload.topicId || undefined,
      knowledgeAreaId: payload.knowledgeAreaId || undefined,
      selectionMode: payload.selectionMode,
      difficultyFilter: payload.difficultyFilter || undefined,
      pyqFilter: payload.pyqFilter || undefined,
      requestedQuestionCount: payload.requestedQuestionCount,
    });

    if (availability.eligibleCount === 0) {
      if (payload.selectionMode === 'INCORRECT_RETRY') {
        throw new Error('No incorrect questions are available for this scope yet.');
      } else if (payload.selectionMode === 'NEW_ONLY') {
        throw new Error('No unseen questions are available for this scope.');
      } else {
        throw new Error('No approved practice questions are currently available for the selected scope.');
      }
    }

    if (availability.hasShortage && !payload.acceptShortage) {
      throw new Error(availability.shortageMessage || `${availability.eligibleCount} eligible questions are available.`);
    }

    const actualCount = Math.min(payload.requestedQuestionCount, availability.eligibleCount);

    // Query candidates
    const mcqWhere: any = {
      status: 'APPROVED',
      isActive: true,
      questionTextEn: { not: '' },
      questionTextKn: { not: '' },
      optionA_En: { not: '' },
      optionA_Kn: { not: '' },
      categoryId: payload.categoryId,
    };

    if (payload.subcategoryId) mcqWhere.subcategoryId = payload.subcategoryId;
    if (payload.topicId) mcqWhere.topicId = payload.topicId;
    if (payload.knowledgeAreaId) mcqWhere.knowledgeAreaId = payload.knowledgeAreaId;

    if (payload.difficultyFilter && ['EASY', 'MEDIUM', 'HARD'].includes(payload.difficultyFilter)) {
      mcqWhere.difficulty = payload.difficultyFilter;
    }

    if (payload.pyqFilter === 'PYQ_ONLY') {
      mcqWhere.isPyq = true;
    } else if (payload.pyqFilter === 'NON_PYQ') {
      mcqWhere.isPyq = false;
    }

    const candidates = await prisma.mcqQuestion.findMany({
      where: mcqWhere,
      select: { id: true },
    });

    const candidateIds = candidates.map((c) => c.id);

    // Student History Map
    const histories = await prisma.studentMcqPracticeHistory.findMany({
      where: { studentId, mcqQuestionId: { in: candidateIds } },
    });

    const historyMap = new Map<string, { timesSeen: number; timesCorrect: number; timesWrong: number; isCurrentlyWeak: boolean; lastAttemptedAt?: Date | null }>();
    for (const h of histories) {
      historyMap.set(h.mcqQuestionId, h);
    }

    let selectedIds: string[] = [];

    if (payload.selectionMode === 'NEW_ONLY') {
      const unseenIds = candidateIds.filter((id) => !historyMap.has(id) || historyMap.get(id)!.timesSeen === 0);
      selectedIds = shuffleArray(unseenIds).slice(0, actualCount);
    } else if (payload.selectionMode === 'INCORRECT_RETRY') {
      const incorrectIds = candidateIds.filter((id) => historyMap.has(id) && historyMap.get(id)!.timesWrong > 0);
      selectedIds = shuffleArray(incorrectIds).slice(0, actualCount);
    } else if (payload.selectionMode === 'WEAK_AREA') {
      const weakIds = candidateIds.filter((id) => {
        const h = historyMap.get(id);
        return h && (h.isCurrentlyWeak || h.timesWrong > h.timesCorrect);
      });
      const unseenIds = candidateIds.filter((id) => !historyMap.has(id) || historyMap.get(id)!.timesSeen === 0);
      const otherIds = candidateIds.filter((id) => !weakIds.includes(id) && !unseenIds.includes(id));

      const combined = [...shuffleArray(weakIds), ...shuffleArray(unseenIds), ...shuffleArray(otherIds)];
      selectedIds = Array.from(new Set(combined)).slice(0, actualCount);
    } else {
      // MIXED Mode
      const unseenIds = candidateIds.filter((id) => !historyMap.has(id) || historyMap.get(id)!.timesSeen === 0);
      const weakIds = candidateIds.filter((id) => historyMap.has(id) && (historyMap.get(id)!.isCurrentlyWeak || historyMap.get(id)!.timesWrong > 0));
      const practicedIds = candidateIds.filter((id) => historyMap.has(id) && historyMap.get(id)!.timesCorrect > 0 && !weakIds.includes(id));

      const targetUnseen = Math.ceil(actualCount * 0.4);
      const targetWeak = Math.ceil(actualCount * 0.3);
      const targetPracticed = Math.max(0, actualCount - targetUnseen - targetWeak);

      const pickedUnseen = shuffleArray(unseenIds).slice(0, targetUnseen);
      const pickedWeak = shuffleArray(weakIds).slice(0, targetWeak);
      const pickedPracticed = shuffleArray(practicedIds).slice(0, targetPracticed);

      const combined = [...pickedUnseen, ...pickedWeak, ...pickedPracticed];
      const remainingCandidates = candidateIds.filter((id) => !combined.includes(id));

      selectedIds = Array.from(new Set([...combined, ...shuffleArray(remainingCandidates)])).slice(0, actualCount);
    }

    // Enforce intra-session uniqueness
    selectedIds = Array.from(new Set(selectedIds));
    // Randomize frozen display order
    selectedIds = shuffleArray(selectedIds);

    // Student preparation language
    const studentUser = await prisma.user.findUnique({ where: { id: studentId } });
    const prepLang = studentUser?.preparationLanguage || 'kn';

    // Transactionally create Session and PracticeSessionQuestions
    const session = await prisma.practiceSession.create({
      data: {
        studentId,
        categoryId: payload.categoryId,
        subcategoryId: payload.subcategoryId || null,
        topicId: payload.topicId || null,
        knowledgeAreaId: payload.knowledgeAreaId || null,
        selectionMode: payload.selectionMode,
        difficultyFilter: payload.difficultyFilter ? (payload.difficultyFilter as any) : null,
        pyqFilter: payload.pyqFilter || null,
        requestedQuestionCount: payload.requestedQuestionCount,
        actualQuestionCount: selectedIds.length,
        preparationLanguage: prepLang,
        status: 'ACTIVE',
        questions: {
          create: selectedIds.map((questionId, index) => ({
            questionId,
            displayOrder: index + 1,
          })),
        },
      },
      include: {
        questions: {
          include: {
            question: true,
          },
          orderBy: { displayOrder: 'asc' },
        },
        category: true,
        subcategory: true,
        topic: true,
        knowledgeArea: true,
      },
    });

    const summary = mapSessionSummary(session);
    const questionsPayload = session.questions.map((q) => mapQuestionPayload(q, prepLang));

    return { session: summary, questions: questionsPayload };
  }

  /**
   * 3. Get active practice session details and questions
   */
  static async getSession(
    studentId: string,
    sessionId: string
  ): Promise<{ session: PracticeSessionSummary; questions: PracticeQuestionPayload[] }> {
    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: {
          include: { question: true },
          orderBy: { displayOrder: 'asc' },
        },
        category: true,
        subcategory: true,
        topic: true,
        knowledgeArea: true,
      },
    });

    if (!session) {
      throw new Error(`Practice session not found: ${sessionId}`);
    }

    if (session.studentId !== studentId) {
      throw new Error('Forbidden. You do not own this practice session.');
    }

    const prepLang = session.preparationLanguage;
    const summary = mapSessionSummary(session);
    const questionsPayload = session.questions.map((q) => mapQuestionPayload(q, prepLang));

    return { session: summary, questions: questionsPayload };
  }

  /**
   * 4. Submit an Answer to a practice question with instant feedback
   */
  static async submitAnswer(
    studentId: string,
    sessionId: string,
    payload: SubmitPracticeAnswerPayload
  ): Promise<SubmitPracticeAnswerResult> {
    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: { category: true },
    });

    if (!session) {
      throw new Error(`Practice session not found: ${sessionId}`);
    }

    if (session.studentId !== studentId) {
      throw new Error('Forbidden. You do not own this practice session.');
    }

    if (session.status !== 'ACTIVE') {
      throw new Error(`Practice session is not active. Current status: ${session.status}`);
    }

    const sessionQuestion = await prisma.practiceSessionQuestion.findFirst({
      where: {
        sessionId,
        questionId: payload.questionId,
      },
      include: { question: true },
    });

    if (!sessionQuestion) {
      throw new Error(`Question ${payload.questionId} does not belong to session ${sessionId}`);
    }

    const mcq = sessionQuestion.question;
    const isCorrect = payload.selectedOption === mcq.correctOption;

    // Check if already answered (Idempotency Check)
    const firstAttempt = sessionQuestion.firstAttemptedAt === null;

    if (firstAttempt) {
      // Record primary first attempt response
      await prisma.practiceSessionQuestion.update({
        where: { id: sessionQuestion.id },
        data: {
          selectedOption: payload.selectedOption,
          isCorrect,
          firstAttemptedAt: new Date(),
          answeredAt: new Date(),
        },
      });

      // Update Student MCQ Practice History
      const existingHistory = await prisma.studentMcqPracticeHistory.findUnique({
        where: {
          studentId_mcqQuestionId: { studentId, mcqQuestionId: payload.questionId },
        },
      });

      const timesSeen = (existingHistory?.timesSeen || 0) + 1;
      const timesCorrect = (existingHistory?.timesCorrect || 0) + (isCorrect ? 1 : 0);
      const timesWrong = (existingHistory?.timesWrong || 0) + (isCorrect ? 0 : 1);
      const isCurrentlyWeak = timesWrong > timesCorrect || (!isCorrect && timesWrong >= 1);

      await prisma.studentMcqPracticeHistory.upsert({
        where: { studentId_mcqQuestionId: { studentId, mcqQuestionId: payload.questionId } },
        update: {
          timesSeen,
          timesCorrect,
          timesWrong,
          lastAttemptedAt: new Date(),
          lastCorrectAt: isCorrect ? new Date() : existingHistory?.lastCorrectAt,
          lastWrongAt: !isCorrect ? new Date() : existingHistory?.lastWrongAt,
          isCurrentlyWeak,
        },
        create: {
          studentId,
          mcqQuestionId: payload.questionId,
          timesSeen: 1,
          timesCorrect: isCorrect ? 1 : 0,
          timesWrong: isCorrect ? 0 : 1,
          lastAttemptedAt: new Date(),
          lastCorrectAt: isCorrect ? new Date() : null,
          lastWrongAt: isCorrect ? null : new Date(),
          isCurrentlyWeak,
        },
      });

      // Update Student Taxonomy Practice Stats
      await updateTaxonomyStats(studentId, session, isCorrect);
    }

    const explanation = session.preparationLanguage === 'en'
      ? (mcq.explanationEn || 'No explanation provided.')
      : (mcq.explanationKn || 'ವಿವರಣೆ ಲಭ್ಯವಿಲ್ಲ.');

    return {
      sessionQuestionId: sessionQuestion.id,
      questionId: payload.questionId,
      selectedOption: payload.selectedOption,
      isCorrect: firstAttempt ? isCorrect : (sessionQuestion.isCorrect ?? isCorrect),
      firstAttempt,
      correctOption: mcq.correctOption,
      explanation,
    };
  }

  /**
   * 5. Skip Question
   */
  static async skipQuestion(studentId: string, sessionId: string, questionId: string): Promise<{ success: boolean; nextQuestionId?: string }> {
    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: { questions: { orderBy: { displayOrder: 'asc' } } },
    });

    if (!session || session.studentId !== studentId) {
      throw new Error('Forbidden or session not found');
    }

    const currentIdx = session.questions.findIndex((q) => q.questionId === questionId);
    const nextQ = session.questions.find((q, idx) => idx > currentIdx && q.selectedOption === null);

    return {
      success: true,
      nextQuestionId: nextQ?.questionId,
    };
  }

  /**
   * 6. Reveal Answer without answering (counts as revealed, not first-attempt correct)
   */
  static async revealAnswer(studentId: string, sessionId: string, questionId: string): Promise<SubmitPracticeAnswerResult> {
    const session = await prisma.practiceSession.findUnique({ where: { id: sessionId } });
    if (!session || session.studentId !== studentId) throw new Error('Forbidden or session not found');

    const sessionQuestion = await prisma.practiceSessionQuestion.findFirst({
      where: { sessionId, questionId },
      include: { question: true },
    });
    if (!sessionQuestion) throw new Error('Question not found in session');

    const firstAttempt = sessionQuestion.firstAttemptedAt === null;

    if (firstAttempt) {
      await prisma.practiceSessionQuestion.update({
        where: { id: sessionQuestion.id },
        data: {
          isRevealed: true,
          isCorrect: false,
          firstAttemptedAt: new Date(),
        },
      });

      // Track as wrong in history since answer was revealed before answering
      await prisma.studentMcqPracticeHistory.upsert({
        where: { studentId_mcqQuestionId: { studentId, mcqQuestionId: questionId } },
        update: {
          timesSeen: { increment: 1 },
          timesWrong: { increment: 1 },
          lastAttemptedAt: new Date(),
          lastWrongAt: new Date(),
          isCurrentlyWeak: true,
        },
        create: {
          studentId,
          mcqQuestionId: questionId,
          timesSeen: 1,
          timesCorrect: 0,
          timesWrong: 1,
          lastAttemptedAt: new Date(),
          lastWrongAt: new Date(),
          isCurrentlyWeak: true,
        },
      });

      await updateTaxonomyStats(studentId, session, false);
    }

    const mcq = sessionQuestion.question;
    const explanation = session.preparationLanguage === 'en'
      ? (mcq.explanationEn || 'No explanation provided.')
      : (mcq.explanationKn || 'ವಿವರಣೆ ಲಭ್ಯವಿಲ್ಲ.');

    return {
      sessionQuestionId: sessionQuestion.id,
      questionId,
      selectedOption: sessionQuestion.selectedOption || '',
      isCorrect: false,
      firstAttempt,
      correctOption: mcq.correctOption,
      explanation,
    };
  }

  /**
   * 7. Toggle Mark For Revision
   */
  static async toggleMarkForRevision(studentId: string, sessionId: string, questionId: string): Promise<{ questionId: string; markedForRevision: boolean }> {
    const sessionQuestion = await prisma.practiceSessionQuestion.findFirst({
      where: { sessionId, questionId },
      include: { session: true },
    });

    if (!sessionQuestion || sessionQuestion.session.studentId !== studentId) {
      throw new Error('Forbidden or session question not found');
    }

    const newFlag = !sessionQuestion.markedForRevision;
    await prisma.practiceSessionQuestion.update({
      where: { id: sessionQuestion.id },
      data: { markedForRevision: newFlag },
    });

    return { questionId, markedForRevision: newFlag };
  }

  /**
   * 8. Complete Session & Return Summary
   */
  static async completeSession(studentId: string, sessionId: string, timeSpentSeconds?: number): Promise<PracticeSessionSummary> {
    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: {
        questions: { include: { question: true } },
        category: true,
        subcategory: true,
        topic: true,
        knowledgeArea: true,
      },
    });

    if (!session || session.studentId !== studentId) {
      throw new Error('Forbidden or session not found');
    }

    const updatedTime = timeSpentSeconds ? session.timeSpentSeconds + timeSpentSeconds : session.timeSpentSeconds;

    const updatedSession = await prisma.practiceSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        timeSpentSeconds: updatedTime,
      },
      include: {
        questions: { include: { question: true } },
        category: true,
        subcategory: true,
        topic: true,
        knowledgeArea: true,
      },
    });

    return mapSessionSummary(updatedSession);
  }

  /**
   * 9. Abandon Session
   */
  static async abandonSession(studentId: string, sessionId: string): Promise<{ id: string; status: PracticeSessionStatus }> {
    const session = await prisma.practiceSession.findUnique({ where: { id: sessionId } });
    if (!session || session.studentId !== studentId) throw new Error('Forbidden or session not found');

    const updated = await prisma.practiceSession.update({
      where: { id: sessionId },
      data: { status: 'ABANDONED', abandonedAt: new Date() },
    });

    return { id: updated.id, status: updated.status as PracticeSessionStatus };
  }

  /**
   * 10. Retry Incorrect Questions from a Session
   */
  static async retryIncorrectSession(
    studentId: string,
    sessionId: string
  ): Promise<{ session: PracticeSessionSummary; questions: PracticeQuestionPayload[] }> {
    const session = await prisma.practiceSession.findUnique({
      where: { id: sessionId },
      include: { questions: true },
    });

    if (!session || session.studentId !== studentId) throw new Error('Forbidden or session not found');

    const incorrectQuestionIds = session.questions
      .filter((q) => q.isCorrect === false || (q.selectedOption !== null && q.isCorrect !== true))
      .map((q) => q.questionId);

    if (incorrectQuestionIds.length === 0) {
      throw new Error('No incorrect questions found in this session to retry.');
    }

    return this.startSession(studentId, {
      categoryId: session.categoryId,
      subcategoryId: session.subcategoryId || undefined,
      topicId: session.topicId || undefined,
      knowledgeAreaId: session.knowledgeAreaId || undefined,
      selectionMode: 'INCORRECT_RETRY',
      requestedQuestionCount: incorrectQuestionIds.length,
      acceptShortage: true,
    });
  }

  /**
   * 11. Get Student Practice History List
   */
  static async getStudentPracticeHistory(studentId: string): Promise<PracticeSessionSummary[]> {
    const sessions = await prisma.practiceSession.findMany({
      where: { studentId },
      include: {
        questions: { include: { question: true } },
        category: true,
        subcategory: true,
        topic: true,
        knowledgeArea: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map(mapSessionSummary);
  }

  /**
   * 12. Get Student Weak Areas
   */
  static async getStudentWeakAreas(studentId: string): Promise<WeakAreaItem[]> {
    const stats = await prisma.studentTaxonomyPracticeStats.findMany({
      where: { studentId, totalAttempted: { gte: 2 } },
      include: {
        category: true,
        subcategory: true,
        topic: true,
        knowledgeArea: true,
      },
      orderBy: { accuracy: 'asc' },
    });

    return stats.map((s) => {
      const acc = Number(s.accuracy);
      let statusLabel: 'UNSEEN' | 'NEEDS_REVIEW' | 'WEAK' | 'DEVELOPING' | 'STRONG' = 'NEEDS_REVIEW';

      if (s.totalAttempted === 0) statusLabel = 'UNSEEN';
      else if (acc < 50) statusLabel = 'WEAK';
      else if (acc >= 50 && acc < 80) statusLabel = 'DEVELOPING';
      else if (acc >= 80) statusLabel = 'STRONG';

      return {
        categoryId: s.categoryId,
        categoryName: s.category.nameEn,
        subcategoryId: s.subcategoryId,
        subcategoryName: s.subcategory?.nameEn,
        topicId: s.topicId,
        topicName: s.topic?.nameEn,
        knowledgeAreaId: s.knowledgeAreaId,
        knowledgeAreaName: s.knowledgeArea?.nameEn,
        totalAttempted: s.totalAttempted,
        uniqueSeen: s.uniqueQuestionsSeen,
        totalCorrect: s.totalCorrect,
        totalWrong: s.totalWrong,
        accuracyPercentage: acc,
        statusLabel,
      };
    });
  }

  /**
   * 13. Get Overall Student Practice Stats
   */
  static async getStudentProgressStats(studentId: string): Promise<StudentPracticeProgressStats> {
    const histories = await prisma.studentMcqPracticeHistory.findMany({
      where: { studentId },
    });

    let totalQuestionsAttempted = 0;
    let totalCorrect = 0;
    let totalWrong = 0;

    for (const h of histories) {
      totalQuestionsAttempted += h.timesSeen;
      totalCorrect += h.timesCorrect;
      totalWrong += h.timesWrong;
    }

    const uniqueQuestionsSeen = histories.length;
    const accuracyPercentage = totalQuestionsAttempted > 0 ? Math.round((totalCorrect / totalQuestionsAttempted) * 10000) / 100 : 0;

    const activeSessionsCount = await prisma.practiceSession.count({ where: { studentId, status: 'ACTIVE' } });
    const completedSessionsCount = await prisma.practiceSession.count({ where: { studentId, status: 'COMPLETED' } });

    const weakAreas = await this.getStudentWeakAreas(studentId);
    const weakTopicsCount = weakAreas.filter((w) => w.statusLabel === 'WEAK').length;
    const strongTopicsCount = weakAreas.filter((w) => w.statusLabel === 'STRONG').length;

    const lastSession = await prisma.practiceSession.findFirst({
      where: { studentId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    return {
      totalQuestionsAttempted,
      uniqueQuestionsSeen,
      totalCorrect,
      totalWrong,
      accuracyPercentage,
      activeSessionsCount,
      completedSessionsCount,
      weakTopicsCount,
      strongTopicsCount,
      lastPracticedAt: lastSession?.updatedAt || null,
    };
  }

  /**
   * 14. Admin Practice Configurations
   */
  static async getAdminConfigs(): Promise<any[]> {
    return prisma.topicPracticeConfig.findMany({
      include: {
        category: true,
        subcategory: true,
        topic: true,
        knowledgeArea: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async upsertAdminConfig(payload: TopicPracticeConfigPayload): Promise<any> {
    if (payload.categoryId) {
      const existing = await prisma.topicPracticeConfig.findFirst({
        where: { categoryId: payload.categoryId },
      });
      if (existing) {
        return prisma.topicPracticeConfig.update({
          where: { id: existing.id },
          data: payload as any,
        });
      }
    }
    return prisma.topicPracticeConfig.create({
      data: payload as any,
    });
  }
}

// Helper: Shuffles array safely
function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Helper: Maps PracticeSession to PracticeSessionSummary
function mapSessionSummary(session: any): PracticeSessionSummary {
  const total = session.actualQuestionCount || session.questions?.length || 0;
  const attempted = session.questions?.filter((q: any) => q.selectedOption !== null).length || 0;
  const correct = session.questions?.filter((q: any) => q.isCorrect === true).length || 0;
  const wrong = session.questions?.filter((q: any) => q.isCorrect === false && q.selectedOption !== null).length || 0;
  const unanswered = Math.max(0, total - attempted);
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 10000) / 100 : 0;
  const markedForRevisionCount = session.questions?.filter((q: any) => q.markedForRevision === true).length || 0;

  const recommendations: string[] = [];
  if (attempted > 0) {
    if (accuracy < 50) {
      recommendations.push('Accuracy is below 50%. Recommend practicing Weak Areas to master core concepts.');
    }
    if (wrong > 0) {
      recommendations.push('You missed some questions. Use "Retry Incorrect Questions" to reinforce your learning.');
    }
    if (accuracy >= 80) {
      recommendations.push('Excellent performance! Try a higher difficulty level or practice another Subcategory.');
    }
  }

  return {
    id: session.id,
    studentId: session.studentId,
    categoryId: session.categoryId,
    categoryName: session.category?.nameEn || 'Category',
    subcategoryId: session.subcategoryId,
    subcategoryName: session.subcategory?.nameEn,
    topicId: session.topicId,
    topicName: session.topic?.nameEn,
    knowledgeAreaId: session.knowledgeAreaId,
    knowledgeAreaName: session.knowledgeArea?.nameEn,
    selectionMode: session.selectionMode as PracticeSelectionMode,
    difficultyFilter: session.difficultyFilter,
    pyqFilter: session.pyqFilter,
    requestedQuestionCount: session.requestedQuestionCount,
    actualQuestionCount: total,
    attemptedCount: attempted,
    correctCount: correct,
    wrongCount: wrong,
    unansweredCount: unanswered,
    accuracyPercentage: accuracy,
    timeSpentSeconds: session.timeSpentSeconds || 0,
    markedForRevisionCount,
    preparationLanguage: session.preparationLanguage,
    status: session.status as PracticeSessionStatus,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    recommendations,
  };
}

// Helper: Securely maps PracticeSessionQuestion to PracticeQuestionPayload
function mapQuestionPayload(q: any, prepLang: string): PracticeQuestionPayload {
  const mcq = q.question;
  const isEn = prepLang === 'en';

  return {
    sessionQuestionId: q.id,
    questionId: q.questionId,
    displayOrder: q.displayOrder,
    questionText: isEn ? mcq.questionTextEn : mcq.questionTextKn,
    optionA: isEn ? mcq.optionA_En : mcq.optionA_Kn,
    optionB: isEn ? mcq.optionB_En : mcq.optionB_Kn,
    optionC: isEn ? mcq.optionC_En : mcq.optionC_Kn,
    optionD: isEn ? mcq.optionD_En : mcq.optionD_Kn,
    difficulty: mcq.difficulty,
    isPyq: mcq.isPyq,
    pyqExamName: mcq.pyqExamName,
    pyqYear: mcq.pyqYear,
    sourceName: mcq.sourceName,
    selectedOption: q.selectedOption,
    isAnswered: q.selectedOption !== null,
    isCorrect: q.isCorrect,
    isRevealed: q.isRevealed,
    markedForRevision: q.markedForRevision,
    // Note: correctOption & explanation are deliberately undefined here to prevent answer leaks!
  };
}

// Helper: Updates aggregate taxonomy stats for student
async function updateTaxonomyStats(studentId: string, session: any, isCorrect: boolean) {
  const categoryId = session.categoryId;
  const subcategoryId = session.subcategoryId;
  const topicId = session.topicId;
  const knowledgeAreaId = session.knowledgeAreaId;

  // We update or create the taxonomy stat entry for student
  const existing = await prisma.studentTaxonomyPracticeStats.findFirst({
    where: {
      studentId,
      categoryId,
      subcategoryId: subcategoryId || null,
      topicId: topicId || null,
      knowledgeAreaId: knowledgeAreaId || null,
    },
  });

  const totalAttempted = (existing?.totalAttempted || 0) + 1;
  const totalCorrect = (existing?.totalCorrect || 0) + (isCorrect ? 1 : 0);
  const totalWrong = (existing?.totalWrong || 0) + (isCorrect ? 0 : 1);
  const accuracy = Math.round((totalCorrect / totalAttempted) * 10000) / 100;

  // Calculate unique questions seen in this taxonomy
  const uniqueCount = await prisma.studentMcqPracticeHistory.count({
    where: {
      studentId,
      question: {
        categoryId,
        ...(subcategoryId ? { subcategoryId } : {}),
        ...(topicId ? { topicId } : {}),
        ...(knowledgeAreaId ? { knowledgeAreaId } : {}),
      },
    },
  });

  if (existing) {
    await prisma.studentTaxonomyPracticeStats.update({
      where: { id: existing.id },
      data: {
        totalAttempted,
        totalCorrect,
        totalWrong,
        uniqueQuestionsSeen: uniqueCount,
        accuracy,
        lastPracticedAt: new Date(),
      },
    });
  } else {
    await prisma.studentTaxonomyPracticeStats.create({
      data: {
        studentId,
        categoryId,
        subcategoryId: subcategoryId || null,
        topicId: topicId || null,
        knowledgeAreaId: knowledgeAreaId || null,
        totalAttempted: 1,
        totalCorrect: isCorrect ? 1 : 0,
        totalWrong: isCorrect ? 0 : 1,
        uniqueQuestionsSeen: uniqueCount || 1,
        accuracy: isCorrect ? 100 : 0,
        lastPracticedAt: new Date(),
      },
    });
  }
}
