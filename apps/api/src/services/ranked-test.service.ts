// @ts-nocheck
import { prisma } from '@study-karnataka/database';
import {
  CreateRankedTestInput,
  UpdateRankedTestInput,
  SaveRankedAnswerInput,
  InvalidateAttemptInput,
} from '@study-karnataka/validation';
import {
  RankedTestResponse,
  StudentRankedTestSummary,
  StudentAttemptResponse,
  StudentAttemptQuestionPayload,
  StudentResultResponse,
  LeaderboardEntryResponse,
  SolutionReviewItem,
  PreparationLanguage,
} from '@study-karnataka/shared-types';

export class RankedTestServiceError extends Error {
  constructor(message: string, public status: number = 400, public details?: any) {
    super(message);
    this.name = 'RankedTestServiceError';
  }
}

export class RankedTestService {
  /**
   * Sequence Generator for Ranked Test Code: RANKED_000001...
   */
  static async getNextRankedCodePreview(): Promise<{ code: string; seqNumber: number }> {
    const lastConfig = await prisma.rankedTest.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    });

    let nextNum = 1;
    if (lastConfig && lastConfig.code.startsWith('RANKED_')) {
      const parts = lastConfig.code.split('_');
      const parsed = parseInt(parts[1], 10);
      if (!isNaN(parsed)) {
        nextNum = parsed + 1;
      }
    }

    const code = `RANKED_${String(nextNum).padStart(6, '0')}`;
    return { code, seqNumber: nextNum };
  }

  /**
   * 1. Create Ranked Test Configuration
   */
  static async createRankedTest(input: CreateRankedTestInput, adminUserId?: string): Promise<RankedTestResponse> {
    // 1. Check underlying MockTest exists and is PUBLISHED
    const mockTest = await prisma.mockTest.findUnique({
      where: { id: input.mockTestId },
      include: {
        questions: true,
        examCycle: true,
      },
    });

    if (!mockTest) {
      throw new RankedTestServiceError('Underlying Mock Test not found', 404);
    }

    if (mockTest.status !== 'PUBLISHED' || !mockTest.isPublished) {
      throw new RankedTestServiceError(
        `Underlying Mock Test '${mockTest.code}' is not Published (Status: ${mockTest.status}). A Ranked Test can only be created from a PUBLISHED Test.`,
        400
      );
    }

    if (mockTest.questions.length === 0 || mockTest.questions.length !== mockTest.totalQuestions) {
      throw new RankedTestServiceError(
        `Underlying Mock Test question count mismatch: ${mockTest.questions.length} questions attached out of ${mockTest.totalQuestions} configured total.`,
        400
      );
    }

    // 2. Validate Series Entry relationship if present
    if (input.testSeriesTestId) {
      const seriesTest = await prisma.testSeriesTest.findUnique({
        where: { id: input.testSeriesTestId },
      });
      if (!seriesTest) {
        throw new RankedTestServiceError('Specified Test Series Test entry not found', 404);
      }
      if (seriesTest.mockTestId !== input.mockTestId) {
        throw new RankedTestServiceError('Specified Test Series Test entry does not match the chosen Mock Test ID', 400);
      }
    }

    // 3. Generate Sequence Code
    const { code } = await this.getNextRankedCodePreview();

    // 4. Create Ranked Test record
    const created = await prisma.rankedTest.create({
      data: {
        code,
        mockTestId: input.mockTestId,
        testSeriesTestId: input.testSeriesTestId || null,
        mode: input.mode,
        status: 'DRAFT',
        availableFrom: new Date(input.availableFrom),
        startDeadlineAt: input.startDeadlineAt ? new Date(input.startDeadlineAt) : null,
        scheduledStartAt: input.scheduledStartAt ? new Date(input.scheduledStartAt) : null,
        scheduledEndAt: input.scheduledEndAt ? new Date(input.scheduledEndAt) : null,
        latestJoinAt: input.latestJoinAt ? new Date(input.latestJoinAt) : null,
        solutionReleasePolicy: input.solutionReleasePolicy || 'AFTER_RESULTS_PUBLISHED',
        createdByAdminId: adminUserId || null,
      },
      include: {
        mockTest: {
          include: { examCycle: true },
        },
      },
    });

    return this.mapToRankedTestResponse(created);
  }

  /**
   * 2. List Ranked Tests with search & status filters
   */
  static async getRankedTestList(params?: {
    search?: string;
    mode?: string;
    status?: string;
    examCycleId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (params?.status) {
      where.status = params.status;
    }

    if (params?.mode) {
      where.mode = params.mode;
    }

    if (params?.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { mockTest: { titleEn: { contains: params.search, mode: 'insensitive' } } },
        { mockTest: { titleKn: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    if (params?.examCycleId) {
      where.mockTest = { examCycleId: params.examCycleId };
    }

    const [items, total] = await Promise.all([
      prisma.rankedTest.findMany({
        where,
        include: {
          mockTest: {
            include: { examCycle: true },
          },
          _count: {
            select: { attempts: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.rankedTest.count({ where }),
    ]);

    const mapped = await Promise.all(items.map((item) => this.mapToRankedTestResponse(item)));

    return {
      items: mapped,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * 3. Get Ranked Test by ID
   */
  static async getRankedTestById(id: string): Promise<RankedTestResponse> {
    const config = await prisma.rankedTest.findUnique({
      where: { id },
      include: {
        mockTest: {
          include: { examCycle: true },
        },
        _count: {
          select: { attempts: true },
        },
      },
    });

    if (!config) {
      throw new RankedTestServiceError('Ranked Test configuration not found', 404);
    }

    return this.mapToRankedTestResponse(config);
  }

  /**
   * 4. Activate Ranked Test (Freezes config)
   */
  static async activateRankedTest(id: string, adminUserId?: string): Promise<RankedTestResponse> {
    const config = await prisma.rankedTest.findUnique({
      where: { id },
      include: { mockTest: { include: { questions: true } } },
    });

    if (!config) {
      throw new RankedTestServiceError('Ranked Test configuration not found', 404);
    }

    if (config.status !== 'DRAFT') {
      throw new RankedTestServiceError(`Cannot activate Ranked Test in '${config.status}' status. Must be DRAFT.`, 400);
    }

    // Verify readiness
    if (!config.mockTest || config.mockTest.status !== 'PUBLISHED' || !config.mockTest.isPublished) {
      throw new RankedTestServiceError('Cannot activate: Underlying Mock Test is not Published', 400);
    }

    if (config.mockTest.questions.length !== config.mockTest.totalQuestions) {
      throw new RankedTestServiceError('Cannot activate: Question count mismatch in underlying Test', 400);
    }

    const updated = await prisma.rankedTest.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        publishedByAdminId: adminUserId || null,
      },
      include: {
        mockTest: { include: { examCycle: true } },
      },
    });

    return this.mapToRankedTestResponse(updated);
  }

  /**
   * 5. Close Ranked Test
   */
  static async closeRankedTest(id: string, adminUserId?: string): Promise<RankedTestResponse> {
    const config = await prisma.rankedTest.findUnique({
      where: { id },
    });

    if (!config) {
      throw new RankedTestServiceError('Ranked Test configuration not found', 404);
    }

    if (config.status !== 'ACTIVE') {
      throw new RankedTestServiceError(`Cannot close Ranked Test in '${config.status}' status. Must be ACTIVE.`, 400);
    }

    // Auto-finalize any overdue active attempts atomically
    await this.finalizeExpiredAttempts(id);

    const updated = await prisma.rankedTest.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
      include: {
        mockTest: { include: { examCycle: true } },
      },
    });

    return this.mapToRankedTestResponse(updated);
  }

  /**
   * 6. Student: List Eligible Ranked Tests
   */
  static async getStudentRankedTests(studentId: string): Promise<StudentRankedTestSummary[]> {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new RankedTestServiceError('Student account not found', 404);
    }

    const activeConfigs = await prisma.rankedTest.findMany({
      where: {
        status: { in: ['ACTIVE', 'CLOSED', 'RESULTS_PUBLISHED'] },
      },
      include: {
        mockTest: { include: { examCycle: true } },
        attempts: {
          where: { studentId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const studentLang = student.preparationLanguage || 'kn';

    return activeConfigs.map((c) => {
      const myAttempt = c.attempts[0];
      let attemptState: StudentRankedTestSummary['attemptState'] = 'NOT_STARTED';

      if (myAttempt) {
        if (c.status === 'RESULTS_PUBLISHED') {
          attemptState = 'RESULTS_PUBLISHED';
        } else {
          attemptState = myAttempt.status as any;
        }
      }

      return {
        id: c.id,
        code: c.code,
        title: studentLang === 'en' ? c.mockTest?.titleEn || '' : c.mockTest?.titleKn || '',
        examTitle: c.mockTest?.examCycle ? (studentLang === 'en' ? c.mockTest.examCycle.titleEn : c.mockTest.examCycle.titleKn) : '',
        mode: c.mode,
        totalQuestions: c.mockTest?.totalQuestions || 0,
        durationMinutes: c.mockTest?.durationMinutes || 60,
        availableFrom: c.availableFrom.toISOString(),
        startDeadlineAt: c.startDeadlineAt?.toISOString() || null,
        scheduledStartAt: c.scheduledStartAt?.toISOString() || null,
        scheduledEndAt: c.scheduledEndAt?.toISOString() || null,
        latestJoinAt: c.latestJoinAt?.toISOString() || null,
        status: c.status,
        resultPublicationStatus: c.resultPublicationStatus,
        attemptState,
        myAttemptId: myAttempt?.id || null,
      };
    });
  }

  /**
   * 7. Student: Start or Resume Attempt
   * Transactional & Concurrency Safe (Enforces ONE attempt per student per Ranked Test)
   */
  static async startOrResumeAttempt(rankedTestId: string, studentId: string): Promise<StudentAttemptResponse> {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new RankedTestServiceError('Student account not found', 404);
    }

    if (!student.isActive || student.accountStatus !== 'ACTIVE') {
      throw new RankedTestServiceError('Student account is inactive or suspended', 403);
    }

    const config = await prisma.rankedTest.findUnique({
      where: { id: rankedTestId },
      include: {
        mockTest: {
          include: {
            questions: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!config) {
      throw new RankedTestServiceError('Ranked Test not found', 404);
    }

    if (config.status !== 'ACTIVE') {
      throw new RankedTestServiceError(`Ranked Test is not currently ACTIVE (Status: ${config.status})`, 400);
    }

    const now = new Date();
    const nowMs = now.getTime();

    // Check Start Window
    const availableFromMs = new Date(config.availableFrom).getTime();
    if (nowMs < availableFromMs) {
      throw new RankedTestServiceError(`Ranked Test is not available until ${config.availableFrom.toISOString()}`, 400);
    }

    if (config.mode === 'ANYTIME_RANKED') {
      if (config.startDeadlineAt) {
        const deadlineMs = new Date(config.startDeadlineAt).getTime();
        if (nowMs > deadlineMs) {
          throw new RankedTestServiceError('The start window for this Anytime Ranked Test has expired.', 400);
        }
      }
    } else if (config.mode === 'SCHEDULED_LIVE') {
      const scheduledStartMs = new Date(config.scheduledStartAt!).getTime();
      const scheduledEndMs = new Date(config.scheduledEndAt!).getTime();

      if (nowMs < scheduledStartMs) {
        throw new RankedTestServiceError(`Scheduled Live examination has not started yet. Starts at ${config.scheduledStartAt!.toISOString()}`, 400);
      }

      if (nowMs >= scheduledEndMs) {
        throw new RankedTestServiceError('Scheduled Live examination has ended.', 400);
      }

      if (config.latestJoinAt) {
        const latestJoinMs = new Date(config.latestJoinAt).getTime();
        if (nowMs > latestJoinMs) {
          throw new RankedTestServiceError('The latest join time for this Live examination has passed.', 400);
        }
      }
    }

    // Check if attempt already exists (ONE-ATTEMPT RULE + REFRESH RESUME)
    let existingAttempt = await prisma.rankedAttempt.findUnique({
      where: {
        rankedTestId_studentId: {
          rankedTestId,
          studentId,
        },
      },
      include: {
        answers: true,
      },
    });

    if (existingAttempt) {
      // If already finalized or invalidated
      if (existingAttempt.status !== 'ACTIVE') {
        throw new RankedTestServiceError(
          `Ranked Test attempt already completed/finalized (Status: ${existingAttempt.status}). Retakes are strictly prohibited for Ranked Tests.`,
          400
        );
      }

      // Check if server time has expired
      const expiresAtMs = new Date(existingAttempt.expiresAt).getTime();
      if (nowMs >= expiresAtMs) {
        // Auto-finalize immediately
        const finalized = await this.autoSubmitAttempt(existingAttempt.id);
        throw new RankedTestServiceError('Time expired for your attempt. Attempt submitted automatically.', 400);
      }

      // Return existing active attempt (Resume cleanly)
      return this.formatStudentAttemptResponse(existingAttempt, config, now);
    }

    // Create NEW attempt transactionally
    const durationMinutes = config.mockTest?.durationMinutes || 60;
    let startedAt = now;
    let expiresAt: Date;

    if (config.mode === 'ANYTIME_RANKED') {
      expiresAt = new Date(nowMs + durationMinutes * 60 * 1000);
    } else {
      // SCHEDULED_LIVE: Server deadline is global scheduledEndAt
      expiresAt = new Date(config.scheduledEndAt!);
    }

    const prepLang = (student.preparationLanguage || 'kn') as PreparationLanguage;

    try {
      const newAttempt = await prisma.rankedAttempt.create({
        data: {
          rankedTestId,
          studentId,
          status: 'ACTIVE',
          startedAt,
          expiresAt,
          preparationLanguage: prepLang,
          totalQuestions: config.mockTest?.totalQuestions || 0,
          maximumMarks: config.mockTest?.totalMarks || 0,
        },
        include: {
          answers: true,
        },
      });

      return this.formatStudentAttemptResponse(newAttempt, config, now);
    } catch (err: any) {
      // Handle potential race condition if 2 start requests arrive simultaneously
      if (err.code === 'P2002') {
        const retryAttempt = await prisma.rankedAttempt.findUnique({
          where: { rankedTestId_studentId: { rankedTestId, studentId } },
          include: { answers: true },
        });
        if (retryAttempt) {
          return this.formatStudentAttemptResponse(retryAttempt, config, now);
        }
      }
      throw err;
    }
  }

  /**
   * 8. Student: Get Attempt Questions (Snapshot payload in student's preparation language)
   * SECURITY: NEVER exposes correct option, explanations, or internal scoring
   */
  static async getAttemptQuestions(attemptId: string, studentId: string): Promise<StudentAttemptQuestionPayload[]> {
    const attempt = await prisma.rankedAttempt.findUnique({
      where: { id: attemptId },
      include: {
        rankedTest: {
          include: {
            mockTest: {
              include: {
                questions: {
                  orderBy: { displayOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new RankedTestServiceError('Attempt not found', 404);
    }

    if (attempt.studentId !== studentId) {
      throw new RankedTestServiceError('Access denied: You do not own this attempt', 403);
    }

    const questions = attempt.rankedTest.mockTest?.questions || [];
    const isEn = attempt.preparationLanguage === 'en';

    return questions.map((q) => ({
      mockTestQuestionId: q.id,
      questionId: q.questionId,
      displayOrder: q.displayOrder,
      sectionTitle: isEn ? q.sectionTitleEn : q.sectionTitleKn,
      questionText: (isEn ? q.snapshotQuestionEn : q.snapshotQuestionKn) || '',
      optionA: (isEn ? q.snapshotOptionA_En : q.snapshotOptionA_Kn) || '',
      optionB: (isEn ? q.snapshotOptionB_En : q.snapshotOptionB_Kn) || '',
      optionC: (isEn ? q.snapshotOptionC_En : q.snapshotOptionC_Kn) || '',
      optionD: (isEn ? q.snapshotOptionD_En : q.snapshotOptionD_Kn) || '',
      positiveMarks: Number(q.snapshotPositiveMarks || q.positiveMarks || 1.0),
      negativeMarks: Number(q.snapshotNegativeMarks || q.negativeMarks || 0.25),
    }));
  }

  /**
   * 9. Student: Idempotent Answer Autosave
   */
  static async saveAnswer(attemptId: string, studentId: string, input: SaveRankedAnswerInput) {
    const attempt = await prisma.rankedAttempt.findUnique({
      where: { id: attemptId },
      include: {
        rankedTest: {
          include: {
            mockTest: {
              include: { questions: { select: { id: true } } },
            },
          },
        },
      },
    });

    if (!attempt) {
      throw new RankedTestServiceError('Attempt not found', 404);
    }

    if (attempt.studentId !== studentId) {
      throw new RankedTestServiceError('Access denied: You do not own this attempt', 403);
    }

    if (attempt.status !== 'ACTIVE') {
      throw new RankedTestServiceError(`Cannot save answer for finalized attempt (Status: ${attempt.status})`, 400);
    }

    const now = new Date();
    if (now.getTime() >= new Date(attempt.expiresAt).getTime()) {
      await this.autoSubmitAttempt(attemptId);
      throw new RankedTestServiceError('Time expired for your attempt. Your answers have been submitted automatically.', 400);
    }

    // Verify question belongs to this MockTest
    const validQuestionIds = attempt.rankedTest.mockTest?.questions.map((q) => q.id) || [];
    if (!validQuestionIds.includes(input.mockTestQuestionId)) {
      throw new RankedTestServiceError('Specified Question does not belong to this Ranked Test', 400);
    }

    // Upsert answer idempotently
    const saved = await prisma.rankedAttemptAnswer.upsert({
      where: {
        attemptId_mockTestQuestionId: {
          attemptId,
          mockTestQuestionId: input.mockTestQuestionId,
        },
      },
      update: {
        selectedOption: input.selectedOption !== undefined ? input.selectedOption : undefined,
        isMarkedForReview: input.isMarkedForReview !== undefined ? input.isMarkedForReview : undefined,
      },
      create: {
        attemptId,
        mockTestQuestionId: input.mockTestQuestionId,
        selectedOption: input.selectedOption || null,
        isMarkedForReview: input.isMarkedForReview || false,
      },
    });

    // Update attemptedCount on attempt
    const answeredCount = await prisma.rankedAttemptAnswer.count({
      where: {
        attemptId,
        selectedOption: { not: null },
      },
    });

    await prisma.rankedAttempt.update({
      where: { id: attemptId },
      data: { attemptedCount: answeredCount },
    });

    return {
      success: true,
      savedAnswer: {
        mockTestQuestionId: saved.mockTestQuestionId,
        selectedOption: saved.selectedOption,
        isMarkedForReview: saved.isMarkedForReview,
      },
      attemptedCount: answeredCount,
    };
  }

  /**
   * 10. Student: Manual Final Submit
   */
  static async submitAttempt(attemptId: string, studentId: string): Promise<any> {
    const attempt = await prisma.rankedAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new RankedTestServiceError('Attempt not found', 404);
    }

    if (attempt.studentId !== studentId) {
      throw new RankedTestServiceError('Access denied: You do not own this attempt', 403);
    }

    if (attempt.status !== 'ACTIVE') {
      // If already submitted, return current finalized state cleanly
      return this.getFinalizedSubmissionSummary(attemptId);
    }

    return this.finalizeScoredAttempt(attemptId, 'MANUAL');
  }

  /**
   * 11. Auto-submit expired attempt
   */
  static async autoSubmitAttempt(attemptId: string): Promise<any> {
    const attempt = await prisma.rankedAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt || attempt.status !== 'ACTIVE') {
      return;
    }

    return this.finalizeScoredAttempt(attemptId, 'AUTO_TIMED_OUT');
  }

  /**
   * 12. Finalize Scored Attempt (Atomically calculates score from frozen snapshots)
   */
  private static async finalizeScoredAttempt(attemptId: string, submissionType: 'MANUAL' | 'AUTO_TIMED_OUT'): Promise<any> {
    const attempt = await prisma.rankedAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: true,
        rankedTest: {
          include: {
            mockTest: {
              include: {
                questions: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) return;

    const submittedAt = new Date();
    const questions = attempt.rankedTest.mockTest?.questions || [];
    const answersMap = new Map(attempt.answers.map((a) => [a.mockTestQuestionId, a.selectedOption]));

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    let rawScoreNum = 0.0;
    let negativeMarksNum = 0.0;
    let totalMarksNum = 0.0;

    for (const q of questions) {
      const pos = Number(q.snapshotPositiveMarks || q.positiveMarks || 1.0);
      const neg = Number(q.snapshotNegativeMarks || q.negativeMarks || 0.25);
      const correctOpt = q.snapshotCorrectOption;
      totalMarksNum += pos;

      const selected = answersMap.get(q.id);
      if (!selected) {
        unansweredCount++;
      } else if (selected === correctOpt) {
        correctCount++;
        rawScoreNum += pos;
      } else {
        wrongCount++;
        negativeMarksNum += neg;
        rawScoreNum -= neg;
      }
    }

    const attemptedCount = correctCount + wrongCount;
    const totalQuestions = questions.length;

    // Time taken calculation
    const startMs = new Date(attempt.startedAt).getTime();
    const subMs = submittedAt.getTime();
    const expMs = new Date(attempt.expiresAt).getTime();
    const effectiveEndMs = Math.min(subMs, expMs);
    const timeTakenSeconds = Math.max(0, Math.floor((effectiveEndMs - startMs) / 1000));

    const percentage = totalMarksNum > 0 ? (rawScoreNum / totalMarksNum) * 100 : 0;

    const updated = await prisma.rankedAttempt.update({
      where: { id: attemptId },
      data: {
        status: submissionType === 'AUTO_TIMED_OUT' ? 'AUTO_SUBMITTED' : 'SUBMITTED',
        submissionType,
        submittedAt,
        totalQuestions,
        attemptedCount,
        correctCount,
        wrongCount,
        unansweredCount,
        rawScore: rawScoreNum,
        maximumMarks: totalMarksNum,
        negativeMarksApplied: negativeMarksNum,
        percentage,
        timeTakenSeconds,
      },
    });

    return updated;
  }

  /**
   * Helper: Finalized submission summary for post-submit screen
   * SECURITY: Does NOT reveal correct options or solutions before results published
   */
  private static async getFinalizedSubmissionSummary(attemptId: string) {
    const attempt = await prisma.rankedAttempt.findUnique({
      where: { id: attemptId },
      include: {
        rankedTest: true,
      },
    });

    return {
      attemptId: attempt!.id,
      status: attempt!.status,
      submittedAt: attempt!.submittedAt?.toISOString(),
      totalQuestions: attempt!.totalQuestions,
      attemptedCount: attempt!.attemptedCount,
      timeTakenSeconds: attempt!.timeTakenSeconds,
      resultPublicationStatus: attempt!.rankedTest.resultPublicationStatus,
      message: 'Test submitted successfully. Results will be available after official publication.',
    };
  }

  /**
   * 13. Admin: Generate Competition Rankings
   * Deterministic Priority:
   * 1. Score (desc)
   * 2. Correct Count (desc)
   * 3. Wrong Count (asc)
   * 4. Time Taken Seconds (asc)
   * Genuine ties receive IDENTICAL displayed rank (e.g. 1, 1, 3).
   */
  static async generateRankings(rankedTestId: string, adminUserId?: string) {
    const config = await prisma.rankedTest.findUnique({
      where: { id: rankedTestId },
    });

    if (!config) {
      throw new RankedTestServiceError('Ranked Test not found', 404);
    }

    if (config.status === 'ACTIVE') {
      throw new RankedTestServiceError('Cannot generate rankings while Ranked Test is still ACTIVE. Must close test first.', 400);
    }

    // Auto-finalize any remaining overdue active attempts
    await this.finalizeExpiredAttempts(rankedTestId);

    // Fetch valid finalized attempts
    const validAttempts = await prisma.rankedAttempt.findMany({
      where: {
        rankedTestId,
        status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
      },
      orderBy: [
        { rawScore: 'desc' },
        { correctCount: 'desc' },
        { wrongCount: 'asc' },
        { timeTakenSeconds: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    const totalParticipants = validAttempts.length;

    // Delete any existing stale draft results in transaction
    await prisma.$transaction(async (tx) => {
      await tx.rankedResult.deleteMany({ where: { rankedTestId } });

      let currentRank = 1;
      const resultsToCreate: any[] = [];

      for (let i = 0; i < validAttempts.length; i++) {
        const curr = validAttempts[i];

        if (i > 0) {
          const prev = validAttempts[i - 1];
          const isSameScore = Number(curr.rawScore) === Number(prev.rawScore);
          const isSameCorrect = curr.correctCount === prev.correctCount;
          const isSameWrong = curr.wrongCount === prev.wrongCount;
          const isSameTime = curr.timeTakenSeconds === prev.timeTakenSeconds;

          // If NOT identical on all 4 criteria, rank jumps to i + 1 (Competition Ranking)
          if (!isSameScore || !isSameCorrect || !isSameWrong || !isSameTime) {
            currentRank = i + 1;
          }
        }

        resultsToCreate.push({
          rankedTestId,
          attemptId: curr.id,
          studentId: curr.studentId,
          rank: currentRank,
          totalParticipants,
          rawScore: curr.rawScore,
          correctCount: curr.correctCount,
          wrongCount: curr.wrongCount,
          unansweredCount: curr.unansweredCount,
          timeTakenSeconds: curr.timeTakenSeconds,
          rankingPolicyVersion: 'v1.0',
        });
      }

      if (resultsToCreate.length > 0) {
        await tx.rankedResult.createMany({
          data: resultsToCreate,
        });
      }

      await tx.rankedTest.update({
        where: { id: rankedTestId },
        data: {
          resultPublicationStatus: 'READY',
        },
      });
    });

    return {
      success: true,
      totalParticipants,
      message: `Rankings generated successfully for ${totalParticipants} participant(s).`,
    };
  }

  /**
   * 14. Admin: Publish Results
   */
  static async publishResults(rankedTestId: string, adminUserId?: string) {
    const config = await prisma.rankedTest.findUnique({
      where: { id: rankedTestId },
    });

    if (!config) {
      throw new RankedTestServiceError('Ranked Test not found', 404);
    }

    if (config.status === 'ACTIVE') {
      throw new RankedTestServiceError('Cannot publish results while Ranked Test is ACTIVE. Close test first.', 400);
    }

    const resultsCount = await prisma.rankedResult.count({ where: { rankedTestId } });
    if (resultsCount === 0) {
      // Auto-generate rankings if not generated yet
      await this.generateRankings(rankedTestId, adminUserId);
    }

    const now = new Date();

    const updated = await prisma.rankedTest.update({
      where: { id: rankedTestId },
      data: {
        status: 'RESULTS_PUBLISHED',
        resultPublicationStatus: 'PUBLISHED',
        resultsPublishedAt: now,
      },
      include: {
        mockTest: { include: { examCycle: true } },
      },
    });

    return this.mapToRankedTestResponse(updated);
  }

  /**
   * 15. Student: Get My Result
   */
  static async getStudentResult(rankedTestId: string, studentId: string): Promise<StudentResultResponse> {
    const config = await prisma.rankedTest.findUnique({
      where: { id: rankedTestId },
      include: {
        mockTest: true,
      },
    });

    if (!config) {
      throw new RankedTestServiceError('Ranked Test not found', 404);
    }

    const attempt = await prisma.rankedAttempt.findUnique({
      where: {
        rankedTestId_studentId: { rankedTestId, studentId },
      },
      include: {
        result: true,
      },
    });

    if (!attempt) {
      throw new RankedTestServiceError('No attempt record found for this Ranked Test', 404);
    }

    const isPublished = config.resultPublicationStatus === 'PUBLISHED' || config.status === 'RESULTS_PUBLISHED';

    if (!isPublished) {
      return {
        rankedTestId: config.id,
        rankedTestCode: config.code,
        testTitle: attempt.preparationLanguage === 'en' ? config.mockTest?.titleEn || '' : config.mockTest?.titleKn || '',
        status: config.status,
        resultPublicationStatus: config.resultPublicationStatus,
        solutionReleasePolicy: config.solutionReleasePolicy,
        canViewSolutions: false,
      };
    }

    const res = attempt.result;

    return {
      rankedTestId: config.id,
      rankedTestCode: config.code,
      testTitle: attempt.preparationLanguage === 'en' ? config.mockTest?.titleEn || '' : config.mockTest?.titleKn || '',
      status: config.status,
      resultPublicationStatus: config.resultPublicationStatus,
      rank: res?.rank || null,
      totalParticipants: res?.totalParticipants || null,
      rawScore: res ? Number(res.rawScore) : Number(attempt.rawScore),
      maximumMarks: Number(attempt.maximumMarks),
      correctCount: res ? res.correctCount : attempt.correctCount,
      wrongCount: res ? res.wrongCount : attempt.wrongCount,
      unansweredCount: res ? res.unansweredCount : attempt.unansweredCount,
      percentage: Number(attempt.percentage),
      timeTakenSeconds: res ? res.timeTakenSeconds : attempt.timeTakenSeconds,
      publishedAt: res?.publishedAt.toISOString() || config.resultsPublishedAt?.toISOString() || null,
      solutionReleasePolicy: config.solutionReleasePolicy,
      canViewSolutions: config.solutionReleasePolicy === 'AFTER_RESULTS_PUBLISHED',
    };
  }

  /**
   * 16. Student: Privacy-Safe Leaderboard
   * Exposes NO sensitive identity (email, phone, DOB, guardian info, internal user ID)
   */
  static async getLeaderboard(rankedTestId: string, studentId: string, params?: { page?: number; pageSize?: number }) {
    const config = await prisma.rankedTest.findUnique({
      where: { id: rankedTestId },
    });

    if (!config) {
      throw new RankedTestServiceError('Ranked Test not found', 404);
    }

    if (config.resultPublicationStatus !== 'PUBLISHED' && config.status !== 'RESULTS_PUBLISHED') {
      throw new RankedTestServiceError('Leaderboard is not available until official results publication', 400);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const [results, total] = await Promise.all([
      prisma.rankedResult.findMany({
        where: { rankedTestId },
        include: {
          student: {
            select: { id: true, fullName: true },
          },
        },
        orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: pageSize,
      }),
      prisma.rankedResult.count({ where: { rankedTestId } }),
    ]);

    // Student's own rank
    const myResult = await prisma.rankedResult.findUnique({
      where: {
        attemptId: (
          await prisma.rankedAttempt.findUnique({
            where: { rankedTestId_studentId: { rankedTestId, studentId } },
            select: { id: true },
          })
        )?.id || '',
      },
    });

    const entries: LeaderboardEntryResponse[] = results.map((r) => {
      // Mask name safely: e.g. "Rahul S." or neutral representation
      const nameParts = r.student.fullName.trim().split(' ');
      const maskedName =
        nameParts.length > 1
          ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
          : nameParts[0];

      return {
        rank: r.rank,
        studentDisplayName: maskedName,
        rawScore: Number(r.rawScore),
        correctCount: r.correctCount,
        wrongCount: r.wrongCount,
        timeTakenSeconds: r.timeTakenSeconds,
        isCurrentStudent: r.studentId === studentId,
      };
    });

    return {
      entries,
      myRank: myResult
        ? {
            rank: myResult.rank,
            totalParticipants: myResult.totalParticipants,
            rawScore: Number(myResult.rawScore),
          }
        : null,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * 17. Student: Solution Review (Available only AFTER result publication if policy permits)
   */
  static async getSolutionReview(rankedTestId: string, studentId: string): Promise<SolutionReviewItem[]> {
    const config = await prisma.rankedTest.findUnique({
      where: { id: rankedTestId },
      include: {
        mockTest: {
          include: {
            questions: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!config) {
      throw new RankedTestServiceError('Ranked Test not found', 404);
    }

    if (config.resultPublicationStatus !== 'PUBLISHED' && config.status !== 'RESULTS_PUBLISHED') {
      throw new RankedTestServiceError('Solution review is blocked until official results publication', 403);
    }

    if (config.solutionReleasePolicy === 'NEVER') {
      throw new RankedTestServiceError('Solutions are configured as NEVER released for this Ranked Test', 403);
    }

    const attempt = await prisma.rankedAttempt.findUnique({
      where: {
        rankedTestId_studentId: { rankedTestId, studentId },
      },
      include: {
        answers: true,
      },
    });

    if (!attempt) {
      throw new RankedTestServiceError('No attempt record found', 404);
    }

    const answersMap = new Map(attempt.answers.map((a) => [a.mockTestQuestionId, a.selectedOption]));
    const isEn = attempt.preparationLanguage === 'en';

    return (config.mockTest?.questions || []).map((q) => {
      const pos = Number(q.snapshotPositiveMarks || q.positiveMarks || 1.0);
      const neg = Number(q.snapshotNegativeMarks || q.negativeMarks || 0.25);
      const selected = answersMap.get(q.id) || null;
      const correctOpt = q.snapshotCorrectOption || '';
      const isCorrect = selected === correctOpt;

      let marksAwarded = 0;
      if (selected) {
        marksAwarded = isCorrect ? pos : -neg;
      }

      return {
        mockTestQuestionId: q.id,
        displayOrder: q.displayOrder,
        sectionTitle: isEn ? q.sectionTitleEn : q.sectionTitleKn,
        questionText: (isEn ? q.snapshotQuestionEn : q.snapshotQuestionKn) || '',
        optionA: (isEn ? q.snapshotOptionA_En : q.snapshotOptionA_Kn) || '',
        optionB: (isEn ? q.snapshotOptionB_En : q.snapshotOptionB_Kn) || '',
        optionC: (isEn ? q.snapshotOptionC_En : q.snapshotOptionC_Kn) || '',
        optionD: (isEn ? q.snapshotOptionD_En : q.snapshotOptionD_Kn) || '',
        studentSelectedOption: selected,
        correctOption: correctOpt,
        isCorrect,
        explanation: (isEn ? q.snapshotExplanationEn : q.snapshotExplanationKn) || '',
        positiveMarks: pos,
        negativeMarks: neg,
        marksAwarded,
      };
    });
  }

  /**
   * 18. Admin: Invalidate Student Attempt
   */
  static async invalidateAttempt(attemptId: string, input: InvalidateAttemptInput, adminUserId?: string): Promise<any> {
    const attempt = await prisma.rankedAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new RankedTestServiceError('Attempt not found', 404);
    }

    const updated = await prisma.rankedAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'INVALIDATED',
        invalidationReason: input.invalidationReason,
        invalidatedByAdminId: adminUserId || null,
      },
    });

    // Also delete any existing result record so it's excluded from rankings
    await prisma.rankedResult.deleteMany({ where: { attemptId } });

    return updated;
  }

  /**
   * Background / On-Demand Finalizer for Overdue Active Attempts
   */
  static async finalizeExpiredAttempts(rankedTestId?: string) {
    const now = new Date();
    const where: any = {
      status: 'ACTIVE',
      expiresAt: { lte: now },
    };

    if (rankedTestId) {
      where.rankedTestId = rankedTestId;
    }

    const overdueAttempts = await prisma.rankedAttempt.findMany({
      where,
      select: { id: true },
    });

    for (const att of overdueAttempts) {
      await this.autoSubmitAttempt(att.id);
    }

    return overdueAttempts.length;
  }

  /**
   * Helper: Map RankedTest to RankedTestResponse DTO
   */
  private static async mapToRankedTestResponse(item: any): Promise<RankedTestResponse> {
    const counts = await prisma.rankedAttempt.groupBy({
      by: ['status'],
      where: { rankedTestId: item.id },
      _count: { status: true },
    });

    let totalAttemptsCount = 0;
    let activeAttemptsCount = 0;
    let submittedAttemptsCount = 0;
    let autoSubmittedAttemptsCount = 0;
    let invalidatedAttemptsCount = 0;

    for (const c of counts) {
      const cnt = c._count.status;
      totalAttemptsCount += cnt;
      if (c.status === 'ACTIVE') activeAttemptsCount = cnt;
      if (c.status === 'SUBMITTED') submittedAttemptsCount = cnt;
      if (c.status === 'AUTO_SUBMITTED') autoSubmittedAttemptsCount = cnt;
      if (c.status === 'INVALIDATED') invalidatedAttemptsCount = cnt;
    }

    const readinessErrors: string[] = [];
    if (!item.mockTest) {
      readinessErrors.push('Underlying Mock Test is missing');
    } else {
      if (item.mockTest.status !== 'PUBLISHED' || !item.mockTest.isPublished) {
        readinessErrors.push(`Underlying Mock Test '${item.mockTest.code}' is not Published`);
      }
    }

    return {
      id: item.id,
      code: item.code,
      mockTestId: item.mockTestId,
      testSeriesTestId: item.testSeriesTestId,
      mode: item.mode,
      status: item.status,
      availableFrom: item.availableFrom.toISOString(),
      startDeadlineAt: item.startDeadlineAt?.toISOString() || null,
      scheduledStartAt: item.scheduledStartAt?.toISOString() || null,
      scheduledEndAt: item.scheduledEndAt?.toISOString() || null,
      latestJoinAt: item.latestJoinAt?.toISOString() || null,
      resultPublicationStatus: item.resultPublicationStatus,
      solutionReleasePolicy: item.solutionReleasePolicy,
      createdByAdminId: item.createdByAdminId,
      publishedByAdminId: item.publishedByAdminId,
      closedAt: item.closedAt?.toISOString() || null,
      resultsPublishedAt: item.resultsPublishedAt?.toISOString() || null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      mockTest: item.mockTest
        ? {
            id: item.mockTest.id,
            code: item.mockTest.code,
            titleEn: item.mockTest.titleEn,
            titleKn: item.mockTest.titleKn,
            totalQuestions: item.mockTest.totalQuestions,
            durationMinutes: item.mockTest.durationMinutes,
            totalMarks: Number(item.mockTest.totalMarks),
            status: item.mockTest.status,
            isPublished: item.mockTest.isPublished,
            examCycleId: item.mockTest.examCycleId,
            examCycle: item.mockTest.examCycle
              ? {
                  id: item.mockTest.examCycle.id,
                  cycleCode: item.mockTest.examCycle.cycleCode,
                  titleEn: item.mockTest.examCycle.titleEn,
                  titleKn: item.mockTest.examCycle.titleKn,
                }
              : null,
          }
        : null,
      totalAttemptsCount,
      activeAttemptsCount,
      submittedAttemptsCount,
      autoSubmittedAttemptsCount,
      invalidatedAttemptsCount,
      isReadinessValid: readinessErrors.length === 0,
      readinessErrors,
    };
  }

  /**
   * Helper: Format StudentAttemptResponse DTO with active timer calculation
   */
  private static formatStudentAttemptResponse(attempt: any, config: any, now: Date): StudentAttemptResponse {
    const nowMs = now.getTime();
    const expiresMs = new Date(attempt.expiresAt).getTime();
    const remainingSeconds = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
    const isExpired = remainingSeconds === 0;

    const savedAnswersMap: Record<string, { selectedOption: string | null; isMarkedForReview: boolean }> = {};
    if (attempt.answers) {
      for (const a of attempt.answers) {
        savedAnswersMap[a.mockTestQuestionId] = {
          selectedOption: a.selectedOption,
          isMarkedForReview: a.isMarkedForReview,
        };
      }
    }

    const isEn = attempt.preparationLanguage === 'en';

    return {
      attemptId: attempt.id,
      rankedTestId: config.id,
      rankedTestCode: config.code,
      testTitle: (isEn ? config.mockTest?.titleEn : config.mockTest?.titleKn) || '',
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      expiresAt: attempt.expiresAt.toISOString(),
      serverNow: now.toISOString(),
      remainingSeconds,
      preparationLanguage: attempt.preparationLanguage,
      totalQuestions: attempt.totalQuestions,
      attemptedCount: attempt.attemptedCount,
      isExpired,
      savedAnswers: savedAnswersMap,
    };
  }
}
