// @ts-nocheck
import { prisma } from '@study-karnataka/database';
import {
  ExamPortfolioOverview,
  ExamReadinessListItem,
  ExamWorkflowQueue,
  ExamImportantDateAnalytics,
  ExamStaleWorkItem,
  ExamReadinessDetail,
  ExamReadinessIssue,
  ExamAnalyticsFilters,
  PaginationMeta,
} from '@study-karnataka/shared-types';
import {
  evaluateExamCycleReadiness,
  getStaleDaysConfig,
  isRecordStale,
} from '@study-karnataka/validation';

export class ExamAnalyticsService {
  /**
   * Get portfolio overview aggregated metrics
   */
  static async getPortfolioOverview(filters: ExamAnalyticsFilters = {}): Promise<ExamPortfolioOverview> {
    const where: any = {};
    if (!filters.includeArchived) {
      where.status = { not: 'ARCHIVED' };
    }
    if (filters.authorityId) {
      where.programme = { authorityId: filters.authorityId };
    }
    if (filters.programmeId) {
      where.programmeId = filters.programmeId;
    }
    if (filters.cycleYear) {
      where.cycleYear = filters.cycleYear;
    }

    const [
      totalAuthorities,
      activeAuthorities,
      totalProgrammes,
      activeProgrammes,
      totalCycles,
      cycles,
    ] = await Promise.all([
      prisma.examAuthority.count(),
      prisma.examAuthority.count({ where: { isActive: true } }),
      prisma.examProgramme.count(),
      prisma.examProgramme.count({ where: { isActive: true } }),
      prisma.examCycle.count({ where }),
      prisma.examCycle.findMany({
        where,
        include: {
          programme: { include: { authority: true } },
          eligibility: true,
          importantDates: true,
          officialResources: true,
          seo: true,
          patterns: {
            include: {
              stages: {
                include: {
                  papers: {
                    include: { sections: true },
                  },
                },
              },
            },
          },
          syllabi: {
            include: { nodes: true },
          },
        },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      DRAFT: 0,
      REVIEW_PENDING: 0,
      CHANGES_REQUESTED: 0,
      APPROVED: 0,
      PUBLISHED: 0,
      CLOSED: 0,
      ARCHIVED: 0,
    };

    const visibilityCounts: Record<string, number> = {
      PRIVATE: 0,
      UNLISTED: 0,
      PUBLIC: 0,
    };

    const readinessCounts: Record<string, number> = {
      NOT_STARTED: 0,
      IN_PROGRESS: 0,
      BLOCKED: 0,
      READY: 0,
      LIVE: 0,
      ARCHIVED: 0,
    };

    const bilingualCounts = {
      bothComplete: 0,
      englishCompleteOnly: 0,
      kannadaCompleteOnly: 0,
      incomplete: 0,
    };

    const patternReadinessCounts = {
      hasCurrentPattern: 0,
      missingPattern: 0,
      publishedPattern: 0,
      draftOrPendingPattern: 0,
    };

    const syllabusReadinessCounts = {
      hasCurrentSyllabus: 0,
      missingSyllabus: 0,
      publishedSyllabus: 0,
      draftOrPendingSyllabus: 0,
    };

    let staleCount = 0;
    const staleDays = getStaleDaysConfig();

    for (const exam of cycles) {
      statusCounts[exam.status] = (statusCounts[exam.status] || 0) + 1;
      visibilityCounts[exam.visibility] = (visibilityCounts[exam.visibility] || 0) + 1;

      if (isRecordStale(exam.updatedAt, exam.status, staleDays)) {
        staleCount++;
      }

      const evalResult = evaluateExamCycleReadiness(exam);
      const readinessStatus = evalResult.summary.overallStatus;
      readinessCounts[readinessStatus] = (readinessCounts[readinessStatus] || 0) + 1;

      // Bilingual
      const titleEn = !!exam.titleEn?.trim();
      const titleKn = !!exam.titleKn?.trim();
      const descEn = !!exam.descriptionEn?.trim();
      const descKn = !!exam.descriptionKn?.trim();
      const enComplete = titleEn && descEn;
      const knComplete = titleKn && descKn;

      if (enComplete && knComplete) bilingualCounts.bothComplete++;
      else if (enComplete) bilingualCounts.englishCompleteOnly++;
      else if (knComplete) bilingualCounts.kannadaCompleteOnly++;
      else bilingualCounts.incomplete++;

      // Pattern
      const currentPattern = exam.patterns.find((p) => p.isCurrent) || exam.patterns[0];
      if (currentPattern) {
        patternReadinessCounts.hasCurrentPattern++;
        if (currentPattern.status === 'PUBLISHED') patternReadinessCounts.publishedPattern++;
        else patternReadinessCounts.draftOrPendingPattern++;
      } else {
        patternReadinessCounts.missingPattern++;
      }

      // Syllabus
      const currentSyllabus = exam.syllabi.find((s) => s.isCurrent) || exam.syllabi[0];
      if (currentSyllabus) {
        syllabusReadinessCounts.hasCurrentSyllabus++;
        if (currentSyllabus.status === 'PUBLISHED') syllabusReadinessCounts.publishedSyllabus++;
        else syllabusReadinessCounts.draftOrPendingSyllabus++;
      } else {
        syllabusReadinessCounts.missingSyllabus++;
      }
    }

    return {
      totalAuthorities,
      activeAuthorities,
      totalProgrammes,
      activeProgrammes,
      totalCycles,
      statusCounts: statusCounts as Record<any, number>,
      visibilityCounts: visibilityCounts as Record<any, number>,
      readinessCounts: readinessCounts as Record<any, number>,
      bilingualCounts,
      patternReadinessCounts,
      syllabusReadinessCounts,
      staleCount,
      asOf: new Date().toISOString(),
    };
  }

  /**
   * Get paginated readiness list with comprehensive diagnostics
   */
  static async getReadinessList(
    filters: ExamAnalyticsFilters = {}
  ): Promise<{ data: ExamReadinessListItem[]; meta: PaginationMeta }> {
    const where: any = {};
    if (!filters.includeArchived) {
      where.status = { not: 'ARCHIVED' };
    }
    if (filters.authorityId) {
      where.programme = { authorityId: filters.authorityId };
    }
    if (filters.programmeId) {
      where.programmeId = filters.programmeId;
    }
    if (filters.cycleYear) {
      where.cycleYear = filters.cycleYear;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.visibility) {
      where.visibility = filters.visibility;
    }
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { titleEn: { contains: q, mode: 'insensitive' } },
        { titleKn: { contains: q, mode: 'insensitive' } },
        { cycleCode: { contains: q, mode: 'insensitive' } },
        { programme: { nameEn: { contains: q, mode: 'insensitive' } } },
        { programme: { authority: { nameEn: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const allCycles = await prisma.examCycle.findMany({
      where,
      include: {
        programme: { include: { authority: true } },
        eligibility: true,
        importantDates: true,
        officialResources: true,
        seo: true,
        patterns: {
          include: {
            stages: {
              include: {
                papers: {
                  include: { sections: true },
                },
              },
            },
          },
        },
        syllabi: {
          include: { nodes: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    let items: ExamReadinessListItem[] = allCycles.map((exam) => {
      const evalResult = evaluateExamCycleReadiness(exam);
      const summary = evalResult.summary;

      const currentPattern = exam.patterns.find((p) => p.isCurrent) || exam.patterns[0];
      const currentSyllabus = exam.syllabi.find((s) => s.isCurrent) || exam.syllabi[0];

      const enComplete = !!exam.titleEn?.trim() && !!exam.descriptionEn?.trim();
      const knComplete = !!exam.titleKn?.trim() && !!exam.descriptionKn?.trim();
      let bilingualState: 'BOTH_COMPLETE' | 'ENGLISH_COMPLETE' | 'KANNADA_COMPLETE' | 'INCOMPLETE' = 'INCOMPLETE';
      if (enComplete && knComplete) bilingualState = 'BOTH_COMPLETE';
      else if (enComplete) bilingualState = 'ENGLISH_COMPLETE';
      else if (knComplete) bilingualState = 'KANNADA_COMPLETE';

      return {
        id: exam.id,
        cycleCode: exam.cycleCode,
        cycleYear: exam.cycleYear,
        titleEn: exam.titleEn,
        titleKn: exam.titleKn,
        authorityId: exam.programme.authority.id,
        authorityNameEn: exam.programme.authority.nameEn,
        authorityNameKn: exam.programme.authority.nameKn,
        programmeId: exam.programme.id,
        programmeNameEn: exam.programme.nameEn,
        programmeNameKn: exam.programme.nameKn,
        status: exam.status,
        visibility: exam.visibility,
        englishReadiness: enComplete ? 'COMPLETE' : 'INCOMPLETE',
        kannadaReadiness: knComplete ? 'COMPLETE' : 'INCOMPLETE',
        bilingualState,
        examRecordReadiness: evalResult.examRecordSection.blockerCount > 0 ? 'BLOCKED' : 'READY',
        patternReadiness: !currentPattern ? 'NOT_STARTED' : evalResult.patternSection.blockerCount > 0 ? 'BLOCKED' : 'READY',
        syllabusReadiness: !currentSyllabus ? 'NOT_STARTED' : evalResult.syllabusSection.blockerCount > 0 ? 'BLOCKED' : 'READY',
        patternStatus: currentPattern?.status || null,
        syllabusStatus: currentSyllabus?.status || null,
        overallCompletionPercentage: summary.completionPercentage,
        overallReadinessStatus: summary.overallStatus,
        blockerCount: summary.blockerCount,
        warningCount: summary.warningCount,
        nextRequiredAction: summary.nextRequiredAction,
        lastUpdated: exam.updatedAt.toISOString(),
        patternRevisionNumber: currentPattern?.revisionNumber || null,
        syllabusRevisionNumber: currentSyllabus?.revisionNumber || null,
      };
    });

    // In-memory filters for readiness metrics if provided
    if (filters.readinessStatus) {
      items = items.filter((i) => i.overallReadinessStatus === filters.readinessStatus);
    }
    if (filters.bilingualState) {
      items = items.filter((i) => i.bilingualState === filters.bilingualState);
    }
    if (filters.patternStatus) {
      items = items.filter((i) => i.patternStatus === filters.patternStatus);
    }
    if (filters.syllabusStatus) {
      items = items.filter((i) => i.syllabusStatus === filters.syllabusStatus);
    }

    // Sort
    const sortBy = filters.sortBy || 'lastUpdated';
    const sortOrder = filters.sortOrder || 'desc';
    items.sort((a: any, b: any) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const total = items.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = items.slice((page - 1) * limit, page * limit);

    return {
      data: paginated,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get actionable workflow queues
   */
  static async getWorkflowQueues(filters: ExamAnalyticsFilters = {}): Promise<ExamWorkflowQueue> {
    const where: any = {};
    if (!filters.includeArchived) {
      where.status = { not: 'ARCHIVED' };
    }
    if (filters.authorityId) {
      where.programme = { authorityId: filters.authorityId };
    }
    if (filters.programmeId) {
      where.programmeId = filters.programmeId;
    }

    const cycles = await prisma.examCycle.findMany({
      where,
      include: {
        programme: { include: { authority: true } },
        eligibility: true,
        importantDates: true,
        officialResources: true,
        seo: true,
        patterns: {
          include: {
            stages: {
              include: { papers: { include: { sections: true } } },
            },
          },
        },
        syllabi: { include: { nodes: true } },
      },
    });

    const queue: ExamWorkflowQueue = {
      awaitingManager: [],
      awaitingReviewer: [],
      awaitingSuperAdmin: [],
      blockedByValidation: [],
      missingPattern: [],
      missingSyllabus: [],
      bilingualIncomplete: [],
      staleDrafts: [],
    };

    const staleDays = getStaleDaysConfig();

    for (const exam of cycles) {
      const evalResult = evaluateExamCycleReadiness(exam);
      const summary = evalResult.summary;
      const daysWithoutUpdate = Math.floor(
        (new Date().getTime() - new Date(exam.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      const baseItem = {
        id: exam.id,
        examId: exam.id,
        titleEn: exam.titleEn,
        titleKn: exam.titleKn,
        cycleCode: exam.cycleCode,
        cycleYear: exam.cycleYear,
        authorityNameEn: exam.programme.authority.nameEn,
        programmeNameEn: exam.programme.nameEn,
        currentStatus: exam.status,
        updatedAt: exam.updatedAt.toISOString(),
        daysWithoutUpdate,
        blockerCount: summary.blockerCount,
        destinationRoute: `/exams/${exam.id}`,
      };

      if (exam.status === 'CHANGES_REQUESTED') {
        queue.awaitingManager.push({
          ...baseItem,
          queueCategory: 'AWAITING_CONTENT_MANAGER',
          responsibleRole: 'Content Manager',
        });
      } else if (exam.status === 'REVIEW_PENDING') {
        queue.awaitingReviewer.push({
          ...baseItem,
          queueCategory: 'AWAITING_REVIEWER',
          responsibleRole: 'Content Reviewer',
        });
      } else if (exam.status === 'APPROVED') {
        queue.awaitingSuperAdmin.push({
          ...baseItem,
          queueCategory: 'AWAITING_SUPER_ADMIN_PUBLICATION',
          responsibleRole: 'Super Admin',
        });
      }

      if (summary.overallStatus === 'BLOCKED') {
        queue.blockedByValidation.push({
          ...baseItem,
          queueCategory: 'BLOCKED_BY_VALIDATION',
          responsibleRole: 'Content Manager',
        });
      }

      const currentPattern = exam.patterns.find((p) => p.isCurrent) || exam.patterns[0];
      if (!currentPattern) {
        queue.missingPattern.push({
          ...baseItem,
          queueCategory: 'MISSING_CURRENT_PATTERN',
          responsibleRole: 'Content Manager',
          destinationRoute: `/exams/${exam.id}/pattern`,
        });
      }

      const currentSyllabus = exam.syllabi.find((s) => s.isCurrent) || exam.syllabi[0];
      if (!currentSyllabus) {
        queue.missingSyllabus.push({
          ...baseItem,
          queueCategory: 'MISSING_CURRENT_SYLLABUS',
          responsibleRole: 'Content Manager',
          destinationRoute: `/exams/${exam.id}/syllabus`,
        });
      }

      const enComplete = !!exam.titleEn?.trim() && !!exam.descriptionEn?.trim();
      const knComplete = !!exam.titleKn?.trim() && !!exam.descriptionKn?.trim();
      if (!enComplete || !knComplete) {
        queue.bilingualIncomplete.push({
          ...baseItem,
          queueCategory: 'BILINGUAL_INCOMPLETE',
          responsibleRole: 'Content Manager',
          destinationRoute: `/exams/${exam.id}/edit`,
        });
      }

      if (isRecordStale(exam.updatedAt, exam.status, staleDays)) {
        queue.staleDrafts.push({
          ...baseItem,
          queueCategory: 'STALE_DRAFT',
          responsibleRole: exam.status === 'CHANGES_REQUESTED' ? 'Content Manager' : 'Content Manager',
        });
      }
    }

    return queue;
  }

  /**
   * Get Important Dates analytics
   */
  static async getImportantDatesAnalytics(filters: ExamAnalyticsFilters = {}): Promise<ExamImportantDateAnalytics> {
    const where: any = {};
    if (!filters.includeArchived) {
      where.examCycle = { status: { not: 'ARCHIVED' } };
    }
    if (filters.authorityId) {
      where.examCycle = { ...where.examCycle, programme: { authorityId: filters.authorityId } };
    }
    if (filters.programmeId) {
      where.examCycle = { ...where.examCycle, programmeId: filters.programmeId };
    }

    const importantDates = await prisma.examImportantDate.findMany({
      where,
      include: {
        examCycle: {
          include: { programme: { include: { authority: true } } },
        },
        examStage: true,
      },
      orderBy: { startAt: 'asc' },
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const d7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const d90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const analytics: ExamImportantDateAnalytics = {
      today: [],
      next7Days: [],
      next30Days: [],
      next90Days: [],
      pastDates: [],
      tentativeDates: [],
      applicationsOpen: [],
      applicationsClosingSoon: [],
      upcomingExams: [],
      upcomingResults: [],
      stageLinkedDates: [],
    };

    importantDates.forEach((dt) => {
      const start = new Date(dt.startAt);
      const isPast = start < todayStart;
      const isClosingSoon = dt.type === 'APPLICATION_END' && start >= todayStart && start <= d7;

      const item = {
        id: dt.id,
        examId: dt.examCycleId,
        examTitleEn: dt.examCycle.titleEn,
        examTitleKn: dt.examCycle.titleKn,
        authorityNameEn: dt.examCycle.programme.authority.nameEn,
        programmeNameEn: dt.examCycle.programme.nameEn,
        dateType: dt.type,
        labelEn: dt.labelEn,
        labelKn: dt.labelKn,
        startAt: dt.startAt.toISOString(),
        endAt: dt.endAt ? dt.endAt.toISOString() : null,
        isTentative: dt.isTentative,
        stageNameEn: dt.examStage?.nameEn || null,
        destinationRoute: `/exams/${dt.examCycleId}/edit`,
        isPast,
        isClosingSoon,
      };

      if (start >= todayStart && start <= todayEnd) analytics.today.push(item);
      if (start > todayEnd && start <= d7) analytics.next7Days.push(item);
      if (start > d7 && start <= d30) analytics.next30Days.push(item);
      if (start > d30 && start <= d90) analytics.next90Days.push(item);
      if (isPast) analytics.pastDates.push(item);
      if (dt.isTentative) analytics.tentativeDates.push(item);
      if (dt.type === 'APPLICATION_START' && start <= now && (!dt.endAt || new Date(dt.endAt) >= now)) {
        analytics.applicationsOpen.push(item);
      }
      if (isClosingSoon) analytics.applicationsClosingSoon.push(item);
      if (dt.type === 'EXAM' && !isPast) analytics.upcomingExams.push(item);
      if (dt.type === 'RESULT' && !isPast) analytics.upcomingResults.push(item);
      if (dt.examStageId) analytics.stageLinkedDates.push(item);
    });

    return analytics;
  }

  /**
   * Get Stale work items list
   */
  static async getStaleWorkItems(filters: ExamAnalyticsFilters = {}): Promise<ExamStaleWorkItem[]> {
    const staleDays = getStaleDaysConfig();
    const thresholdDate = new Date(new Date().getTime() - staleDays * 24 * 60 * 60 * 1000);

    const staleCycles = await prisma.examCycle.findMany({
      where: {
        status: { in: ['DRAFT', 'CHANGES_REQUESTED'] },
        updatedAt: { lte: thresholdDate },
      },
      include: { programme: true },
    });

    return staleCycles.map((c) => {
      const daysWithoutUpdate = Math.floor(
        (new Date().getTime() - new Date(c.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        entityType: 'EXAM_CYCLE',
        entityId: c.id,
        examId: c.id,
        label: `${c.titleEn} (${c.cycleCode})`,
        currentStatus: c.status,
        updatedAt: c.updatedAt.toISOString(),
        daysWithoutUpdate,
        responsibleRole: c.status === 'CHANGES_REQUESTED' ? 'Content Manager' : 'Content Manager',
        destinationRoute: `/exams/${c.id}/edit`,
      };
    });
  }

  /**
   * Get detailed Per-Exam readiness and activity breakdown
   */
  static async getPerExamReadinessDetail(examId: string): Promise<ExamReadinessDetail> {
    const exam = await prisma.examCycle.findUnique({
      where: { id: examId },
      include: {
        programme: { include: { authority: true } },
        eligibility: true,
        importantDates: true,
        officialResources: true,
        seo: true,
        patterns: {
          include: {
            stages: {
              include: {
                papers: {
                  include: { sections: true },
                },
              },
            },
          },
        },
        syllabi: {
          include: { nodes: true },
        },
      },
    });

    if (!exam) {
      throw { statusCode: 404, code: 'EXAM_ANALYTICS_EXAM_NOT_FOUND', message: `Exam Cycle with ID ${examId} not found` };
    }

    const evalResult = evaluateExamCycleReadiness(exam);
    const summary = evalResult.summary;

    // Fetch relevant audit logs for this exam
    const auditLogs = await prisma.adminAuditLog.findMany({
      where: {
        OR: [
          { recordType: 'EXAM_CYCLE', recordId: examId },
          { recordType: 'EXAM_PATTERN', recordId: { in: exam.patterns.map((p) => p.id) } },
          { recordType: 'EXAM_SYLLABUS', recordId: { in: exam.syllabi.map((s) => s.id) } },
        ],
      },
      include: { adminUser: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const recentActivity = auditLogs.map((log) => ({
      id: log.id,
      adminUserId: log.adminUserId,
      adminName: log.adminUser.fullName,
      action: log.action,
      module: log.module,
      recordType: log.recordType,
      recordId: log.recordId,
      createdAt: log.createdAt.toISOString(),
    }));

    return {
      overview: {
        examId: exam.id,
        titleEn: exam.titleEn,
        titleKn: exam.titleKn,
        cycleCode: exam.cycleCode,
        cycleYear: exam.cycleYear,
        authorityNameEn: exam.programme.authority.nameEn,
        authorityNameKn: exam.programme.authority.nameKn,
        programmeNameEn: exam.programme.nameEn,
        programmeNameKn: exam.programme.nameKn,
        status: exam.status,
        visibility: exam.visibility,
        overallReadiness: summary.overallStatus,
        completionPercentage: summary.completionPercentage,
        blockerCount: summary.blockerCount,
        warningCount: summary.warningCount,
        nextAction: summary.nextRequiredAction,
        lastUpdated: exam.updatedAt.toISOString(),
      },
      examRecordSection: evalResult.examRecordSection,
      patternSection: evalResult.patternSection,
      syllabusSection: evalResult.syllabusSection,
      publicationSection: evalResult.publicationSection,
      issues: evalResult.issues,
      recentActivity,
      asOf: new Date().toISOString(),
    };
  }

  /**
   * Get issues for a specific exam
   */
  static async getPerExamIssues(
    examId: string,
    filters: { category?: string; severity?: string; blocking?: boolean } = {}
  ): Promise<ExamReadinessIssue[]> {
    const detail = await this.getPerExamReadinessDetail(examId);
    let issues = detail.issues;

    if (filters.category) {
      issues = issues.filter((i) => i.category === filters.category);
    }
    if (filters.severity) {
      issues = issues.filter((i) => i.severity === filters.severity);
    }
    if (filters.blocking !== undefined) {
      issues = issues.filter((i) => i.blocking === filters.blocking);
    }

    return issues;
  }
}
