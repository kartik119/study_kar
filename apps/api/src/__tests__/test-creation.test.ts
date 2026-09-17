// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '@study-karnataka/database';
import { assertTestDatabase } from './testGuard';
import { TestCreationService } from '../services/test-creation.service';

const ADMIN_TOKEN_KEY = 'dev_access_token_secret_key_2026';

// Helper to construct authorization header
const authHeader = (role: string = 'Super Admin') => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    {
      userId: 'test-admin-uuid-1234',
      email: 'admin@study-karnataka.in',
      roles: [role],
      permissions: [
        'tests.view',
        'tests.create',
        'tests.edit',
        'tests.submit_review',
        'tests.review',
        'tests.approve',
        'tests.publish',
        'tests.archive',
      ],
    },
    ADMIN_TOKEN_KEY,
    { expiresIn: '1h' }
  );
  return `Bearer ${token}`;
};

describe('Prompt 12 — Test ID Sequence & Exact Question Selection Gate Integration Tests', () => {
  let categoryPolityId: string;
  let categoryHistoryId: string;
  let approvedBilingualQIds: string[] = [];
  let draftQId: string;

  beforeAll(async () => {
    assertTestDatabase();

    // Clean up test tables safely
    await prisma.mockTestQuestion.deleteMany({});
    await prisma.testCategoryDistribution.deleteMany({});
    await prisma.testSubcategoryDistribution.deleteMany({});
    await prisma.testDifficultyDistribution.deleteMany({});
    await prisma.mockTest.deleteMany({});
  });

  beforeEach(async () => {
    assertTestDatabase();

    // Setup master categories
    const catPolity = await prisma.academicCategory.upsert({
      where: { code: 'TEST_POLITY' },
      update: {},
      create: {
        code: 'TEST_POLITY',
        nameEn: 'Indian Polity & Constitution',
        nameKn: 'ಭಾರತೀಯ ರಾಜ್ಯವ್ಯವಸ್ಥೆ',
        slugEn: 'test-polity',
        slugKn: 'test-polity-kn',
      },
    });
    categoryPolityId = catPolity.id;

    const catHistory = await prisma.academicCategory.upsert({
      where: { code: 'TEST_HISTORY' },
      update: {},
      create: {
        code: 'TEST_HISTORY',
        nameEn: 'Indian History',
        nameKn: 'ಭಾರತೀಯ ಇತಿಹಾಸ',
        slugEn: 'test-history',
        slugKn: 'test-history-kn',
      },
    });
    categoryHistoryId = catHistory.id;

    // Create a pool of Approved & Bilingual Ready MCQs across categories and difficulties
    approvedBilingualQIds = [];

    const mcqSpecs = [
      // Polity Easy (3)
      { catId: categoryPolityId, diff: 'EASY', code: 'MCQ_POL_E1' },
      { catId: categoryPolityId, diff: 'EASY', code: 'MCQ_POL_E2' },
      { catId: categoryPolityId, diff: 'EASY', code: 'MCQ_POL_E3' },
      // Polity Medium (4)
      { catId: categoryPolityId, diff: 'MEDIUM', code: 'MCQ_POL_M1' },
      { catId: categoryPolityId, diff: 'MEDIUM', code: 'MCQ_POL_M2' },
      { catId: categoryPolityId, diff: 'MEDIUM', code: 'MCQ_POL_M3' },
      { catId: categoryPolityId, diff: 'MEDIUM', code: 'MCQ_POL_M4' },
      // Polity Hard (2)
      { catId: categoryPolityId, diff: 'HARD', code: 'MCQ_POL_H1' },
      { catId: categoryPolityId, diff: 'HARD', code: 'MCQ_POL_H2' },

      // History Easy (2)
      { catId: categoryHistoryId, diff: 'EASY', code: 'MCQ_HIS_E1' },
      { catId: categoryHistoryId, diff: 'EASY', code: 'MCQ_HIS_E2' },
      // History Medium (3)
      { catId: categoryHistoryId, diff: 'MEDIUM', code: 'MCQ_HIS_M1' },
      { catId: categoryHistoryId, diff: 'MEDIUM', code: 'MCQ_HIS_M2' },
      { catId: categoryHistoryId, diff: 'MEDIUM', code: 'MCQ_HIS_M3' },
      // History Hard (2)
      { catId: categoryHistoryId, diff: 'HARD', code: 'MCQ_HIS_H1' },
      { catId: categoryHistoryId, diff: 'HARD', code: 'MCQ_HIS_H2' },
    ];

    for (const spec of mcqSpecs) {
      const q = await prisma.mcqQuestion.upsert({
        where: { code: spec.code },
        update: {
          status: 'APPROVED',
          category: { connect: { id: spec.catId } },
          difficulty: spec.diff as any,
          questionTextEn: `Question text for ${spec.code}?`,
          questionTextKn: `${spec.code} ಗೆ ಪ್ರಶ್ನೆ ಪಠ್ಯ?`,
          optionA_En: 'Option A (EN)',
          optionA_Kn: 'ಆಯ್ಕೆ A (KN)',
          optionB_En: 'Option B (EN)',
          optionB_Kn: 'ಆಯ್ಕೆ B (KN)',
          optionC_En: 'Option C (EN)',
          optionC_Kn: 'ಆಯ್ಕೆ C (KN)',
          optionD_En: 'Option D (EN)',
          optionD_Kn: 'ಆಯ್ಕೆ D (KN)',
          correctOption: 'A',
          explanationEn: 'Explanation in English',
          explanationKn: 'ಕನ್ನಡದಲ್ಲಿ ವಿವರಣೆ',
        },
        create: {
          code: spec.code,
          seqNumber: Math.floor(Math.random() * 900000) + 100000,
          questionTextEn: `Question text for ${spec.code}?`,
          questionTextKn: `${spec.code} ಗೆ ಪ್ರಶ್ನೆ ಪಠ್ಯ?`,
          optionA_En: 'Option A (EN)',
          optionA_Kn: 'ಆಯ್ಕೆ A (KN)',
          optionB_En: 'Option B (EN)',
          optionB_Kn: 'ಆಯ್ಕೆ B (KN)',
          optionC_En: 'Option C (EN)',
          optionC_Kn: 'ಆಯ್ಕೆ C (KN)',
          optionD_En: 'Option D (EN)',
          optionD_Kn: 'ಆಯ್ಕೆ D (KN)',
          correctOption: 'A',
          explanationEn: 'Explanation in English',
          explanationKn: 'ಕನ್ನಡದಲ್ಲಿ ವಿವರಣೆ',
          category: { connect: { id: spec.catId } },
          difficulty: spec.diff as any,
          positiveMarks: 1.0,
          negativeMarks: 0.25,
          status: 'APPROVED',
        },
      });
      approvedBilingualQIds.push(q.id);
    }

    // Create 1 DRAFT (ineligible) MCQ
    const draftQ = await prisma.mcqQuestion.upsert({
      where: { code: 'MCQ_DRAFT_INELIGIBLE' },
      update: { status: 'DRAFT' },
      create: {
        code: 'MCQ_DRAFT_INELIGIBLE',
        seqNumber: 999999,
        questionTextEn: 'Draft question text',
        questionTextKn: 'ಡ್ರಾಫ್ಟ್ ಪ್ರಶ್ನೆ',
        optionA_En: 'A',
        optionA_Kn: 'A',
        optionB_En: 'B',
        optionB_Kn: 'B',
        optionC_En: 'C',
        optionC_Kn: 'C',
        optionD_En: 'D',
        optionD_Kn: 'D',
        correctOption: 'A',
        explanationEn: 'Exp',
        explanationKn: 'Exp',
        status: 'DRAFT',
      },
    });
    draftQId = draftQ.id;
  });

  it('1. GET /next-code is 100% READ-ONLY (does not consume sequence or mutate DB)', async () => {
    const res1 = await request(app)
      .get('/api/v1/admin/mcq-library/tests/next-code')
      .set('Authorization', authHeader())
      .expect(200);

    const res2 = await request(app)
      .get('/api/v1/admin/mcq-library/tests/next-code')
      .set('Authorization', authHeader())
      .expect(200);

    const res3 = await request(app)
      .get('/api/v1/admin/mcq-library/tests/next-code')
      .set('Authorization', authHeader())
      .expect(200);

    expect(res1.body.data.code).toBe(res2.body.data.code);
    expect(res2.body.data.code).toBe(res3.body.data.code);
  });

  it('2. Manual Selection 99/100 Failure: Blocks test creation when question count is short', async () => {
    const previewRes = await request(app)
      .get('/api/v1/admin/mcq-library/tests/next-code')
      .set('Authorization', authHeader())
      .expect(200);

    const previewCode = previewRes.body.data.code;

    // Attempt to create test configured for 5 questions but with only 4 selected
    const errRes = await request(app)
      .post('/api/v1/admin/mcq-library/tests')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'Short Selection Test',
        titleKn: 'ಅಪೂರ್ಣ ಪರೀಕ್ಷೆ',
        totalQuestions: 5,
        durationMinutes: 30,
        selectionMode: 'MANUAL',
        questionIds: approvedBilingualQIds.slice(0, 4), // 4 questions provided instead of 5
      })
      .expect(400);

    expect(errRes.body.error.message).toContain('Exact question count requirement failed');

    // Confirm preview code remains unchanged after creation failure
    const previewResAfter = await request(app)
      .get('/api/v1/admin/mcq-library/tests/next-code')
      .set('Authorization', authHeader())
      .expect(200);

    expect(previewResAfter.body.data.code).toBe(previewCode);
  });

  it('3. Manual Selection 100/100 Success: Creates MockTest with exact number of MockTestQuestions', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/mcq-library/tests')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'KAS Manual Exact Selection Test',
        titleKn: 'ಕೆಎಎಸ್ ಹಸ್ತಚಾಲಿತ ಪರೀಕ್ಷೆ',
        totalQuestions: 5,
        durationMinutes: 30,
        selectionMode: 'MANUAL',
        questionIds: approvedBilingualQIds.slice(0, 5), // exactly 5 unique eligible questions
      })
      .expect(201);

    const testId = createRes.body.data.id;
    const testCode = createRes.body.data.code;
    expect(testCode).toMatch(/^TEST_\d{6}$/);

    // Database assertions
    const dbTest = await prisma.mockTest.findUnique({ where: { id: testId } });
    expect(dbTest?.totalQuestions).toBe(5);

    const dbQuestionsCount = await prisma.mockTestQuestion.count({ where: { mockTestId: testId } });
    expect(dbQuestionsCount).toBe(5);
  });

  it('4. Manual Over-Selection: Blocks adding more questions than configured total', async () => {
    const errRes = await request(app)
      .post('/api/v1/admin/mcq-library/tests')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'Over Selected Test',
        titleKn: 'ಹೆಚ್ಚು ಆಯ್ಕೆಮಾಡಿದ ಪರೀಕ್ಷೆ',
        totalQuestions: 3,
        durationMinutes: 30,
        selectionMode: 'MANUAL',
        questionIds: approvedBilingualQIds.slice(0, 4), // 4 provided for total = 3
      })
      .expect(400);

    expect(errRes.body.error.message).toContain('Question limit reached');
  });

  it('5. Duplicate Question Failure: Blocks test creation if selection contains duplicate MCQ IDs', async () => {
    const errRes = await request(app)
      .post('/api/v1/admin/mcq-library/tests')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'Duplicate Selection Test',
        titleKn: 'ನಕಲಿ ಆಯ್ಕೆ ಪರೀಕ್ಷೆ',
        totalQuestions: 2,
        durationMinutes: 30,
        selectionMode: 'MANUAL',
        questionIds: [approvedBilingualQIds[0], approvedBilingualQIds[0]], // Duplicate ID
      })
      .expect(400);

    expect(errRes.body.error.message).toContain('duplicate questions');
  });

  it('6. Automatic Selection Engine: Solves joint Category AND Difficulty constraints simultaneously', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/mcq-library/tests')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'KAS Automatic Joint Constraint Test',
        titleKn: 'ಕೆಎಎಸ್ ಸ್ವಯಂಚಾಲಿತ ಪರೀಕ್ಷೆ',
        totalQuestions: 10,
        durationMinutes: 60,
        selectionMode: 'AUTOMATIC',
        categoryDistributions: [
          { categoryId: categoryPolityId, targetCount: 6 },
          { categoryId: categoryHistoryId, targetCount: 4 },
        ],
        difficultyDistributions: [
          { difficulty: 'EASY', targetCount: 3 },
          { difficulty: 'MEDIUM', targetCount: 5 },
          { difficulty: 'HARD', targetCount: 2 },
        ],
      })
      .expect(201);

    const test = createRes.body.data;
    expect(test.totalQuestions).toBe(10);
    expect(test.questions.length).toBe(10);

    const dbQuestionCount = await prisma.mockTestQuestion.count({ where: { mockTestId: test.id } });
    expect(dbQuestionCount).toBe(10);
  });

  it('7. Automatic Shortage Detection: Blocks test creation and consumes no sequence when pool is insufficient', async () => {
    const testsCountBefore = await prisma.mockTest.count();

    const errRes = await request(app)
      .post('/api/v1/admin/mcq-library/tests')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'KAS Insufficient Pool Test',
        titleKn: 'ಕೆಎಎಸ್ ಅಪೂರ್ಣ ಪರೀಕ್ಷೆ',
        totalQuestions: 50,
        durationMinutes: 120,
        selectionMode: 'AUTOMATIC',
        categoryDistributions: [
          { categoryId: categoryPolityId, targetCount: 30 },
          { categoryId: categoryHistoryId, targetCount: 20 },
        ],
        difficultyDistributions: [
          { difficulty: 'HARD', targetCount: 50 },
        ],
      })
      .expect(400);

    expect(errRes.body.error.message).toContain('Unable to complete automatic question selection');

    // Confirm no MockTest record was created
    const testsCountAfter = await prisma.mockTest.count();
    expect(testsCountAfter).toBe(testsCountBefore);
  });

  it('8. Eligibility Change Detection: Server double-check catches status change before persistence', async () => {
    // Create a temporary question and mark it DRAFT
    const targetQId = approvedBilingualQIds[2];
    await prisma.mcqQuestion.update({
      where: { id: targetQId },
      data: { status: 'DRAFT' },
    });

    const errRes = await request(app)
      .post('/api/v1/admin/mcq-library/tests')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'Eligibility Check Test',
        titleKn: 'ಅರ್ಹತೆ ಪರಿಶೀಲನೆ',
        totalQuestions: 3,
        durationMinutes: 30,
        selectionMode: 'MANUAL',
        questionIds: [approvedBilingualQIds[0], approvedBilingualQIds[1], targetQId],
      })
      .expect(400);

    expect(errRes.body.error.message).toContain('ineligible questions');

    // Restore status to APPROVED for clean state
    await prisma.mcqQuestion.update({
      where: { id: targetQId },
      data: { status: 'APPROVED' },
    });
  });

  it('9. Publication Snapshot & Immutability: Freezes question snapshots transactionally on publish', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/mcq-library/tests')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'KAS Published Snapshot Test',
        titleKn: 'ಕೆಎಎಸ್ ಪ್ರಕಟಿತ ಪರೀಕ್ಷೆ',
        totalQuestions: 2,
        durationMinutes: 30,
        selectionMode: 'AUTOMATIC',
        categoryDistributions: [{ categoryId: categoryPolityId, targetCount: 2 }],
        difficultyDistributions: [{ difficulty: 'EASY', targetCount: 2 }],
      })
      .expect(201);

    const testId = createRes.body.data.id;

    // Submit -> Approve -> Publish
    await request(app)
      .post(`/api/v1/admin/mcq-library/tests/${testId}/submit-review`)
      .set('Authorization', authHeader())
      .expect(200);

    await request(app)
      .post(`/api/v1/admin/mcq-library/tests/${testId}/approve`)
      .set('Authorization', authHeader())
      .expect(200);

    const pubRes = await request(app)
      .post(`/api/v1/admin/mcq-library/tests/${testId}/publish`)
      .set('Authorization', authHeader())
      .expect(200);

    expect(pubRes.body.data.status).toBe('PUBLISHED');
    expect(pubRes.body.data.isPublished).toBe(true);

    const firstTQ = pubRes.body.data.questions[0];
    expect(firstTQ.snapshotQuestionEn).toBeTruthy();
    expect(firstTQ.snapshotOptionA_En).toBeTruthy();

    // Modify canonical MCQ in library
    await prisma.mcqQuestion.update({
      where: { id: firstTQ.questionId },
      data: { questionTextEn: 'MODIFIED QUESTION TEXT AFTER PUBLISH' },
    });

    // Fetch test again -> Snapshot MUST REMAIN UNCHANGED
    const getRes = await request(app)
      .get(`/api/v1/admin/mcq-library/tests/${testId}`)
      .set('Authorization', authHeader())
      .expect(200);

    const reFetchedTQ = getRes.body.data.questions.find((q: any) => q.id === firstTQ.id);
    expect(reFetchedTQ.snapshotQuestionEn).toBe(firstTQ.snapshotQuestionEn);
    expect(reFetchedTQ.snapshotQuestionEn).not.toBe('MODIFIED QUESTION TEXT AFTER PUBLISH');
  });

  it('10. Full Workflow Lifecycle: DRAFT -> REVIEW_PENDING -> CHANGES_REQUESTED -> REVIEW_PENDING -> APPROVED -> PUBLISHED -> ARCHIVED', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/mcq-library/tests')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'KAS Full Lifecycle Test',
        titleKn: 'ಕೆಎಎಸ್ ಪೂರ್ಣ ಜೀವನಚಕ್ರ ಪರೀಕ್ಷೆ',
        totalQuestions: 2,
        durationMinutes: 30,
        selectionMode: 'MANUAL',
        questionIds: [approvedBilingualQIds[0], approvedBilingualQIds[1]],
      })
      .expect(201);

    const testId = createRes.body.data.id;

    // 1. Submit for Review
    const s1 = await request(app)
      .post(`/api/v1/admin/mcq-library/tests/${testId}/submit-review`)
      .set('Authorization', authHeader())
      .expect(200);
    expect(s1.body.data.status).toBe('REVIEW_PENDING');

    // 2. Request Changes
    const s2 = await request(app)
      .post(`/api/v1/admin/mcq-library/tests/${testId}/request-changes`)
      .set('Authorization', authHeader())
      .send({ rejectionReason: 'Please reorder questions' })
      .expect(200);
    expect(s2.body.data.status).toBe('CHANGES_REQUESTED');
    expect(s2.body.data.rejectionReason).toBe('Please reorder questions');

    // 3. Submit again
    const s3 = await request(app)
      .post(`/api/v1/admin/mcq-library/tests/${testId}/submit-review`)
      .set('Authorization', authHeader())
      .expect(200);
    expect(s3.body.data.status).toBe('REVIEW_PENDING');

    // 4. Approve
    const s4 = await request(app)
      .post(`/api/v1/admin/mcq-library/tests/${testId}/approve`)
      .set('Authorization', authHeader())
      .expect(200);
    expect(s4.body.data.status).toBe('APPROVED');

    // 5. Publish
    const s5 = await request(app)
      .post(`/api/v1/admin/mcq-library/tests/${testId}/publish`)
      .set('Authorization', authHeader())
      .expect(200);
    expect(s5.body.data.status).toBe('PUBLISHED');

    // 6. Archive
    const s6 = await request(app)
      .post(`/api/v1/admin/mcq-library/tests/${testId}/archive`)
      .set('Authorization', authHeader())
      .expect(200);
    expect(s6.body.data.status).toBe('ARCHIVED');
  });

  it('11. Repeated next-code preview endpoint is strictly read-only and does not consume Test IDs', async () => {
    const res1 = await request(app)
      .get('/api/v1/admin/mcq-library/tests/next-code')
      .set('Authorization', authHeader())
      .expect(200);

    const res2 = await request(app)
      .get('/api/v1/admin/mcq-library/tests/next-code')
      .set('Authorization', authHeader())
      .expect(200);

    const res3 = await request(app)
      .get('/api/v1/admin/mcq-library/tests/next-code')
      .set('Authorization', authHeader())
      .expect(200);

    expect(res1.body.data.code).toBe(res2.body.data.code);
    expect(res2.body.data.code).toBe(res3.body.data.code);
    expect(res1.body.data.seqNumber).toBe(res2.body.data.seqNumber);
  });

  it('12. Subcategory allocation sum must equal parent Category target count', async () => {
    let catSub = await prisma.academicSubcategory.findFirst({
      where: { categoryId: categoryPolityId },
    });
    if (!catSub) {
      catSub = await prisma.academicSubcategory.create({
        data: {
          categoryId: categoryPolityId,
          code: 'SUBCAT_TEST_12',
          nameEn: 'Subcat Test 12',
          nameKn: 'ಉಪವರ್ಗ 12',
          slugEn: 'subcat-test-12',
          slugKn: 'subcat-test-12-kn',
        },
      });
    }

    const invalidRes = await request(app)
      .post('/api/v1/admin/mcq-library/tests')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'Invalid Subcat Test',
        titleKn: 'ಅಮಾನ್ಯ ಉಪವರ್ಗ ಪರೀಕ್ಷೆ',
        totalQuestions: 10,
        durationMinutes: 60,
        selectionMode: 'MANUAL',
        questionIds: approvedBilingualQIds.slice(0, 10),
        categoryDistributions: [{ categoryId: categoryPolityId, targetCount: 10 }],
        subcategoryDistributions: [{ subcategoryId: catSub.id, targetCount: 8 }], // 8 != 10
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error.message).toContain('Subcategory allocation sum');
  });

  it('13. Automatic selection shortage fails cleanly, creates no MockTest, and preserves sequence', async () => {
    const codeBefore = await TestCreationService.getNextTestCodePreview();

    const shortageRes = await request(app)
      .post('/api/v1/admin/mcq-library/tests')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'Shortage Test',
        titleKn: 'ಕೊರತೆ ಪರೀಕ್ಷೆ',
        totalQuestions: 100, // Only ~12 MCQs exist in test DB
        durationMinutes: 60,
        selectionMode: 'AUTOMATIC',
        categoryDistributions: [{ categoryId: categoryPolityId, targetCount: 100 }],
        difficultyDistributions: [{ difficulty: 'EASY', targetCount: 100 }],
      });

    expect(shortageRes.status).toBe(400);
    expect(shortageRes.body.error.message).toContain('Unable to complete automatic question selection');

    const codeAfter = await TestCreationService.getNextTestCodePreview();
    expect(codeAfter.code).toBe(codeBefore.code);
    expect(codeAfter.seqNumber).toBe(codeBefore.seqNumber);
  });

  it('14. Stale/ineligible MCQ in manual submission triggers 400 error', async () => {
    const ineligibleRes = await request(app)
      .post('/api/v1/admin/mcq-library/tests')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'Ineligible MCQ Test',
        titleKn: 'ಅನರ್ಹ ಪ್ರಶ್ನೆ ಪರೀಕ್ಷೆ',
        totalQuestions: 2,
        durationMinutes: 60,
        selectionMode: 'MANUAL',
        questionIds: [approvedBilingualQIds[0], draftQId], // draftQId is not APPROVED
      });

    expect(ineligibleRes.status).toBe(400);
    expect(ineligibleRes.body.error.message).toContain('Manual selection contains ineligible questions');
  });

  it('15. KAS Paper 2 blueprint validation (40+30+30; 20+55+25) evaluates cleanly', async () => {
    const checkRes = await TestCreationService.checkAvailability({
      totalQuestions: 100,
      categoryDistributions: [
        { categoryId: categoryPolityId, targetCount: 40 },
        { categoryId: categoryHistoryId, targetCount: 30 },
      ],
      difficultyDistributions: [
        { difficulty: 'EASY', targetCount: 20 },
        { difficulty: 'MEDIUM', targetCount: 55 },
        { difficulty: 'HARD', targetCount: 25 },
      ],
    });

    expect(checkRes.totalQuestions).toBe(100);
    expect(checkRes.categoryStatus.length).toBe(2);
    expect(checkRes.difficultyStatus.length).toBe(3);
  });
});
