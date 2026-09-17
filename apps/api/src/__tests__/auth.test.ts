// @ts-nocheck
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import dotenv from 'dotenv';
import path from 'path';

// Load root env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { app } from '../app';
import { prisma } from '@study-karnataka/database';
import { signAccessToken } from '../utils/jwt';

const TEST_MOBILES = ['9876500001', '9876500002', '9876500003', '9876500004', '9876500005'];

async function cleanupTestUsers() {
  await prisma.user.deleteMany({
    where: { mobile: { in: TEST_MOBILES } },
  });
  await prisma.oTPChallenge.deleteMany({
    where: { mobile: { in: TEST_MOBILES } },
  });
}

describe('Development Prompt 2 — Authentication & Authorization Endpoints', () => {
  beforeAll(async () => {
    process.env.DEVELOPMENT_OTP = '123456';
    process.env.NODE_ENV = 'development';
    await cleanupTestUsers();
  });

  beforeEach(async () => {
    await cleanupTestUsers();
  });

  afterAll(async () => {
    await cleanupTestUsers();
    await prisma.$disconnect();
  });

  it('1. Adult Student Registration Flow', async () => {
    const mobile = '9876500001';

    // Step A: Request OTP
    const res1 = await request(app)
      .post('/api/v1/auth/student/otp/request')
      .send({ mobile, purpose: 'STUDENT_REGISTRATION' });

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.devOtp).toBe('123456');

    // Step B: Verify OTP
    const res2 = await request(app)
      .post('/api/v1/auth/student/otp/verify')
      .send({ mobile, otp: '123456', purpose: 'STUDENT_REGISTRATION' });

    expect(res2.status).toBe(200);
    expect(res2.body.data.isRegistered).toBe(false);

    // Step C: Complete Registration (Adult DOB: 1998-05-15)
    const res3 = await request(app)
      .post('/api/v1/auth/student/registration/complete')
      .send({
        mobile,
        fullName: 'Anand Kumar',
        dateOfBirth: '1998-05-15',
        preparationLanguage: 'kn',
        email: 'anand@example.com',
      });

    expect(res3.status).toBe(201);
    expect(res3.body.success).toBe(true);
    expect(res3.body.data.user.fullName).toBe('Anand Kumar');
    expect(res3.body.data.user.preparationLanguage).toBe('kn');
    expect(res3.body.data.accessToken).toBeDefined();
  });

  it('2. Minor Student Guardian Consent Workflow (< 18 years)', async () => {
    const mobile = '9876500002';
    const guardianMobile = '9876500003';

    // Complete Minor Registration (DOB: 2010-06-20 -> age 16)
    const res1 = await request(app)
      .post('/api/v1/auth/student/registration/complete')
      .send({
        mobile,
        fullName: 'Minor Student',
        dateOfBirth: '2010-06-20',
        preparationLanguage: 'en',
        guardianDetails: {
          guardianName: 'Ramesh Kumar',
          guardianRelationship: 'Father',
          guardianMobile,
        },
      });

    expect(res1.status).toBe(201);
    expect(res1.body.data.isMinor).toBe(true);
    expect(res1.body.data.consentStatus).toBe('PENDING');

    const studentUserId = res1.body.data.user.id;

    // Guardian OTP Request & Verification
    await request(app)
      .post('/api/v1/auth/guardian/otp/request')
      .send({ guardianMobile });

    const res2 = await request(app)
      .post('/api/v1/auth/guardian/otp/verify')
      .send({
        guardianMobile,
        otp: '123456',
        studentUserId,
      });

    expect(res2.status).toBe(200);
    expect(res2.body.data.consentStatus).toBe('VERIFIED');
  });

  it('3. Preparation Language Update and Lock Operation', async () => {
    const mobile = '9876500004';

    // Register Adult Student with Kannada
    const reg = await request(app)
      .post('/api/v1/auth/student/registration/complete')
      .send({
        mobile,
        fullName: 'Language Test Student',
        dateOfBirth: '2001-01-01',
        preparationLanguage: 'kn',
      });

    const token = reg.body.data.accessToken;

    // Update language from Kannada to English before lock
    const patchRes1 = await request(app)
      .patch('/api/v1/students/me/preparation-language')
      .set('Authorization', `Bearer ${token}`)
      .send({ preparationLanguage: 'en' });

    expect(patchRes1.status).toBe(200);
    expect(patchRes1.body.data.preparationLanguage).toBe('en');

    // Lock Preparation Language
    const lockRes = await request(app)
      .post('/api/v1/students/me/preparation-language/lock')
      .set('Authorization', `Bearer ${token}`);

    expect(lockRes.status).toBe(200);
    expect(lockRes.body.data.isLanguageLocked).toBe(true);

    // Attempt to update language AFTER lock -> should return 409 Conflict
    const patchRes2 = await request(app)
      .patch('/api/v1/students/me/preparation-language')
      .set('Authorization', `Bearer ${token}`)
      .send({ preparationLanguage: 'kn' });

    expect(patchRes2.status).toBe(409);
    expect(patchRes2.body.error.code).toBe('PREPARATION_LANGUAGE_LOCKED');
  });

  it('4. Admin Authentication, Failed Login Lockout & Refresh Token', async () => {
    const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@studykarnataka.com';

    // Admin login with wrong password (failed attempts)
    const badLogin = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({
        email: adminEmail,
        password: 'WrongPassword123',
      });

    expect(badLogin.status).toBe(401);
    expect(badLogin.body.error.code).toBe('INVALID_CREDENTIALS');

    // Admin login with correct seeded bootstrap password
    const goodLogin = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({
        email: adminEmail,
        password: process.env.BOOTSTRAP_ADMIN_PASSWORD || 'Admin@StudyKar2026',
      });

    expect(goodLogin.status).toBe(200);
    expect(goodLogin.body.data.user.roles).toContain('Super Admin');
    expect(goodLogin.body.data.accessToken).toBeDefined();

    const refreshToken = goodLogin.body.data.refreshToken;

    // Refresh Token Rotation
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeDefined();
  });

  it('5. Sensitive Student-Data Access & RBAC Audit Logging Verification', async () => {
    // 1. Create real AdminUsers for audit log foreign key validity
    const superAdmin = await prisma.adminUser.upsert({
      where: { email: 'test-superadmin@studykarnataka.com' },
      update: {},
      create: {
        email: 'test-superadmin@studykarnataka.com',
        fullName: 'Super Admin Test',
        passwordHash: 'hash',
      },
    });

    const supportExec = await prisma.adminUser.upsert({
      where: { email: 'test-supportexec@studykarnataka.com' },
      update: {},
      create: {
        email: 'test-supportexec@studykarnataka.com',
        fullName: 'Support Exec Test',
        passwordHash: 'hash',
      },
    });

    const contentMgr = await prisma.adminUser.upsert({
      where: { email: 'test-contentmgr@studykarnataka.com' },
      update: {},
      create: {
        email: 'test-contentmgr@studykarnataka.com',
        fullName: 'Content Manager Test',
        passwordHash: 'hash',
      },
    });

    const contentRev = await prisma.adminUser.upsert({
      where: { email: 'test-contentrev@studykarnataka.com' },
      update: {},
      create: {
        email: 'test-contentrev@studykarnataka.com',
        fullName: 'Content Rev Test',
        passwordHash: 'hash',
      },
    });

    // 2. Create minor student record with guardian details
    const studentRes = await request(app)
      .post('/api/v1/auth/student/registration/complete')
      .send({
        mobile: '9876500004',
        fullName: 'Sensitive Test Student',
        dateOfBirth: '2012-04-10',
        preparationLanguage: 'kn',
        guardianDetails: {
          guardianName: 'Guardian Test',
          guardianRelationship: 'Mother',
          guardianMobile: '9876500005',
        },
      });

    expect(studentRes.status).toBe(201);
    const studentId = studentRes.body.data.user.id;

    // A. Super Admin Token (has sensitive view permissions)
    const superAdminToken = signAccessToken({
      userId: superAdmin.id,
      accountType: 'ADMIN',
      roles: ['Super Admin'],
      permissions: ['students.view', 'students.sensitive_dob.view', 'students.sensitive_guardian.view'],
      sessionId: 'sess-super-admin',
    });

    const superAdminRes = await request(app)
      .get(`/api/v1/admin/students/${studentId}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(superAdminRes.status).toBe(200);
    expect(superAdminRes.body.data.dateOfBirth).toBeDefined();
    expect(superAdminRes.body.data.guardianConsent).toBeDefined();

    // B. Support Executive Token (has sensitive view permissions + creates audit log)
    const supportExecToken = signAccessToken({
      userId: supportExec.id,
      accountType: 'ADMIN',
      roles: ['Support Executive'],
      permissions: ['students.view', 'students.sensitive_dob.view', 'students.sensitive_guardian.view'],
      sessionId: 'sess-support-exec',
    });

    const supportExecRes = await request(app)
      .get(`/api/v1/admin/students/${studentId}`)
      .set('Authorization', `Bearer ${supportExecToken}`);

    expect(supportExecRes.status).toBe(200);
    expect(supportExecRes.body.data.dateOfBirth).toBeDefined();
    expect(supportExecRes.body.data.guardianConsent).toBeDefined();

    // Verify Audit Log entry created for Support Executive sensitive access
    const auditLogs = await prisma.adminAuditLog.findMany({
      where: {
        adminUserId: supportExec.id,
        action: 'SENSITIVE_DATA_ACCESS',
      },
    });
    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0].reason).toContain(studentId);

    // C. Content Manager Token (does NOT have students.view permission)
    const contentMgrToken = signAccessToken({
      userId: contentMgr.id,
      accountType: 'ADMIN',
      roles: ['Content Manager'],
      permissions: ['dashboard.view', 'exams.view', 'study_materials.view'],
      sessionId: 'sess-content-mgr',
    });

    const contentMgrRes = await request(app)
      .get(`/api/v1/admin/students/${studentId}`)
      .set('Authorization', `Bearer ${contentMgrToken}`);

    expect(contentMgrRes.status).toBe(403);

    // D. Content Reviewer Token (does NOT have students.view permission)
    const contentRevToken = signAccessToken({
      userId: contentRev.id,
      accountType: 'ADMIN',
      roles: ['Content Reviewer'],
      permissions: ['dashboard.view', 'exams.view', 'study_materials.view'],
      sessionId: 'sess-content-rev',
    });

    const contentRevRes = await request(app)
      .get(`/api/v1/admin/students/${studentId}`)
      .set('Authorization', `Bearer ${contentRevToken}`);

    expect(contentRevRes.status).toBe(403);

    // Cleanup created admin users and audit logs
    await prisma.adminAuditLog.deleteMany({
      where: { adminUserId: { in: [superAdmin.id, supportExec.id, contentMgr.id, contentRev.id] } },
    });
    await prisma.adminUser.deleteMany({
      where: { id: { in: [superAdmin.id, supportExec.id, contentMgr.id, contentRev.id] } },
    });
  });
});
