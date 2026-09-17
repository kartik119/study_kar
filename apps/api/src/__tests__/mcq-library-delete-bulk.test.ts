// @ts-nocheck
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '@study-karnataka/database';
import { assertTestDatabase } from './testGuard';
import { signAccessToken } from '../utils/jwt';

describe('MCQ Library Single & Bulk Delete and Status Actions Integration Tests', () => {
  let adminUserId: string;
  let adminToken: string;
  let q1Id: string;
  let q2Id: string;
  let q3Id: string;
  let qReferencedId: string;
  let mockTestId: string;

  beforeAll(async () => {
    assertTestDatabase();

    // 1. Create test admin user in DB
    const adminUser = await prisma.adminUser.upsert({
      where: { email: 'mcq.delete.admin@studykarnataka.com' },
      update: {},
      create: {
        email: 'mcq.delete.admin@studykarnataka.com',
        fullName: 'MCQ Delete Super Admin',
        passwordHash: 'hash',
        accountStatus: 'ACTIVE',
      },
    });
    adminUserId = adminUser.id;

    adminToken = signAccessToken({
      userId: adminUserId,
      accountType: 'ADMIN',
      roles: ['Super Admin'],
      permissions: ['mcq_tests.view'],
      sessionId: 'mcq-delete-session-id',
    });

    // 2. Clean up tables
    await prisma.mockTestQuestion.deleteMany({});
    await prisma.mockTest.deleteMany({});
    await prisma.mcqQuestion.deleteMany({
      where: { code: { in: ['MCQ_DEL_001', 'MCQ_DEL_002', 'MCQ_DEL_003', 'MCQ_REF_999'] } },
    });

    // 3. Create 3 unreferenced questions
    const q1 = await prisma.mcqQuestion.create({
      data: {
        code: 'MCQ_DEL_001',
        seqNumber: 800001,
        questionTextEn: 'Unreferenced MCQ 1 for delete test?',
        questionTextKn: 'ಅನ್‌ರೆಫರೆನ್ಸ್ಡ್ ಪ್ರಶ್ನೆ 1?',
        optionA_En: 'A', optionA_Kn: 'A',
        optionB_En: 'B', optionB_Kn: 'B',
        optionC_En: 'C', optionC_Kn: 'C',
        optionD_En: 'D', optionD_Kn: 'D',
        correctOption: 'A',
        explanationEn: 'Exp', explanationKn: 'Exp',
        status: 'DRAFT',
      },
    });
    q1Id = q1.id;

    const q2 = await prisma.mcqQuestion.create({
      data: {
        code: 'MCQ_DEL_002',
        seqNumber: 800002,
        questionTextEn: 'Unreferenced MCQ 2 for delete test?',
        questionTextKn: 'ಅನ್‌ರೆಫರೆನ್ಸ್ಡ್ ಪ್ರಶ್ನೆ 2?',
        optionA_En: 'A', optionA_Kn: 'A',
        optionB_En: 'B', optionB_Kn: 'B',
        optionC_En: 'C', optionC_Kn: 'C',
        optionD_En: 'D', optionD_Kn: 'D',
        correctOption: 'B',
        explanationEn: 'Exp', explanationKn: 'Exp',
        status: 'DRAFT',
      },
    });
    q2Id = q2.id;

    const q3 = await prisma.mcqQuestion.create({
      data: {
        code: 'MCQ_DEL_003',
        seqNumber: 800003,
        questionTextEn: 'Unreferenced MCQ 3 for delete test?',
        questionTextKn: 'ಅನ್‌ರೆಫರೆನ್ಸ್ಡ್ ಪ್ರಶ್ನೆ 3?',
        optionA_En: 'A', optionA_Kn: 'A',
        optionB_En: 'B', optionB_Kn: 'B',
        optionC_En: 'C', optionC_Kn: 'C',
        optionD_En: 'D', optionD_Kn: 'D',
        correctOption: 'C',
        explanationEn: 'Exp', explanationKn: 'Exp',
        status: 'REVIEW_PENDING',
      },
    });
    q3Id = q3.id;

    // 4. Create 1 referenced question linked to a Mock Test
    const qRef = await prisma.mcqQuestion.create({
      data: {
        code: 'MCQ_REF_999',
        seqNumber: 800009,
        questionTextEn: 'Referenced MCQ in mock test?',
        questionTextKn: 'ಉಲ್ಲೇಖಿತ ಪ್ರಶ್ನೆ?',
        optionA_En: 'A', optionA_Kn: 'A',
        optionB_En: 'B', optionB_Kn: 'B',
        optionC_En: 'C', optionC_Kn: 'C',
        optionD_En: 'D', optionD_Kn: 'D',
        correctOption: 'D',
        explanationEn: 'Exp', explanationKn: 'Exp',
        status: 'APPROVED',
      },
    });
    qReferencedId = qRef.id;

    const mockTest = await prisma.mockTest.create({
      data: {
        code: 'TEST_REF_001',
        titleEn: 'Test Linked to Question',
        titleKn: 'ಉಲ್ಲೇಖಿತ ಪರೀಕ್ಷೆ',
        durationMinutes: 30,
        totalQuestions: 1,
        status: 'DRAFT',
      },
    });
    mockTestId = mockTest.id;

    await prisma.mockTestQuestion.create({
      data: {
        mockTestId,
        questionId: qReferencedId,
        displayOrder: 1,
        selectionSource: 'MANUAL',
      },
    });
  });

  it('1. DELETE /questions/:id successfully deletes an unreferenced question', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/mcq-library/questions/${q1Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(q1Id);

    const checkDb = await prisma.mcqQuestion.findUnique({ where: { id: q1Id } });
    expect(checkDb).toBeNull();
  });

  it('2. DELETE /questions/:id blocks deleting a question referenced in a Mock Test', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/mcq-library/questions/${qReferencedId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('currently linked to 1 Mock Test');

    const checkDb = await prisma.mcqQuestion.findUnique({ where: { id: qReferencedId } });
    expect(checkDb).not.toBeNull();
  });

  it('3. POST /questions/bulk-delete deletes unreferenced questions and skips referenced ones', async () => {
    const res = await request(app)
      .post('/api/v1/admin/mcq-library/questions/bulk-delete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: [q2Id, qReferencedId] })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.deletedCount).toBe(1);
    expect(res.body.data.totalRequested).toBe(2);
    expect(res.body.data.skipped.length).toBe(1);
    expect(res.body.data.skipped[0].id).toBe(qReferencedId);

    const checkQ2 = await prisma.mcqQuestion.findUnique({ where: { id: q2Id } });
    expect(checkQ2).toBeNull();
  });

  it('4. POST /questions/bulk-status performs bulk status updates', async () => {
    // Bulk Approve on q3 (REVIEW_PENDING -> APPROVED)
    const resApprove = await request(app)
      .post('/api/v1/admin/mcq-library/questions/bulk-status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: [q3Id], action: 'approve' })
      .expect(200);

    expect(resApprove.body.data.updatedCount).toBe(1);

    const checkQ3App = await prisma.mcqQuestion.findUnique({ where: { id: q3Id } });
    expect(checkQ3App?.status).toBe('APPROVED');

    // Bulk Archive on q3 (APPROVED -> ARCHIVED)
    const resArchive = await request(app)
      .post('/api/v1/admin/mcq-library/questions/bulk-status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: [q3Id], action: 'archive' })
      .expect(200);

    expect(resArchive.body.data.updatedCount).toBe(1);

    const checkQ3Arch = await prisma.mcqQuestion.findUnique({ where: { id: q3Id } });
    expect(checkQ3Arch?.status).toBe('ARCHIVED');
  });
});
