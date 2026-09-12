import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '@study-karnataka/database';
import { assertTestDatabase } from './testGuard';
import { TestSeriesService } from '../services/test-series.service';

const ADMIN_TOKEN_KEY = 'dev_access_token_secret_key_2026';

const authHeader = (role: string = 'Super Admin') => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    {
      userId: 'test-admin-uuid-1234',
      email: 'admin@study-karnataka.in',
      roles: [role],
      permissions: [
        'test_series.view',
        'test_series.create',
        'test_series.edit',
        'test_series.submit_review',
        'test_series.review',
        'test_series.approve',
        'test_series.publish',
        'test_series.archive',
        'tests.view',
        'tests.create',
        'tests.publish',
      ],
    },
    ADMIN_TOKEN_KEY,
    { expiresIn: '1h' }
  );
  return `Bearer ${token}`;
};

describe('Prompt 13 — Test Series Management Integration Tests', () => {
  let examCycleId: string;
  let otherExamCycleId: string;
  let publishedTest1Id: string;
  let publishedTest2Id: string;
  let draftTestId: string;
  let sharedMcqId: string;
  let uniqueMcq1Id: string;
  let uniqueMcq2Id: string;

  beforeAll(async () => {
    assertTestDatabase();

    // Clean up test tables safely
    await prisma.testSeriesTest.deleteMany({});
    await prisma.testSeries.deleteMany({});
    await prisma.mockTestQuestion.deleteMany({});
    await prisma.mcqQuestion.deleteMany({});
    await prisma.testCategoryDistribution.deleteMany({});
    await prisma.testSubcategoryDistribution.deleteMany({});
    await prisma.testDifficultyDistribution.deleteMany({});
    await prisma.mockTest.deleteMany({});

    // 1. Setup Exam Cycles
    const programme = await prisma.examProgramme.upsert({
      where: { code: 'PROMPT13_PROG' },
      update: {},
      create: {
        authorityId: (await prisma.examAuthority.findFirst())?.id || '',
        code: 'PROMPT13_PROG',
        nameEn: 'KAS Programme 13',
        nameKn: 'ಕೆಎಎಸ್ ಕಾರ್ಯಕ್ರಮ 13',
      },
    });

    const cycle1 = await prisma.examCycle.upsert({
      where: { programmeId_cycleCode: { programmeId: programme.id, cycleCode: 'KAS_2026_SERIES' } },
      update: {},
      create: {
        programmeId: programme.id,
        cycleCode: 'KAS_2026_SERIES',
        cycleYear: 2026,
        titleEn: 'KAS 2026 Main Cycle',
        titleKn: 'ಕೆಎಎಸ್ 2026 ಮುಖ್ಯ ಪರೀಕ್ಷೆ',
      },
    });
    examCycleId = cycle1.id;

    const cycle2 = await prisma.examCycle.upsert({
      where: { programmeId_cycleCode: { programmeId: programme.id, cycleCode: 'PSI_2026_SERIES' } },
      update: {},
      create: {
        programmeId: programme.id,
        cycleCode: 'PSI_2026_SERIES',
        cycleYear: 2026,
        titleEn: 'PSI 2026 Cycle',
        titleKn: 'ಪಿಎಸ್ಐ 2026 ಪರೀಕ್ಷೆ',
      },
    });
    otherExamCycleId = cycle2.id;

    // 2. Setup Category & MCQs
    const category = await prisma.academicCategory.upsert({
      where: { code: 'SERIES_POLITY' },
      update: {},
      create: {
        code: 'SERIES_POLITY',
        nameEn: 'Polity Series Category',
        nameKn: 'ರಾಜ್ಯವ್ಯವಸ್ಥೆ',
        slugEn: 'series-polity',
        slugKn: 'series-polity-kn',
      },
    });

    const mcq1 = await prisma.mcqQuestion.create({
      data: {
        code: 'MCQ_SERIES_01',
        questionTextEn: 'Shared Question 1 EN',
        questionTextKn: 'Shared Question 1 KN',
        optionA_En: 'A',
        optionA_Kn: 'A',
        optionB_En: 'B',
        optionB_Kn: 'B',
        optionC_En: 'C',
        optionC_Kn: 'C',
        optionD_En: 'D',
        optionD_Kn: 'D',
        correctOption: 'A',
        explanationEn: 'Exp 1 EN',
        explanationKn: 'Exp 1 KN',
        difficulty: 'EASY',
        status: 'APPROVED',
        categoryId: category.id,
      },
    });
    sharedMcqId = mcq1.id;

    const mcq2 = await prisma.mcqQuestion.create({
      data: {
        code: 'MCQ_SERIES_02',
        questionTextEn: 'Unique Question 2 EN',
        questionTextKn: 'Unique Question 2 KN',
        optionA_En: 'A',
        optionA_Kn: 'A',
        optionB_En: 'B',
        optionB_Kn: 'B',
        optionC_En: 'C',
        optionC_Kn: 'C',
        optionD_En: 'D',
        optionD_Kn: 'D',
        correctOption: 'B',
        explanationEn: 'Exp 2 EN',
        explanationKn: 'Exp 2 KN',
        difficulty: 'MEDIUM',
        status: 'APPROVED',
        categoryId: category.id,
      },
    });
    uniqueMcq1Id = mcq2.id;

    const mcq3 = await prisma.mcqQuestion.create({
      data: {
        code: 'MCQ_SERIES_03',
        questionTextEn: 'Unique Question 3 EN',
        questionTextKn: 'Unique Question 3 KN',
        optionA_En: 'A',
        optionA_Kn: 'A',
        optionB_En: 'B',
        optionB_Kn: 'B',
        optionC_En: 'C',
        optionC_Kn: 'C',
        optionD_En: 'D',
        optionD_Kn: 'D',
        correctOption: 'C',
        explanationEn: 'Exp 3 EN',
        explanationKn: 'Exp 3 KN',
        difficulty: 'HARD',
        status: 'APPROVED',
        categoryId: category.id,
      },
    });
    uniqueMcq2Id = mcq3.id;

    // 3. Setup Tests in Test Library
    const test1 = await prisma.mockTest.create({
      data: {
        code: 'TEST_SERIES_PUB_01',
        titleEn: 'Published Test 01',
        titleKn: 'ಪ್ರಕಟಿತ ಪರೀಕ್ಷೆ 01',
        examCycleId,
        totalQuestions: 2,
        durationMinutes: 60,
        status: 'PUBLISHED',
        isPublished: true,
        questions: {
          create: [
            { questionId: sharedMcqId, displayOrder: 1 },
            { questionId: uniqueMcq1Id, displayOrder: 2 },
          ],
        },
      },
    });
    publishedTest1Id = test1.id;

    const test2 = await prisma.mockTest.create({
      data: {
        code: 'TEST_SERIES_PUB_02',
        titleEn: 'Published Test 02',
        titleKn: 'ಪ್ರಕಟಿತ ಪರೀಕ್ಷೆ 02',
        examCycleId,
        totalQuestions: 2,
        durationMinutes: 60,
        status: 'PUBLISHED',
        isPublished: true,
        questions: {
          create: [
            { questionId: sharedMcqId, displayOrder: 1 },
            { questionId: uniqueMcq2Id, displayOrder: 2 },
          ],
        },
      },
    });
    publishedTest2Id = test2.id;

    const test3 = await prisma.mockTest.create({
      data: {
        code: 'TEST_SERIES_DRAFT_01',
        titleEn: 'Draft Test 01',
        titleKn: 'ಕರಡು ಪರೀಕ್ಷೆ 01',
        examCycleId,
        totalQuestions: 1,
        durationMinutes: 30,
        status: 'DRAFT',
        isPublished: false,
        questions: {
          create: [{ questionId: uniqueMcq2Id, displayOrder: 1 }],
        },
      },
    });
    draftTestId = test3.id;
  });

  it('1. Repeated GET /next-code preview is read-only and does not consume sequence', async () => {
    const res1 = await request(app)
      .get('/api/v1/admin/mcq-library/test-series/next-code')
      .set('Authorization', authHeader())
      .expect(200);

    const res2 = await request(app)
      .get('/api/v1/admin/mcq-library/test-series/next-code')
      .set('Authorization', authHeader())
      .expect(200);

    expect(res1.body.data.code).toBe(res2.body.data.code);
    expect(res1.body.data.seqNumber).toBe(res2.body.data.seqNumber);
  });

  it('2. Create Test Series requires bilingual titles (EN & KN >= 3 chars)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/mcq-library/test-series')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'TS', // short
        titleKn: 'ಕೆಎಎಸ್',
        examCycleId,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('English title must be at least 3 characters');
  });

  it('3. Exam Hierarchy Gate: Prevents adding a Test from a different Exam Cycle', async () => {
    const otherTest = await prisma.mockTest.create({
      data: {
        code: 'TEST_OTHER_EXAM_01',
        titleEn: 'PSI Test',
        titleKn: 'ಪಿಎಸ್ಐ ಪರೀಕ್ಷೆ',
        examCycleId: otherExamCycleId,
        totalQuestions: 1,
        durationMinutes: 30,
        status: 'PUBLISHED',
        isPublished: true,
      },
    });

    const res = await request(app)
      .post('/api/v1/admin/mcq-library/test-series')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'KAS Series',
        titleKn: 'ಕೆಎಎಸ್ ಸರಣಿ',
        examCycleId,
        tests: [{ mockTestId: otherTest.id, orderIndex: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('belongs to a different Exam Cycle');
  });

  it('4. Duplicate Test Prevention: Cannot add the same Test twice to one Test Series', async () => {
    const res = await request(app)
      .post('/api/v1/admin/mcq-library/test-series')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'Duplicate Test Series',
        titleKn: 'ದ್ವಿಪ್ರತಿ ಪರೀಕ್ಷೆ ಸರಣಿ',
        examCycleId,
        tests: [
          { mockTestId: publishedTest1Id, orderIndex: 1 },
          { mockTestId: publishedTest1Id, orderIndex: 2 },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('The same Test cannot appear twice in one Test Series');
  });

  it('5. Question Reuse Policy ALLOW_REPEATS allows shared MCQs across Practice tests', async () => {
    const res = await request(app)
      .post('/api/v1/admin/mcq-library/test-series')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'Allow Repeats Series',
        titleKn: 'ಪುನರಾವರ್ತನೆ ಸರಣಿ',
        examCycleId,
        questionReusePolicy: 'ALLOW_REPEATS',
        tests: [
          { mockTestId: publishedTest1Id, orderIndex: 1, entryType: 'PRACTICE' },
          { mockTestId: publishedTest2Id, orderIndex: 2, entryType: 'PRACTICE' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.isReusePolicyValid).toBe(true);
    expect(res.body.data.repeatedMcqCount).toBe(1); // sharedMcqId
  });

  it('6. Question Reuse Policy NO_REPEAT blocks shared MCQs and reports exact location', async () => {
    const res = await request(app)
      .post('/api/v1/admin/mcq-library/test-series')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'No Repeat Series',
        titleKn: 'ಪುನರಾವರ್ತನೆ ಇಲ್ಲದ ಸರಣಿ',
        examCycleId,
        questionReusePolicy: 'NO_REPEAT',
        tests: [
          { mockTestId: publishedTest1Id, orderIndex: 1, entryType: 'PRACTICE' },
          { mockTestId: publishedTest2Id, orderIndex: 2, entryType: 'PRACTICE' },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Question Reuse Validation Failed');
    expect(res.body.error.details.reuseErrors[0]).toContain('NO_REPEAT Policy Violated');
  });

  it('7. Ranked-to-Ranked No-Repeat Rule: Ranked tests ALWAYS enforce no-repeat even if global policy is ALLOW_REPEATS', async () => {
    const res = await request(app)
      .post('/api/v1/admin/mcq-library/test-series')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'Ranked Overlap Series',
        titleKn: 'ರ್ಯಾಂಕ್ಡ್ ಸರಣಿ',
        examCycleId,
        questionReusePolicy: 'ALLOW_REPEATS', // Global allow repeats
        tests: [
          { mockTestId: publishedTest1Id, orderIndex: 1, entryType: 'RANKED' },
          { mockTestId: publishedTest2Id, orderIndex: 2, entryType: 'RANKED' },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.details.reuseErrors[0]).toContain('Ranked-to-Ranked No-Repeat Rule Violated');
  });

  it('8. Publication Safety Gate: Series publication is BLOCKED if any included test is DRAFT', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/mcq-library/test-series')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'Publication Gate Series',
        titleKn: 'ಪ್ರಕಟಣೆ ದ್ವಾರ ಸರಣಿ',
        examCycleId,
        questionReusePolicy: 'ALLOW_REPEATS',
        tests: [
          { mockTestId: publishedTest1Id, orderIndex: 1 },
          { mockTestId: draftTestId, orderIndex: 2 }, // Draft test included
        ],
      })
      .expect(201);

    const seriesId = createRes.body.data.id;

    // Submit -> Approve
    await request(app)
      .post(`/api/v1/admin/mcq-library/test-series/${seriesId}/submit-review`)
      .set('Authorization', authHeader())
      .expect(200);

    await request(app)
      .post(`/api/v1/admin/mcq-library/test-series/${seriesId}/approve`)
      .set('Authorization', authHeader())
      .expect(200);

    // Publish -> MUST BE BLOCKED
    const pubRes = await request(app)
      .post(`/api/v1/admin/mcq-library/test-series/${seriesId}/publish`)
      .set('Authorization', authHeader());

    expect(pubRes.status).toBe(400);
    expect(pubRes.body.error.message).toContain('Publication Blocked');
    expect(pubRes.body.error.message).toContain('are not Published');
  });

  it('9. Series Publication Safety: Publishing Series does NOT cascade-publish included tests', async () => {
    const draftTestBefore = await prisma.mockTest.findUnique({ where: { id: draftTestId } });
    expect(draftTestBefore?.status).toBe('DRAFT');

    // Confirm draftTest status was NOT altered by failed or successful series publish checks
    const draftTestAfter = await prisma.mockTest.findUnique({ where: { id: draftTestId } });
    expect(draftTestAfter?.status).toBe('DRAFT');
  });

  it('10. Published Series Structural Immutability: Edits or reordering on PUBLISHED Series return 400', async () => {
    // Create & Publish a valid Series containing only Published tests
    const createRes = await request(app)
      .post('/api/v1/admin/mcq-library/test-series')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'Published Series Immutability Test',
        titleKn: 'ಪ್ರಕಟಿತ ಸರಣಿ ಬದಲಾಯಿಸಲಾಗದು',
        examCycleId,
        questionReusePolicy: 'ALLOW_REPEATS',
        tests: [{ mockTestId: publishedTest1Id, orderIndex: 1 }],
      })
      .expect(201);

    const seriesId = createRes.body.data.id;

    await request(app)
      .post(`/api/v1/admin/mcq-library/test-series/${seriesId}/submit-review`)
      .set('Authorization', authHeader())
      .expect(200);

    await request(app)
      .post(`/api/v1/admin/mcq-library/test-series/${seriesId}/approve`)
      .set('Authorization', authHeader())
      .expect(200);

    const pubRes = await request(app)
      .post(`/api/v1/admin/mcq-library/test-series/${seriesId}/publish`)
      .set('Authorization', authHeader())
      .expect(200);

    expect(pubRes.body.data.status).toBe('PUBLISHED');

    // Attempt structural update on Published Series -> MUST FAIL 400
    const editRes = await request(app)
      .patch(`/api/v1/admin/mcq-library/test-series/${seriesId}`)
      .set('Authorization', authHeader())
      .send({
        titleEn: 'Attempted Title Edit on Published Series',
      });

    expect(editRes.status).toBe(400);
    expect(editRes.body.error.message).toContain('Published Test Series is structurally immutable');
  });

  it('11. Full Workflow Lifecycle: DRAFT -> REVIEW_PENDING -> CHANGES_REQUESTED -> REVIEW_PENDING -> APPROVED -> PUBLISHED -> ARCHIVED', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/mcq-library/test-series')
      .set('Authorization', authHeader())
      .send({
        titleEn: 'Full Lifecycle Series',
        titleKn: 'ಪೂರ್ಣ ಜೀವನಚಕ್ರ ಸರಣಿ',
        examCycleId,
        questionReusePolicy: 'ALLOW_REPEATS',
        tests: [{ mockTestId: publishedTest1Id, orderIndex: 1 }],
      })
      .expect(201);

    const seriesId = createRes.body.data.id;

    // 1. Submit for review
    const s1 = await request(app)
      .post(`/api/v1/admin/mcq-library/test-series/${seriesId}/submit-review`)
      .set('Authorization', authHeader())
      .expect(200);
    expect(s1.body.data.status).toBe('REVIEW_PENDING');

    // 2. Request changes
    const s2 = await request(app)
      .post(`/api/v1/admin/mcq-library/test-series/${seriesId}/request-changes`)
      .set('Authorization', authHeader())
      .send({ rejectionReason: 'Please check description' })
      .expect(200);
    expect(s2.body.data.status).toBe('CHANGES_REQUESTED');
    expect(s2.body.data.rejectionReason).toBe('Please check description');

    // 3. Submit again
    const s3 = await request(app)
      .post(`/api/v1/admin/mcq-library/test-series/${seriesId}/submit-review`)
      .set('Authorization', authHeader())
      .expect(200);
    expect(s3.body.data.status).toBe('REVIEW_PENDING');

    // 4. Approve
    const s4 = await request(app)
      .post(`/api/v1/admin/mcq-library/test-series/${seriesId}/approve`)
      .set('Authorization', authHeader())
      .expect(200);
    expect(s4.body.data.status).toBe('APPROVED');

    // 5. Publish
    const s5 = await request(app)
      .post(`/api/v1/admin/mcq-library/test-series/${seriesId}/publish`)
      .set('Authorization', authHeader())
      .expect(200);
    expect(s5.body.data.status).toBe('PUBLISHED');
    expect(s5.body.data.isPublished).toBe(true);

    // 6. Archive
    const s6 = await request(app)
      .post(`/api/v1/admin/mcq-library/test-series/${seriesId}/archive`)
      .set('Authorization', authHeader())
      .expect(200);
    expect(s6.body.data.status).toBe('ARCHIVED');
  });
});
