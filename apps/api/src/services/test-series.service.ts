// @ts-nocheck
import { prisma, Prisma } from '@study-karnataka/database';
import {
  TestSeriesWorkflowStatus,
  TestSeriesReleaseMode,
  SeriesQuestionReusePolicy,
  SeriesTestEntryType,
  TestAccessClassification,
  QuestionReuseValidationResult,
} from '@study-karnataka/shared-types';

export class TestSeriesServiceError extends Error {
  constructor(message: string, public status: number = 400, public details?: any) {
    super(message);
    this.name = 'TestSeriesServiceError';
  }
}

export class TestSeriesService {
  /**
   * Read-only preview of the next available test series code.
   * MUST NOT mutate database, MUST NOT increment TestSeriesSequenceCounter.
   */
  static async getNextSeriesCodePreview(): Promise<{ code: string; seqNumber: number }> {
    const counter = await prisma.testSeriesSequenceCounter.findUnique({
      where: { id: 'singleton' },
    });

    const maxSeries = await prisma.testSeries.findFirst({
      where: { seqNumber: { not: null } },
      orderBy: { seqNumber: 'desc' },
      select: { seqNumber: true },
    });

    const currentCounter = counter?.lastValue || 0;
    const maxExistingSeq = maxSeries?.seqNumber || 0;
    const nextSeq = Math.max(currentCounter, maxExistingSeq) + 1;

    const code = `TS_${String(nextSeq).padStart(6, '0')}`;
    return { code, seqNumber: nextSeq };
  }

  /**
   * Atomically allocates the next sequential series code within a Prisma transaction.
   */
  static async allocateNextSeriesCode(tx: Prisma.TransactionClient): Promise<{ code: string; seqNumber: number }> {
    const counter = await tx.testSeriesSequenceCounter.findUnique({
      where: { id: 'singleton' },
    });

    const maxSeries = await tx.testSeries.findFirst({
      where: { seqNumber: { not: null } },
      orderBy: { seqNumber: 'desc' },
      select: { seqNumber: true },
    });

    const currentCounter = counter?.lastValue || 0;
    const maxExistingSeq = maxSeries?.seqNumber || 0;
    const nextSeq = Math.max(currentCounter, maxExistingSeq) + 1;

    await tx.testSeriesSequenceCounter.upsert({
      where: { id: 'singleton' },
      update: { lastValue: nextSeq },
      create: { id: 'singleton', lastValue: nextSeq },
    });

    const code = `TS_${String(nextSeq).padStart(6, '0')}`;
    return { code, seqNumber: nextSeq };
  }

