import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { app } from '../app';
import { prisma } from '@study-karnataka/database';
import { signAccessToken } from '../utils/jwt';

describe('Development Prompt 3 — Exam Domain & Bilingual Exam Records', () => {
  let superAdminUser: any;
  let contentMgrUser: any;
  let contentRevUser: any;
  let supportExecUser: any;

  let superAdminToken: string;
  let contentMgrToken: string;
  let contentRevToken: string;
  let supportExecToken: string;

  const testSuffix = Math.floor(Math.random() * 10000);
  const testAuthCode = `KPSC_TEST_${testSuffix}`;

  beforeAll(async () => {
    // 1. Create clean test AdminUsers for foreign key validity & auditing
    superAdminUser = await prisma.adminUser.create({
      data: {
        email: `exam-superadmin-${testSuffix}@studykarnataka.com`,
        fullName: 'Exam Super Admin',
        passwordHash: 'hash',
      },
    });

    contentMgrUser = await prisma.adminUser.create({
      data: {
        email: `exam-contentmgr-${testSuffix}@studykarnataka.com`,
        fullName: 'Exam Content Manager',
        passwordHash: 'hash',
      },
    });

    contentRevUser = await prisma.adminUser.create({
      data: {
        email: `exam-contentrev-${testSuffix}@studykarnataka.com`,
        fullName: 'Exam Content Reviewer',
        passwordHash: 'hash',
      },
    });

    supportExecUser = await prisma.adminUser.create({
      data: {
        email: `exam-supportexec-${testSuffix}@studykarnataka.com`,
        fullName: 'Exam Support Executive',
        passwordHash: 'hash',
      },
    });

    // 2. Generate access tokens with assigned permissions matching RBAC matrix
    superAdminToken = signAccessToken({
      userId: superAdminUser.id,
      accountType: 'ADMIN',
      roles: ['Super Admin'],
      permissions: [
        'exams.view',
        'exams.create',
        'exams.update',
        'exams.submit_review',
        'exams.review',
        'exams.approve',
        'exams.publish',
        'exams.close',
        'exams.archive',
        'exams.authorities.manage',
        'exams.programmes.manage',
      ],
      sessionId: `sess-exam-superadmin-${testSuffix}`,
    });

    contentMgrToken = signAccessToken({
      userId: contentMgrUser.id,
      accountType: 'ADMIN',
      roles: ['Content Manager'],
      permissions: [
        'exams.view',
        'exams.create',
        'exams.update',
        'exams.submit_review',
        'exams.authorities.manage',
        'exams.programmes.manage',
      ],
      sessionId: `sess-exam-contentmgr-${testSuffix}`,
    });

    contentRevToken = signAccessToken({
      userId: contentRevUser.id,
      accountType: 'ADMIN',
      roles: ['Content Reviewer'],
      permissions: ['exams.view', 'exams.review', 'exams.approve'],
      sessionId: `sess-exam-contentrev-${testSuffix}`,
    });

    supportExecToken = signAccessToken({
      userId: supportExecUser.id,
      accountType: 'ADMIN',
      roles: ['Support Executive'],
      permissions: ['students.view', 'support.view'],
      sessionId: `sess-exam-supportexec-${testSuffix}`,
    });
  });

  afterAll(async () => {
    // Cleanup test database records safely
    await prisma.adminAuditLog.deleteMany({
      where: {
        adminUserId: { in: [superAdminUser.id, contentMgrUser.id, contentRevUser.id, supportExecUser.id] },
      },
    });
    await prisma.adminUser.deleteMany({
      where: {
        id: { in: [superAdminUser.id, contentMgrUser.id, contentRevUser.id, supportExecUser.id] },
      },
    });
    await prisma.$disconnect();
  });

  it('1. Role-Based Access Control (RBAC) Enforcement for Exam Endpoints', async () => {
    // Support Executive should be denied access to admin exam endpoints (403)
    const res1 = await request(app)
      .get('/api/v1/admin/exams')
      .set('Authorization', `Bearer ${supportExecToken}`);
    expect(res1.status).toBe(403);

    // Content Manager can access admin exams list
    const res2 = await request(app)
      .get('/api/v1/admin/exams')
      .set('Authorization', `Bearer ${contentMgrToken}`);
    expect(res2.status).toBe(200);

    // Super Admin can access admin exams list
    const res3 = await request(app)
      .get('/api/v1/admin/exams')
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(res3.status).toBe(200);
  });

  it('2. Exam Authority & Programme CRUD Operations and Code Uniqueness', async () => {
    // A. Create Authority
    const authRes = await request(app)
      .post('/api/v1/admin/exam-authorities')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        code: testAuthCode,
        nameEn: 'Karnataka Public Service Commission Test',
        nameKn: 'ಕರ್ನಾಟಕ ಲೋಕಸೇವಾ ಆಯೋಗ ಪರೀಕ್ಷೆ',
        officialWebsiteUrl: 'https://kpsc.kar.nic.in',
      });

    expect(authRes.status).toBe(201);
    expect(authRes.body.data.code).toBe(testAuthCode);
    const authorityId = authRes.body.data.id;

    // B. Duplicate Authority Code -> 409 Conflict
    const dupAuthRes = await request(app)
      .post('/api/v1/admin/exam-authorities')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        code: testAuthCode,
        nameEn: 'Duplicate',
        nameKn: 'ನಕಲಿ',
      });
    expect(dupAuthRes.status).toBe(409);

    // C. Create Programme under Authority
    const progRes = await request(app)
      .post('/api/v1/admin/exam-programmes')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        authorityId,
        code: `KAS_${testSuffix}`,
        nameEn: 'Karnataka Administrative Service Test',
        nameKn: 'ಕರ್ನಾಟಕ ಆಡಳಿತ ಸೇವೆ ಪರೀಕ್ಷೆ',
      });

    expect(progRes.status).toBe(201);
    expect(progRes.body.data.code).toBe(`KAS_${testSuffix}`);
  });

  it('3. Exam Cycle Lifecycle, Bilingual Records, Workflow & Audit Trail', async () => {
    // A. Setup Authority and Programme
    const auth = await prisma.examAuthority.create({
      data: {
        code: `AUTH2_${testSuffix}`,
        nameEn: 'KPSC Test Authority 2',
        nameKn: 'ಕೆಪಿಎಸ್‌ಸಿ ಪರೀಕ್ಷಾ ಪ್ರಾಧಿಕಾರ ೨',
      },
    });

    const prog = await prisma.examProgramme.create({
      data: {
        authorityId: auth.id,
        code: `PROG2_${testSuffix}`,
        nameEn: 'KAS Test Programme 2',
        nameKn: 'ಕೆಎಎಸ್ ಪರೀಕ್ಷಾ ಕಾರ್ಯಕ್ರಮ ೨',
      },
    });

    // B. Content Manager creates Draft Exam Cycle (Incomplete in Kannada to test readiness)
    const createRes = await request(app)
      .post('/api/v1/admin/exams')
      .set('Authorization', `Bearer ${contentMgrToken}`)
      .send({
        programmeId: prog.id,
        cycleCode: `CYCLE_${testSuffix}`,
        cycleYear: 2026,
        titleEn: 'KAS Gazetted Probationers 2026',
        titleKn: 'ಕೆಎಎಸ್ ಗೆಜೆಟೆಡ್ ಪ್ರೊಬೇಷನರ್ಸ್ ೨೦೨೬',
        descriptionEn: 'Full English recruitment overview',
        descriptionKn: '', // Intentionally missing description to render INCOMPLETE
        visibility: 'PUBLIC',
        seo: {
          slugEn: `kas-2026-test-cycle-${testSuffix}`,
          slugKn: `kas-2026-kannada-test-cycle-${testSuffix}`,
        },
      });

    expect(createRes.status).toBe(201);
    const examId = createRes.body.data.id;
    expect(createRes.body.data.status).toBe('DRAFT');
    expect(createRes.body.data.readiness.state).toBe('ENGLISH_COMPLETE');

    // C. Content Manager attempts to submit INCOMPLETE record -> 400 Bad Request
    const badSubmit = await request(app)
      .post(`/api/v1/admin/exams/${examId}/submit-review`)
      .set('Authorization', `Bearer ${contentMgrToken}`);
    expect(badSubmit.status).toBe(400);

    // D. Update Exam Cycle to complete Kannada description
    const updateRes = await request(app)
      .patch(`/api/v1/admin/exams/${examId}`)
      .set('Authorization', `Bearer ${contentMgrToken}`)
      .send({
        descriptionKn: 'ಸಮಗ್ರ ಕನ್ನಡ ನೇಮಕಾತಿ ವಿವರಣೆ',
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.readiness.state).toBe('BOTH_COMPLETE');

    // E. Content Manager submits for review
    const submitRes = await request(app)
      .post(`/api/v1/admin/exams/${examId}/submit-review`)
      .set('Authorization', `Bearer ${contentMgrToken}`);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('REVIEW_PENDING');

    // F. Content Manager attempts to APPROVE -> 403 Forbidden (Only Content Reviewer or Super Admin)
    const unauthApprove = await request(app)
      .post(`/api/v1/admin/exams/${examId}/approve`)
      .set('Authorization', `Bearer ${contentMgrToken}`);
    expect(unauthApprove.status).toBe(403);

    // G. Content Reviewer Approves the Exam Cycle
    const approveRes = await request(app)
      .post(`/api/v1/admin/exams/${examId}/approve`)
      .set('Authorization', `Bearer ${contentRevToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');

    // H. Content Reviewer attempts to PUBLISH -> 403 Forbidden (Only Super Admin)
    const unauthPublish = await request(app)
      .post(`/api/v1/admin/exams/${examId}/publish`)
      .set('Authorization', `Bearer ${contentRevToken}`);
    expect(unauthPublish.status).toBe(403);

    // I. Super Admin Publishes the Exam Cycle
    const publishRes = await request(app)
      .post(`/api/v1/admin/exams/${examId}/publish`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ visibility: 'PUBLIC' });
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.status).toBe('PUBLISHED');
    expect(publishRes.body.data.visibility).toBe('PUBLIC');

    // J. Verify Audit Trail entries recorded for the lifecycle steps
    const auditLogs = await prisma.adminAuditLog.findMany({
      where: { recordId: examId },
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(3);
  });

  it('4. Public Localized API Endpoint Localization & Visibility Rules', async () => {
    // Fetch public list in English
    const pubEn = await request(app).get('/api/v1/exams?language=en');
    expect(pubEn.status).toBe(200);
    expect(Array.isArray(pubEn.body.data)).toBe(true);

    if (pubEn.body.data.length > 0) {
      const first = pubEn.body.data[0];
      expect(first.title).toBeDefined();
      expect(first.language).toBe('en');
    }

    // Fetch public list in Kannada
    const pubKn = await request(app).get('/api/v1/exams?language=kn');
    expect(pubKn.status).toBe(200);
    if (pubKn.body.data.length > 0) {
      const first = pubKn.body.data[0];
      expect(first.language).toBe('kn');
    }

    // Fetch detail by slug
    const slugRes = await request(app).get(`/api/v1/exams/kas-2026-test-cycle-${testSuffix}?language=en`);
    expect(slugRes.status).toBe(200);
    expect(slugRes.body.data.title).toBe('KAS Gazetted Probationers 2026');
  });
});
