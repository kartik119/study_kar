// @ts-nocheck
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma, seedMcqDemo } from '@study-karnataka/database';
import { signAccessToken } from '../utils/jwt';

describe('Prompt 10 MCQ Question Library Foundation & Closure Integration Tests', () => {
  let adminToken: string;
  let categoryId: string;
  let subcategoryId: string;
  let draftQuestionId: string;
  let completeQuestionId: string;

  beforeAll(async () => {
    // 1. Admin User
    const adminUser = await prisma.adminUser.upsert({
      where: { email: 'mcq.foundation.admin@studykarnataka.com' },
      update: {},
      create: {
        email: 'mcq.foundation.admin@studykarnataka.com',
        fullName: 'MCQ Foundation Super Admin',
        passwordHash: 'hash',
        accountStatus: 'ACTIVE',
      },
    });

    adminToken = signAccessToken({
      userId: adminUser.id,
      accountType: 'ADMIN',
      roles: ['Super Admin'],
      permissions: ['mcq_tests.view', 'mcq.view', 'mcq.create', 'mcq.edit', 'mcq.submit_review', 'mcq.review', 'mcq.approve', 'mcq.archive'],
      sessionId: 'mcq-foundation-session-id',
    });

    // 2. Baseline Category & Subcategory
    const cat = await prisma.academicCategory.upsert({
      where: { code: 'MCQ_TEST_POLITY' },
      update: {},
      create: {
        code: 'MCQ_TEST_POLITY',
        nameEn: 'Indian Polity Test Cat',
        nameKn: 'ಭಾರತೀಯ ರಾಜಕೀಯ ಪರೀಕ್ಷಾ ವರ್ಗ',
        slugEn: 'indian-polity-test-cat',
        slugKn: 'indian-polity-test-cat-kn',
      },
    });
    categoryId = cat.id;

    const sub = await prisma.academicSubcategory.upsert({
      where: { categoryId_code: { categoryId: cat.id, code: 'MCQ_TEST_RIGHTS' } },
      update: {},
      create: {
        categoryId: cat.id,
        code: 'MCQ_TEST_RIGHTS',
        nameEn: 'Rights Subcat',
        nameKn: 'ಹಕ್ಕುಗಳ ಉಪವರ್ಗ',
        slugEn: 'rights-subcat',
        slugKn: 'rights-subcat-kn',
      },
    });
    subcategoryId = sub.id;

    // Clean up any stale test questions from previous runs
    await prisma.mcqQuestion.deleteMany({
      where: {
        OR: [
          { questionTextEn: { contains: 'Constitutional Amendment' } },
          { questionTextEn: { contains: 'President of India' } },
          { questionTextEn: { contains: 'Writs in Indian Constitution' } },
          { questionTextEn: { contains: 'Preamble of India' } },
        ],
      },
    });
  });

  it('1. GET /questions/next-code returns auto-generated sequential code e.g. MCQ_00000X', async () => {
    const res = await request(app)
      .get('/api/v1/admin/mcq-library/questions/next-code')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.code).toMatch(/^MCQ_\d{6}$/);
    expect(res.body.data.seqNumber).toBeGreaterThan(0);
  });

  it('2. Bilingual Readiness vs Approval Eligibility (Complete content without Category)', async () => {
    // Complete language content, but no category/subcategory
    const res = await request(app)
      .post('/api/v1/admin/mcq-library/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        questionTextEn: 'Preamble of India question text',
        questionTextKn: 'ಭಾರತದ ಪ್ರಸ್ತಾವನೆ ಪ್ರಶ್ನೆ ಪಠ್ಯ',
        optionA_En: 'Opt A EN',
        optionA_Kn: 'ಆಯ್ಕೆ A KN',
        optionB_En: 'Opt B EN',
        optionB_Kn: 'ಆಯ್ಕೆ B KN',
        optionC_En: 'Opt C EN',
        optionC_Kn: 'ಆಯ್ಕೆ C KN',
        optionD_En: 'Opt D EN',
        optionD_Kn: 'ಆಯ್ಕೆ D KN',
        explanationEn: 'Explanation EN',
        explanationKn: 'ವಿವರಣೆ KN',
        difficulty: 'EASY',
        correctOption: 'A',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.readiness).toBe('BILINGUAL_READY');
    expect(res.body.data.approvalEligibility.eligible).toBe(false);
    expect(res.body.data.approvalEligibility.missingFields).toContain('CATEGORY');
    expect(res.body.data.approvalEligibility.missingFields).toContain('SUBCATEGORY');

    // Clean up
    await prisma.mcqQuestion.delete({ where: { id: res.body.data.id } });
  });

  it('3. Bilingual Readiness vs Approval Eligibility (Complete content without Correct Answer)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/mcq-library/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        questionTextEn: 'Writs in Indian Constitution question text',
        questionTextKn: 'ಭಾರತೀಯ ಸಂವಿಧಾನದ ರಿಟ್‌ಗಳ ಪ್ರಶ್ನೆ',
        optionA_En: 'Opt A EN',
        optionA_Kn: 'ಆಯ್ಕೆ A KN',
        optionB_En: 'Opt B EN',
        optionB_Kn: 'ಆಯ್ಕೆ B KN',
        optionC_En: 'Opt C EN',
        optionC_Kn: 'ಆಯ್ಕೆ C KN',
        optionD_En: 'Opt D EN',
        optionD_Kn: 'ಆಯ್ಕೆ D KN',
        explanationEn: 'Explanation EN',
        explanationKn: 'ವಿವರಣೆ KN',
        difficulty: 'EASY',
        categoryId,
        subcategoryId,
        // no correctOption
      });

    expect(res.status).toBe(201);
    expect(res.body.data.readiness).toBe('BILINGUAL_READY');
    expect(res.body.data.approvalEligibility.eligible).toBe(false);
    expect(res.body.data.approvalEligibility.missingFields).toContain('CORRECT_ANSWER');

    // Try approving: must be rejected because approvalEligibility.eligible === false
    const approveRes = await request(app)
      .post(`/api/v1/admin/mcq-library/questions/${res.body.data.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveRes.status).toBe(400);
    expect(approveRes.body.error.message).toContain('Missing required approval fields');

    // Clean up
    await prisma.mcqQuestion.delete({ where: { id: res.body.data.id } });
  });

  it('4. Language Readiness: English missing => ENGLISH_INCOMPLETE, Kannada missing => KANNADA_INCOMPLETE', async () => {
    // English missing
    const knOnlyRes = await request(app)
      .post('/api/v1/admin/mcq-library/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        questionTextKn: 'ಕನ್ನಡ ಪ್ರಶ್ನೆ ಮಾತ್ರ',
        optionA_Kn: 'ಆಯ್ಕೆ ಎ',
        optionB_Kn: 'ಆಯ್ಕೆ ಬಿ',
        optionC_Kn: 'ಆಯ್ಕೆ ಸಿ',
        optionD_Kn: 'ಆಯ್ಕೆ ಡಿ',
        explanationKn: 'ವಿವರಣೆ ಬಿ',
        difficulty: 'EASY',
      });

    expect(knOnlyRes.body.data.readiness).toBe('ENGLISH_INCOMPLETE');

    // Kannada missing
    const enOnlyRes = await request(app)
      .post('/api/v1/admin/mcq-library/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        questionTextEn: 'English question stem only',
        optionA_En: 'Opt A',
        optionB_En: 'Opt B',
        optionC_En: 'Opt C',
        optionD_En: 'Opt D',
        explanationEn: 'Explanation A',
        difficulty: 'EASY',
      });

    expect(enOnlyRes.body.data.readiness).toBe('KANNADA_INCOMPLETE');

    // Clean up
    await prisma.mcqQuestion.delete({ where: { id: knOnlyRes.body.data.id } });
    await prisma.mcqQuestion.delete({ where: { id: enOnlyRes.body.data.id } });
  });

  it('5. POST /questions creates a complete BILINGUAL_READY & Approval Eligible question', async () => {
    const timestamp = Date.now();
    const uniqueStemEn = `Which Constitutional Amendment Act reduced the voting age from 21 to 18 years in India? (${timestamp})`;

    const res = await request(app)
      .post('/api/v1/admin/mcq-library/questions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        questionTextEn: uniqueStemEn,
        questionTextKn: 'ಭಾರತದಲ್ಲಿ ಮತದಾನದ ವಯಸ್ಸನ್ನು ೨೧ ರಿಂದ ೧೮ ವರ್ಷಕ್ಕೆ ಇಳಿಸಿದ ಸಂವಿಧಾನ ತಿದ್ದುಪಡಿ ಕಾಯ್ದೆ ಯಾವುದು?',
        optionA_En: '42nd Amendment Act',
        optionA_Kn: '೪೨ ನೇ ತಿದ್ದುಪಡಿ ಕಾಯ್ದೆ',
        optionB_En: '44th Amendment Act',
        optionB_Kn: '೪೪ ನೇ ತಿದ್ದುಪಡಿ ಕಾಯ್ದೆ',
        optionC_En: '61st Amendment Act',
        optionC_Kn: '೬೧ ನೇ ತಿದ್ದುಪಡಿ ಕಾಯ್ದೆ',
        optionD_En: '73rd Amendment Act',
        optionD_Kn: '೭೩ ನೇ ತಿದ್ದುಪಡಿ ಕಾಯ್ದೆ',
        correctOption: 'C',
        explanationEn: 'The 61st Constitutional Amendment Act of 1988 reduced the voting age for the Lok Sabha and Legislative Assemblies from 21 to 18 years.',
        explanationKn: '೧೯೮೮ ರ ೬೧ ನೇ ಸಂವಿಧಾನ ತಿದ್ದುಪಡಿ ಕಾಯ್ದೆಯು ಲೋಕಸಭೆ ಮತ್ತು ವಿಧಾನಸಭೆಗಳ ಮತದಾನದ ವಯಸ್ಸನ್ನು ೨೧ ರಿಂದ ೧೮ ಕ್ಕೆ ಇಳಿಸಿತು.',
        difficulty: 'MEDIUM',
        positiveMarks: 1.0,
        negativeMarks: 0.25,
        status: 'DRAFT',
        categoryId,
        subcategoryId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.readiness).toBe('BILINGUAL_READY');
    expect(res.body.data.approvalEligibility.eligible).toBe(true);

    completeQuestionId = res.body.data.id;
  });

  it('6. Full Workflow Lifecycle: Submit -> Request Changes -> Submit -> Approve -> Archive', async () => {
    // 1. Submit for review
    const submitRes = await request(app)
      .post(`/api/v1/admin/mcq-library/questions/${completeQuestionId}/submit-review`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('REVIEW_PENDING');

    // 2. Request changes
    const reqChangesRes = await request(app)
      .post(`/api/v1/admin/mcq-library/questions/${completeQuestionId}/request-changes`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(reqChangesRes.status).toBe(200);
    expect(reqChangesRes.body.data.status).toBe('CHANGES_REQUESTED');

    // 3. Resubmit for review
    const resubmitRes = await request(app)
      .post(`/api/v1/admin/mcq-library/questions/${completeQuestionId}/submit-review`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.data.status).toBe('REVIEW_PENDING');

    // 4. Approve
    const approveRes = await request(app)
      .post(`/api/v1/admin/mcq-library/questions/${completeQuestionId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');

    // 5. Archive
    const archiveRes = await request(app)
      .post(`/api/v1/admin/mcq-library/questions/${completeQuestionId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.data.status).toBe('ARCHIVED');
  });

  it('7. Demo Seed Environment Safety Guard & Idempotency', async () => {
    // 1. Safety Guard Check
    const origEnv = process.env.NODE_ENV;
    const origAllow = process.env.ALLOW_DEMO_SEED;

    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_DEMO_SEED;

    await expect(seedMcqDemo()).rejects.toThrow('[DEMO SEED BLOCKED]');

    // 2. Restore env and test idempotency
    process.env.NODE_ENV = origEnv || 'test';
    process.env.ALLOW_DEMO_SEED = 'true';

    // Run demo seed twice
    await seedMcqDemo();
    await seedMcqDemo();

    const count = await prisma.mcqQuestion.count({
      where: { code: { in: ['MCQ_000001', 'MCQ_000002', 'MCQ_000003', 'MCQ_000004'] } },
    });

    expect(count).toBe(4);

    // Reset env
    if (origAllow) process.env.ALLOW_DEMO_SEED = origAllow;
    else delete process.env.ALLOW_DEMO_SEED;
  });
});
