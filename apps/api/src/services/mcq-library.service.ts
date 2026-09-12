import { prisma } from '@study-karnataka/database';
import { TestCreationService } from './test-creation.service';
import {
  CreateMcqQuestionPayload,
  McqBilingualReadiness,
  McqApprovalEligibility,
  McqDuplicateWarning,
  McqWorkflowStatus,
  McqQueryParams,
} from '@study-karnataka/shared-types';

export class McqLibraryServiceError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'McqLibraryServiceError';
  }
}

/**
 * Stem normalization helper for duplicate detection
 */
export function normalizeStem(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, ' ') // Strip HTML tags
    .toLowerCase()
    .replace(/[^a-z0-9\u0C80-\u0CFF]+/g, ' ') // Preserve English & Kannada alphanumeric
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Calculates dynamic bilingual readiness state based STRICTLY on language content completeness
 */
export function calculateBilingualReadiness(q: {
  questionTextEn?: string | null;
  questionTextKn?: string | null;
  optionA_En?: string | null;
  optionA_Kn?: string | null;
  optionB_En?: string | null;
  optionB_Kn?: string | null;
  optionC_En?: string | null;
  optionC_Kn?: string | null;
  optionD_En?: string | null;
  optionD_Kn?: string | null;
  explanationEn?: string | null;
  explanationKn?: string | null;
}): McqBilingualReadiness {
  const hasEnStem = Boolean(q.questionTextEn && q.questionTextEn.trim().length > 0);
  const hasKnStem = Boolean(q.questionTextKn && q.questionTextKn.trim().length > 0);

  const hasEnOptions = Boolean(
    q.optionA_En?.trim() && q.optionB_En?.trim() && q.optionC_En?.trim() && q.optionD_En?.trim()
  );
  const hasKnOptions = Boolean(
    q.optionA_Kn?.trim() && q.optionB_Kn?.trim() && q.optionC_Kn?.trim() && q.optionD_Kn?.trim()
  );

  const hasEnExplanation = Boolean(q.explanationEn && q.explanationEn.trim().length > 0);
  const hasKnExplanation = Boolean(q.explanationKn && q.explanationKn.trim().length > 0);

  const enComplete = hasEnStem && hasEnOptions && hasEnExplanation;
  const knComplete = hasKnStem && hasKnOptions && hasKnExplanation;

  if (enComplete && knComplete) {
    return 'BILINGUAL_READY';
  }
  if (enComplete && !knComplete) {
    return 'KANNADA_INCOMPLETE';
  }
  if (!enComplete && knComplete) {
    return 'ENGLISH_INCOMPLETE';
  }
  return 'INCOMPLETE';
}

/**
 * Calculates separate Approval / Test Eligibility
 */
export function calculateApprovalEligibility(q: {
  questionTextEn?: string | null;
  questionTextKn?: string | null;
  optionA_En?: string | null;
  optionA_Kn?: string | null;
  optionB_En?: string | null;
  optionB_Kn?: string | null;
  optionC_En?: string | null;
  optionC_Kn?: string | null;
  optionD_En?: string | null;
  optionD_Kn?: string | null;
  explanationEn?: string | null;
  explanationKn?: string | null;
  correctOption?: string | null;
  difficulty?: string | null;
  positiveMarks?: any;
  negativeMarks?: any;
  categoryId?: string | null;
  subcategoryId?: string | null;
}): McqApprovalEligibility {
  const missingFields: string[] = [];

  const hasEnStem = Boolean(q.questionTextEn && q.questionTextEn.trim().length > 0);
  const hasKnStem = Boolean(q.questionTextKn && q.questionTextKn.trim().length > 0);
  if (!hasEnStem) missingFields.push('ENGLISH_QUESTION');
  if (!hasKnStem) missingFields.push('KANNADA_QUESTION');

  const hasEnOptions = Boolean(
    q.optionA_En?.trim() && q.optionB_En?.trim() && q.optionC_En?.trim() && q.optionD_En?.trim()
  );
  const hasKnOptions = Boolean(
    q.optionA_Kn?.trim() && q.optionB_Kn?.trim() && q.optionC_Kn?.trim() && q.optionD_Kn?.trim()
  );
  if (!hasEnOptions) missingFields.push('ENGLISH_OPTIONS');
  if (!hasKnOptions) missingFields.push('KANNADA_OPTIONS');

  const hasEnExplanation = Boolean(q.explanationEn && q.explanationEn.trim().length > 0);
  const hasKnExplanation = Boolean(q.explanationKn && q.explanationKn.trim().length > 0);
  if (!hasEnExplanation) missingFields.push('ENGLISH_EXPLANATION');
  if (!hasKnExplanation) missingFields.push('KANNADA_EXPLANATION');

  const hasCorrectAnswer = Boolean(q.correctOption && ['A', 'B', 'C', 'D'].includes(q.correctOption));
  if (!hasCorrectAnswer) missingFields.push('CORRECT_ANSWER');

  const hasDifficulty = Boolean(q.difficulty && ['EASY', 'MEDIUM', 'HARD'].includes(q.difficulty));
  if (!hasDifficulty) missingFields.push('DIFFICULTY');

  const posMarksNum = Number(q.positiveMarks);
  const hasPositiveMarks = q.positiveMarks !== null && q.positiveMarks !== undefined && !isNaN(posMarksNum) && posMarksNum > 0;
  if (!hasPositiveMarks) missingFields.push('POSITIVE_MARKS');

  const negMarksNum = Number(q.negativeMarks);
  const hasNegativeMarks = q.negativeMarks !== null && q.negativeMarks !== undefined && !isNaN(negMarksNum) && negMarksNum >= 0;
  if (!hasNegativeMarks) missingFields.push('NEGATIVE_MARKS');

  if (!q.categoryId) missingFields.push('CATEGORY');
  if (!q.subcategoryId) missingFields.push('SUBCATEGORY');

  return {
    eligible: missingFields.length === 0,
    missingFields,
  };
}