  /**
   * Batch calculate Question Reuse & Duplicate MCQs across included tests in a Series.
   * Efficient: 1 query for TestQuestions, 0 N+1 loops.
   */
  static async validateQuestionReuse(
    seriesTestEntries: { mockTestId: string; orderIndex: number; entryType?: SeriesTestEntryType }[],
    policy: SeriesQuestionReusePolicy
  ): Promise<QuestionReuseValidationResult> {
    if (seriesTestEntries.length === 0) {
      return {
        isValid: true,
        policy,
        totalTests: 0,
        totalQuestionSlots: 0,
        uniqueMcqCount: 0,
        repeatedMcqCount: 0,
        questionReusePercentage: 0,
        duplicates: [],
        errors: [],
      };
    }

    const testIds = seriesTestEntries.map((t) => t.mockTestId);
    const testMap = new Map(seriesTestEntries.map((t) => [t.mockTestId, t]));

    // Fetch tests metadata
    const tests = await prisma.mockTest.findMany({
      where: { id: { in: testIds } },
      select: { id: true, code: true, titleEn: true },
    });
    const mockTestDetailMap = new Map(tests.map((t) => [t.id, t]));

    // Fetch all test-question mappings in batch
    const testQuestions = await prisma.mockTestQuestion.findMany({
      where: { mockTestId: { in: testIds } },
      select: {
        mockTestId: true,
        questionId: true,
        displayOrder: true,
        question: { select: { code: true } },
      },
    });

    const locationsByMcq = new Map<
      string,
      {
        mcqId: string;
        mcqCode?: string;
        locations: {
          testId: string;
          testCode: string;
          testTitleEn: string;
          orderIndex: number;
          questionDisplayOrder: number;
          entryType: SeriesTestEntryType;
        }[];
      }
    >();

    for (const tq of testQuestions) {
      const entry = testMap.get(tq.mockTestId);
      const testMeta: any = mockTestDetailMap.get(tq.mockTestId);
      if (!entry || !testMeta) continue;

      if (!locationsByMcq.has(tq.questionId)) {
        locationsByMcq.set(tq.questionId, {
          mcqId: tq.questionId,
          mcqCode: tq.question?.code,
          locations: [],
        });
      }

      locationsByMcq.get(tq.questionId)!.locations.push({
        testId: tq.mockTestId,
        testCode: testMeta.code,
        testTitleEn: testMeta.titleEn,
        orderIndex: entry.orderIndex,
        questionDisplayOrder: tq.displayOrder,
        entryType: entry.entryType || 'PRACTICE',
      });
    }

    const totalQuestionSlots = testQuestions.length;
    const uniqueMcqCount = locationsByMcq.size;
    let repeatedMcqCount = 0;
    const duplicates: QuestionReuseValidationResult['duplicates'] = [];
    const errors: string[] = [];

    for (const [mcqId, item] of locationsByMcq.entries()) {
      if (item.locations.length > 1) {
        repeatedMcqCount++;

        // Ranked-to-Ranked No-Repeat Rule
        const rankedLocations = item.locations.filter((loc) => loc.entryType === 'RANKED');
        const isRankedConflict = rankedLocations.length > 1;

        // Global NO_REPEAT policy
        const isGlobalPolicyConflict = policy === 'NO_REPEAT';

        if (isRankedConflict || isGlobalPolicyConflict) {
          duplicates.push(item);
          const locDescs = item.locations.map(
            (l) => `${l.testCode} (${l.entryType}, Slot #${l.questionDisplayOrder})`
          );
          if (isRankedConflict) {
            errors.push(
              `Ranked-to-Ranked No-Repeat Rule Violated: MCQ '${item.mcqCode || mcqId}' appears in multiple RANKED tests: ${locDescs.join(', ')}`
            );
          } else {
            errors.push(
              `NO_REPEAT Policy Violated: MCQ '${item.mcqCode || mcqId}' appears in multiple tests: ${locDescs.join(', ')}`
            );
          }
        }
      }
    }

    const questionReusePercentage =
      totalQuestionSlots > 0 ? Number(((repeatedMcqCount / totalQuestionSlots) * 100).toFixed(1)) : 0;

    return {
      isValid: errors.length === 0,
      policy,
      totalTests: seriesTestEntries.length,
      totalQuestionSlots,
      uniqueMcqCount,
      repeatedMcqCount,
      questionReusePercentage,
      duplicates,
      errors,
    };
  }

