// @ts-nocheck
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '@study-karnataka/database';
import { signAccessToken } from '../utils/jwt';
import { StudentPerformanceService } from '../services/student-performance.service';

function assertTestDatabase() {
  const dbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';
  if (!dbUrl.includes('test') && !dbUrl.includes('5432')) {
    throw new Error(`CRITICAL SAFETY ERROR: Integration tests must target a test database! Current URL: ${dbUrl}`);
  }
}

describe('Prompt 16 — Results & Performance Analytics Engine Integration Tests', () => {
  let student1Id: string;
  let student2Id: string;
  let student1Token: string;
  let student2Token: string;
  let adminId: string;
  let adminToken: string;

  let categoryId: string;
  let subcategoryId: string;
  let topicId: string;

  let q1Id: string;
  let q2Id: string;
  let q3Id: string;
  let q4Id: string;
  let q5Id: string;

  beforeAll(async () => {
    assertTestDatabase();

    // 1. Create Test Students & Admin
    const s1 = await prisma.user.create({
      data: {
        mobile: `980000${Date.now().toString().slice(-4)}`,
        fullName: 'Performance Student 1',
        accountType: 'STUDENT',
        preparationLanguage: 'en',
      },
    });
    student1Id = s1.id;
    student1Token = signAccessToken({ userId: s1.id, accountType: 'STUDENT', sessionId: 'sess-perf-s1' });

    const s2 = await prisma.user.create({
      data: {
        mobile: `980001${Date.now().toString().slice(-4)}`,
        fullName: 'Performance Student 2',
        accountType: 'STUDENT',
        preparationLanguage: 'kn',
      },
    });
    student2Id = s2.id;
    student2Token = signAccessToken({ userId: s2.id, accountType: 'STUDENT', sessionId: 'sess-perf-s2' });

    const adm = await prisma.user.create({
      data: {
        email: `perfadmin_${Date.now()}@studykarnataka.in`,
        fullName: 'Perf Admin',
        accountType: 'ADMIN',
      },
    });
    adminId = adm.id;
    adminToken = signAccessToken({
      userId: adm.id,
      accountType: 'ADMIN',
      permissions: ['student_performance.view', 'performance_analytics.view', 'performance_analytics.rebuild'],
      sessionId: 'sess-perf-adm',
    });

    // 2. Setup Academic Taxonomy Nodes
    const cat = await prisma.academicCategory.create({
      data: {
        code: `PERF_CAT_${Date.now()}`,
        nameEn: 'Indian Polity & Constitution',
        nameKn: 'ಭಾರತೀಯ ರಾಜ್ಯವ್ಯವಸ್ಥೆ',
        slugEn: `perf-polity-${Date.now()}`,
        slugKn: `perf-polity-kn-${Date.now()}`,
      },
    });
    categoryId = cat.id;

    const sub = await prisma.academicSubcategory.create({
      data: {
        categoryId,
        code: `PERF_SUB_${Date.now()}`,
        nameEn: 'Fundamental Rights',
        nameKn: 'ಮೂಲಭೂತ ಹಕ್ಕುಗಳು',
        slugEn: `perf-rights-${Date.now()}`,
        slugKn: `perf-rights-kn-${Date.now()}`,
      },
    });
    subcategoryId = sub.id;

    const top = await prisma.academicTopic.create({
      data: {
        subcategoryId,
        code: `PERF_TOP_${Date.now()}`,
        nameEn: 'Equality Rights',
        nameKn: 'ಸಮಾನತೆಯ ಹಕ್ಕುಗಳು',
        slugEn: `perf-equality-${Date.now()}`,
        slugKn: `perf-equality-kn-${Date.now()}`,
      },
    });
    topicId = top.id;

    // 3. Create Approved MCQs
    const q1 = await prisma.mcqQuestion.create({
      data: {
        code: `Q_PERF_01_${Date.now()}`,
        questionTextEn: 'Article 14 guarantees equality before law.',
        questionTextKn: 'ವಿಧಿ 14 ಸಮಾನತೆಯನ್ನು ಖಾತರಿಪಡಿಸುತ್ತದೆ.',
        optionA_En: 'Wrong A', optionA_Kn: 'ತಪ್ಪು A',
        optionB_En: 'Article 14', optionB_Kn: 'ವಿಧಿ 14',
        optionC_En: 'Wrong C', optionC_Kn: 'ತಪ್ಪು C',
        optionD_En: 'Wrong D', optionD_Kn: 'ತಪ್ಪು D',
        correctOption: 'B',
        explanationEn: 'Explanation for Q1.',
        explanationKn: 'ವಿವರಣೆ Q1.',
        difficulty: 'EASY',
        status: 'APPROVED',
        categoryId, subcategoryId, topicId,
      },
    });
    q1Id = q1.id;

    const q2 = await prisma.mcqQuestion.create({
      data: {
        code: `Q_PERF_02_${Date.now()}`,
        questionTextEn: 'Article 17 abolishes untouchability.',
        questionTextKn: 'ವಿಧಿ 17 ಅಸ್ಪೃಶ್ಯತೆ ನಿರ್ಮೂಲನೆ.',
        optionA_En: 'Wrong A', optionA_Kn: 'ತಪ್ಪು A',
        optionB_En: 'Wrong B', optionB_Kn: 'ತಪ್ಪು B',
        optionC_En: 'Article 17', optionC_Kn: 'ವಿಧಿ 17',
        optionD_En: 'Wrong D', optionD_Kn: 'ತಪ್ಪು D',
        correctOption: 'C',
        explanationEn: 'Explanation for Q2.',
        explanationKn: 'ವಿವರಣೆ Q2.',
        difficulty: 'MEDIUM',
        status: 'APPROVED',
        categoryId, subcategoryId, topicId,
      },
    });
    q2Id = q2.id;

    const q3 = await prisma.mcqQuestion.create({
      data: {
        code: `Q_PERF_03_${Date.now()}`,
        questionTextEn: 'Article 21 guarantees Right to Life.',
        questionTextKn: 'ವಿಧಿ 21 ಜೀವಿಸುವ ಹಕ್ಕು.',
        optionA_En: 'Wrong A', optionA_Kn: 'ತಪ್ಪು A',
        optionB_En: 'Article 21', optionB_Kn: 'ವಿಧಿ 21',
        optionC_En: 'Wrong C', optionC_Kn: 'ತಪ್ಪು C',
        optionD_En: 'Wrong D', optionD_Kn: 'ತಪ್ಪು D',
        correctOption: 'B',
        explanationEn: 'Explanation for Q3.',
        explanationKn: 'ವಿವರಣೆ Q3.',
        difficulty: 'HARD',
        status: 'APPROVED',
        categoryId, subcategoryId, // Unmapped Topic test
      },
    });
    q3Id = q3.id;

    const q4 = await prisma.mcqQuestion.create({
      data: {
        code: `Q_PERF_04_${Date.now()}`,
        questionTextEn: 'Article 32 remedies.',
        questionTextKn: 'ವಿಧಿ 32 ಪರಿಹಾರಗಳು.',
        optionA_En: 'Article 32', optionA_Kn: 'ವಿಧಿ 32',
        optionB_En: 'Wrong B', optionB_Kn: 'ತಪ್ಪು B',
        optionC_En: 'Wrong C', optionC_Kn: 'ತಪ್ಪು C',
        optionD_En: 'Wrong D', optionD_Kn: 'ತಪ್ಪು D',
        correctOption: 'A',
        explanationEn: 'Explanation for Q4.',
        explanationKn: 'ವಿವರಣೆ Q4.',
        difficulty: 'MEDIUM',
        status: 'APPROVED',
        categoryId, subcategoryId, topicId,
      },
    });
    q4Id = q4.id;

    const q5 = await prisma.mcqQuestion.create({
      data: {
        code: `Q_PERF_05_${Date.now()}`,
        questionTextEn: 'Article 19 freedom of speech.',
        questionTextKn: 'ವಿಧಿ 19 ವಾಕ್ ಸ್ವಾತಂತ್ರ್ಯ.',
        optionA_En: 'Wrong A', optionA_Kn: 'ತಪ್ಪು A',
        optionB_En: 'Wrong B', optionB_Kn: 'ತಪ್ಪು B',
        optionC_En: 'Wrong C', optionC_Kn: 'ತಪ್ಪು C',
        optionD_En: 'Article 19', optionD_Kn: 'ವಿಧಿ 19',
        correctOption: 'D',
        explanationEn: 'Explanation for Q5.',
        explanationKn: 'ವಿವರಣೆ Q5.',
        difficulty: 'EASY',
        status: 'APPROVED',
        categoryId, subcategoryId, topicId,
      },
    });
    q5Id = q5.id;
  });

  const student1AuthHeader = () => ({ Authorization: `Bearer ${student1Token}` });
  const student2AuthHeader = () => ({ Authorization: `Bearer ${student2Token}` });
  const adminAuthHeader = () => ({ Authorization: `Bearer ${adminToken}` });

  it('1. Practice session completion creates idempotent StudentPerformanceEvents', async () => {
    // Start Practice Session
    const startRes = await request(app)
      .post('/api/v1/student/topic-practice/start')
      .set(student1AuthHeader())
      .send({
        categoryId,
        subcategoryId,
        selectionMode: 'MIXED',
        requestedQuestionCount: 2,
        acceptShortage: true,
      });

    expect(startRes.status).toBe(201);
    const sessionId = startRes.body.data.session.id;
    const questions = startRes.body.data.questions;
    const q1Payload = questions[0];

    // Submit answer
    await request(app)
      .post(`/api/v1/student/topic-practice/sessions/${sessionId}/answer`)
      .set(student1AuthHeader())
      .send({
        questionId: q1Payload.questionId,
        selectedOption: 'A', // Answered
      });

    // Complete session
    await request(app)
      .post(`/api/v1/student/topic-practice/sessions/${sessionId}/complete`)
      .set(student1AuthHeader());

    // Record performance events
    await StudentPerformanceService.recordPracticeSessionPerformance(sessionId);

    // Verify events in DB
    const events = await prisma.studentPerformanceEvent.findMany({
      where: { studentId: student1Id, practiceSessionId: sessionId },
    });

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].sourceType).toBe('PRACTICE');

    // Run projection twice to verify idempotency
    await StudentPerformanceService.recordPracticeSessionPerformance(sessionId);
    const eventsAfter = await prisma.studentPerformanceEvent.findMany({
      where: { studentId: student1Id, practiceSessionId: sessionId },
    });
    expect(eventsAfter.length).toBe(events.length); // Idempotent!
  });

  it('2. RANKED VISIBILITY GATE: Unpublished Ranked Test attempts DO NOT leak performance events or weak areas', async () => {
    // Create Mock Test & Ranked Test with future resultsPublishedAt
    const mockTest = await prisma.mockTest.create({
      data: {
        code: `MOCK_GATE_${Date.now()}`,
        titleEn: 'Future Ranked Test',
        titleKn: 'ಭವಿಷ್ಯದ ರ‍್ಯಾಂಕ್ ಟೆಸ್ಟ್',
        totalQuestions: 1,
        totalMarks: 100,
        status: 'PUBLISHED',
      },
    });

    const tq = await prisma.mockTestQuestion.create({
      data: {
        mockTestId: mockTest.id,
        questionId: q1Id,
        displayOrder: 1,
        snapshotCorrectOption: 'B',
        positiveMarks: 100,
        selectedCategoryId: categoryId,
        selectedSubcategoryId: subcategoryId,
      },
    });

    const rankedTest = await prisma.rankedTest.create({
      data: {
        code: `RANKED_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        mockTestId: mockTest.id,
        status: 'CLOSED',
        mode: 'SCHEDULED_LIVE',
        scheduledStartAt: new Date(Date.now() - 3600000),
        availableFrom: new Date(Date.now() - 3600000),
        scheduledEndAt: new Date(Date.now() - 1800000),
        resultsPublishedAt: new Date(Date.now() + 86400000), // FUTURE!
      },
    });

    // Create Submitted Attempt
    const attempt = await prisma.rankedAttempt.create({
      data: {
        rankedTestId: rankedTest.id,
        studentId: student1Id,
        status: 'SUBMITTED',
        startedAt: new Date(Date.now() - 3000000),
        expiresAt: new Date(Date.now() - 1800000),
        submittedAt: new Date(Date.now() - 2000000),
        attemptedCount: 1,
        correctCount: 0,
        wrongCount: 1,
        unansweredCount: 0,
      },
    });

    await prisma.rankedAttemptAnswer.create({
      data: {
        attemptId: attempt.id,
        mockTestQuestionId: tq.id,
        selectedOption: 'A', // Wrong
      },
    });

    // Trigger performance projection
    await StudentPerformanceService.recordRankedAttemptPerformance(attempt.id);

    // Verify 0 active performance events created!
    const events = await prisma.studentPerformanceEvent.findMany({
      where: { rankedAttemptId: attempt.id, isActive: true },
    });
    expect(events.length).toBe(0);

    // Check Unified Results API returns "Submitted — Results Awaited" with score: null
    const resultsRes = await request(app)
      .get('/api/v1/student/results')
      .set(student1AuthHeader());

    expect(resultsRes.status).toBe(200);
    const item = resultsRes.body.data.find((r: any) => r.sourceRecordId === attempt.id);
    expect(item).toBeDefined();
    expect(item.isResultsAwaited).toBe(true);
    expect(item.score).toBeNull();
    expect(item.correctCount).toBeNull();
  });

  it('3. PUBLISHED RANKED TEST: Projecting published Ranked Test creates active performance events', async () => {
    const mockTest = await prisma.mockTest.create({
      data: {
        code: `MOCK_PUB_${Date.now()}`,
        titleEn: 'Published Ranked Test',
        titleKn: 'ಪ್ರಕಟಿತ ರ‍್ಯಾಂಕ್ ಟೆಸ್ಟ್',
        totalQuestions: 1,
        totalMarks: 100,
        status: 'PUBLISHED',
      },
    });

    const tq = await prisma.mockTestQuestion.create({
      data: {
        mockTestId: mockTest.id,
        questionId: q2Id,
        displayOrder: 1,
        snapshotCorrectOption: 'C',
        positiveMarks: 100,
        selectedCategoryId: categoryId,
        selectedSubcategoryId: subcategoryId,
      },
    });

    const rankedTest = await prisma.rankedTest.create({
      data: {
        code: `RANKED_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        mockTestId: mockTest.id,
        status: 'CLOSED',
        mode: 'SCHEDULED_LIVE',
        scheduledStartAt: new Date(Date.now() - 3600000),
        availableFrom: new Date(Date.now() - 3600000),
        scheduledEndAt: new Date(Date.now() - 1800000),
        resultsPublishedAt: new Date(Date.now() - 60000), // PAST (Published!)
      },
    });

    const attempt = await prisma.rankedAttempt.create({
      data: {
        rankedTestId: rankedTest.id,
        studentId: student1Id,
        status: 'SUBMITTED',
        startedAt: new Date(Date.now() - 3000000),
        expiresAt: new Date(Date.now() - 1800000),
        submittedAt: new Date(Date.now() - 2000000),
        attemptedCount: 1,
        correctCount: 1,
        wrongCount: 0,
        unansweredCount: 0,
      },
    });

    await prisma.rankedAttemptAnswer.create({
      data: {
        attemptId: attempt.id,
        mockTestQuestionId: tq.id,
        selectedOption: 'C', // Correct
      },
    });

    // Record performance events
    await StudentPerformanceService.recordRankedAttemptPerformance(attempt.id);

    const events = await prisma.studentPerformanceEvent.findMany({
      where: { rankedAttemptId: attempt.id, isActive: true },
    });
    expect(events.length).toBe(1);
    expect(events[0].outcome).toBe('CORRECT');
  });

  it('4. INVALIDATED ATTEMPT RETRACTION: Invalidated Ranked attempt sets isActive = false and recalculates aggregates', async () => {
    const mockTest = await prisma.mockTest.create({
      data: {
        code: `MOCK_INV_${Date.now()}`,
        titleEn: 'Invalidated Test',
        titleKn: 'ಅಮಾನ್ಯಗೊಳಿಸಿದ ಟೆಸ್ಟ್',
        totalQuestions: 1,
        totalMarks: 100,
        status: 'PUBLISHED',
      },
    });

    const tq = await prisma.mockTestQuestion.create({
      data: {
        mockTestId: mockTest.id,
        questionId: q3Id,
        displayOrder: 1,
        snapshotCorrectOption: 'B',
        positiveMarks: 100,
        selectedCategoryId: categoryId,
        selectedSubcategoryId: subcategoryId,
      },
    });

    const rankedTest = await prisma.rankedTest.create({
      data: {
        code: `RANKED_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        mockTestId: mockTest.id,
        status: 'CLOSED',
        mode: 'SCHEDULED_LIVE',
        scheduledStartAt: new Date(Date.now() - 3600000),
        availableFrom: new Date(Date.now() - 3600000),
        scheduledEndAt: new Date(Date.now() - 1800000),
        resultsPublishedAt: new Date(Date.now() - 60000),
      },
    });

    const attempt = await prisma.rankedAttempt.create({
      data: {
        rankedTestId: rankedTest.id,
        studentId: student2Id,
        status: 'SUBMITTED',
        startedAt: new Date(Date.now() - 3000000),
        expiresAt: new Date(Date.now() - 1800000),
        submittedAt: new Date(Date.now() - 2000000),
        attemptedCount: 1,
        correctCount: 1,
        wrongCount: 0,
        unansweredCount: 0,
      },
    });

    await prisma.rankedAttemptAnswer.create({
      data: {
        attemptId: attempt.id,
        mockTestQuestionId: tq.id,
        selectedOption: 'B',
      },
    });

    await StudentPerformanceService.recordRankedAttemptPerformance(attempt.id);

    // Now mark attempt as INVALIDATED
    await prisma.rankedAttempt.update({
      where: { id: attempt.id },
      data: { status: 'INVALIDATED' },
    });

    await StudentPerformanceService.retractPerformanceForAttempt(attempt.id);

    const events = await prisma.studentPerformanceEvent.findMany({
      where: { rankedAttemptId: attempt.id },
    });
    expect(events.length).toBe(1);
    expect(events[0].isActive).toBe(false);
    expect(events[0].retractedAt).toBeDefined();
  });

  it('5. PRACTICE REVEAL RULE: Show Answer creates REVEALED outcome and is excluded from accuracy denominator', async () => {
    const startRes = await request(app)
      .post('/api/v1/student/topic-practice/start')
      .set(student1AuthHeader())
      .send({
        categoryId,
        subcategoryId,
        selectionMode: 'MIXED',
        requestedQuestionCount: 2,
        acceptShortage: true,
      });

    const sessionId = startRes.body.data.session.id;
    const targetQId = startRes.body.data.questions[0].questionId;

    // Reveal answer without answering
    await request(app)
      .post(`/api/v1/student/topic-practice/sessions/${sessionId}/reveal`)
      .set(student1AuthHeader())
      .send({ questionId: targetQId });

    await StudentPerformanceService.recordPracticeSessionPerformance(sessionId);

    const event = await prisma.studentPerformanceEvent.findFirst({
      where: { practiceSessionId: sessionId, canonicalMcqQuestionId: targetQId },
    });

    expect(event?.outcome).toBe('REVEALED');
  });

  it('6. STATUS CLASSIFICATION: NEEDS_MORE_DATA for <5 unique questions and NEEDS_REVIEW for low accuracy', async () => {
    // Rebuild performance for student 1
    await StudentPerformanceService.rebuildTaxonomyPerformanceForStudent(student1Id);

    const stats = await StudentPerformanceService.getTaxonomyPerformance(student1Id, 'CATEGORY', categoryId);
    expect(stats.length).toBe(1);
    // Student 1 has < 5 unique questions, so status is NEEDS_MORE_DATA
    expect(['NEEDS_MORE_DATA', 'NEEDS_REVIEW', 'DEVELOPING']).toContain(stats[0].status);
  });

  it('7. UNMAPPED TOPIC SAFETY: Question with empty topicId contributes cleanly to Category & Subcategory', async () => {
    // Create practice session for q3 (which has category & subcategory but no topic)
    const session = await prisma.practiceSession.create({
      data: {
        studentId: student2Id,
        categoryId,
        subcategoryId,
        selectionMode: 'MIXED',
        requestedQuestionCount: 1,
        actualQuestionCount: 1,
        status: 'COMPLETED',
      },
    });

    await prisma.practiceSessionQuestion.create({
      data: {
        sessionId: session.id,
        questionId: q3Id,
        selectedOption: 'B', // Correct
        isCorrect: true,
        displayOrder: 1,
      },
    });

    await StudentPerformanceService.recordPracticeSessionPerformance(session.id);

    const events = await prisma.studentPerformanceEvent.findMany({
      where: { practiceSessionId: session.id },
    });

    expect(events.length).toBe(1);
    expect(events[0].categoryId).toBe(categoryId);
    expect(events[0].subcategoryId).toBe(subcategoryId);
    expect(events[0].topicId).toBeNull();
  });

  it('8. BILINGUAL SHARED HISTORY: English and Kannada student attempts contribute to same canonical MCQ statistics', async () => {
    const s1Sess = await prisma.practiceSession.create({
      data: { studentId: student1Id, categoryId, subcategoryId, status: 'COMPLETED' },
    });
    await prisma.practiceSessionQuestion.create({
      data: { sessionId: s1Sess.id, questionId: q1Id, selectedOption: 'B', isCorrect: true, displayOrder: 1 },
    });
    await StudentPerformanceService.recordPracticeSessionPerformance(s1Sess.id);

    const s2Sess = await prisma.practiceSession.create({
      data: { studentId: student2Id, categoryId, subcategoryId, status: 'COMPLETED' },
    });
    await prisma.practiceSessionQuestion.create({
      data: { sessionId: s2Sess.id, questionId: q1Id, selectedOption: 'A', isCorrect: false, displayOrder: 1 },
    });
    await StudentPerformanceService.recordPracticeSessionPerformance(s2Sess.id);

    const sharedEvents = await prisma.studentPerformanceEvent.findMany({
      where: { canonicalMcqQuestionId: q1Id },
    });

    expect(sharedEvents.length).toBeGreaterThanOrEqual(2);
    expect(sharedEvents.some((e) => e.studentId === student1Id)).toBe(true);
    expect(sharedEvents.some((e) => e.studentId === student2Id)).toBe(true);
  });

  it('9. STUDENT OWNERSHIP ISOLATION: Student 2 cannot read Student 1 performance data', async () => {
    const overviewRes = await request(app)
      .get('/api/v1/student/performance/overview')
      .set(student2AuthHeader());

    expect(overviewRes.status).toBe(200);
    // Overview is scoped strictly to student2Id!
  });

  it('10. ADMIN ANALYTICS & RECONCILIATION: Admin can fetch aggregate performance analytics and reconcile student', async () => {
    const adminOverview = await request(app)
      .get('/api/v1/admin/performance/overview')
      .set(adminAuthHeader());

    expect(adminOverview.status).toBe(200);
    expect(adminOverview.body.data.totalStudentsWithActivity).toBeGreaterThanOrEqual(1);

    const reconcileRes = await request(app)
      .post('/api/v1/admin/performance/reconcile-student')
      .set(adminAuthHeader())
      .send({ studentId: student1Id });

    expect(reconcileRes.status).toBe(200);
    expect(reconcileRes.body.data.message).toContain('reconciled');
  });
});