export class McqLibraryService {
  /**
   * Generates a transaction-safe sequential code e.g. MCQ_000001
   */
  static async generateNextSequentialCode(tx?: any): Promise<{ code: string; seqNumber: number }> {
    const client = tx || prisma;
    
    // Auto-sync counter with actual max sequence in DB to fulfill user request of basing it on library content
    const maxRecord = await client.mcqQuestion.aggregate({ _max: { seqNumber: true } });
    const actualMax = maxRecord._max.seqNumber || 0;

    let counter = await client.mcqSequenceCounter.findUnique({ where: { id: 'mcq_counter' } });
    if (!counter || counter.lastSeq > actualMax || counter.lastSeq < actualMax) {
      counter = await client.mcqSequenceCounter.upsert({
        where: { id: 'mcq_counter' },
        update: { lastSeq: actualMax },
        create: { id: 'mcq_counter', lastSeq: actualMax },
      });
    }

    counter = await client.mcqSequenceCounter.update({
      where: { id: 'mcq_counter' },
      data: { lastSeq: { increment: 1 } },
    });

    let seqNumber = counter.lastSeq;
    let padded = String(seqNumber).padStart(6, '0');
    let code = `MCQ_${padded}`;

    // Collision check loop for idempotency & pre-seeded records
    let existing = await client.mcqQuestion.findUnique({ where: { code } });
    while (existing) {
      counter = await client.mcqSequenceCounter.update({
        where: { id: 'mcq_counter' },
        data: { lastSeq: { increment: 1 } },
      });
      seqNumber = counter.lastSeq;
      padded = String(seqNumber).padStart(6, '0');
      code = `MCQ_${padded}`;
      existing = await client.mcqQuestion.findUnique({ where: { code } });
    }

    return { code, seqNumber };
  }

  /**
   * Previews the next sequential code without actually incrementing the DB counter.
   * Useful for showing the code to the user before they submit the form.
   */
  static async previewNextSequentialCode(): Promise<{ code: string; seqNumber: number }> {
    const maxRecord = await prisma.mcqQuestion.aggregate({
      _max: { seqNumber: true },
    });

    let seqNumber = (maxRecord._max.seqNumber || 0) + 1;
    let padded = String(seqNumber).padStart(6, '0');
    let code = `MCQ_${padded}`;

    // Collision check loop (read-only)
    let existing = await prisma.mcqQuestion.findUnique({ where: { code } });
    while (existing) {
      seqNumber++;
      padded = String(seqNumber).padStart(6, '0');
      code = `MCQ_${padded}`;
      existing = await prisma.mcqQuestion.findUnique({ where: { code } });
    }

    return { code, seqNumber };
  }