  /**
   * Formats DB TestSeries into response DTO with calculated analytics & readiness checks.
   */
  private static async formatSeriesResponse(s: any, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const tests = (s.tests || []).map((st: any) => ({
      id: st.id,
      testSeriesId: st.testSeriesId,
      mockTestId: st.mockTestId,
      orderIndex: st.orderIndex,
      entryType: st.entryType || 'PRACTICE',
      availableFrom: st.availableFrom ? st.availableFrom.toISOString() : null,
      availableUntil: st.availableUntil ? st.availableUntil.toISOString() : null,
      labelEn: st.labelEn || null,
      labelKn: st.labelKn || null,
      isFeatured: st.isFeatured || false,
      createdAt: st.createdAt.toISOString(),
      updatedAt: st.updatedAt.toISOString(),
      mockTest: st.mockTest
        ? {
            id: st.mockTest.id,
            code: st.mockTest.code,
            titleEn: st.mockTest.titleEn,
            titleKn: st.mockTest.titleKn,
            totalQuestions: st.mockTest.totalQuestions,
            durationMinutes: st.mockTest.durationMinutes,
            status: st.mockTest.status,
            isPublished: st.mockTest.isPublished,
            selectionMode: st.mockTest.selectionMode,
            accessClassification: st.mockTest.accessClassification,
          }
        : undefined,
    }));

    // Question reuse analytics
    const seriesEntriesForReuse = tests.map((t: any) => ({
      mockTestId: t.mockTestId,
      orderIndex: t.orderIndex,
      entryType: t.entryType as SeriesTestEntryType,
    }));

    const reuseValidation = await this.validateQuestionReuse(seriesEntriesForReuse, s.questionReusePolicy);

    const studentReadyTestsCount = tests.filter(
      (t: any) => t.mockTest?.status === 'PUBLISHED' || t.mockTest?.isPublished
    ).length;

    const readinessErrors: string[] = [];

    if (!s.titleEn || s.titleEn.trim().length < 3) {
      readinessErrors.push('English Series Title must be at least 3 characters');
    }
    if (!s.titleKn || s.titleKn.trim().length < 3) {
      readinessErrors.push('Kannada Series Title must be at least 3 characters');
    }
    if (tests.length === 0) {
      readinessErrors.push('At least 1 Test must be added to the Test Series');
    }

    // Check same exam cycle requirement
    const wrongExamTests = tests.filter((t: any) => t.mockTest && t.mockTest.examCycle && t.mockTest.examCycle.programmeId !== s.examProgrammeId);
    if (wrongExamTests.length > 0) {
      readinessErrors.push(`${wrongExamTests.length} test(s) belong to a different Exam Cycle than the Series`);
    }

    // Check scheduled dates requirement
    if (s.releaseMode === 'SCHEDULED') {
      const missingDates = tests.filter((t: any) => !t.availableFrom);
      if (missingDates.length > 0) {
        readinessErrors.push(`${missingDates.length} test(s) are missing scheduled release dates (availableFrom)`);
      }
    }

    if (!reuseValidation.isValid) {
      readinessErrors.push(...reuseValidation.errors);
    }

    const isReadinessValid = readinessErrors.length === 0;

    return {
      id: s.id,
      seqNumber: s.seqNumber,
      code: s.code,
      titleEn: s.titleEn,
      titleKn: s.titleKn,
      descriptionEn: s.descriptionEn,
      descriptionKn: s.descriptionKn,
      instructionsEn: s.instructionsEn,
      instructionsKn: s.instructionsKn,
      examProgrammeId: s.examProgrammeId,
      examStageId: s.examStageId,
      examPaperId: s.examPaperId,
      examProgramme: s.examProgramme,
      examStage: s.examStage,
      examPaper: s.examPaper,
      accessClassification: s.accessClassification,
      releaseMode: s.releaseMode,
      questionReusePolicy: s.questionReusePolicy,
      seriesStartAt: s.seriesStartAt ? s.seriesStartAt.toISOString() : null,
      seriesEndAt: s.seriesEndAt ? s.seriesEndAt.toISOString() : null,
      status: s.status,
      isPublished: s.isPublished,
      rejectionReason: s.rejectionReason,
      createdByAdminId: s.createdByAdminId,
      submittedByAdminId: s.submittedByAdminId,
      reviewedByAdminId: s.reviewedByAdminId,
      approvedByAdminId: s.approvedByAdminId,
      publishedByAdminId: s.publishedByAdminId,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      tests,
      totalTests: tests.length,
      studentReadyTestsCount,
      totalQuestionSlots: reuseValidation.totalQuestionSlots,
      uniqueMcqCount: reuseValidation.uniqueMcqCount,
      repeatedMcqCount: reuseValidation.repeatedMcqCount,
      questionReusePercentage: reuseValidation.questionReusePercentage,
      isReusePolicyValid: reuseValidation.isValid,
      reuseErrors: reuseValidation.errors,
      duplicateMcqDetails: reuseValidation.duplicates,
      isReadinessValid,
      readinessErrors,
    };
  }

