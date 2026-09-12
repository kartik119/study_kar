import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '@study-karnataka/database';
import { TopicPracticeService } from '../services/topic-practice.service';

function assertTestDatabase() {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl.includes('test')) {
    throw new Error(`TEST DATABASE SAFETY GUARD: Refusing to run integration tests against non-test database: ${dbUrl}`);
  }
}

describe('Prompt 15 — Topic Practice Engine Integration Tests', () => {
  let adminToken: string;
  let student1Id: string;
  let student1Token: string;
  let student2Id: string;
  let student2Token: string;
  let studentKnId: string;
  let studentKnToken: string;

  let categoryId: string;
  let subcategoryId: string;
  let topicId: string;
  let knowledgeAreaId: string;

  let q1Id: string;
  let q2Id: string;
  let q3Id: string;
  let q4Id: string;
  let draftQId: string;

  function adminAuthHeader() {
    return { Authorization: `Bearer ${adminToken}` };
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

    const { signAccessToken } = await import('../utils/jwt');

    // 1. Admin setup
    const admin = await prisma.adminUser.upsert({
      where: { email: 'practice-admin@studykarnataka.com' },
      update: {},
      create: {
        email: 'practice-admin@studykarnataka.com',
        fullName: 'Practice Admin',
        passwordHash: 'hash',
      },
    });

    adminToken = signAccessToken({
      userId: admin.id,
      accountType: 'ADMIN',
      roles: ['Super Admin'],
      sessionId: 'session-practice-admin',
    });

    // 2. Student setup
    const s1 = await prisma.user.upsert({
      where: { mobile: '9988001101' },
      update: { preparationLanguage: 'en', isLanguageLocked: true },
      create: {
        mobile: '9988001101',
        fullName: 'Practice Student One EN',
        preparationLanguage: 'en',
        isLanguageLocked: true,
        accountStatus: 'ACTIVE',
      },
    });
    student1Id = s1.id;
    student1Token = signAccessToken({
      userId: s1.id,
      accountType: 'STUDENT',
      sessionId: 'session-practice-student-1',
    });

    const s2 = await prisma.user.upsert({
      where: { mobile: '9988001102' },
      update: { preparationLanguage: 'en', isLanguageLocked: true },
      create: {
        mobile: '9988001102',
        fullName: 'Practice Student Two EN',
        preparationLanguage: 'en',
        isLanguageLocked: true,
        accountStatus: 'ACTIVE',
      },
    });
    student2Id = s2.id;
    student2Token = signAccessToken({
      userId: s2.id,
      accountType: 'STUDENT',
      sessionId: 'session-practice-student-2',
    });

    const sKn = await prisma.user.upsert({
      where: { mobile: '9988001103' },
      update: { preparationLanguage: 'kn', isLanguageLocked: true },
      create: {
        mobile: '9988001103',
        fullName: 'ಅಭ್ಯಾಸ ವಿದ್ಯಾರ್ಥಿ',
        preparationLanguage: 'kn',
        isLanguageLocked: true,
        accountStatus: 'ACTIVE',
      },
    });
    studentKnId = sKn.id;
    studentKnToken = signAccessToken({
      userId: sKn.id,
      accountType: 'STUDENT',
      sessionId: 'session-practice-student-kn',
    });

    // Cleanup old test data for isolation
    await prisma.practiceSessionQuestion.deleteMany({ where: { session: { category: { code: 'PRACTICE_POLITY' } } } });
    await prisma.practiceSession.deleteMany({ where: { category: { code: 'PRACTICE_POLITY' } } });
    await prisma.studentMcqPracticeHistory.deleteMany({ where: { question: { category: { code: 'PRACTICE_POLITY' } } } });
    await prisma.studentTaxonomyPracticeStats.deleteMany({ where: { category: { code: 'PRACTICE_POLITY' } } });
    await prisma.mcqQuestion.deleteMany({ where: { category: { code: 'PRACTICE_POLITY' } } });
    await prisma.academicCategory.deleteMany({ where: { code: 'PRACTICE_POLITY' } });

    // 3. Taxonomy setup
    const cat = await prisma.academicCategory.create({
      data: {
        code: 'PRACTICE_POLITY',
        nameEn: 'Indian Polity Practice',
        nameKn: 'ಭಾರತೀಯ ರಾಜ್ಯವ್ಯವಸ್ಥೆ',
        slugEn: 'practice-polity',
        slugKn: 'practice-polity-kn',
      },
    });
    categoryId = cat.id;

    const sub = await prisma.academicSubcategory.create({
      data: {
        categoryId,
        code: 'SUB_RIGHTS',
        nameEn: 'Fundamental Rights Practice',
        nameKn: 'ಮೂಲಭೂತ ಹಕ್ಕುಗಳು',
        slugEn: 'fundamental-rights-practice',
        slugKn: 'fundamental-rights-practice-kn',
      },
    });
    subcategoryId = sub.id;

    const top = await prisma.academicTopic.create({
      data: {
        subcategoryId,
        code: 'TOP_EQUALITY',
        nameEn: 'Right to Equality',
        nameKn: 'ಸಮಾನತೆಯ ಹಕ್ಕು',
        slugEn: 'right-to-equality-practice',
        slugKn: 'right-to-equality-practice-kn',
      },
    });
    topicId = top.id;

    const ka = await prisma.academicKnowledgeArea.create({
      data: {
        topicId,
        code: 'KA_ART14',
        nameEn: 'Article 14 - Equality Before Law',
        nameKn: 'ವಿಧಿ 14 - ಕಾನೂನಿನ ಮುಂಭಾಗದಲ್ಲಿ ಸಮಾನತೆ',
        slugEn: 'article-14-practice',
        slugKn: 'article-14-practice-kn',
      },
    });
    knowledgeAreaId = ka.id;

    // 4. MCQs setup
    const q1 = await prisma.mcqQuestion.create({
      data: {
        code: 'MCQ_PRACTICE_01',
        questionTextEn: 'Which article guarantees equality before law?',
        questionTextKn: 'ಕಾನೂನಿನ ಮುಂಭಾಗದಲ್ಲಿ ಸಮಾನತೆಯನ್ನು ನೀಡುವ ವಿಧಿ ಯಾವುದು?',
        optionA_En: 'Article 12',
        optionA_Kn: 'ವಿಧಿ 12',
        optionB_En: 'Article 14',
        optionB_Kn: 'ವಿಧಿ 14',
        optionC_En: 'Article 19',
        optionC_Kn: 'ವಿಧಿ 19',
        optionD_En: 'Article 21',
        optionD_Kn: 'ವಿಧಿ 21',
        correctOption: 'B',
        explanationEn: 'Article 14 ensures equality before law.',
        explanationKn: 'ವಿಧಿ 14 ಕಾನೂನಿನ ಮುಂದೆ ಸಮಾನತೆಯನ್ನು ಖಾತರಿಪಡಿಸುತ್ತದೆ.',
        difficulty: 'EASY',
        status: 'APPROVED',
        categoryId,
        subcategoryId,
        topicId,
        knowledgeAreaId,
        isPyq: true,
      },
    });
    q1Id = q1.id;

    const q2 = await prisma.mcqQuestion.create({
      data: {
        code: 'MCQ_PRACTICE_02',
        questionTextEn: 'Which article abolishes untouchability?',
        questionTextKn: 'ಅಸ್ಪೃಶ್ಯತೆಯನ್ನು ನಿಷೇಧಿಸುವ ವಿಧಿ ಯಾವುದು?',
        optionA_En: 'Article 15',
        optionA_Kn: 'ವಿಧಿ 15',
        optionB_En: 'Article 16',
        optionB_Kn: 'ವಿಧಿ 16',
        optionC_En: 'Article 17',
        optionC_Kn: 'ವಿಧಿ 17',
        optionD_En: 'Article 18',
        optionD_Kn: 'ವಿಧಿ 18',
        correctOption: 'C',
        explanationEn: 'Article 17 abolishes untouchability.',
        explanationKn: 'ವಿಧಿ 17 ಅಸ್ಪೃಶ್ಯತೆಯನ್ನು ನಿರ್ಮೂಲನೆ ಮಾಡುತ್ತದೆ.',
        difficulty: 'MEDIUM',
        status: 'APPROVED',
        categoryId,
        subcategoryId,
        topicId,
        isPyq: false,
      },
    });
    q2Id = q2.id;

    const q3 = await prisma.mcqQuestion.create({
      data: {
        code: 'MCQ_PRACTICE_03',
        questionTextEn: 'Which article prohibits discrimination on grounds of religion?',
        questionTextKn: 'ಧರ್ಮದ ಆಧಾರದ ಮೇಲೆ ತಾರತಮ್ಯವನ್ನು ನಿಷೇಧಿಸುವ ವಿಧಿ ಯಾವುದು?',
        optionA_En: 'Article 14',
        optionA_Kn: 'ವಿಧಿ 14',
        optionB_En: 'Article 15',
        optionB_Kn: 'ವಿಧಿ 15',
        optionC_En: 'Article 16',
        optionC_Kn: 'ವಿಧಿ 16',
        optionD_En: 'Article 17',
        optionD_Kn: 'ವಿಧಿ 17',
        correctOption: 'B',
        explanationEn: 'Article 15 prohibits discrimination.',
        explanationKn: 'ವಿಧಿ 15 ತಾರತಮ್ಯವನ್ನು ನಿಷೇಧಿಸುತ್ತದೆ.',
        difficulty: 'MEDIUM',
        status: 'APPROVED',
        categoryId,
        subcategoryId,
        isPyq: true,
      },
    });
    q3Id = q3.id;

    const q4 = await prisma.mcqQuestion.create({
      data: {
        code: 'MCQ_PRACTICE_04',
        questionTextEn: 'Which article guarantees equality of opportunity in public employment?',
        questionTextKn: 'ಸಾರ್ವಜನಿಕ ಉದ್ಯೋಗದಲ್ಲಿ ಸಮಾನ ಅವಕಾಶವನ್ನು ನೀಡುವ ವಿಧಿ ಯಾವುದು?',
        optionA_En: 'Article 16',
        optionA_Kn: 'ವಿಧಿ 16',
        optionB_En: 'Article 17',
        optionB_Kn: 'ವಿಧಿ 17',
        optionC_En: 'Article 18',
        optionC_Kn: 'ವಿಧಿ 18',
        optionD_En: 'Article 19',
        optionD_Kn: 'ವಿಧಿ 19',
        correctOption: 'A',
        explanationEn: 'Article 16 guarantees equal opportunity in public employment.',
        explanationKn: 'ವಿಧಿ 16 ಉದ್ಯೋಗದಲ್ಲಿ ಸಮಾನ ಅವಕಾಶ ನೀಡುತ್ತದೆ.',
        difficulty: 'HARD',
        status: 'APPROVED',
        categoryId,
        subcategoryId,
        isPyq: false,
      },
    });
    q4Id = q4.id;

    // DRAFT Question (Must be excluded!)
    const draftQ = await prisma.mcqQuestion.create({
      data: {
        code: 'MCQ_PRACTICE_DRAFT',
        questionTextEn: 'Draft question text',
        questionTextKn: 'ಕರಡು ಪ್ರಶ್ನೆ ಪಠ್ಯ',
        optionA_En: 'Opt A',
        optionA_Kn: 'ಆಯ್ಕೆ ಎ',
        optionB_En: 'Opt B',
        optionB_Kn: 'ಆಯ್ಕೆ ಬಿ',
        optionC_En: 'Opt C',
        optionC_Kn: 'ಆಯ್ಕೆ ಸಿ',
        optionD_En: 'Opt D',
        optionD_Kn: 'ಆಯ್ಕೆ ಡಿ',
        correctOption: 'A',
        difficulty: 'EASY',
        status: 'DRAFT', // NOT APPROVED!
        categoryId,
        subcategoryId,
      },
    });
    draftQId = draftQ.id;
  });

  it('1. Cascading taxonomy validation: invalid subcategory or topic hierarchy is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/student/topic-practice/availability')
      .set(student1AuthHeader())
      .send({
        categoryId,
        subcategoryId: 'invalid-sub-id',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('does not belong to category');
  });

  it('2. Topic Practice allows Category & Subcategory practice without forcing Topic mapping', async () => {
    const res = await request(app)
      .post('/api/v1/student/topic-practice/availability')
      .set(student1AuthHeader())
      .send({
        categoryId,
        subcategoryId,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.totalApprovedInScope).toBe(4); // 4 APPROVED questions (Draft excluded)
    expect(res.body.data.unseenCount).toBe(4);
  });

  it('3. Pre-start availability surfaces shortage when requested questions > eligible questions', async () => {
    const res = await request(app)
      .post('/api/v1/student/topic-practice/availability')
      .set(student1AuthHeader())
      .send({
        categoryId,
        subcategoryId,
        requestedQuestionCount: 20,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.hasShortage).toBe(true);
    expect(res.body.data.eligibleCount).toBe(4);
    expect(res.body.data.shortageMessage).toContain('4 eligible questions are currently available');
  });

  it('4. Starting a session freezes selected question IDs & order in DB with no intra-session duplicates', async () => {
    const res = await request(app)
      .post('/api/v1/student/topic-practice/start')
      .set(student1AuthHeader())
      .send({
        categoryId,
        subcategoryId,
        selectionMode: 'MIXED',
        requestedQuestionCount: 3,
        acceptShortage: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.session.actualQuestionCount).toBe(3);
    const session = res.body.data.session;
    const questions = res.body.data.questions;

    expect(questions.length).toBe(3);
    const qIds = questions.map((q: any) => q.questionId);
    // Intra-session uniqueness check
    const uniqueQIds = new Set(qIds);
    expect(uniqueQIds.size).toBe(3);

    // Verify DRAFT question is NOT in selection
    expect(qIds).not.toContain(draftQId);

    // Verify fetching session again (refresh) returns exact same frozen questions & order
    const getRes = await request(app)
      .get(`/api/v1/student/topic-practice/sessions/${session.id}`)
      .set(student1AuthHeader());

    expect(getRes.status).toBe(200);
    const refreshedQIds = getRes.body.data.questions.map((q: any) => q.questionId);
    expect(refreshedQIds).toEqual(qIds);
  });

  it('5. ANSWER SECURITY: Question list payloads NEVER leak correctOption or explanation before submission', async () => {
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

    const questions = startRes.body.data.questions;
    for (const q of questions) {
      expect(q.correctOption).toBeUndefined();
      expect(q.explanation).toBeUndefined();
    }
  });

  it('6. Answer submission gives instant feedback with correctOption & explanation in student preparation language', async () => {
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
    const questions = startRes.body.data.questions;
    const targetQ = questions[0];

    // Determine correct option for targetQ
    let correctOpt = 'A';
    if (targetQ.questionId === q1Id) correctOpt = 'B';
    else if (targetQ.questionId === q2Id) correctOpt = 'C';
    else if (targetQ.questionId === q3Id) correctOpt = 'B';
    else if (targetQ.questionId === q4Id) correctOpt = 'A';

    // Submit correct answer
    const ansRes = await request(app)
      .post(`/api/v1/student/topic-practice/sessions/${sessionId}/answer`)
      .set(student1AuthHeader())
      .send({
        questionId: targetQ.questionId,
        selectedOption: correctOpt,
      });

    expect(ansRes.status).toBe(200);
    expect(ansRes.body.data.isCorrect).toBe(true);
    expect(ansRes.body.data.firstAttempt).toBe(true);
    expect(ansRes.body.data.correctOption).toBeDefined();
    expect(ansRes.body.data.explanation).toBeDefined();
  });

  it('7. Kannada student receives questions & explanations in Kannada', async () => {
    const startRes = await request(app)
      .post('/api/v1/student/topic-practice/start')
      .set(studentKnAuthHeader())
      .send({
        categoryId,
        subcategoryId,
        selectionMode: 'MIXED',
        requestedQuestionCount: 1,
        acceptShortage: true,
      });

    expect(startRes.status).toBe(201);
    const sessionId = startRes.body.data.session.id;
    const qPayload = startRes.body.data.questions[0];

    expect(qPayload.questionText).toMatch(/[\u0C80-\u0CFF]/); // Contains Kannada characters!

    const ansRes = await request(app)
      .post(`/api/v1/student/topic-practice/sessions/${sessionId}/answer`)
      .set(studentKnAuthHeader())
      .send({
        questionId: qPayload.questionId,
        selectedOption: 'A',
      });

    expect(ansRes.status).toBe(200);
    expect(ansRes.body.data.explanation).toMatch(/[\u0C80-\u0CFF]/);
  });

  it('8. First-Attempt Integrity: Retries or repeated answer calls do not rewrite original correctness result', async () => {
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
    const qPayload = startRes.body.data.questions[0];
    const targetQId = qPayload.questionId;

    let correctOpt = 'A';
    if (targetQId === q1Id) correctOpt = 'B';
    else if (targetQId === q2Id) correctOpt = 'C';
    else if (targetQId === q3Id) correctOpt = 'B';
    else if (targetQId === q4Id) correctOpt = 'A';

    const wrongOpt = correctOpt === 'A' ? 'B' : 'A';

    // Submit wrong answer first
    const ans1 = await request(app)
      .post(`/api/v1/student/topic-practice/sessions/${sessionId}/answer`)
      .set(student1AuthHeader())
      .send({
        questionId: targetQId,
        selectedOption: wrongOpt,
      });

    expect(ans1.status).toBe(200);
    expect(ans1.body.data.isCorrect).toBe(false);
    expect(ans1.body.data.firstAttempt).toBe(true);

    // Resubmit correct option for learning retry
    const ans2 = await request(app)
      .post(`/api/v1/student/topic-practice/sessions/${sessionId}/answer`)
      .set(student1AuthHeader())
      .send({
        questionId: targetQId,
        selectedOption: correctOpt,
      });

    expect(ans2.status).toBe(200);
    expect(ans2.body.data.firstAttempt).toBe(false);
    expect(ans2.body.data.isCorrect).toBe(false); // First attempt result remains authoritative!
  });

  it('9. INCORRECT_RETRY mode selects questions previously answered incorrectly', async () => {
    // Student 2 answers a question incorrectly
    const startRes1 = await request(app)
      .post('/api/v1/student/topic-practice/start')
      .set(student2AuthHeader())
      .send({
        categoryId,
        subcategoryId,
        selectionMode: 'MIXED',
        requestedQuestionCount: 2,
        acceptShortage: true,
      });

    const s1Id = startRes1.body.data.session.id;
    const targetQId = startRes1.body.data.questions[0].questionId;

    await request(app)
      .post(`/api/v1/student/topic-practice/sessions/${s1Id}/answer`)
      .set(student2AuthHeader())
      .send({
        questionId: targetQId,
        selectedOption: 'D', // Intentional wrong answer
      });

    await request(app)
      .post(`/api/v1/student/topic-practice/sessions/${s1Id}/complete`)
      .set(student2AuthHeader());

    // Student 2 starts INCORRECT_RETRY mode session
    const retryRes = await request(app)
      .post('/api/v1/student/topic-practice/start')
      .set(student2AuthHeader())
      .send({
        categoryId,
        subcategoryId,
        selectionMode: 'INCORRECT_RETRY',
        requestedQuestionCount: 5,
        acceptShortage: true,
      });

    expect(retryRes.status).toBe(201);
    const retryQuestions = retryRes.body.data.questions;
    expect(retryQuestions.map((q: any) => q.questionId)).toContain(targetQId);
  });

  it('10. Skip, Reveal, and Mark for Revision functionality', async () => {
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
    const q1 = startRes.body.data.questions[0].questionId;
    const q2 = startRes.body.data.questions[1].questionId;

    // Toggle Mark for Revision
    const revRes = await request(app)
      .post(`/api/v1/student/topic-practice/sessions/${sessionId}/revision-mark`)
      .set(student1AuthHeader())
      .send({ questionId: q1 });

    expect(revRes.status).toBe(200);
    expect(revRes.body.data.markedForRevision).toBe(true);

    // Skip
    const skipRes = await request(app)
      .post(`/api/v1/student/topic-practice/sessions/${sessionId}/skip`)
      .set(student1AuthHeader())
      .send({ questionId: q1 });

    expect(skipRes.status).toBe(200);

    // Reveal
    const revAns = await request(app)
      .post(`/api/v1/student/topic-practice/sessions/${sessionId}/reveal`)
      .set(student1AuthHeader())
      .send({ questionId: q2 });

    expect(revAns.status).toBe(200);
    expect(revAns.body.data.explanation).toBeDefined();
  });

  it('11. Session completion calculates accuracy among attempted questions only (unanswered do not reduce accuracy)', async () => {
    const startRes = await request(app)
      .post('/api/v1/student/topic-practice/start')
      .set(student1AuthHeader())
      .send({
        categoryId,
        subcategoryId,
        selectionMode: 'MIXED',
        requestedQuestionCount: 4,
        acceptShortage: true,
      });

    const sessionId = startRes.body.data.session.id;

    // Answer Q1 correct, Q2 wrong, leave Q3 and Q4 unanswered
    await request(app)
      .post(`/api/v1/student/topic-practice/sessions/${sessionId}/answer`)
      .set(student1AuthHeader())
      .send({ questionId: q1Id, selectedOption: 'B' });

    await request(app)
      .post(`/api/v1/student/topic-practice/sessions/${sessionId}/answer`)
      .set(student1AuthHeader())
      .send({ questionId: q2Id, selectedOption: 'A' });

    const compRes = await request(app)
      .post(`/api/v1/student/topic-practice/sessions/${sessionId}/complete`)
      .set(student1AuthHeader())
      .send({ timeSpentSeconds: 120 });

    expect(compRes.status).toBe(200);
    const summary = compRes.body.data;

    expect(summary.attemptedCount).toBe(2);
    expect(summary.correctCount).toBe(1);
    expect(summary.wrongCount).toBe(1);
    expect(summary.unansweredCount).toBe(2);
    // Accuracy = 1 / 2 * 100 = 50% (NOT 1 / 4 = 25%)
    expect(summary.accuracyPercentage).toBe(50);
  });

  it('12. Ownership Isolation: Student 2 cannot access Student 1 practice session', async () => {
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

    const s1SessionId = startRes.body.data.session.id;

    // Student 2 tries to access Student 1 session -> 403 Forbidden
    const getRes = await request(app)
      .get(`/api/v1/student/topic-practice/sessions/${s1SessionId}`)
      .set(student2AuthHeader());

    expect(getRes.status).toBe(403);
  });

  it('13. Non-Ranked Verification: Practice session results do NOT create ranked attempts or leaderboard entries', async () => {
    const rankedCount = await prisma.rankedAttempt.count({
      where: { studentId: student1Id },
    });
    const rankedResultsCount = await prisma.rankedResult.count({
      where: { studentId: student1Id },
    });

    // Verify practice activity didn't pollute ranked models!
    expect(rankedCount).toBe(0);
    expect(rankedResultsCount).toBe(0);
  });
});