  /**
   * Validates cascading taxonomy relationships (Category -> Subcategory -> Topic -> Knowledge Area)
   */
  static async validateTaxonomyHierarchy(
    categoryId?: string | null,
    subcategoryId?: string | null,
    topicId?: string | null,
    knowledgeAreaId?: string | null
  ) {
    if (subcategoryId) {
      const sub = await prisma.academicSubcategory.findUnique({ where: { id: subcategoryId } });
      if (!sub) {
        throw new McqLibraryServiceError('Selected Subcategory does not exist', 400);
      }
      if (categoryId && sub.categoryId !== categoryId) {
        throw new McqLibraryServiceError('Selected Subcategory does not belong to the selected Category', 400);
      }
    }

    if (topicId) {
      const topic = await prisma.academicTopic.findUnique({ where: { id: topicId } });
      if (!topic) {
        throw new McqLibraryServiceError('Selected Topic does not exist', 400);
      }
      if (subcategoryId && topic.subcategoryId !== subcategoryId) {
        throw new McqLibraryServiceError('Selected Topic does not belong to the selected Subcategory', 400);
      }
    }

    if (knowledgeAreaId) {
      const ka = await prisma.academicKnowledgeArea.findUnique({ where: { id: knowledgeAreaId } });
      if (!ka) {
        throw new McqLibraryServiceError('Selected Knowledge Area does not exist', 400);
      }
      if (topicId && ka.topicId !== topicId) {
        throw new McqLibraryServiceError('Selected Knowledge Area does not belong to the selected Topic', 400);
      }
    }
  }

  /**
   * Performs stem normalization duplicate check
   */
  static async checkDuplicateStems(
    questionTextEn?: string | null,
    questionTextKn?: string | null,
    excludeId?: string
  ): Promise<McqDuplicateWarning[]> {
    const normEn = normalizeStem(questionTextEn);
    const normKn = normalizeStem(questionTextKn);

    if (!normEn && !normKn) return [];

    const existingQuestions = await prisma.mcqQuestion.findMany({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        isActive: true,
        OR: [
          normEn ? { normalizedStemEn: { equals: normEn } } : undefined,
          normKn ? { normalizedStemKn: { equals: normKn } } : undefined,
        ].filter(Boolean) as any[],
      },
      select: {
        id: true,
        code: true,
        questionTextEn: true,
        normalizedStemEn: true,
        normalizedStemKn: true,
      },
      take: 5,
    });