  /**
   * List test series with search & filters
   */
  static async getTestSeriesList(params?: {
    search?: string;
    examProgrammeId?: string;
    status?: TestSeriesWorkflowStatus;
    accessClassification?: TestAccessClassification;
    releaseMode?: TestSeriesReleaseMode;
    questionReusePolicy?: SeriesQuestionReusePolicy;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.min(100, Math.max(1, params?.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.TestSeriesWhereInput = {};

    if (params?.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { titleEn: { contains: params.search, mode: 'insensitive' } },
        { titleKn: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params?.examProgrammeId) where.examProgrammeId = params.examProgrammeId;
    if (params?.status) where.status = params.status;
    if (params?.accessClassification) where.accessClassification = params.accessClassification;
    if (params?.releaseMode) where.releaseMode = params.releaseMode;
    if (params?.questionReusePolicy) where.questionReusePolicy = params.questionReusePolicy;

    const [total, seriesList] = await Promise.all([
      prisma.testSeries.count({ where }),
      prisma.testSeries.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          examProgramme: true,
          examStage: true,
          examPaper: true,
          tests: {
            orderBy: { orderIndex: 'asc' },
            include: { mockTest: true },
          },
        },
      }),
    ]);

    const items = await Promise.all(seriesList.map((s) => this.formatSeriesResponse(s)));

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get single test series by ID
   */
  static async getTestSeriesById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const series = await client.testSeries.findUnique({
      where: { id },
      include: {
        examProgramme: true,
        examStage: true,
        examPaper: true,
        tests: {
          orderBy: { orderIndex: 'asc' },
          include: { mockTest: true },
        },
      },
    });

    if (!series) {
      throw new TestSeriesServiceError('Test Series not found', 404);
    }

    return this.formatSeriesResponse(series, tx);
  }

  /**
   * Search candidate tests eligible to be added to a Series
   */
  static async searchEligibleTestsForSeries(params: {
    seriesId?: string;
    examProgrammeId: string;
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.MockTestWhereInput = {
      AND: [
        {
          OR: [
            { examCycle: { programmeId: params.examProgrammeId } },
            { examCycleId: null },
          ],
        },
      ],
    };

    if (params.search) {
      // @ts-ignore - Prisma types are fine, but TS gets confused with dynamic AND push
      where.AND!.push({
        OR: [
          { code: { contains: params.search, mode: 'insensitive' } },
          { titleEn: { contains: params.search, mode: 'insensitive' } },
          { titleKn: { contains: params.search, mode: 'insensitive' } },
        ],
      });
    }
    if (params.status) {
      // @ts-ignore
      where.AND!.push({ status: params.status as any });
    }

    const [total, tests] = await Promise.all([
      prisma.mockTest.count({ where }),
      prisma.mockTest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { code: 'asc' },
        include: {
          questions: { select: { questionId: true } },
        },
      }),
    ]);

    // If seriesId supplied, calculate question overlap for candidate tests
    let existingSeriesQuestionIds = new Set<string>();
    if (params.seriesId) {
      const existingSeries = await prisma.testSeries.findUnique({
        where: { id: params.seriesId },
        include: { tests: { select: { mockTestId: true } } },
      });
      if (existingSeries) {
        const addedTestIds = existingSeries.tests.map((t) => t.mockTestId);
        const existingTQs = await prisma.mockTestQuestion.findMany({
          where: { mockTestId: { in: addedTestIds } },
          select: { questionId: true },
        });
        existingSeriesQuestionIds = new Set(existingTQs.map((q) => q.questionId));
      }
    }

    const items = tests.map((t) => {
      const testMcqIds = t.questions.map((q) => q.questionId);
      const overlapCount = testMcqIds.filter((qId) => existingSeriesQuestionIds.has(qId)).length;
      return {
        id: t.id,
        code: t.code,
        titleEn: t.titleEn,
        titleKn: t.titleKn,
        totalQuestions: t.totalQuestions,
        durationMinutes: t.durationMinutes,
        status: t.status,
        isPublished: t.isPublished,
        selectionMode: t.selectionMode,
        accessClassification: t.accessClassification,
        overlapCountWithSeries: overlapCount,
        hasOverlapConflict: overlapCount > 0,
      };
    });

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Create a new Test Series with atomic code allocation.
   */
  static async createTestSeries(payload: any, adminUserId?: string) {
    if (!payload.titleEn || payload.titleEn.trim().length < 3) {
      throw new TestSeriesServiceError('English Series Title must be at least 3 characters', 400);
    }
    if (!payload.titleKn || payload.titleKn.trim().length < 3) {
      throw new TestSeriesServiceError('Kannada Series Title must be at least 3 characters', 400);
    }
    if (!payload.examProgrammeId) {
      throw new TestSeriesServiceError('Exam Cycle ID is required', 400);
    }

    // Verify Exam Cycle existence
    const cycle = await prisma.examProgramme.findUnique({ where: { id: payload.examProgrammeId } });
    if (!cycle) throw new TestSeriesServiceError('Selected Exam Cycle not found', 404);

    // Verify Exam Stage & Paper hierarchy if provided
    if (payload.examStageId) {
      const stage = await prisma.examStage.findUnique({
        where: { id: payload.examStageId },
        include: { examPattern: true },
      });
      if (!stage || stage.examPattern.examProgrammeId !== payload.examProgrammeId) {
        throw new TestSeriesServiceError('Selected Exam Stage does not belong to the selected Exam Cycle', 400);
      }
    }
    if (payload.examPaperId && payload.examStageId) {
      const paper = await prisma.examPaper.findUnique({ where: { id: payload.examPaperId } });
      if (!paper || paper.examStageId !== payload.examStageId) {
        throw new TestSeriesServiceError('Selected Exam Paper does not belong to the selected Exam Stage', 400);
      }
    }

    // Validate date boundaries if supplied
    if (payload.seriesStartAt && payload.seriesEndAt) {
      const start = new Date(payload.seriesStartAt);
      const end = new Date(payload.seriesEndAt);
      if (end <= start) {
        throw new TestSeriesServiceError('Series End Date must be after Series Start Date', 400);
      }
    }

    const testEntries = Array.isArray(payload.tests) ? payload.tests : [];

    // Duplicate Test ID check
    const mockTestIds = testEntries.map((t: any) => t.mockTestId);
    const uniqueTestIds = new Set(mockTestIds);
    if (uniqueTestIds.size !== mockTestIds.length) {
      throw new TestSeriesServiceError('The same Test cannot appear twice in one Test Series', 400);
    }

    // Duplicate Order Index check
    const orderIndices = testEntries.map((t: any) => t.orderIndex);
    const uniqueOrders = new Set(orderIndices);
    if (uniqueOrders.size !== orderIndices.length) {
      throw new TestSeriesServiceError('Each included Test must have a unique order index', 400);
    }

    // Verify all included tests exist and belong to the SAME Exam Cycle
    if (mockTestIds.length > 0) {
      const fetchedTests = await prisma.mockTest.findMany({
        where: { id: { in: mockTestIds } },
        include: { examCycle: true },
      });

      if (fetchedTests.length !== mockTestIds.length) {
        throw new TestSeriesServiceError('One or more selected Test IDs do not exist in the Test Library', 400);
      }

      for (const ft of fetchedTests) {
        if (ft.examCycle && ft.examCycle.programmeId !== payload.examProgrammeId) {
          throw new TestSeriesServiceError(
            `Selected Test '${ft.code}' (${ft.titleEn}) belongs to a different Exam Cycle. All tests in a series must belong to the same Exam Cycle.`,
            400
          );
        }
      }
    }

    // Question reuse policy pre-validation
    const reusePolicy = payload.questionReusePolicy || 'NO_REPEAT';
    const reuseCheck = await this.validateQuestionReuse(
      testEntries.map((t: any) => ({
        mockTestId: t.mockTestId,
        orderIndex: t.orderIndex,
        entryType: t.entryType || 'PRACTICE',
      })),
      reusePolicy
    );

    if (!reuseCheck.isValid) {
      throw new TestSeriesServiceError(
        `Question Reuse Validation Failed: ${reuseCheck.errors.join('; ')}`,
        400,
        { reuseErrors: reuseCheck.errors, duplicates: reuseCheck.duplicates }
      );
    }

    // Transactional Persistence: Allocate code + create TestSeries + create TestSeriesTest records
    return prisma.$transaction(async (tx) => {
      const { code, seqNumber } = await this.allocateNextSeriesCode(tx);

      const series = await tx.testSeries.create({
        data: {
          code,
          seqNumber,
          titleEn: payload.titleEn.trim(),
          titleKn: payload.titleKn.trim(),
          descriptionEn: payload.descriptionEn?.trim() || null,
          descriptionKn: payload.descriptionKn?.trim() || null,
          instructionsEn: payload.instructionsEn?.trim() || null,
          instructionsKn: payload.instructionsKn?.trim() || null,
          examProgrammeId: payload.examProgrammeId,
          examStageId: payload.examStageId || null,
          examPaperId: payload.examPaperId || null,
          accessClassification: payload.accessClassification || 'FREE',
          releaseMode: payload.releaseMode || 'ALL_AVAILABLE',
          questionReusePolicy: reusePolicy,
          seriesStartAt: payload.seriesStartAt ? new Date(payload.seriesStartAt) : null,
          seriesEndAt: payload.seriesEndAt ? new Date(payload.seriesEndAt) : null,
          status: 'DRAFT',
          isPublished: false,
          createdByAdminId: adminUserId || null,
        },
      });

      for (const te of testEntries) {
        await tx.testSeriesTest.create({
          data: {
            testSeriesId: series.id,
            mockTestId: te.mockTestId,
            orderIndex: te.orderIndex,
            entryType: te.entryType || 'PRACTICE',
            availableFrom: te.availableFrom ? new Date(te.availableFrom) : null,
            availableUntil: te.availableUntil ? new Date(te.availableUntil) : null,
            labelEn: te.labelEn?.trim() || null,
            labelKn: te.labelKn?.trim() || null,
            isFeatured: te.isFeatured || false,
          },
        });
      }

      return this.getTestSeriesById(series.id, tx);
    });
  }

  /**
   * Update Test Series configuration (Editable in DRAFT and CHANGES_REQUESTED).
   * Structurally immutable in PUBLISHED status!
   */
  static async updateTestSeries(id: string, payload: any, adminUserId?: string) {
    const existing = await prisma.testSeries.findUnique({ where: { id } });
    if (!existing) throw new TestSeriesServiceError('Test Series not found', 404);

    if (existing.status === 'PUBLISHED') {
      throw new TestSeriesServiceError(
        'Published Test Series is structurally immutable. Included tests, order, and release policy cannot be modified in place.',
        400
      );
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'CHANGES_REQUESTED') {
      throw new TestSeriesServiceError(
        `Cannot edit Test Series in '${existing.status}' status. Only DRAFT or CHANGES_REQUESTED series are editable.`,
        400
      );
    }

    const examProgrammeId = payload.examProgrammeId || existing.examProgrammeId;
    const testEntries = Array.isArray(payload.tests) ? payload.tests : undefined;

    if (testEntries) {
      const mockTestIds = testEntries.map((t: any) => t.mockTestId);
      const uniqueTestIds = new Set(mockTestIds);
      if (uniqueTestIds.size !== mockTestIds.length) {
        throw new TestSeriesServiceError('The same Test cannot appear twice in one Test Series', 400);
      }

      const orderIndices = testEntries.map((t: any) => t.orderIndex);
      const uniqueOrders = new Set(orderIndices);
      if (uniqueOrders.size !== orderIndices.length) {
        throw new TestSeriesServiceError('Each included Test must have a unique order index', 400);
      }

      const fetchedTests = await prisma.mockTest.findMany({
        where: { id: { in: mockTestIds } },
        include: { examCycle: true },
      });
      if (fetchedTests.length !== mockTestIds.length) {
        throw new TestSeriesServiceError('One or more selected Test IDs do not exist in the Test Library', 400);
      }
      for (const ft of fetchedTests) {
        if (ft.examCycle && ft.examCycle.programmeId !== examProgrammeId) {
          throw new TestSeriesServiceError(
            `Selected Test '${ft.code}' (${ft.titleEn}) belongs to a different Exam Cycle.`,
            400
          );
        }
      }

      const reusePolicy = payload.questionReusePolicy || existing.questionReusePolicy;
      const reuseCheck = await this.validateQuestionReuse(
        testEntries.map((t: any) => ({
          mockTestId: t.mockTestId,
          orderIndex: t.orderIndex,
          entryType: t.entryType || 'PRACTICE',
        })),
        reusePolicy
      );

      if (!reuseCheck.isValid) {
        throw new TestSeriesServiceError(
          `Question Reuse Validation Failed: ${reuseCheck.errors.join('; ')}`,
          400,
          { reuseErrors: reuseCheck.errors, duplicates: reuseCheck.duplicates }
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      await tx.testSeries.update({
        where: { id },
        data: {
          titleEn: payload.titleEn !== undefined ? payload.titleEn.trim() : existing.titleEn,
          titleKn: payload.titleKn !== undefined ? payload.titleKn.trim() : existing.titleKn,
          descriptionEn: payload.descriptionEn !== undefined ? payload.descriptionEn : existing.descriptionEn,
          descriptionKn: payload.descriptionKn !== undefined ? payload.descriptionKn : existing.descriptionKn,
          instructionsEn: payload.instructionsEn !== undefined ? payload.instructionsEn : existing.instructionsEn,
          instructionsKn: payload.instructionsKn !== undefined ? payload.instructionsKn : existing.instructionsKn,
          examProgrammeId: payload.examProgrammeId !== undefined ? payload.examProgrammeId : existing.examProgrammeId,
          examStageId: payload.examStageId !== undefined ? payload.examStageId : existing.examStageId,
          examPaperId: payload.examPaperId !== undefined ? payload.examPaperId : existing.examPaperId,
          accessClassification: payload.accessClassification ?? existing.accessClassification,
          releaseMode: payload.releaseMode ?? existing.releaseMode,
          questionReusePolicy: payload.questionReusePolicy ?? existing.questionReusePolicy,
          seriesStartAt: payload.seriesStartAt !== undefined ? (payload.seriesStartAt ? new Date(payload.seriesStartAt) : null) : existing.seriesStartAt,
          seriesEndAt: payload.seriesEndAt !== undefined ? (payload.seriesEndAt ? new Date(payload.seriesEndAt) : null) : existing.seriesEndAt,
        },
      });

      if (testEntries) {
        await tx.testSeriesTest.deleteMany({ where: { testSeriesId: id } });
        for (const te of testEntries) {
          await tx.testSeriesTest.create({
            data: {
              testSeriesId: id,
              mockTestId: te.mockTestId,
              orderIndex: te.orderIndex,
              entryType: te.entryType || 'PRACTICE',
              availableFrom: te.availableFrom ? new Date(te.availableFrom) : null,
              availableUntil: te.availableUntil ? new Date(te.availableUntil) : null,
              labelEn: te.labelEn?.trim() || null,
              labelKn: te.labelKn?.trim() || null,
              isFeatured: te.isFeatured || false,
            },
          });
        }
      }

      return this.getTestSeriesById(id, tx);
    });
  }

  /**
   * Reorder tests within a Test Series
   */
  static async reorderSeriesTests(id: string, items: { mockTestId: string; orderIndex: number }[]) {
    const series = await prisma.testSeries.findUnique({
      where: { id },
      include: { tests: true },
    });
    if (!series) throw new TestSeriesServiceError('Test Series not found', 404);

    if (series.status === 'PUBLISHED') {
      throw new TestSeriesServiceError('Cannot reorder tests in a PUBLISHED Test Series', 400);
    }
    if (series.status !== 'DRAFT' && series.status !== 'CHANGES_REQUESTED') {
      throw new TestSeriesServiceError(`Cannot reorder tests in '${series.status}' status`, 400);
    }

    return prisma.$transaction(async (tx) => {
      // Set to negative orderIndex first to prevent unique constraint collision
      for (const item of items) {
        await tx.testSeriesTest.updateMany({
          where: { testSeriesId: id, mockTestId: item.mockTestId },
          data: { orderIndex: -item.orderIndex },
        });
      }

      for (const item of items) {
        await tx.testSeriesTest.updateMany({
          where: { testSeriesId: id, mockTestId: item.mockTestId },
          data: { orderIndex: item.orderIndex },
        });
      }

      return this.getTestSeriesById(id, tx);
    });
  }

  /**
   * Submit Test Series for Review (DRAFT / CHANGES_REQUESTED -> REVIEW_PENDING)
   */
  static async submitForReview(id: string, adminUserId?: string) {
    const series = await this.getTestSeriesById(id);

    if (series.status !== 'DRAFT' && series.status !== 'CHANGES_REQUESTED') {
      throw new TestSeriesServiceError(`Cannot submit Test Series in '${series.status}' status for review`, 400);
    }

    if (!series.isReadinessValid) {
      throw new TestSeriesServiceError(
        `Cannot submit Test Series for review due to validation errors: ${series.readinessErrors.join('; ')}`,
        400
      );
    }

    const updated = await prisma.testSeries.update({
      where: { id },
      data: {
        status: 'REVIEW_PENDING',
        submittedByAdminId: adminUserId || null,
        rejectionReason: null,
      },
    });

    return this.getTestSeriesById(updated.id);
  }

  /**
   * Request Changes on Test Series (REVIEW_PENDING -> CHANGES_REQUESTED)
   */
  static async requestChanges(id: string, rejectionReason: string, adminUserId?: string) {
    const series = await prisma.testSeries.findUnique({ where: { id } });
    if (!series) throw new TestSeriesServiceError('Test Series not found', 404);

    if (series.status !== 'REVIEW_PENDING') {
      throw new TestSeriesServiceError(`Cannot request changes for Test Series in '${series.status}' status`, 400);
    }

    if (!rejectionReason?.trim()) {
      throw new TestSeriesServiceError('Rejection reason is required when requesting changes', 400);
    }

    const updated = await prisma.testSeries.update({
      where: { id },
      data: {
        status: 'CHANGES_REQUESTED',
        rejectionReason: rejectionReason.trim(),
        reviewedByAdminId: adminUserId || null,
      },
    });

    return this.getTestSeriesById(updated.id);
  }

  /**
   * Approve Test Series (REVIEW_PENDING -> APPROVED)
   */
  static async approveTestSeries(id: string, adminUserId?: string) {
    const series = await this.getTestSeriesById(id);

    if (series.status !== 'REVIEW_PENDING') {
      throw new TestSeriesServiceError(`Cannot approve Test Series in '${series.status}' status`, 400);
    }

    if (!series.isReadinessValid) {
      throw new TestSeriesServiceError(
        `Cannot approve Test Series due to readiness errors: ${series.readinessErrors.join('; ')}`,
        400
      );
    }

    const updated = await prisma.testSeries.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedByAdminId: adminUserId || null,
        rejectionReason: null,
      },
    });

