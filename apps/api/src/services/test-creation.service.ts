import { prisma, Prisma } from '@study-karnataka/database';
import {
  TestWorkflowStatus,
  TestSelectionMode,
  TestScoringPolicy,
  TestAccessClassification,
  PyqPreference,
  AvailabilityCheckResult,
  ShortageDetail,
} from '@study-karnataka/shared-types';

export class TestCreationServiceError extends Error {
  constructor(message: string, public status: number = 400, public details?: any) {
    super(message);
    this.name = 'TestCreationServiceError';
  }
}

export class TestCreationService {
  /**
   * Read-only preview of the next available test code.
   * MUST NOT mutate database, MUST NOT increment TestSequenceCounter.
   */
  static async getNextTestCodePreview(): Promise<{ code: string; seqNumber: number }> {
    const counter = await prisma.testSequenceCounter.findUnique({
      where: { id: 'singleton' },
    });

    const maxTest = await prisma.mockTest.findFirst({
      where: { seqNumber: { not: null } },
      orderBy: { seqNumber: 'desc' },
      select: { seqNumber: true },
    });

    const currentCounter = counter?.lastValue || 0;
    const maxExistingSeq = maxTest?.seqNumber || 0;
    const nextSeq = Math.max(currentCounter, maxExistingSeq) + 1;

    const code = `TEST_${String(nextSeq).padStart(6, '0')}`;
    return { code, seqNumber: nextSeq };
  }

  /**
   * Atomically allocates the next sequential test code within a Prisma transaction.
   * Called ONLY inside createTest transaction upon successful validation of complete test.
   */
  static async allocateNextTestCode(tx: Prisma.TransactionClient): Promise<{ code: string; seqNumber: number }> {
    const counter = await tx.testSequenceCounter.findUnique({
      where: { id: 'singleton' },
    });

    const maxTest = await tx.mockTest.findFirst({
      where: { seqNumber: { not: null } },
      orderBy: { seqNumber: 'desc' },
      select: { seqNumber: true },
    });

    const currentCounter = counter?.lastValue || 0;
    const maxExistingSeq = maxTest?.seqNumber || 0;
    const nextSeq = Math.max(currentCounter, maxExistingSeq) + 1;

    await tx.testSequenceCounter.upsert({
      where: { id: 'singleton' },
      update: { lastValue: nextSeq },
      create: { id: 'singleton', lastValue: nextSeq },
    });

    const code = `TEST_${String(nextSeq).padStart(6, '0')}`;
    return { code, seqNumber: nextSeq };
  }

  /**
   * Generates sequential test code (TEST_000001, TEST_000002...)
   */
  static async generateNextTestCode(tx?: Prisma.TransactionClient): Promise<{ code: string; seqNumber: number }> {
    if (tx) {
      return this.allocateNextTestCode(tx);
    }
    return this.getNextTestCodePreview();
  }

  /**
   * Helper to evaluate bilingual readiness & approval eligibility for a question
   */
  private static isQuestionEligible(q: any): boolean {
    if (q.status !== 'APPROVED') return false;
    const isEnComplete = Boolean(
      q.questionTextEn?.trim() &&
        q.optionA_En?.trim() &&
        q.optionB_En?.trim() &&
        q.optionC_En?.trim() &&
        q.optionD_En?.trim() &&
        q.explanationEn?.trim()
    );
    const isKnComplete = Boolean(
      q.questionTextKn?.trim() &&
        q.optionA_Kn?.trim() &&
        q.optionB_Kn?.trim() &&
        q.optionC_Kn?.trim() &&
        q.optionD_Kn?.trim() &&
        q.explanationKn?.trim()
    );
    return isEnComplete && isKnComplete;
  }