    return existingQuestions.map((q) => ({
      matchedId: q.id,
      matchedCode: q.code,
      matchedStemEn: q.questionTextEn.slice(0, 100),
      similarityScore:
        q.normalizedStemEn === normEn || q.normalizedStemKn === normKn ? 100 : 85,
    }));
  }

  /**
   * List MCQs with server-side pagination & multi-filter support
   */
  static async getQuestions(params: McqQueryParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit || params.pageSize) || 25));
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (params.difficulty && params.difficulty !== 'ALL') {
      where.difficulty = params.difficulty;
    }
    if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    }
    if (params.categoryId && params.categoryId !== 'ALL') {
      if (Array.isArray(params.categoryId)) {
        where.categoryId = { in: params.categoryId };
      } else {
        where.categoryId = params.categoryId;
      }
    }
    if (params.subcategoryId && params.subcategoryId !== 'ALL') {
      if (Array.isArray(params.subcategoryId)) {
        where.subcategoryId = { in: params.subcategoryId };
      } else {
        where.subcategoryId = params.subcategoryId;
      }
    }
    if (params.topicId && params.topicId !== 'ALL') {
      where.topicId = params.topicId;
    }
    if (params.knowledgeAreaId && params.knowledgeAreaId !== 'ALL') {
      where.knowledgeAreaId = params.knowledgeAreaId;
    }
    if (params.isPyq !== undefined) {
      where.isPyq = String(params.isPyq) === 'true';
    }

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { questionTextEn: { contains: q, mode: 'insensitive' } },
        { questionTextKn: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, questions] = await Promise.all([
      prisma.mcqQuestion.count({ where }),
      prisma.mcqQuestion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          examCycle: { select: { id: true, titleEn: true, titleKn: true } },
          syllabusNode: { select: { id: true, nameEn: true, nameKn: true } },
          category: { select: { id: true, nameEn: true, nameKn: true } },
          subcategory: { select: { id: true, nameEn: true, nameKn: true } },
          topic: { select: { id: true, nameEn: true, nameKn: true } },
          knowledgeArea: { select: { id: true, nameEn: true, nameKn: true } },
        },
      }),
    ]);

    let formatted = questions.map((q) => {
      const readiness = calculateBilingualReadiness(q);
      const approvalEligibility = calculateApprovalEligibility(q);
      return {
        ...q,
        positiveMarks: Number(q.positiveMarks),
        negativeMarks: Number(q.negativeMarks),
        readiness,
        approvalEligibility,
        examCycleTitleEn: q.examCycle?.titleEn,
        syllabusNodeNameEn: q.syllabusNode?.nameEn,
        categoryNameEn: q.category?.nameEn,
        subcategoryNameEn: q.subcategory?.nameEn,
        topicNameEn: q.topic?.nameEn,
        knowledgeAreaNameEn: q.knowledgeArea?.nameEn,
      };
    });

    if (params.readiness && params.readiness !== 'ALL') {
      formatted = formatted.filter((q) => q.readiness === params.readiness);
    }

    return {
      data: formatted,
      meta: {
        page,
        limit,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new canonical MCQ Question (Draft or Submitting)
   */
  static async createQuestion(payload: CreateMcqQuestionPayload, adminUserId?: string) {
    if (!payload.difficulty) {
      throw new McqLibraryServiceError('Difficulty level is required (EASY, MEDIUM, HARD)', 400);
    }
    if (payload.positiveMarks !== undefined && payload.positiveMarks <= 0) {
      throw new McqLibraryServiceError('Positive marks must be greater than 0', 400);
    }
    if (payload.negativeMarks !== undefined && payload.negativeMarks < 0) {
      throw new McqLibraryServiceError('Negative marks cannot be negative', 400);
    }

    await this.validateTaxonomyHierarchy(
      payload.categoryId,
      payload.subcategoryId,
      payload.topicId,
      payload.knowledgeAreaId
    );

    const normEn = normalizeStem(payload.questionTextEn);
    const normKn = normalizeStem(payload.questionTextKn);

    const duplicateWarnings = await this.checkDuplicateStems(
      payload.questionTextEn,
      payload.questionTextKn
    );

    const question = await prisma.$transaction(async (tx) => {
      const { code, seqNumber } = await this.generateNextSequentialCode(tx);

      return tx.mcqQuestion.create({
        data: {
          code,
          seqNumber,
          questionTextEn: payload.questionTextEn?.trim() || '',
          questionTextKn: payload.questionTextKn?.trim() || '',
          optionA_En: payload.optionA_En?.trim() || '',
          optionA_Kn: payload.optionA_Kn?.trim() || '',
          optionB_En: payload.optionB_En?.trim() || '',
          optionB_Kn: payload.optionB_Kn?.trim() || '',
          optionC_En: payload.optionC_En?.trim() || '',
          optionC_Kn: payload.optionC_Kn?.trim() || '',
          optionD_En: payload.optionD_En?.trim() || '',
          optionD_Kn: payload.optionD_Kn?.trim() || '',
          correctOption: payload.correctOption || '',
          explanationEn: payload.explanationEn?.trim() || null,
          explanationKn: payload.explanationKn?.trim() || null,
          difficulty: payload.difficulty,
          positiveMarks: payload.positiveMarks ?? 1.00,
          negativeMarks: payload.negativeMarks ?? 0.25,
          status: payload.status || 'DRAFT',
          categoryId: payload.categoryId || null,
          subcategoryId: payload.subcategoryId || null,
          topicId: payload.topicId || null,
          knowledgeAreaId: payload.knowledgeAreaId || null,
          examCycleId: payload.examCycleId || null,
          syllabusNodeId: payload.syllabusNodeId || null,
          sourceType: payload.sourceType || 'ORIGINAL',
          sourceName: payload.sourceName?.trim() || null,
          sourceUrl: payload.sourceUrl?.trim() || null,
          isPyq: payload.isPyq ?? false,
          pyqExamName: payload.pyqExamName?.trim() || null,
          pyqYear: payload.pyqYear || null,
          pyqPaperStage: payload.pyqPaperStage?.trim() || null,
          pyqQuestionNumber: payload.pyqQuestionNumber?.trim() || null,
          pyqNotes: payload.pyqNotes?.trim() || null,
          normalizedStemEn: normEn || null,
          normalizedStemKn: normKn || null,
          createdByAdminId: adminUserId || null,
        },
      });
    });

    // Record Audit Log
    if (adminUserId) {
      await prisma.adminAuditLog.create({
        data: {
          adminUserId,
          action: 'CREATE',
          module: 'MCQ_LIBRARY',
          recordType: 'McqQuestion',
          recordId: question.id,
          newValue: { code: question.code, status: question.status },
        },
      });
    }

    const readiness = calculateBilingualReadiness(question);
    const approvalEligibility = calculateApprovalEligibility(question);

    return {
      ...question,
      positiveMarks: Number(question.positiveMarks),
      negativeMarks: Number(question.negativeMarks),
      readiness,
      approvalEligibility,
      duplicateWarnings,
    };
  }

  /**
   * Get single MCQ Question by ID
   */
  static async getQuestionById(id: string) {
    const question = await prisma.mcqQuestion.findUnique({
      where: { id },
      include: {
        examCycle: { select: { id: true, titleEn: true, titleKn: true } },
        syllabusNode: { select: { id: true, nameEn: true, nameKn: true } },
        category: { select: { id: true, nameEn: true, nameKn: true } },
        subcategory: { select: { id: true, nameEn: true, nameKn: true } },
        topic: { select: { id: true, nameEn: true, nameKn: true } },
        knowledgeArea: { select: { id: true, nameEn: true, nameKn: true } },
      },
    });

    if (!question) {
      throw new McqLibraryServiceError('MCQ Question not found', 404);
    }

    const readiness = calculateBilingualReadiness(question);
    const approvalEligibility = calculateApprovalEligibility(question);
    const duplicateWarnings = await this.checkDuplicateStems(
      question.questionTextEn,
      question.questionTextKn,
      question.id
    );

    return {
      ...question,
      positiveMarks: Number(question.positiveMarks),
      negativeMarks: Number(question.negativeMarks),
      readiness,
      approvalEligibility,
      examCycleTitleEn: question.examCycle?.titleEn,
      syllabusNodeNameEn: question.syllabusNode?.nameEn,
      categoryNameEn: question.category?.nameEn,
      subcategoryNameEn: question.subcategory?.nameEn,
      topicNameEn: question.topic?.nameEn,
      knowledgeAreaNameEn: question.knowledgeArea?.nameEn,
      duplicateWarnings,
    };
  }

  /**
   * Update MCQ Question
   */
  static async updateQuestion(id: string, payload: Partial<CreateMcqQuestionPayload>, adminUserId?: string) {
    const existing = await this.getQuestionById(id);

    if (payload.positiveMarks !== undefined && payload.positiveMarks <= 0) {
      throw new McqLibraryServiceError('Positive marks must be greater than 0', 400);
    }
    if (payload.negativeMarks !== undefined && payload.negativeMarks < 0) {
      throw new McqLibraryServiceError('Negative marks cannot be negative', 400);
    }

    const catId = payload.categoryId !== undefined ? payload.categoryId : existing.categoryId;
    const subcatId = payload.subcategoryId !== undefined ? payload.subcategoryId : existing.subcategoryId;
    const topicId = payload.topicId !== undefined ? payload.topicId : existing.topicId;
    const kaId = payload.knowledgeAreaId !== undefined ? payload.knowledgeAreaId : existing.knowledgeAreaId;

    await this.validateTaxonomyHierarchy(catId, subcatId, topicId, kaId);

    const data: any = {};
    if (payload.questionTextEn !== undefined) {
      data.questionTextEn = payload.questionTextEn.trim();
      data.normalizedStemEn = normalizeStem(payload.questionTextEn);
    }
    if (payload.questionTextKn !== undefined) {
      data.questionTextKn = payload.questionTextKn.trim();
      data.normalizedStemKn = normalizeStem(payload.questionTextKn);
    }
    if (payload.optionA_En !== undefined) data.optionA_En = payload.optionA_En.trim();
    if (payload.optionA_Kn !== undefined) data.optionA_Kn = payload.optionA_Kn.trim();
    if (payload.optionB_En !== undefined) data.optionB_En = payload.optionB_En.trim();
    if (payload.optionB_Kn !== undefined) data.optionB_Kn = payload.optionB_Kn.trim();
    if (payload.optionC_En !== undefined) data.optionC_En = payload.optionC_En.trim();
    if (payload.optionC_Kn !== undefined) data.optionC_Kn = payload.optionC_Kn.trim();
    if (payload.optionD_En !== undefined) data.optionD_En = payload.optionD_En.trim();
    if (payload.optionD_Kn !== undefined) data.optionD_Kn = payload.optionD_Kn.trim();
    if (payload.correctOption !== undefined) data.correctOption = payload.correctOption;
    if (payload.explanationEn !== undefined) data.explanationEn = payload.explanationEn?.trim() || null;
    if (payload.explanationKn !== undefined) data.explanationKn = payload.explanationKn?.trim() || null;
    if (payload.difficulty !== undefined) data.difficulty = payload.difficulty;
    if (payload.positiveMarks !== undefined) data.positiveMarks = payload.positiveMarks;
    if (payload.negativeMarks !== undefined) data.negativeMarks = payload.negativeMarks;
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.categoryId !== undefined) data.categoryId = payload.categoryId || null;
    if (payload.subcategoryId !== undefined) data.subcategoryId = payload.subcategoryId || null;
    if (payload.topicId !== undefined) data.topicId = payload.topicId || null;
    if (payload.knowledgeAreaId !== undefined) data.knowledgeAreaId = payload.knowledgeAreaId || null;
    if (payload.examCycleId !== undefined) data.examCycleId = payload.examCycleId || null;
    if (payload.syllabusNodeId !== undefined) data.syllabusNodeId = payload.syllabusNodeId || null;
    if (payload.sourceType !== undefined) data.sourceType = payload.sourceType;
    if (payload.sourceName !== undefined) data.sourceName = payload.sourceName?.trim() || null;
    if (payload.sourceUrl !== undefined) data.sourceUrl = payload.sourceUrl?.trim() || null;
    if (payload.isPyq !== undefined) data.isPyq = payload.isPyq;
    if (payload.pyqExamName !== undefined) data.pyqExamName = payload.pyqExamName?.trim() || null;
    if (payload.pyqYear !== undefined) data.pyqYear = payload.pyqYear || null;
    if (payload.pyqPaperStage !== undefined) data.pyqPaperStage = payload.pyqPaperStage?.trim() || null;
    if (payload.pyqQuestionNumber !== undefined) data.pyqQuestionNumber = payload.pyqQuestionNumber?.trim() || null;
    if (payload.pyqNotes !== undefined) data.pyqNotes = payload.pyqNotes?.trim() || null;

    const updated = await prisma.mcqQuestion.update({
      where: { id },
      data,
    });

    if (adminUserId) {
      await prisma.adminAuditLog.create({
        data: {
          adminUserId,
          action: 'UPDATE',
          module: 'MCQ_LIBRARY',
          recordType: 'McqQuestion',
          recordId: updated.id,
          previousValue: { code: existing.code, status: existing.status },
          newValue: { code: updated.code, status: updated.status },
        },
      });
    }

    const readiness = calculateBilingualReadiness(updated);
    const approvalEligibility = calculateApprovalEligibility(updated);
    const duplicateWarnings = await this.checkDuplicateStems(
      updated.questionTextEn,
      updated.questionTextKn,
      updated.id
    );

    return {
      ...updated,
      positiveMarks: Number(updated.positiveMarks),
      negativeMarks: Number(updated.negativeMarks),
      readiness,
      approvalEligibility,
      duplicateWarnings,
    };
  }

  /**
   * Workflow Action: Submit for Review
   */
  static async submitForReview(id: string, adminUserId?: string) {
    const q = await this.getQuestionById(id);
    if (!['DRAFT', 'CHANGES_REQUESTED'].includes(q.status)) {
      throw new McqLibraryServiceError(
        `Cannot submit for review from status ${q.status}. Must be DRAFT or CHANGES_REQUESTED`,
        400
      );
    }

    const updated = await prisma.mcqQuestion.update({
      where: { id },
      data: { status: 'REVIEW_PENDING' },
    });

    if (adminUserId) {
      await prisma.adminAuditLog.create({
        data: {
          adminUserId,
          action: 'SUBMIT_REVIEW',
          module: 'MCQ_LIBRARY',
          recordType: 'McqQuestion',
          recordId: id,
          previousValue: { status: q.status },
          newValue: { status: 'REVIEW_PENDING' },
        },
      });
    }

    return { ...updated, positiveMarks: Number(updated.positiveMarks), negativeMarks: Number(updated.negativeMarks) };
  }

  /**
   * Workflow Action: Request Changes
   */
  static async requestChanges(id: string, adminUserId?: string) {
    const q = await this.getQuestionById(id);
    if (q.status !== 'REVIEW_PENDING') {
      throw new McqLibraryServiceError('Can only request changes for questions in REVIEW_PENDING status', 400);
    }

    const updated = await prisma.mcqQuestion.update({
      where: { id },
      data: { status: 'CHANGES_REQUESTED' },
    });

    if (adminUserId) {
      await prisma.adminAuditLog.create({
        data: {
          adminUserId,
          action: 'REQUEST_CHANGES',
          module: 'MCQ_LIBRARY',
          recordType: 'McqQuestion',
          recordId: id,
          previousValue: { status: q.status },
          newValue: { status: 'CHANGES_REQUESTED' },
        },
      });
    }

    return { ...updated, positiveMarks: Number(updated.positiveMarks), negativeMarks: Number(updated.negativeMarks) };
  }

  /**
   * Workflow Action: Approve Question (Strict Validation Guards)
   */
  static async approveQuestion(id: string, adminUserId?: string) {
    const q = await this.getQuestionById(id);

    // 1. Check language readiness
    const readiness = calculateBilingualReadiness(q);
    if (readiness !== 'BILINGUAL_READY') {
      throw new McqLibraryServiceError(
        `Question cannot be approved because language content is incomplete (Current readiness: ${readiness}). Both English & Kannada stems, options A-D, and explanations are required.`,
        400
      );
    }

    // 2. Check approval eligibility (category, subcategory, correct answer, difficulty, marks)
    const eligibility = calculateApprovalEligibility(q);
    if (!eligibility.eligible) {
      throw new McqLibraryServiceError(
        `Question approval rejected: Missing required approval fields (${eligibility.missingFields.join(', ')}).`,
        400
      );
    }

    // 3. Check exact duplicate stem
    const duplicates = await this.checkDuplicateStems(q.questionTextEn, q.questionTextKn, q.id);
    const exactMatch = duplicates.find((d) => d.similarityScore === 100);
    if (exactMatch) {
      throw new McqLibraryServiceError(
        `Question approval rejected: An exact stem duplicate already exists in the question bank (${exactMatch.matchedCode}).`,
        400
      );
    }

    const updated = await prisma.mcqQuestion.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedByAdminId: adminUserId || null,
        approvedByAdminId: adminUserId || null,
      },
    });

    if (adminUserId) {
      await prisma.adminAuditLog.create({
        data: {
          adminUserId,
          action: 'APPROVE',
          module: 'MCQ_LIBRARY',
          recordType: 'McqQuestion',
          recordId: id,
          previousValue: { status: q.status },
          newValue: { status: 'APPROVED' },
        },
      });
    }

    return { ...updated, positiveMarks: Number(updated.positiveMarks), negativeMarks: Number(updated.negativeMarks) };
  }

  /**
   * Workflow Action: Archive Question
   */
  static async archiveQuestion(id: string, adminUserId?: string) {
    const q = await this.getQuestionById(id);
    const updated = await prisma.mcqQuestion.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    if (adminUserId) {
      await prisma.adminAuditLog.create({
        data: {
          adminUserId,
          action: 'ARCHIVE',
          module: 'MCQ_LIBRARY',
          recordType: 'McqQuestion',
          recordId: id,
          previousValue: { status: q.status },
          newValue: { status: 'ARCHIVED' },
        },
      });
    }

    return { ...updated, positiveMarks: Number(updated.positiveMarks), negativeMarks: Number(updated.negativeMarks) };
  }

  /**
   * Delete Question (Safety checked against Mock Test linkages)
   */
  static async deleteQuestion(id: string, adminUserId?: string) {
    const q = await this.getQuestionById(id);

    // Check if linked to any Mock Tests
    const mockTestLinksCount = await prisma.mockTestQuestion.count({
      where: { questionId: id },
    });

    if (mockTestLinksCount > 0) {
      throw new McqLibraryServiceError(
        `Cannot delete question '${q.code}' as it is currently linked to ${mockTestLinksCount} Mock Test(s). Please remove it from the test(s) first or archive it instead.`,
        400
      );
    }

    await prisma.mcqQuestion.delete({ where: { id } });

    if (adminUserId) {
      await prisma.adminAuditLog.create({
        data: {
          adminUserId,
          action: 'DELETE',
          module: 'MCQ_LIBRARY',
          recordType: 'McqQuestion',
          recordId: id,
          previousValue: { code: q.code, status: q.status },
        },
      });
    }

    return { success: true, id, code: q.code };
  }

  /**
   * Bulk Delete Questions
   */
  static async deleteQuestionsBulk(ids: string[], adminUserId?: string) {
    if (!ids || ids.length === 0) {
      throw new McqLibraryServiceError('No question IDs provided for bulk deletion.', 400);
    }

    const questions = await prisma.mcqQuestion.findMany({
      where: { id: { in: ids } },
      select: { id: true, code: true, status: true },
    });

    const skipped: Array<{ id: string; code: string; reason: string }> = [];
    const deletableIds: string[] = [];

    for (const q of questions) {
      const linksCount = await prisma.mockTestQuestion.count({
        where: { questionId: q.id },
      });

      if (linksCount > 0) {
        skipped.push({
          id: q.id,
          code: q.code,
          reason: `Referenced in ${linksCount} Mock Test(s)`,
        });
      } else {
        deletableIds.push(q.id);
      }
    }

    if (deletableIds.length > 0) {
      await prisma.mcqQuestion.deleteMany({
        where: { id: { in: deletableIds } },
      });

      if (adminUserId) {
        await prisma.adminAuditLog.create({
          data: {
            adminUserId,
            action: 'BULK_DELETE',
            module: 'MCQ_LIBRARY',
            recordType: 'McqQuestion',
            recordId: 'BULK',
            newValue: { deletedCount: deletableIds.length, totalRequested: ids.length, skippedCount: skipped.length },
          },
        });
      }
    }

    return {
      success: true,
      deletedCount: deletableIds.length,
      totalRequested: ids.length,
      skipped,
    };
  }

  /**
   * Bulk Workflow Status Actions (submit, approve, archive)
   */
  static async updateQuestionsStatusBulk(ids: string[], action: 'submit' | 'approve' | 'archive', adminUserId?: string) {
    if (!ids || ids.length === 0) {
      throw new McqLibraryServiceError('No question IDs provided for bulk status action.', 400);
    }

    let targetStatus: 'REVIEW_PENDING' | 'APPROVED' | 'ARCHIVED';
    let validCurrentStatuses: string[] = [];

    if (action === 'submit') {
      targetStatus = 'REVIEW_PENDING';
      validCurrentStatuses = ['DRAFT', 'CHANGES_REQUESTED'];
    } else if (action === 'approve') {
      targetStatus = 'APPROVED';
      validCurrentStatuses = ['REVIEW_PENDING'];
    } else if (action === 'archive') {
      targetStatus = 'ARCHIVED';
      validCurrentStatuses = ['DRAFT', 'REVIEW_PENDING', 'CHANGES_REQUESTED', 'APPROVED'];
    } else {
      throw new McqLibraryServiceError('Invalid bulk status action.', 400);
    }

    const result = await prisma.mcqQuestion.updateMany({
      where: {
        id: { in: ids },
        status: { in: validCurrentStatuses as any },
      },
      data: {
        status: targetStatus,
        ...(action === 'approve'
          ? {
              reviewedByAdminId: adminUserId || null,
              approvedByAdminId: adminUserId || null,
            }
          : {}),
      },
    });

    if (adminUserId) {
      await prisma.adminAuditLog.create({
        data: {
          adminUserId,
          action: `BULK_${action.toUpperCase()}`,
          module: 'MCQ_LIBRARY',
          recordType: 'McqQuestion',
          recordId: 'BULK',
          newValue: { updatedCount: result.count, targetStatus },
        },
      });
    }

    return { success: true, updatedCount: result.count };
  }

  /**
   * Mock Test Methods
   */
  static async getMockTests(params?: { examCycleId?: string; isPublished?: boolean }): Promise<any[]> {
    const res = await TestCreationService.getTests(params);
    return res.items;
  }

  static async createMockTest(payload: any, adminUserId?: string): Promise<any> {
    return TestCreationService.createTest(payload, adminUserId);
  }

  static async addQuestionsToMockTest(mockTestId: string, questionIds: string[]) {
    await TestCreationService.saveManualSelection(mockTestId, questionIds);
    return { success: true, count: questionIds.length };
  }
}