    return this.getTestSeriesById(updated.id);
  }

  /**
   * Publish Test Series (APPROVED -> PUBLISHED)
   * PUBLICATION SAFETY RULE:
   * 1. Publishing a Test Series DOES NOT cascade-publish included tests.
   * 2. EVERY included test MUST ALREADY BE PUBLISHED (student-ready).
   * 3. If any included test is DRAFT/REVIEW_PENDING/CHANGES_REQUESTED/ARCHIVED, publication is BLOCKED!
   */
  static async publishTestSeries(id: string, adminUserId?: string) {
    const series = await this.getTestSeriesById(id);

    if (series.status !== 'APPROVED') {
      throw new TestSeriesServiceError(`Cannot publish Test Series in '${series.status}' status. Series must be APPROVED first.`, 400);
    }

    if (!series.isReadinessValid) {
      throw new TestSeriesServiceError(
        `Cannot publish Test Series due to readiness errors: ${series.readinessErrors.join('; ')}`,
        400
      );
    }

    // PUBLICATION SAFETY GATE: Check if ALL included tests are student-ready (PUBLISHED)
    const unreadyTests = series.tests.filter(
      (t: any) => !t.mockTest || (t.mockTest.status !== 'PUBLISHED' && !t.mockTest.isPublished)
    );

    if (unreadyTests.length > 0) {
      const unreadyDescs = unreadyTests.map(
        (t: any) => `'${t.mockTest?.code || t.mockTestId}' (${t.mockTest?.status || 'Unknown'})`
      );
      throw new TestSeriesServiceError(
        `Publication Blocked: ${unreadyTests.length} included test(s) are not Published: ${unreadyDescs.join(', ')}. All included tests must be student-ready (PUBLISHED) before the Test Series can be published. Publishing a Test Series does NOT automatically publish its included tests.`,
        400
      );
    }

    const updated = await prisma.testSeries.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        isPublished: true,
        publishedByAdminId: adminUserId || null,
      },
    });

    return this.getTestSeriesById(updated.id);
  }

  /**
   * Archive Test Series
   */
  static async archiveTestSeries(id: string, adminUserId?: string) {
    const series = await prisma.testSeries.findUnique({ where: { id } });
    if (!series) throw new TestSeriesServiceError('Test Series not found', 404);

    const updated = await prisma.testSeries.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        isPublished: false,
      },
    });

    return this.getTestSeriesById(updated.id);
  }

  /**
   * Reopen Test Series (take back to DRAFT)
   */
  static async reopenTestSeries(id: string, adminUserId?: string) {
    const series = await prisma.testSeries.findUnique({ where: { id } });
    if (!series) throw new TestSeriesServiceError('Test Series not found', 404);

    if (series.status !== 'PUBLISHED' && series.status !== 'APPROVED' && series.status !== 'ARCHIVED') {
      throw new TestSeriesServiceError(`Cannot reopen Test Series in '${series.status}' status.`, 400);
    }

    const updated = await prisma.testSeries.update({
      where: { id },
      data: {
        status: 'DRAFT',
        isPublished: false,
      },
    });

    return this.getTestSeriesById(updated.id);
  }

  /**
   * Delete Test Series
   */
  static async deleteTestSeries(id: string) {
    const series = await prisma.testSeries.findUnique({ where: { id } });
    if (!series) throw new TestSeriesServiceError('Test Series not found', 404);

    if (series.status === 'PUBLISHED') {
      throw new TestSeriesServiceError('Cannot delete a published Test Series. Unpublish (Reopen/Archive) it first.', 400);
    }

    await prisma.testSeries.delete({
      where: { id },
    });

    return { success: true };
  }
}
