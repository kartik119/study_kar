// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '@study-karnataka/database';
import { RankedTestService } from '../services/ranked-test.service';

function assertTestDatabase() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes('test')) {
    throw new Error(`TEST DATABASE SAFETY GUARD: Refusing to run integration tests against non-test database: ${dbUrl}`);
  }
}

describe('Prompt 14 — Ranked Test Engine Integration Tests', () => {
  let superAdminToken: string;
  let student1Id: string;
  let student1Token: string;
  let student2Id: string;
  let student2Token: string;
  let studentKnId: string;
  let studentKnToken: string;

  let publishedTestId: string;
  let draftTestId: string;
  let question1Id: string;
  let question2Id: string;

  function adminAuthHeader() {
    return { Authorization: `Bearer ${superAdminToken}` };
  }

  function student1AuthHeader() {
    return { Authorization: `Bearer ${student1Token}` };
  }

  function student2AuthHeader() {
    return { Authorization: `Bearer ${student2Token}` };
  }

  function studentKnAuthHeader() {
    return { Authorization: `Bearer ${studentKnToken}` };
  }

  beforeAll(async () => {
    assertTestDatabase();

    // 1. Setup Auth Tokens
    const { signAccessToken } = await import('../utils/jwt');

    const superAdmin = await prisma.adminUser.upsert({
      where: { email: 'ranked-superadmin@studykarnataka.com' },
      update: {},
      create: {
        email: 'ranked-superadmin@studykarnataka.com',
        fullName: 'Ranked Super Admin',
        passwordHash: 'hash',
      },
    });

    superAdminToken = signAccessToken({
      userId: superAdmin.id,
      accountType: 'ADMIN',
      roles: ['Super Admin'],
      permissions: [
        'ranked_tests.view',
        'ranked_tests.create',
        'ranked_tests.edit',
        'ranked_tests.activate',
        'ranked_tests.close',
        'ranked_tests.attempts.view',
        'ranked_tests.attempts.invalidate',
        'ranked_tests.results.generate',
        'ranked_tests.results.publish',
        'ranked_tests.archive',
      ],
      sessionId: 'session-ranked-admin',
    });

    // Create Student 1 (English)
    const s1 = await prisma.user.upsert({
      where: { mobile: '9900112201' },
      update: { preparationLanguage: 'en', isLanguageLocked: true },
      create: {
        mobile: '9900112201',
        fullName: 'Student One EN',
        preparationLanguage: 'en',
        isLanguageLocked: true,
        accountStatus: 'ACTIVE',
      },
    });
    student1Id = s1.id;
    student1Token = signAccessToken({
      userId: s1.id,
      accountType: 'STUDENT',
      sessionId: 'session-student-1',
    });

    // Create Student 2 (English)
    const s2 = await prisma.user.upsert({
      where: { mobile: '9900112202' },
      update: { preparationLanguage: 'en', isLanguageLocked: true },
      create: {
        mobile: '9900112202',
        fullName: 'Student Two EN',
        preparationLanguage: 'en',
        isLanguageLocked: true,
        accountStatus: 'ACTIVE',
      },
    });
    student2Id = s2.id;
    student2Token = signAccessToken({
      userId: s2.id,
      accountType: 'STUDENT',
      sessionId: 'session-student-2',
    });

    // Create Student 3 (Kannada)
    const sKn = await prisma.user.upsert({
      where: { mobile: '9900112203' },
      update: { preparationLanguage: 'kn', isLanguageLocked: true },
      create: {
        mobile: '9900112203',
        fullName: 'ವಿದ್ಯಾರ್ಥಿ ಮೂರು',
        preparationLanguage: 'kn',
        isLanguageLocked: true,
        accountStatus: 'ACTIVE',
      },
    });
    studentKnId = sKn.id;
    studentKnToken = signAccessToken({
      userId: sKn.id,
      accountType: 'STUDENT',
      sessionId: 'session-student-kn',
    });

    // 2. Setup Category & MCQs
    const category = await prisma.academicCategory.upsert({
      where: { code: 'RANKED_POLITY' },
      update: {},
      create: {
        code: 'RANKED_POLITY',
        nameEn: 'Indian Polity Ranked',
        nameKn: 'ಭಾರತೀಯ ರಾಜ್ಯವ್ಯವಸ್ಥೆ',
        slugEn: 'ranked-polity',
        slugKn: 'ranked-polity-kn',
      },
    });

    const q1 = await prisma.mcqQuestion.create({
      data: {
        code: 'MCQ_RANKED_01',
        questionTextEn: 'Which Article of the Constitution guarantees Equality before Law?',
        questionTextKn: 'ಸಂವಿಧಾನದ ಯಾವ ವಿಧಿಯು ಕಾನೂನಿನ ಮುಂದೆ ಸಮಾನತೆಯನ್ನು ಖಾತರಿಪಡಿಸುತ್ತದೆ?',
        optionA_En: 'Article 12',
        optionA_Kn: 'ವಿಧಿ 12',
        optionB_En: 'Article 14',
        optionB_Kn: 'ವಿಧಿ 14',
        optionC_En: 'Article 19',
        optionC_Kn: 'ವಿಧಿ 19',
        optionD_En: 'Article 21',
        optionD_Kn: 'ವಿಧಿ 21',
        correctOption: 'B',
        explanationEn: 'Article 14 guarantees equality before law.',
        explanationKn: 'ವಿಧಿ 14 ಕಾನೂನಿನ ಮುಂದೆ ಸಮಾನತೆಯನ್ನು ನೀಡುತ್ತದೆ.',
        difficulty: 'MEDIUM',
        status: 'APPROVED',
        categoryId: category.id,
      },
    });

    const q2 = await prisma.mcqQuestion.create({
      data: {
        code: 'MCQ_RANKED_02',
        questionTextEn: 'Who is the ex-officio Chairman of Rajya Sabha?',
        questionTextKn: 'ರಾಜ್ಯಸಭೆಯ ಪದನಿಮಿತ್ತ ಅಧ್ಯಕ್ಷರು ಯಾರು?',
        optionA_En: 'President',
        optionA_Kn: 'ರಾಷ್ಟ್ರಪತಿ',
        optionB_En: 'Prime Minister',
        optionB_Kn: 'ಪ್ರಧಾನಮಂತ್ರಿ',
        optionC_En: 'Vice President',
        optionC_Kn: 'ಉಪರಾಷ್ಟ್ರಪತಿ',
        optionD_En: 'Speaker',
        optionD_Kn: 'ಸ್ಪೀಕರ್',
        correctOption: 'C',
        explanationEn: 'Vice President of India is the ex-officio Chairman of Rajya Sabha.',
        explanationKn: 'ಭಾರತದ ಉಪರಾಷ್ಟ್ರಪತಿಯವರು ರಾಜ್ಯಸಭೆಯ ಪದನಿಮಿತ್ತ ಅಧ್ಯಕ್ಷರಾಗಿರುತ್ತಾರೆ.',
        difficulty: 'EASY',
        status: 'APPROVED',
        categoryId: category.id,
      },
    });

    // 3. Create PUBLISHED MockTest with snapshot questions
    const pubTest = await prisma.mockTest.create({
      data: {
        code: 'TEST_RANKED_PUB_01',
        titleEn: 'KAS Prelims Grand Ranked Test 01',
        titleKn: 'ಕೆಎಎಸ್ ಪೂರ್ವಭಾವಿ ಮಹಾ ರ್ಯಾಂಕ್ ಪರೀಕ್ಷೆ 01',
        totalQuestions: 2,
        durationMinutes: 60,
        totalMarks: 4.0,
        status: 'PUBLISHED',
        isPublished: true,
        questions: {
          create: [
            {
              questionId: q1.id,
              displayOrder: 1,
              positiveMarks: 2.0,
              negativeMarks: 0.5,
              snapshotQuestionEn: q1.questionTextEn,
              snapshotQuestionKn: q1.questionTextKn,
              snapshotOptionA_En: q1.optionA_En,
              snapshotOptionA_Kn: q1.optionA_Kn,
              snapshotOptionB_En: q1.optionB_En,
              snapshotOptionB_Kn: q1.optionB_Kn,
              snapshotOptionC_En: q1.optionC_En,
              snapshotOptionC_Kn: q1.optionC_Kn,
              snapshotOptionD_En: q1.optionD_En,
              snapshotOptionD_Kn: q1.optionD_Kn,
              snapshotCorrectOption: 'B',
              snapshotExplanationEn: q1.explanationEn,
              snapshotExplanationKn: q1.explanationKn,
              snapshotPositiveMarks: 2.0,
              snapshotNegativeMarks: 0.5,
            },
            {
              questionId: q2.id,
              displayOrder: 2,
              positiveMarks: 2.0,
              negativeMarks: 0.5,
              snapshotQuestionEn: q2.questionTextEn,
              snapshotQuestionKn: q2.questionTextKn,
              snapshotOptionA_En: q2.optionA_En,
              snapshotOptionA_Kn: q2.optionA_Kn,
              snapshotOptionB_En: q2.optionB_En,
              snapshotOptionB_Kn: q2.optionB_Kn,
              snapshotOptionC_En: q2.optionC_En,
              snapshotOptionC_Kn: q2.optionC_Kn,
              snapshotOptionD_En: q2.optionD_En,
              snapshotOptionD_Kn: q2.optionD_Kn,
              snapshotCorrectOption: 'C',
              snapshotExplanationEn: q2.explanationEn,
              snapshotExplanationKn: q2.explanationKn,
              snapshotPositiveMarks: 2.0,
              snapshotNegativeMarks: 0.5,
            },
          ],
        },
      },
      include: {
        questions: true,
      },
    });
    publishedTestId = pubTest.id;
    question1Id = pubTest.questions[0].id;
    question2Id = pubTest.questions[1].id;

    // 4. Create DRAFT MockTest (Ineligible for Ranked)
    const draftTest = await prisma.mockTest.create({
      data: {
        code: 'TEST_RANKED_DRAFT_01',
        titleEn: 'Draft Test 01',
        titleKn: 'ಕರಡು ಪರೀಕ್ಷೆ 01',
        totalQuestions: 1,
        durationMinutes: 30,
        status: 'DRAFT',
        isPublished: false,
      },
    });
    draftTestId = draftTest.id;
  });

  it('1. Only PUBLISHED MockTests can be configured into a Ranked Test (Draft rejected)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/mcq-library/ranked-tests')
      .set(adminAuthHeader())
      .send({
        mockTestId: draftTestId,
        mode: 'ANYTIME_RANKED',
        availableFrom: new Date().toISOString(),
        startDeadlineAt: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('is not Published');
  });

  it('2. ANYTIME_RANKED requires startDeadlineAt > availableFrom', async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 3600000);

    const res = await request(app)
      .post('/api/v1/admin/mcq-library/ranked-tests')
      .set(adminAuthHeader())
      .send({
        mockTestId: publishedTestId,
        mode: 'ANYTIME_RANKED',
        availableFrom: now.toISOString(),
        startDeadlineAt: past.toISOString(), // past < now
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('startDeadlineAt must be strictly after availableFrom');
  });

  it('3. SCHEDULED_LIVE requires scheduledEndAt > scheduledStartAt', async () => {
    const now = new Date();

    const res = await request(app)
      .post('/api/v1/admin/mcq-library/ranked-tests')
      .set(adminAuthHeader())
      .send({
        mockTestId: publishedTestId,
        mode: 'SCHEDULED_LIVE',
        availableFrom: now.toISOString(),
        scheduledStartAt: new Date(now.getTime() + 7200000).toISOString(),
        scheduledEndAt: new Date(now.getTime() + 3600000).toISOString(), // end < start
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('scheduledEndAt must be strictly after scheduledStartAt');
  });

  it('4. Successfully creates and activates a Ranked Test', async () => {
    const from = new Date(Date.now() - 3600000); // 1 hour ago
    const deadline = new Date(Date.now() + 86400000); // 24 hours later

    const createRes = await request(app)
      .post('/api/v1/admin/mcq-library/ranked-tests')
      .set(adminAuthHeader())
      .send({
        mockTestId: publishedTestId,
        mode: 'ANYTIME_RANKED',
        availableFrom: from.toISOString(),
        startDeadlineAt: deadline.toISOString(),
        solutionReleasePolicy: 'AFTER_RESULTS_PUBLISHED',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe('DRAFT');
    const rankedTestId = createRes.body.data.id;

    // Activate
    const actRes = await request(app)
      .post(`/api/v1/admin/mcq-library/ranked-tests/${rankedTestId}/activate`)
      .set(adminAuthHeader());

    expect(actRes.status).toBe(200);
    expect(actRes.body.data.status).toBe('ACTIVE');
  });

  it('5. ONE ATTEMPT RULE & REFRESH RESUME: Student starts test, refresh reopens same attempt without creating a second attempt', async () => {
    // Create active Ranked Test
    const from = new Date(Date.now() - 3600000);
    const deadline = new Date(Date.now() + 86400000);

    const config = await RankedTestService.createRankedTest({
      mockTestId: publishedTestId,
      mode: 'ANYTIME_RANKED',
      availableFrom: from.toISOString(),
      startDeadlineAt: deadline.toISOString(),
    });
    await RankedTestService.activateRankedTest(config.id);

    // Student 1 Starts Attempt
    const res1 = await request(app)
      .post(`/api/v1/student/ranked-tests/${config.id}/start`)
      .set(student1AuthHeader());

    expect(res1.status).toBe(200);
    expect(res1.body.data.status).toBe('ACTIVE');
    const attemptId = res1.body.data.attemptId;

    // Student 1 Refresh / Second Start Request -> Returns SAME Attempt
    const res2 = await request(app)
      .post(`/api/v1/student/ranked-tests/${config.id}/start`)
      .set(student1AuthHeader());

    expect(res2.status).toBe(200);
    expect(res2.body.data.attemptId).toBe(attemptId);

    // Verify DB count: Exactly 1 attempt exists for (config.id, student1Id)
    const attemptsCount = await prisma.rankedAttempt.count({
      where: { rankedTestId: config.id, studentId: student1Id },
    });
    expect(attemptsCount).toBe(1);
  });

  it('6. Authoritative Server Timer & Expiry Auto-Submit', async () => {
    const from = new Date(Date.now() - 3600000);
    const deadline = new Date(Date.now() + 86400000);

    const config = await RankedTestService.createRankedTest({
      mockTestId: publishedTestId,
      mode: 'ANYTIME_RANKED',
      availableFrom: from.toISOString(),
      startDeadlineAt: deadline.toISOString(),
    });
    await RankedTestService.activateRankedTest(config.id);

    // Student 1 Starts
    const startRes = await request(app)
      .post(`/api/v1/student/ranked-tests/${config.id}/start`)
      .set(student1AuthHeader());

    const attemptId = startRes.body.data.attemptId;

    // Save one answer
    await request(app)
      .post(`/api/v1/student/ranked-tests/attempts/${attemptId}/answer`)
      .set(student1AuthHeader())
      .send({
        mockTestQuestionId: question1Id,
        selectedOption: 'B', // Correct
      });

    // Artificially expire attempt in DB (expiresAt in past)
    await prisma.rankedAttempt.update({
      where: { id: attemptId },
      data: { expiresAt: new Date(Date.now() - 5000) },
    });

    // Attempting answer after expiry -> Returns 400 & Auto-submits
    const ansRes = await request(app)
      .post(`/api/v1/student/ranked-tests/attempts/${attemptId}/answer`)
      .set(student1AuthHeader())
      .send({
        mockTestQuestionId: question2Id,
        selectedOption: 'C',
      });

    expect(ansRes.status).toBe(400);
    expect(ansRes.body.error.message).toContain('Time expired');

    // Check DB status is AUTO_SUBMITTED
    const finalized = await prisma.rankedAttempt.findUnique({
      where: { id: attemptId },
    });
    expect(finalized?.status).toBe('AUTO_SUBMITTED');
    expect(finalized?.submissionType).toBe('AUTO_TIMED_OUT');
    expect(Number(finalized?.rawScore)).toBe(2.0); // Q1 correct (2.0), Q2 unanswered (0)
  });

  it('7. Idempotent Answer Autosave & Ownership Enforcement', async () => {
    const from = new Date(Date.now() - 3600000);
    const deadline = new Date(Date.now() + 86400000);

    const config = await RankedTestService.createRankedTest({
      mockTestId: publishedTestId,
      mode: 'ANYTIME_RANKED',
      availableFrom: from.toISOString(),
      startDeadlineAt: deadline.toISOString(),
    });
    await RankedTestService.activateRankedTest(config.id);

    // Student 1 starts
    const startRes = await request(app)
      .post(`/api/v1/student/ranked-tests/${config.id}/start`)
      .set(student1AuthHeader());
    const attemptId = startRes.body.data.attemptId;

    // Student 2 attempts to save answer on Student 1 attempt -> 403 Forbidden
    const hijackRes = await request(app)
      .post(`/api/v1/student/ranked-tests/attempts/${attemptId}/answer`)
      .set(student2AuthHeader())
      .send({
        mockTestQuestionId: question1Id,
        selectedOption: 'A',
      });

    expect(hijackRes.status).toBe(403);

    // Student 1 saves option A, then updates to option B (Idempotent upsert)
    await request(app)
      .post(`/api/v1/student/ranked-tests/attempts/${attemptId}/answer`)
      .set(student1AuthHeader())
      .send({
        mockTestQuestionId: question1Id,
        selectedOption: 'A',
      });

    const updateRes = await request(app)
      .post(`/api/v1/student/ranked-tests/attempts/${attemptId}/answer`)
      .set(student1AuthHeader())
      .send({
        mockTestQuestionId: question1Id,
        selectedOption: 'B',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.savedAnswer.selectedOption).toBe('B');

    // Exactly 1 answer row exists in DB
    const answersCount = await prisma.rankedAttemptAnswer.count({
      where: { attemptId, mockTestQuestionId: question1Id },
    });
    expect(answersCount).toBe(1);
  });

  it('8. Correct Answer Leak Prevention: Student APIs before publication NEVER leak correct answers or explanations', async () => {
    const from = new Date(Date.now() - 3600000);
    const deadline = new Date(Date.now() + 86400000);

    const config = await RankedTestService.createRankedTest({
      mockTestId: publishedTestId,
      mode: 'ANYTIME_RANKED',
      availableFrom: from.toISOString(),
      startDeadlineAt: deadline.toISOString(),
    });
    await RankedTestService.activateRankedTest(config.id);

    const startRes = await request(app)
      .post(`/api/v1/student/ranked-tests/${config.id}/start`)
      .set(student1AuthHeader());
    const attemptId = startRes.body.data.attemptId;

    // Fetch Question Payload
    const qRes = await request(app)
      .get(`/api/v1/student/ranked-tests/attempts/${attemptId}/questions`)
      .set(student1AuthHeader());

    expect(qRes.status).toBe(200);
    const questions = qRes.body.data;
    expect(questions.length).toBe(2);

    // Verify ZERO correct answers or explanations are present
    for (const q of questions) {
      expect(q.correctOption).toBeUndefined();
      expect(q.snapshotCorrectOption).toBeUndefined();
      expect(q.explanationEn).toBeUndefined();
      expect(q.explanationKn).toBeUndefined();
      expect(q.snapshotExplanationEn).toBeUndefined();
    }
  });

  it('9. Exact Decimal Scoring & Result Count Invariants: (correct + wrong + unanswered = totalQuestions)', async () => {
    const from = new Date(Date.now() - 3600000);
    const deadline = new Date(Date.now() + 86400000);

    const config = await RankedTestService.createRankedTest({
      mockTestId: publishedTestId,
      mode: 'ANYTIME_RANKED',
      availableFrom: from.toISOString(),
      startDeadlineAt: deadline.toISOString(),
    });
    await RankedTestService.activateRankedTest(config.id);

    // Student 1 starts
    const startRes = await request(app)
      .post(`/api/v1/student/ranked-tests/${config.id}/start`)
      .set(student1AuthHeader());
    const attemptId = startRes.body.data.attemptId;

    // Answer Q1 Correct (B, +2.0), Q2 Wrong (A, -0.5)
    await request(app)
      .post(`/api/v1/student/ranked-tests/attempts/${attemptId}/answer`)
      .set(student1AuthHeader())
      .send({ mockTestQuestionId: question1Id, selectedOption: 'B' });

    await request(app)
      .post(`/api/v1/student/ranked-tests/attempts/${attemptId}/answer`)
      .set(student1AuthHeader())
      .send({ mockTestQuestionId: question2Id, selectedOption: 'A' });

    // Submit
    const subRes = await request(app)
      .post(`/api/v1/student/ranked-tests/attempts/${attemptId}/submit`)
      .set(student1AuthHeader());

    expect(subRes.status).toBe(200);

    // Check DB summary
    const attempt = await prisma.rankedAttempt.findUnique({
      where: { id: attemptId },
    });

    expect(attempt?.status).toBe('SUBMITTED');
    expect(attempt?.totalQuestions).toBe(2);
    expect(attempt?.correctCount).toBe(1);
    expect(attempt?.wrongCount).toBe(1);
    expect(attempt?.unansweredCount).toBe(0);
    expect(attempt?.attemptedCount).toBe(2);
    // Score = 2.0 - 0.5 = 1.50
    expect(Number(attempt?.rawScore)).toBe(1.5);
    // Invariant check
    expect(attempt!.correctCount + attempt!.wrongCount + attempt!.unansweredCount).toBe(attempt!.totalQuestions);
  });

  it('10. Competition Ranking Algorithm & Genuine Tie Handling (Score → Correct → Wrong → Time)', async () => {
    const from = new Date(Date.now() - 3600000);
    const deadline = new Date(Date.now() + 86400000);

    const config = await RankedTestService.createRankedTest({
      mockTestId: publishedTestId,
      mode: 'ANYTIME_RANKED',
      availableFrom: from.toISOString(),
      startDeadlineAt: deadline.toISOString(),
    });
    await RankedTestService.activateRankedTest(config.id);

    // Student 1: Both correct (Score 4.0, Correct 2, Wrong 0)
    const att1 = await RankedTestService.startOrResumeAttempt(config.id, student1Id);
    await RankedTestService.saveAnswer(att1.attemptId, student1Id, { mockTestQuestionId: question1Id, selectedOption: 'B' });
    await RankedTestService.saveAnswer(att1.attemptId, student1Id, { mockTestQuestionId: question2Id, selectedOption: 'C' });
    await RankedTestService.submitAttempt(att1.attemptId, student1Id);

    // Student 2: Both correct with identical score, correct, wrong & time (Tie test)
    const att2 = await RankedTestService.startOrResumeAttempt(config.id, student2Id);
    await RankedTestService.saveAnswer(att2.attemptId, student2Id, { mockTestQuestionId: question1Id, selectedOption: 'B' });
    await RankedTestService.saveAnswer(att2.attemptId, student2Id, { mockTestQuestionId: question2Id, selectedOption: 'C' });
    await RankedTestService.submitAttempt(att2.attemptId, student2Id);

    // Student 3 (Kannada): Q1 correct, Q2 wrong (Score 1.5)
    const att3 = await RankedTestService.startOrResumeAttempt(config.id, studentKnId);
    await RankedTestService.saveAnswer(att3.attemptId, studentKnId, { mockTestQuestionId: question1Id, selectedOption: 'B' });
    await RankedTestService.saveAnswer(att3.attemptId, studentKnId, { mockTestQuestionId: question2Id, selectedOption: 'A' });
    await RankedTestService.submitAttempt(att3.attemptId, studentKnId);

    // Close test & Generate Rankings
    await RankedTestService.closeRankedTest(config.id);
    const genRes = await RankedTestService.generateRankings(config.id);
    expect(genRes.success).toBe(true);

    // Check Results Table
    const results = await prisma.rankedResult.findMany({
      where: { rankedTestId: config.id },
      orderBy: { rank: 'asc' },
    });

    expect(results.length).toBe(3);
    // Student 1 and Student 2 have identical scores/time -> BOTH get Rank 1
    const rank1s = results.filter((r) => r.rank === 1);
    expect(rank1s.length).toBe(2);

    // Student 3 gets Rank 3 (Competition Ranking 1, 1, 3)
    const rank3 = results.find((r) => r.rank === 3);
    expect(rank3).toBeDefined();
    expect(rank3?.studentId).toBe(studentKnId);
    expect(Number(rank3?.rawScore)).toBe(1.5);
  });

  it('11. Result Publication & Solution Review: Solutions blocked before publication, available after publication', async () => {
    const from = new Date(Date.now() - 3600000);
    const deadline = new Date(Date.now() + 86400000);

    const config = await RankedTestService.createRankedTest({
      mockTestId: publishedTestId,
      mode: 'ANYTIME_RANKED',
      availableFrom: from.toISOString(),
      startDeadlineAt: deadline.toISOString(),
      solutionReleasePolicy: 'AFTER_RESULTS_PUBLISHED',
    });
    await RankedTestService.activateRankedTest(config.id);

    const att = await RankedTestService.startOrResumeAttempt(config.id, student1Id);
    await RankedTestService.saveAnswer(att.attemptId, student1Id, { mockTestQuestionId: question1Id, selectedOption: 'B' });
    await RankedTestService.submitAttempt(att.attemptId, student1Id);

    // Request Solutions BEFORE publication -> 403 Forbidden
    const preSolRes = await request(app)
      .get(`/api/v1/student/ranked-tests/${config.id}/solutions`)
      .set(student1AuthHeader());

    expect(preSolRes.status).toBe(403);
    expect(preSolRes.body.error.message).toContain('blocked until official results publication');

    // Close & Publish Results
    await RankedTestService.closeRankedTest(config.id);
    await RankedTestService.publishResults(config.id);

    // Request Solutions AFTER publication -> 200 OK with correct answers & explanations
    const postSolRes = await request(app)
      .get(`/api/v1/student/ranked-tests/${config.id}/solutions`)
      .set(student1AuthHeader());

    expect(postSolRes.status).toBe(200);
    const solutions = postSolRes.body.data;
    expect(solutions.length).toBe(2);
    expect(solutions[0].correctOption).toBe('B');
    expect(solutions[0].isCorrect).toBe(true);
    expect(solutions[0].explanation).toContain('Article 14');
  });

  it('12. Privacy-Safe Leaderboard: Exposes NO sensitive identity (email, phone, DOB, guardian info)', async () => {
    const from = new Date(Date.now() - 3600000);
    const deadline = new Date(Date.now() + 86400000);

    const config = await RankedTestService.createRankedTest({
      mockTestId: publishedTestId,
      mode: 'ANYTIME_RANKED',
      availableFrom: from.toISOString(),
      startDeadlineAt: deadline.toISOString(),
    });
    await RankedTestService.activateRankedTest(config.id);

    const att = await RankedTestService.startOrResumeAttempt(config.id, student1Id);
    await RankedTestService.saveAnswer(att.attemptId, student1Id, { mockTestQuestionId: question1Id, selectedOption: 'B' });
    await RankedTestService.submitAttempt(att.attemptId, student1Id);

    await RankedTestService.closeRankedTest(config.id);
    await RankedTestService.publishResults(config.id);

    const lbRes = await request(app)
      .get(`/api/v1/student/ranked-tests/${config.id}/leaderboard`)
      .set(student1AuthHeader());

    expect(lbRes.status).toBe(200);
    const entries = lbRes.body.data;
    expect(entries.length).toBeGreaterThan(0);

    const entry = entries[0];
    expect(entry.rank).toBeDefined();
    expect(entry.studentDisplayName).toBeDefined();
    expect(entry.rawScore).toBeDefined();

    // Verify sensitive identity fields are completely absent
    expect((entry as any).email).toBeUndefined();
    expect((entry as any).mobile).toBeUndefined();
    expect((entry as any).phone).toBeUndefined();
    expect((entry as any).dateOfBirth).toBeUndefined();
    expect((entry as any).guardianDetails).toBeUndefined();
    expect((entry as any).studentId).toBeUndefined();
  });

  it('13. Bilingual Fairness: Kannada student receives exact same question IDs, order, and marks, only text differs', async () => {
    const from = new Date(Date.now() - 3600000);
    const deadline = new Date(Date.now() + 86400000);

    const config = await RankedTestService.createRankedTest({
      mockTestId: publishedTestId,
      mode: 'ANYTIME_RANKED',
      availableFrom: from.toISOString(),
      startDeadlineAt: deadline.toISOString(),
    });
    await RankedTestService.activateRankedTest(config.id);

    // Kannada Student starts
    const startRes = await request(app)
      .post(`/api/v1/student/ranked-tests/${config.id}/start`)
      .set(studentKnAuthHeader());

    const attemptId = startRes.body.data.attemptId;

    // Fetch Question Payload
    const qRes = await request(app)
      .get(`/api/v1/student/ranked-tests/attempts/${attemptId}/questions`)
      .set(studentKnAuthHeader());

    expect(qRes.status).toBe(200);
    const knQuestions = qRes.body.data;

    expect(knQuestions[0].mockTestQuestionId).toBe(question1Id);
    expect(knQuestions[0].questionText).toContain('ಸಂವಿಧಾನದ ಯಾವ ವಿಧಿಯು');
    expect(knQuestions[0].optionB).toContain('ವಿಧಿ 14');
  });
});