  /**
   * List tests with pagination, search, and filters
   */
  static async getTests(params?: {
    search?: string;
    examCycleId?: string;
    selectionMode?: TestSelectionMode;
    status?: TestWorkflowStatus;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.min(100, Math.max(1, params?.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.MockTestWhereInput = {};

    if (params?.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { titleEn: { contains: params.search, mode: 'insensitive' } },
        { titleKn: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params?.examCycleId) where.examCycleId = params.examCycleId;
    if (params?.selectionMode) where.selectionMode = params.selectionMode;
    if (params?.status) where.status = params.status;

    const [total, tests] = await Promise.all([
      prisma.mockTest.count({ where }),
      prisma.mockTest.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          examCycle: true,
          examStage: true,
          examPaper: true,
          questions: {
            include: { question: true },
          },
          categoryDistributions: { include: { category: true } },
          subcategoryDistributions: { include: { subcategory: true } },
          difficultyDistributions: true,
        },
      }),
    ]);

    const items = tests.map((t) => this.formatTestResponse(t));

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
   * Get single test by ID
   */
  static async getTestById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    const test = await client.mockTest.findUnique({
      where: { id },
      include: {
        examCycle: true,
        examStage: true,
        examPaper: true,
        questions: {
          orderBy: { displayOrder: 'asc' },
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
        categoryDistributions: { include: { category: true } },
        subcategoryDistributions: { include: { subcategory: true } },
        difficultyDistributions: true,
      },
    });

    if (!test) {
      throw new TestCreationServiceError('Test not found', 404);
    }

    return this.formatTestResponse(test);
  }

  /**
   * Formats database test record into DTO with blueprint validation status
   */
  private static formatTestResponse(t: any) {
    const questions = (t.questions || []).map((q: any) => ({
      id: q.id,
      mockTestId: q.mockTestId,
      questionId: q.questionId,
      displayOrder: q.displayOrder,
      selectionSource: q.selectionSource || 'MANUAL',
      selectedCategoryId: q.selectedCategoryId,
      selectedSubcategoryId: q.selectedSubcategoryId,
      selectedDifficulty: q.selectedDifficulty,
      positiveMarks: Number(q.positiveMarks),
      negativeMarks: Number(q.negativeMarks),
      question: q.question,
      snapshotQuestionEn: q.snapshotQuestionEn,
      snapshotQuestionKn: q.snapshotQuestionKn,
      snapshotOptionA_En: q.snapshotOptionA_En,
      snapshotOptionA_Kn: q.snapshotOptionA_Kn,
      snapshotOptionB_En: q.snapshotOptionB_En,
      snapshotOptionB_Kn: q.snapshotOptionB_Kn,
      snapshotOptionC_En: q.snapshotOptionC_En,
      snapshotOptionC_Kn: q.snapshotOptionC_Kn,
      snapshotOptionD_En: q.snapshotOptionD_En,
      snapshotOptionD_Kn: q.snapshotOptionD_Kn,
      snapshotCorrectOption: q.snapshotCorrectOption,
      snapshotExplanationEn: q.snapshotExplanationEn,
      snapshotExplanationKn: q.snapshotExplanationKn,
      snapshotDifficulty: q.snapshotDifficulty,
      snapshotPositiveMarks: q.snapshotPositiveMarks ? Number(q.snapshotPositiveMarks) : undefined,
      snapshotNegativeMarks: q.snapshotNegativeMarks ? Number(q.snapshotNegativeMarks) : undefined,
    }));

    const categoryDistributions = (t.categoryDistributions || []).map((cd: any) => ({
      categoryId: cd.categoryId,
      categoryCode: cd.category?.code,
      categoryNameEn: cd.category?.nameEn,
      categoryNameKn: cd.category?.nameKn,
      targetCount: cd.targetCount,
    }));

    const subcategoryDistributions = (t.subcategoryDistributions || []).map((sd: any) => ({
      subcategoryId: sd.subcategoryId,
      subcategoryCode: sd.subcategory?.code,
      subcategoryNameEn: sd.subcategory?.nameEn,
      subcategoryNameKn: sd.subcategory?.nameKn,
      categoryId: sd.subcategory?.categoryId,
      targetCount: sd.targetCount,
    }));

    const difficultyDistributions = (t.difficultyDistributions || []).map((dd: any) => ({
      difficulty: dd.difficulty,
      targetCount: dd.targetCount,
    }));

    const selectedCount = questions.length;
    const bilingualEligibleCount = questions.filter((q: any) => this.isQuestionEligible(q.question)).length;

    // Evaluate blueprint validation errors
    const blueprintErrors: string[] = [];
    if (selectedCount !== t.totalQuestions) {
      blueprintErrors.push(`Selected questions (${selectedCount}) does not match Total Questions (${t.totalQuestions})`);
    }
    if (bilingualEligibleCount !== selectedCount) {
      blueprintErrors.push(`${selectedCount - bilingualEligibleCount} question(s) are not Approved & Bilingual Ready`);
    }

    // Category distribution check
    if (t.selectionMode === 'AUTOMATIC' || categoryDistributions.length > 0) {
      const catCounts: Record<string, number> = {};
      questions.forEach((q: any) => {
        const catId = q.selectedCategoryId || q.question?.categoryId;
        if (catId) catCounts[catId] = (catCounts[catId] || 0) + 1;
      });
      categoryDistributions.forEach((cd: any) => {
        const actual = catCounts[cd.categoryId] || 0;
        if (actual !== cd.targetCount) {
          blueprintErrors.push(`Category ${cd.categoryNameEn || cd.categoryCode}: expected ${cd.targetCount}, got ${actual}`);
        }
      });
    }

    // Difficulty distribution check
    if (t.selectionMode === 'AUTOMATIC' || difficultyDistributions.length > 0) {
      const diffCounts: Record<string, number> = {};
      questions.forEach((q: any) => {
        const diff = q.selectedDifficulty || q.question?.difficulty;
        if (diff) diffCounts[diff] = (diffCounts[diff] || 0) + 1;
      });
      difficultyDistributions.forEach((dd: any) => {
        const actual = diffCounts[dd.difficulty] || 0;
        if (actual !== dd.targetCount) {
          blueprintErrors.push(`Difficulty ${dd.difficulty}: expected ${dd.targetCount}, got ${actual}`);
        }
      });
    }

    return {
      id: t.id,
      code: t.code,
      seqNumber: t.seqNumber,
      titleEn: t.titleEn,
      titleKn: t.titleKn,
      descriptionEn: t.descriptionEn,
      descriptionKn: t.descriptionKn,
      instructionsEn: t.instructionsEn,
      instructionsKn: t.instructionsKn,
      examCycleId: t.examCycleId,
      examStageId: t.examStageId,
      examPaperId: t.examPaperId,
      examCycle: t.examCycle,
      examStage: t.examStage,
      examPaper: t.examPaper,
      totalQuestions: t.totalQuestions,
      durationMinutes: t.durationMinutes,
      totalMarks: Number(t.totalMarks),
      passingPercentage: Number(t.passingPercentage),
      accessClassification: t.accessClassification,
      scoringPolicy: t.scoringPolicy,
      positiveMarks: Number(t.positiveMarks),
      negativeMarks: Number(t.negativeMarks),
      selectionMode: t.selectionMode,
      pyqPreference: t.pyqPreference,
      generationSeed: t.generationSeed,
      status: t.status,
      isPublished: t.isPublished,
      createdByAdminId: t.createdByAdminId,
      submittedByAdminId: t.submittedByAdminId,
      reviewedByAdminId: t.reviewedByAdminId,
      approvedByAdminId: t.approvedByAdminId,
      publishedByAdminId: t.publishedByAdminId,
      rejectionReason: t.rejectionReason,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      categoryDistributions,
      subcategoryDistributions,
      difficultyDistributions,
      questions,
      selectedCount,
      bilingualEligibleCount,
      isBlueprintValid: blueprintErrors.length === 0,
      blueprintErrors,
    };
  }

  /**
   * Create a new Test with strict question selection gate.
   * A MockTest record is ONLY created after ALL 15 validation rules pass
   * and EXACTLY totalQuestions unique eligible questions are selected.
   */
  static async createTest(payload: any, adminUserId?: string) {
    const totalQuestions = payload.totalQuestions || 100;

    // 1. Basic Details
    if (!payload.titleEn || payload.titleEn.trim().length < 3) {
      throw new TestCreationServiceError('English title must be at least 3 characters', 400);
    }
    if (!payload.titleKn || payload.titleKn.trim().length < 3) {
      throw new TestCreationServiceError('Kannada title must be at least 3 characters', 400);
    }

    // 2. Exam Hierarchy
    if (payload.examStageId && payload.examCycleId) {
      const stage = await prisma.examStage.findUnique({
        where: { id: payload.examStageId },
        include: { examPattern: true },
      });
      if (!stage || stage.examPattern.examCycleId !== payload.examCycleId) {
        throw new TestCreationServiceError('Selected Exam Stage does not belong to the selected Exam Cycle', 400);
      }
    }
    if (payload.examPaperId && payload.examStageId) {
      const paper = await prisma.examPaper.findUnique({ where: { id: payload.examPaperId } });
      if (!paper || paper.examStageId !== payload.examStageId) {
        throw new TestCreationServiceError('Selected Exam Paper does not belong to the selected Exam Stage', 400);
      }
    }

    // 3. Duration & 4. Total Questions & 5. Scoring & 6. Selection Mode
    if (payload.durationMinutes && payload.durationMinutes < 1) {
      throw new TestCreationServiceError('Duration must be at least 1 minute', 400);
    }

    const catDists = Array.isArray(payload.categoryDistributions) ? payload.categoryDistributions : [];
    const subcatDists = Array.isArray(payload.subcategoryDistributions) ? payload.subcategoryDistributions : [];
    const diffDists = Array.isArray(payload.difficultyDistributions) ? payload.difficultyDistributions : [];

    // 11. Category Distribution total check
    if (catDists.length > 0) {
      const catSum = catDists.reduce((acc: number, cd: any) => acc + (cd.targetCount || 0), 0);
      if (catSum !== totalQuestions) {
        throw new TestCreationServiceError(`Category distribution total (${catSum}) must equal Total Questions (${totalQuestions}).`, 400);
      }
    }

    // 13. Difficulty Distribution total check
    if (diffDists.length > 0) {
      const diffSum = diffDists.reduce((acc: number, dd: any) => acc + (dd.targetCount || 0), 0);
      if (diffSum !== totalQuestions) {
        throw new TestCreationServiceError(`Difficulty distribution total (${diffSum}) must equal Total Questions (${totalQuestions}).`, 400);
      }
    }

    // 12. Subcategory Distribution total check against parent Category allocation
    if (subcatDists.length > 0 && catDists.length > 0) {
      const subcatsInDb = await prisma.academicSubcategory.findMany({
        where: { id: { in: subcatDists.map((sd: any) => sd.subcategoryId).filter(Boolean) } },
      });

      const subcatSumByCat: Record<string, number> = {};
      subcatDists.forEach((sd: any) => {
        const sub = subcatsInDb.find((s) => s.id === sd.subcategoryId);
        if (sub && sd.targetCount > 0) {
          subcatSumByCat[sub.categoryId] = (subcatSumByCat[sub.categoryId] || 0) + sd.targetCount;
        }
      });

      for (const cd of catDists) {
        const subSum = subcatSumByCat[cd.categoryId];
        if (subSum !== undefined && subSum !== cd.targetCount) {
          const cat = await prisma.academicCategory.findUnique({ where: { id: cd.categoryId } });
          throw new TestCreationServiceError(
            `Subcategory allocation sum (${subSum}) for category '${cat?.nameEn || cd.categoryId}' must equal parent Category target count (${cd.targetCount}).`,
            400
          );
        }
      }
    }

    // Resolve Final Selected Questions (Manual vs Automatic)
    let selectedMcqs: any[] = [];
    const selectionMode = payload.selectionMode || 'MANUAL';

    if (selectionMode === 'MANUAL') {
      const rawQuestionIds: string[] = Array.isArray(payload.questionIds) ? payload.questionIds : [];

      // Rule 9: Block over-selection (adding 101st question)
      if (rawQuestionIds.length > totalQuestions) {
        throw new TestCreationServiceError(`Question limit reached. This Test requires exactly ${totalQuestions} questions. Current selection has ${rawQuestionIds.length}.`, 400);
      }

      // Rule 12: Duplicate prevention
      const uniqueIds: string[] = Array.from(new Set(rawQuestionIds));
      if (uniqueIds.length !== rawQuestionIds.length) {
        throw new TestCreationServiceError(`Manual selection contains duplicate questions. Exactly ${totalQuestions} unique questions are required.`, 400);
      }

      // Rule 8: Check exact question count before database creation
      if (uniqueIds.length < totalQuestions) {
        const shortage = totalQuestions - uniqueIds.length;
        const msg = shortage === 1 ? '1 more question required.' : `${shortage} more questions required.`;
        throw new TestCreationServiceError(`Exact question count requirement failed. ${msg} Required: ${totalQuestions}, Valid Selected: ${uniqueIds.length}.`, 400);
      }

      // Rule 10: Manual Question Eligibility Check
      const fetchedMcqs = await prisma.mcqQuestion.findMany({
        where: { id: { in: uniqueIds } },
        include: { category: true, subcategory: true },
      });

      const eligibleMcqs = fetchedMcqs.filter((q) => this.isQuestionEligible(q));
      if (eligibleMcqs.length < totalQuestions) {
        const shortage = totalQuestions - eligibleMcqs.length;
        const msg = shortage === 1 ? '1 more question required.' : `${shortage} more questions required.`;
        throw new TestCreationServiceError(`Manual selection contains ineligible questions. ${msg} Required: ${totalQuestions}, Valid Eligible Selected: ${eligibleMcqs.length}.`, 400);
      }

      // Rule 14: PYQ Preference Check
      if (payload.pyqPreference === 'EXCLUDE_PYQ') {
        const pyqCount = eligibleMcqs.filter((q) => q.isPyq).length;
        if (pyqCount > 0) {
          throw new TestCreationServiceError(`Selected questions violate PYQ preference: EXCLUDE_PYQ (${pyqCount} PYQ questions found).`, 400);
        }
      } else if (payload.pyqPreference === 'PYQ_ONLY') {
        const nonPyqCount = eligibleMcqs.filter((q) => !q.isPyq).length;
        if (nonPyqCount > 0) {
          throw new TestCreationServiceError(`Selected questions violate PYQ preference: PYQ_ONLY (${nonPyqCount} non-PYQ questions found).`, 400);
        }
      }

      // Rule 11 & 15: Blueprint validation against selected questions
      if (catDists.length > 0) {
        for (const cd of catDists) {
          if (cd.categoryId && cd.targetCount > 0) {
            const countInCat = eligibleMcqs.filter((q) => q.categoryId === cd.categoryId).length;
            if (countInCat !== cd.targetCount) {
              throw new TestCreationServiceError(`Selected questions do not match Category Distribution for category '${cd.categoryId}'. Expected: ${cd.targetCount}, Selected: ${countInCat}.`, 400);
            }
          }
        }
      }

      if (diffDists.length > 0) {
        for (const dd of diffDists) {
          if (dd.difficulty && dd.targetCount > 0) {
            const countInDiff = eligibleMcqs.filter((q) => q.difficulty === dd.difficulty).length;
            if (countInDiff !== dd.targetCount) {
              throw new TestCreationServiceError(`Selected questions do not match Difficulty Distribution for difficulty '${dd.difficulty}'. Expected: ${dd.targetCount}, Selected: ${countInDiff}.`, 400);
            }
          }
        }
      }

      selectedMcqs = eligibleMcqs;

    } else if (selectionMode === 'AUTOMATIC') {
      // Run automatic selection solver
      const autoResult = await this.generateAutomaticSelectionInternal({
        totalQuestions,
        categoryDistributions: catDists,
        subcategoryDistributions: subcatDists,
        difficultyDistributions: diffDists,
        pyqPreference: payload.pyqPreference || 'ANY',
        seed: payload.generationSeed,
        examCycleId: payload.examCycleId,
      });

      if (!autoResult.success || autoResult.selectedQuestions.length !== totalQuestions) {
        const selectedCount = autoResult.selectedQuestions.length;
        const shortage = totalQuestions - selectedCount;
        const shortageMsg = autoResult.shortageTrace && autoResult.shortageTrace.length > 0
          ? `\nBlocking shortages:\n${autoResult.shortageTrace.map((s: string) => `• ${s}`).join('\n')}`
          : '';

        throw new TestCreationServiceError(`Unable to complete automatic question selection. Required: ${totalQuestions}, Maximum valid selection: ${selectedCount}. Shortage: ${shortage}.${shortageMsg}`, 400);
      }

      selectedMcqs = autoResult.selectedQuestions;
    }

    // FINAL SERVER-SIDE ASSERTION: Must have EXACTLY totalQuestions unique eligible MCQs
    const uniqueFinalIds = Array.from(new Set(selectedMcqs.map((q) => q.id)));
    if (selectedMcqs.length !== totalQuestions || uniqueFinalIds.length !== totalQuestions) {
      throw new TestCreationServiceError(`Exact question count verification failed. Required: ${totalQuestions}, Unique Eligible Selected: ${uniqueFinalIds.length}.`, 400);
    }

    // Transactional Persistence: Sequence allocation + MockTest + MockTestQuestion + Distributions
    return prisma.$transaction(async (tx) => {
      const { code, seqNumber } = await this.allocateNextTestCode(tx);

      const positiveMarks = payload.positiveMarks ?? 1.0;
      const negativeMarks = payload.negativeMarks ?? 0.25;
      const totalMarks = payload.scoringPolicy === 'MCQ_DEFAULT' ? 0 : totalQuestions * positiveMarks;

      const test = await tx.mockTest.create({
        data: {
          code,
          seqNumber,
          titleEn: payload.titleEn,
          titleKn: payload.titleKn,
          descriptionEn: payload.descriptionEn || null,
          descriptionKn: payload.descriptionKn || null,
          instructionsEn: payload.instructionsEn || null,
          instructionsKn: payload.instructionsKn || null,
          examCycleId: payload.examCycleId || null,
          examStageId: payload.examStageId || null,
          examPaperId: payload.examPaperId || null,
          totalQuestions,
          durationMinutes: payload.durationMinutes || 60,
          totalMarks,
          passingPercentage: payload.passingPercentage ?? 40.0,
          accessClassification: payload.accessClassification || 'FREE',
          scoringPolicy: payload.scoringPolicy || 'TEST_DEFAULT',
          positiveMarks,
          negativeMarks,
          selectionMode,
          pyqPreference: payload.pyqPreference || 'ANY',
          generationSeed: payload.generationSeed || null,
          status: 'DRAFT',
          isPublished: false,
          createdByAdminId: adminUserId || null,
        },
      });

      // Save category distributions
      for (const cd of catDists) {
        if (cd.categoryId && cd.targetCount > 0) {
          await tx.testCategoryDistribution.create({
            data: { mockTestId: test.id, categoryId: cd.categoryId, targetCount: cd.targetCount },
          });
        }
      }

      // Save subcategory distributions
      for (const sd of subcatDists) {
        if (sd.subcategoryId && sd.targetCount > 0) {
          await tx.testSubcategoryDistribution.create({
            data: { mockTestId: test.id, subcategoryId: sd.subcategoryId, targetCount: sd.targetCount },
          });
        }
      }

      // Save difficulty distributions
      for (const dd of diffDists) {
        if (dd.difficulty && dd.targetCount > 0) {
          await tx.testDifficultyDistribution.create({
            data: { mockTestId: test.id, difficulty: dd.difficulty, targetCount: dd.targetCount },
          });
        }
      }

      // Save MockTestQuestion rows for all totalQuestions questions
      for (let i = 0; i < selectedMcqs.length; i++) {
        const mcq = selectedMcqs[i];
        await tx.mockTestQuestion.create({
          data: {
            mockTestId: test.id,
            questionId: mcq.id,
            displayOrder: i + 1,
            selectionSource: selectionMode,
            selectedCategoryId: mcq.categoryId || null,
            selectedSubcategoryId: mcq.subcategoryId || null,
            selectedDifficulty: mcq.difficulty || null,
            positiveMarks,
            negativeMarks,
          },
        });
      }

      // POST-CREATION INTEGRITY ASSERTION
      const persistedCount = await tx.mockTestQuestion.count({ where: { mockTestId: test.id } });
      if (persistedCount !== totalQuestions) {
        throw new Error(`Transactional Integrity Failure: Persisted question count (${persistedCount}) does not equal configured totalQuestions (${totalQuestions}). Transaction rolling back.`);
      }

      return this.getTestById(test.id, tx);
    });
  }

  /**
   * Update Test configuration (Editable in DRAFT and CHANGES_REQUESTED)
   */
  static async updateTest(id: string, payload: any, adminUserId?: string) {
    const existing = await prisma.mockTest.findUnique({ where: { id } });
    if (!existing) throw new TestCreationServiceError('Test not found', 404);

    if (existing.status !== 'DRAFT' && existing.status !== 'CHANGES_REQUESTED') {
      throw new TestCreationServiceError(`Cannot edit Test in '${existing.status}' status. Only DRAFT or CHANGES_REQUESTED tests are editable.`, 400);
    }

    return prisma.$transaction(async (tx) => {
      const positiveMarks = payload.positiveMarks ?? Number(existing.positiveMarks);
      const totalQuestions = payload.totalQuestions ?? existing.totalQuestions;
      const totalMarks = payload.scoringPolicy === 'MCQ_DEFAULT' ? 0 : totalQuestions * positiveMarks;

      await tx.mockTest.update({
        where: { id },
        data: {
          titleEn: payload.titleEn ?? existing.titleEn,
          titleKn: payload.titleKn ?? existing.titleKn,
          descriptionEn: payload.descriptionEn !== undefined ? payload.descriptionEn : existing.descriptionEn,
          descriptionKn: payload.descriptionKn !== undefined ? payload.descriptionKn : existing.descriptionKn,
          instructionsEn: payload.instructionsEn !== undefined ? payload.instructionsEn : existing.instructionsEn,
          instructionsKn: payload.instructionsKn !== undefined ? payload.instructionsKn : existing.instructionsKn,
          examCycleId: payload.examCycleId !== undefined ? payload.examCycleId : existing.examCycleId,
          examStageId: payload.examStageId !== undefined ? payload.examStageId : existing.examStageId,
          examPaperId: payload.examPaperId !== undefined ? payload.examPaperId : existing.examPaperId,
          totalQuestions,
          durationMinutes: payload.durationMinutes ?? existing.durationMinutes,
          totalMarks,
          passingPercentage: payload.passingPercentage ?? existing.passingPercentage,
          accessClassification: payload.accessClassification ?? existing.accessClassification,
          scoringPolicy: payload.scoringPolicy ?? existing.scoringPolicy,
          positiveMarks,
          negativeMarks: payload.negativeMarks ?? Number(existing.negativeMarks),
          selectionMode: payload.selectionMode ?? existing.selectionMode,
          pyqPreference: payload.pyqPreference ?? existing.pyqPreference,
        },
      });

      // Update distributions if supplied
      if (Array.isArray(payload.categoryDistributions)) {
        await tx.testCategoryDistribution.deleteMany({ where: { mockTestId: id } });
        for (const cd of payload.categoryDistributions) {
          if (cd.categoryId && cd.targetCount > 0) {
            await tx.testCategoryDistribution.create({
              data: { mockTestId: id, categoryId: cd.categoryId, targetCount: cd.targetCount },
            });
          }
        }
      }

      if (Array.isArray(payload.subcategoryDistributions)) {
        await tx.testSubcategoryDistribution.deleteMany({ where: { mockTestId: id } });
        for (const sd of payload.subcategoryDistributions) {
          if (sd.subcategoryId && sd.targetCount > 0) {
            await tx.testSubcategoryDistribution.create({
              data: { mockTestId: id, subcategoryId: sd.subcategoryId, targetCount: sd.targetCount },
            });
          }
        }
      }

      if (Array.isArray(payload.difficultyDistributions)) {
        await tx.testDifficultyDistribution.deleteMany({ where: { mockTestId: id } });
        for (const dd of payload.difficultyDistributions) {
          if (dd.difficulty && dd.targetCount > 0) {
            await tx.testDifficultyDistribution.create({
              data: { mockTestId: id, difficulty: dd.difficulty, targetCount: dd.targetCount },
            });
          }
        }
      }

      return this.getTestById(id, tx);
    });
  }

  /**
   * Search eligible questions for Manual Selection
   */
  static async searchEligibleQuestions(params: {
    search?: string;
    categoryId?: string;
    subcategoryId?: string;
    topicId?: string;
    knowledgeAreaId?: string;
    difficulty?: string;
    isPyq?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.McqQuestionWhereInput = {
      status: 'APPROVED',
      questionTextEn: { not: '' },
      questionTextKn: { not: '' },
      optionA_En: { not: '' },
      optionA_Kn: { not: '' },
      optionB_En: { not: '' },
      optionB_Kn: { not: '' },
      optionC_En: { not: '' },
      optionC_Kn: { not: '' },
      optionD_En: { not: '' },
      optionD_Kn: { not: '' },
      explanationEn: { not: '' },
      explanationKn: { not: '' },
    };

    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { questionTextEn: { contains: params.search, mode: 'insensitive' } },
        { questionTextKn: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.subcategoryId) where.subcategoryId = params.subcategoryId;
    if (params.topicId) where.topicId = params.topicId;
    if (params.knowledgeAreaId) where.knowledgeAreaId = params.knowledgeAreaId;
    if (params.difficulty) where.difficulty = params.difficulty as any;
    if (params.isPyq !== undefined) where.isPyq = params.isPyq;

    const [total, questions] = await Promise.all([
      prisma.mcqQuestion.count({ where }),
      prisma.mcqQuestion.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { code: 'asc' },
        include: {
          category: true,
          subcategory: true,
          topic: true,
          knowledgeArea: true,
        },
      }),
    ]);

    return {
      items: questions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Save Manual Question Selection
   */
  static async saveManualSelection(testId: string, questionIds: string[]) {
    const test = await prisma.mockTest.findUnique({ where: { id: testId } });
    if (!test) throw new TestCreationServiceError('Test not found', 404);

    if (test.status !== 'DRAFT' && test.status !== 'CHANGES_REQUESTED') {
      throw new TestCreationServiceError(`Cannot edit question selection for Test in '${test.status}' status`, 400);
    }

    if (questionIds.length > test.totalQuestions) {
      throw new TestCreationServiceError(
        `Selected question count (${questionIds.length}) cannot exceed Total Questions (${test.totalQuestions})`,
        400
      );
    }

    // Check duplicate IDs in payload
    const uniqueIds = new Set(questionIds);
    if (uniqueIds.size !== questionIds.length) {
      throw new TestCreationServiceError('Duplicate questions are not allowed in the same Test', 400);
    }

    // Verify eligibility of all selected questions
    const questions = await prisma.mcqQuestion.findMany({
      where: { id: { in: questionIds } },
    });

    if (questions.length !== questionIds.length) {
      throw new TestCreationServiceError('One or more selected question IDs do not exist', 400);
    }

    for (const q of questions) {
      if (!this.isQuestionEligible(q)) {
        throw new TestCreationServiceError(
          `Question ${q.code} is not eligible. Questions must be APPROVED and BILINGUAL_READY.`,
          400
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      // Clear existing selected questions
      await tx.mockTestQuestion.deleteMany({ where: { mockTestId: testId } });

      // Insert selected questions in order
      for (let i = 0; i < questionIds.length; i++) {
        const qId = questionIds[i];
        const q = questions.find((item) => item.id === qId)!;
        await tx.mockTestQuestion.create({
          data: {
            mockTestId: testId,
            questionId: qId,
            displayOrder: i + 1,
            selectionSource: 'MANUAL',
            selectedCategoryId: q.categoryId || null,
            selectedSubcategoryId: q.subcategoryId || null,
            selectedDifficulty: q.difficulty,
            positiveMarks: test.scoringPolicy === 'MCQ_DEFAULT' ? q.positiveMarks : test.positiveMarks,
            negativeMarks: test.scoringPolicy === 'MCQ_DEFAULT' ? q.negativeMarks : test.negativeMarks,
          },
        });
      }

      // Re-calculate total marks
      const updatedQuestions = await tx.mockTestQuestion.findMany({ where: { mockTestId: testId } });
      const computedTotalMarks = updatedQuestions.reduce((acc, curr) => acc + Number(curr.positiveMarks), 0);
      await tx.mockTest.update({
        where: { id: testId },
        data: { totalMarks: computedTotalMarks },
      });

      return this.getTestById(testId, tx);
    });
  }

  /**
   * Availability Check for Automatic Blueprint
   */
  static async checkAvailability(params: {
    totalQuestions: number;
    pyqPreference?: PyqPreference;
    categoryDistributions: { categoryId: string; targetCount: number }[];
    subcategoryDistributions?: { subcategoryId: string; targetCount: number }[];
    difficultyDistributions: { difficulty: 'EASY' | 'MEDIUM' | 'HARD'; targetCount: number }[];
  }): Promise<AvailabilityCheckResult> {
    const baseWhere: Prisma.McqQuestionWhereInput = {
      status: 'APPROVED',
      questionTextEn: { not: '' },
      questionTextKn: { not: '' },
      optionA_En: { not: '' },
      optionA_Kn: { not: '' },
      optionB_En: { not: '' },
      optionB_Kn: { not: '' },
      optionC_En: { not: '' },
      optionC_Kn: { not: '' },
      optionD_En: { not: '' },
      optionD_Kn: { not: '' },
    };

    if (params.pyqPreference === 'EXCLUDE_PYQ') baseWhere.isPyq = false;
    if (params.pyqPreference === 'PYQ_ONLY') baseWhere.isPyq = true;

    // Fetch all eligible questions
    const eligibleQuestions = await prisma.mcqQuestion.findMany({
      where: baseWhere,
      select: {
        id: true,
        code: true,
        categoryId: true,
        subcategoryId: true,
        difficulty: true,
      },
    });

    const categoryStatus: any[] = [];
    const shortages: ShortageDetail[] = [];
    const correctiveSuggestions: string[] = [];

    // Category availability check
    for (const cd of params.categoryDistributions) {
      const cat = await prisma.academicCategory.findUnique({ where: { id: cd.categoryId } });
      const available = eligibleQuestions.filter((q) => q.categoryId === cd.categoryId).length;
      const isSufficient = available >= cd.targetCount;
      categoryStatus.push({
        categoryId: cd.categoryId,
        code: cat?.code || cd.categoryId,
        nameEn: cat?.nameEn || cd.categoryId,
        required: cd.targetCount,
        available,
        isSufficient,
      });

      if (!isSufficient) {
        shortages.push({
          dimension: 'CATEGORY',
          identifier: cd.categoryId,
          nameEn: cat?.nameEn || cd.categoryId,
          required: cd.targetCount,
          available,
          shortage: cd.targetCount - available,
        });
      }
    }

    // Difficulty availability check
    const difficultyStatus: any[] = [];
    for (const dd of params.difficultyDistributions) {
      const available = eligibleQuestions.filter((q) => q.difficulty === dd.difficulty).length;
      const isSufficient = available >= dd.targetCount;
      difficultyStatus.push({
        difficulty: dd.difficulty,
        required: dd.targetCount,
        available,
        isSufficient,
      });

      if (!isSufficient) {
        shortages.push({
          dimension: 'DIFFICULTY',
          identifier: dd.difficulty,
          nameEn: dd.difficulty,
          required: dd.targetCount,
          available,
          shortage: dd.targetCount - available,
        });
      }
    }

    // Joint Intersection Availability Check
    for (const cd of params.categoryDistributions) {
      for (const dd of params.difficultyDistributions) {
        const intersectionCount = eligibleQuestions.filter(
          (q) => q.categoryId === cd.categoryId && q.difficulty === dd.difficulty
        ).length;

        // If total required in this category is > available across difficulties, track
        if (cd.targetCount > 0 && dd.targetCount > 0 && intersectionCount === 0 && cd.targetCount > 2) {
          // Flag severe shortage in intersection if zero available
          const cat = categoryStatus.find((c) => c.categoryId === cd.categoryId);
          correctiveSuggestions.push(
            `No ${dd.difficulty} questions available for category ${cat?.nameEn || cd.categoryId}. Add more questions to Question Library.`
          );
        }
      }
    }

    const totalAvailableEligiblePool = eligibleQuestions.length;
    const isFeasible = shortages.length === 0 && totalAvailableEligiblePool >= params.totalQuestions;

    if (totalAvailableEligiblePool < params.totalQuestions) {
      shortages.push({
        dimension: 'INTERSECTION',
        identifier: 'GLOBAL_POOL',
        nameEn: 'Global Eligible Question Pool',
        required: params.totalQuestions,
        available: totalAvailableEligiblePool,
        shortage: params.totalQuestions - totalAvailableEligiblePool,
      });
      correctiveSuggestions.push(`Total eligible question pool (${totalAvailableEligiblePool}) is smaller than Total Questions required (${params.totalQuestions}).`);
    }

    return {
      isFeasible,
      totalQuestions: params.totalQuestions,
      totalAvailableEligiblePool,
      categoryStatus,
      difficultyStatus,
      shortages,
      correctiveSuggestions,
    };
  }

  /**
   * Solves joint matrix allocation (Category targets x Difficulty targets) using DFS backtracking
   */
  private static solveMatrixAllocation(
    cats: { id: string; target: number }[],
    diffs: { id: string; target: number }[],
    caps: Record<string, Record<string, number>>
  ) {
    const catIds = cats.map((c) => c.id);
    const diffIds = diffs.map((d) => d.id);

    const catRem = Object.fromEntries(cats.map((c) => [c.id, c.target]));
    const diffRem = Object.fromEntries(diffs.map((d) => [d.id, d.target]));

    const result: Record<string, Record<string, number>> = {};
    for (const c of catIds) {
      result[c] = {};
      for (const d of diffIds) result[c][d] = 0;
    }

    function dfs(catIdx: number, diffIdx: number): boolean {
      if (catIdx === catIds.length) {
        return diffIds.every((d) => diffRem[d] === 0);
      }

      const cId = catIds[catIdx];
      const dId = diffIds[diffIdx];
      const nextCatIdx = diffIdx === diffIds.length - 1 ? catIdx + 1 : catIdx;
      const nextDiffIdx = diffIdx === diffIds.length - 1 ? 0 : diffIdx + 1;

      const maxCap = Math.min(caps[cId]?.[dId] ?? 0, catRem[cId], diffRem[dId]);

      for (let amount = maxCap; amount >= 0; amount--) {
        if (diffIdx === diffIds.length - 1 && amount !== catRem[cId]) continue;
        if (catIdx === catIds.length - 1 && amount !== diffRem[dId]) continue;

        result[cId][dId] = amount;
        catRem[cId] -= amount;
        diffRem[dId] -= amount;

        if (dfs(nextCatIdx, nextDiffIdx)) return true;

        catRem[cId] += amount;
        diffRem[dId] += amount;
        result[cId][dId] = 0;
      }

      return false;
    }

    const success = dfs(0, 0);
    return { success, result };
  }

  /**
   * Helper solver function for Automatic Question Selection Engine.
   */
  private static async generateAutomaticSelectionInternal(params: {
    totalQuestions: number;
    categoryDistributions: { categoryId: string; targetCount: number }[];
    subcategoryDistributions?: { subcategoryId: string; targetCount: number }[];
    difficultyDistributions: { difficulty: 'EASY' | 'MEDIUM' | 'HARD'; targetCount: number }[];
    pyqPreference?: PyqPreference;
    seed?: string;
    examCycleId?: string | null;
  }): Promise<{ success: boolean; selectedQuestions: any[]; shortageTrace?: string[] }> {
    const { totalQuestions, categoryDistributions, difficultyDistributions, pyqPreference } = params;

    // Run availability check first
    const avail = await this.checkAvailability({
      totalQuestions,
      pyqPreference: pyqPreference || 'ANY',
      categoryDistributions: categoryDistributions.map((c) => ({ categoryId: c.categoryId, targetCount: c.targetCount })),
      subcategoryDistributions: (params.subcategoryDistributions || []).map((s) => ({ subcategoryId: s.subcategoryId, targetCount: s.targetCount })),
      difficultyDistributions: difficultyDistributions.map((d) => ({ difficulty: d.difficulty, targetCount: d.targetCount })),
    });

    if (!avail.isFeasible) {
      const shortageTrace = avail.shortages.map(
        (s) => `${s.nameEn} (${s.dimension}): Required ${s.required}, Available ${s.available} (Shortage: ${s.shortage})`
      );
      return { success: false, selectedQuestions: [], shortageTrace };
    }

    const targetCatIds = categoryDistributions.filter((c) => c.targetCount > 0).map((c) => c.categoryId);
    const baseWhere: Prisma.McqQuestionWhereInput = {
      status: 'APPROVED',
      questionTextEn: { not: '' },
      questionTextKn: { not: '' },
      optionA_En: { not: '' },
      optionA_Kn: { not: '' },
      optionB_En: { not: '' },
      optionB_Kn: { not: '' },
      optionC_En: { not: '' },
      optionC_Kn: { not: '' },
      optionD_En: { not: '' },
      optionD_Kn: { not: '' },
    };

    if (targetCatIds.length > 0) {
      baseWhere.categoryId = { in: targetCatIds };
    }
    if (pyqPreference === 'EXCLUDE_PYQ') baseWhere.isPyq = false;
    if (pyqPreference === 'PYQ_ONLY') baseWhere.isPyq = true;

    const eligiblePool = await prisma.mcqQuestion.findMany({
      where: baseWhere,
      include: { category: true, subcategory: true },
      orderBy: { code: 'asc' },
    });

    const eligibleFiltered = eligiblePool.filter((q) => this.isQuestionEligible(q));

    // Build capacity matrix and buckets
    const caps: Record<string, Record<string, number>> = {};
    const buckets: Record<string, typeof eligibleFiltered> = {};
    for (const q of eligibleFiltered) {
      if (!q.categoryId) continue;
      const cId = q.categoryId;
      const dId = q.difficulty;
      const key = `${cId}|${q.subcategoryId || ''}|${dId}`;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(q);

      if (!caps[cId]) caps[cId] = {};
      caps[cId][dId] = (caps[cId][dId] || 0) + 1;
    }

    const catTargets = categoryDistributions.filter((c) => c.targetCount > 0).map((c) => ({ id: c.categoryId, target: c.targetCount }));
    const diffTargets = difficultyDistributions.filter((d) => d.targetCount > 0).map((d) => ({ id: d.difficulty, target: d.targetCount }));

    const matrixSolution = this.solveMatrixAllocation(catTargets, diffTargets, caps);

    if (!matrixSolution.success) {
      return {
        success: false,
        selectedQuestions: [],
        shortageTrace: ['Joint Category and Difficulty allocation solver could not satisfy constraints simultaneously with available eligible MCQs.'],
      };
    }

    const selectedQuestions: any[] = [];
    const usedQuestionIds = new Set<string>();

    for (const cId of Object.keys(matrixSolution.result)) {
      for (const dId of Object.keys(matrixSolution.result[cId])) {
        const needed = matrixSolution.result[cId][dId];
        if (needed <= 0) continue;

        const matchingKeys = Object.keys(buckets).filter((k) => k.startsWith(`${cId}|`) && k.endsWith(`|${dId}`));
        let count = 0;

        for (const key of matchingKeys) {
          const pool = buckets[key].filter((q) => !usedQuestionIds.has(q.id));
          for (const q of pool) {
            if (count < needed) {
              selectedQuestions.push(q);
              usedQuestionIds.add(q.id);
              count++;
            }
          }
        }
      }
    }

    if (selectedQuestions.length !== totalQuestions) {
      return {
        success: false,
        selectedQuestions,
        shortageTrace: [`Selected ${selectedQuestions.length} questions out of ${totalQuestions} required. Shortage: ${totalQuestions - selectedQuestions.length}`],
      };
    }

    return {
      success: true,
      selectedQuestions,
    };
  }

  /**
   * Joint Constraint Solver for Automatic Question Selection
   */
  static async generateAutomaticSelection(testId: string, seed?: string) {
    const test = await prisma.mockTest.findUnique({
      where: { id: testId },
      include: {
        categoryDistributions: { include: { category: true } },
        subcategoryDistributions: { include: { subcategory: true } },
        difficultyDistributions: true,
      },
    });

    if (!test) throw new TestCreationServiceError('Test not found', 404);

    if (test.status !== 'DRAFT' && test.status !== 'CHANGES_REQUESTED') {
      throw new TestCreationServiceError(`Cannot generate selection for Test in '${test.status}' status`, 400);
    }

    // Validate blueprint completeness
    const catTotal = test.categoryDistributions.reduce((acc, curr) => acc + curr.targetCount, 0);
    if (catTotal !== test.totalQuestions) {
      throw new TestCreationServiceError(
        `Category allocation sum (${catTotal}) must equal Total Questions (${test.totalQuestions})`,
        400
      );
    }

    const diffTotal = test.difficultyDistributions.reduce((acc, curr) => acc + curr.targetCount, 0);
    if (diffTotal !== test.totalQuestions) {
      throw new TestCreationServiceError(
        `Difficulty allocation sum (${diffTotal}) must equal Total Questions (${test.totalQuestions})`,
        400
      );
    }

    const autoResult = await this.generateAutomaticSelectionInternal({
      totalQuestions: test.totalQuestions,
      categoryDistributions: test.categoryDistributions.map((c) => ({ categoryId: c.categoryId, targetCount: c.targetCount })),
      subcategoryDistributions: test.subcategoryDistributions.map((s) => ({ subcategoryId: s.subcategoryId, targetCount: s.targetCount })),
      difficultyDistributions: test.difficultyDistributions.map((d) => ({ difficulty: d.difficulty, targetCount: d.targetCount })),
      pyqPreference: test.pyqPreference,
      seed: seed || test.generationSeed || undefined,
      examCycleId: test.examCycleId,
    });

    if (!autoResult.success || autoResult.selectedQuestions.length !== test.totalQuestions) {
      const shortageMsg = autoResult.shortageTrace && autoResult.shortageTrace.length > 0
        ? autoResult.shortageTrace.join('; ')
        : 'Could not fulfill required question count';
      throw new TestCreationServiceError(`Unable to generate test. Shortages detected: ${shortageMsg}`, 400, { shortages: autoResult.shortageTrace });
    }

    const selectedQuestions = autoResult.selectedQuestions;
    const seedString = seed || `GEN_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    return prisma.$transaction(async (tx) => {
      await tx.mockTestQuestion.deleteMany({ where: { mockTestId: testId } });

      for (let i = 0; i < selectedQuestions.length; i++) {
        const q = selectedQuestions[i];
        await tx.mockTestQuestion.create({
          data: {
            mockTestId: testId,
            questionId: q.id,
            displayOrder: i + 1,
            selectionSource: 'AUTOMATIC',
            selectedCategoryId: q.categoryId,
            selectedSubcategoryId: q.subcategoryId,
            selectedDifficulty: q.difficulty,
            positiveMarks: test.scoringPolicy === 'MCQ_DEFAULT' ? q.positiveMarks : test.positiveMarks,
            negativeMarks: test.scoringPolicy === 'MCQ_DEFAULT' ? q.negativeMarks : test.negativeMarks,
          },
        });
      }

      const totalMarks = selectedQuestions.reduce((acc, q) => {
        const pos = test.scoringPolicy === 'MCQ_DEFAULT' ? Number(q.positiveMarks) : Number(test.positiveMarks);
        return acc + pos;
      }, 0);

      await tx.mockTest.update({
        where: { id: testId },
        data: {
          generationSeed: seedString,
          totalMarks,
          selectionMode: 'AUTOMATIC',
        },
      });

      return this.getTestById(testId, tx);
    });
  }

  /**
   * Replace single question in an auto-generated or manual test while preserving constraints
   */
  static async replaceQuestion(testId: string, oldQuestionId: string, newQuestionId: string) {
    const test = await prisma.mockTest.findUnique({
      where: { id: testId },
      include: { questions: { include: { question: true } } },
    });

    if (!test) throw new TestCreationServiceError('Test not found', 404);

    if (test.status !== 'DRAFT' && test.status !== 'CHANGES_REQUESTED') {
      throw new TestCreationServiceError(`Cannot replace question for Test in '${test.status}' status`, 400);
    }

    const existingTestQuestion = test.questions.find((q) => q.questionId === oldQuestionId);
    if (!existingTestQuestion) {
      throw new TestCreationServiceError('Old Question ID is not part of this Test', 400);
    }

    if (oldQuestionId === newQuestionId) {
      throw new TestCreationServiceError('New Question ID must be different from Old Question ID', 400);
    }

    // Check if newQuestionId is already in test
    if (test.questions.some((q) => q.questionId === newQuestionId)) {
      throw new TestCreationServiceError('New Question is already included in this Test (Duplicates not allowed)', 400);
    }

    // Check new question eligibility
    const newQuestion = await prisma.mcqQuestion.findUnique({ where: { id: newQuestionId } });
    if (!newQuestion) throw new TestCreationServiceError('New Question not found', 404);

    if (!this.isQuestionEligible(newQuestion)) {
      throw new TestCreationServiceError('New Question is not Approved and Bilingual Ready', 400);
    }

    // Verify replacement bucket constraints (Category and Difficulty must match)
    const targetCat = existingTestQuestion.selectedCategoryId || existingTestQuestion.question?.categoryId;
    const targetDiff = existingTestQuestion.selectedDifficulty || existingTestQuestion.question?.difficulty;

    if (targetCat && newQuestion.categoryId !== targetCat) {
      const cat = await prisma.academicCategory.findUnique({ where: { id: targetCat } });
      throw new TestCreationServiceError(
        `Replacement question must belong to Category '${cat?.nameEn || targetCat}' to preserve test blueprint`,
        400
      );
    }

    if (targetDiff && newQuestion.difficulty !== targetDiff) {
      throw new TestCreationServiceError(
        `Replacement question must have Difficulty '${targetDiff}' to preserve test blueprint`,
        400
      );
    }

    return prisma.$transaction(async (tx) => {
      await tx.mockTestQuestion.update({
        where: { id: existingTestQuestion.id },
        data: {
          questionId: newQuestionId,
          selectedCategoryId: newQuestion.categoryId || null,
          selectedSubcategoryId: newQuestion.subcategoryId || null,
          selectedDifficulty: newQuestion.difficulty,
          positiveMarks: test.scoringPolicy === 'MCQ_DEFAULT' ? newQuestion.positiveMarks : test.positiveMarks,
          negativeMarks: test.scoringPolicy === 'MCQ_DEFAULT' ? newQuestion.negativeMarks : test.negativeMarks,
        },
      });

      return this.getTestById(testId, tx);
    });
  }

  /**
   * Reorder questions in a test
   */
  static async reorderQuestions(testId: string, questionOrder: { questionId: string; displayOrder: number }[]) {
    const test = await prisma.mockTest.findUnique({ where: { id: testId } });
    if (!test) throw new TestCreationServiceError('Test not found', 404);

    if (test.status !== 'DRAFT' && test.status !== 'CHANGES_REQUESTED') {
      throw new TestCreationServiceError(`Cannot reorder questions for Test in '${test.status}' status`, 400);
    }

    return prisma.$transaction(async (tx) => {
      // Temporarily set displayOrder to negative values to avoid unique constraint collision
      for (const item of questionOrder) {
        await tx.mockTestQuestion.updateMany({
          where: { mockTestId: testId, questionId: item.questionId },
          data: { displayOrder: -item.displayOrder },
        });
      }

      // Update to final positive display order
      for (const item of questionOrder) {
        await tx.mockTestQuestion.updateMany({
          where: { mockTestId: testId, questionId: item.questionId },
          data: { displayOrder: item.displayOrder },
        });
      }

      return this.getTestById(testId, tx);
    });
  }

  /**
   * Submit Test for Review (DRAFT / CHANGES_REQUESTED -> REVIEW_PENDING)
   */
  static async submitForReview(id: string, adminUserId?: string) {
    const test = await this.getTestById(id);

    if (test.status !== 'DRAFT' && test.status !== 'CHANGES_REQUESTED') {
      throw new TestCreationServiceError(`Cannot submit Test in '${test.status}' status for review`, 400);
    }

    if (!test.isBlueprintValid) {
      throw new TestCreationServiceError(
        `Cannot submit Test for review due to blueprint errors: ${test.blueprintErrors.join('; ')}`,
        400
      );
    }

    const updated = await prisma.mockTest.update({
      where: { id },
      data: {
        status: 'REVIEW_PENDING',
        submittedByAdminId: adminUserId || null,
        rejectionReason: null,
      },
    });

    return this.getTestById(updated.id);
  }

  /**
   * Request Changes on Test (REVIEW_PENDING -> CHANGES_REQUESTED)
   */
  static async requestChanges(id: string, rejectionReason: string, adminUserId?: string) {
    const test = await prisma.mockTest.findUnique({ where: { id } });
    if (!test) throw new TestCreationServiceError('Test not found', 404);

    if (test.status !== 'REVIEW_PENDING') {
      throw new TestCreationServiceError(`Cannot request changes for Test in '${test.status}' status`, 400);
    }

    if (!rejectionReason?.trim()) {
      throw new TestCreationServiceError('Rejection reason is required when requesting changes', 400);
    }

    const updated = await prisma.mockTest.update({
      where: { id },
      data: {
        status: 'CHANGES_REQUESTED',
        rejectionReason: rejectionReason.trim(),
        reviewedByAdminId: adminUserId || null,
      },
    });

    return this.getTestById(updated.id);
  }

  /**
   * Approve Test (REVIEW_PENDING -> APPROVED)
   */
  static async approveTest(id: string, adminUserId?: string) {
    const test = await this.getTestById(id);

    if (test.status !== 'REVIEW_PENDING') {
      throw new TestCreationServiceError(`Cannot approve Test in '${test.status}' status`, 400);
    }

    if (!test.isBlueprintValid) {
      throw new TestCreationServiceError(
        `Cannot approve Test due to blueprint errors: ${test.blueprintErrors.join('; ')}`,
        400
      );
    }

    const updated = await prisma.mockTest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedByAdminId: adminUserId || null,
        rejectionReason: null,
      },
    });

    return this.getTestById(updated.id);
  }

  /**
   * Publish Test & Finalize Immutable Question Snapshots (APPROVED -> PUBLISHED)
   */
  static async publishTest(id: string, adminUserId?: string) {
    const test = await this.getTestById(id);

    if (test.status !== 'APPROVED') {
      throw new TestCreationServiceError(`Cannot publish Test in '${test.status}' status. Test must be APPROVED first.`, 400);
    }

    if (!test.isBlueprintValid) {
      throw new TestCreationServiceError(
        `Cannot publish Test due to blueprint errors: ${test.blueprintErrors.join('; ')}`,
        400
      );
    }

    return prisma.$transaction(async (tx) => {
      // Freeze immutable question snapshots on MockTestQuestion records
      for (const tq of test.questions) {
        const q = tq.question;
        await tx.mockTestQuestion.update({
          where: { id: tq.id },
          data: {
            snapshotQuestionEn: q.questionTextEn,
            snapshotQuestionKn: q.questionTextKn,
            snapshotOptionA_En: q.optionA_En,
            snapshotOptionA_Kn: q.optionA_Kn,
            snapshotOptionB_En: q.optionB_En,
            snapshotOptionB_Kn: q.optionB_Kn,
            snapshotOptionC_En: q.optionC_En,
            snapshotOptionC_Kn: q.optionC_Kn,
            snapshotOptionD_En: q.optionD_En,
            snapshotOptionD_Kn: q.optionD_Kn,
            snapshotCorrectOption: q.correctOption,
            snapshotExplanationEn: q.explanationEn,
            snapshotExplanationKn: q.explanationKn,
            snapshotDifficulty: q.difficulty,
            snapshotPositiveMarks: tq.positiveMarks,
            snapshotNegativeMarks: tq.negativeMarks,
          },
        });
      }

      await tx.mockTest.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          isPublished: true,
          publishedByAdminId: adminUserId || null,
        },
      });

      return this.getTestById(id, tx);
    });
  }

  /**
   * Archive Test
   */
  static async archiveTest(id: string, adminUserId?: string) {
    const test = await prisma.mockTest.findUnique({ where: { id } });
    if (!test) throw new TestCreationServiceError('Test not found', 404);

    const updated = await prisma.mockTest.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        isPublished: false,
      },
    });

    return this.getTestById(updated.id);
  }

  static async reopenTest(id: string, adminUserId?: string) {
    const test = await prisma.mockTest.findUnique({ where: { id } });
    if (!test) throw new TestCreationServiceError('Test not found', 404);

    const updated = await prisma.mockTest.update({
      where: { id },
      data: {
        status: 'DRAFT',
        isPublished: false,
        rejectionReason: null,
      },
    });

    return this.getTestById(updated.id);
  }

  static async deleteTest(id: string, adminUserId?: string) {
    const test = await prisma.mockTest.findUnique({ where: { id } });
    if (!test) throw new TestCreationServiceError('Test not found', 404);

    if (test.status === 'PUBLISHED') {
      throw new TestCreationServiceError('Cannot delete a published test. Archive it first or unpublish.', 400);
    }

    // Rely on Prisma onDelete: Cascade for relationships
    await prisma.mockTest.delete({
      where: { id }
    });

    return { success: true, id };
  }
}
