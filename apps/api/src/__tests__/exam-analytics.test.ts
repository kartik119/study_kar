import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma, seedDatabase } from '@study-karnataka/database';
import { signAccessToken } from '../utils/jwt';

import { assertTestDatabase } from './testGuard';

describe('Development Prompt 6 — Exam Analytics & Readiness API Integration Tests', { timeout: 30000 }, () => {
  let superAdminToken: string;
  let contentManagerToken: string;
  let contentReviewerToken: string;
  let supportExecToken: string;

  let testAuthorityId: string;
  let testProgrammeId: string;
  let testExamCycleId: string;

  beforeAll(async () => {
    assertTestDatabase();
    await seedDatabase();

    superAdminToken = signAccessToken({
      userId: 'test-sa-id',
      accountType: 'ADMIN',
      roles: ['Super Admin'],
      permissions: ['exams.analytics.view'],
      sessionId: 'test-sa-session',
    });

    contentManagerToken = signAccessToken({
      userId: 'test-cm-id',
      accountType: 'ADMIN',
      roles: ['Content Manager'],
      permissions: ['exams.analytics.view'],
      sessionId: 'test-cm-session',
    });

    contentReviewerToken = signAccessToken({
      userId: 'test-cr-id',
      accountType: 'ADMIN',
      roles: ['Content Reviewer'],
      permissions: ['exams.analytics.view'],
      sessionId: 'test-cr-session',
    });

    supportExecToken = signAccessToken({
      userId: 'test-se-id',
      accountType: 'ADMIN',
      roles: ['Support Executive'],
      permissions: ['students.view'],
      sessionId: 'test-se-session',
    });

    // Create test Authority, Programme & Exam Cycle
    const authCode = `AUTH_ANALYTICS_${Date.now()}`;
    const authority = await prisma.examAuthority.create({
      data: {
        code: authCode,
        nameEn: 'Karnataka Analytics Authority',
        nameKn: 'ಕರ್ನಾಟಕ ಅನಾಲಿಟಿಕ್ಸ್ ಪ್ರಾಧಿಕಾರ',
        isActive: true,
      },
    });
    testAuthorityId = authority.id;

    const progCode = `PROG_ANALYTICS_${Date.now()}`;
    const programme = await prisma.examProgramme.create({
      data: {
        authorityId: testAuthorityId,
        code: progCode,
        nameEn: 'Karnataka Analytics Programme',
        nameKn: 'ಕರ್ನಾಟಕ ಅನಾಲಿಟಿಕ್ಸ್ ಕಾರ್ಯಕ್ರಮ',
        isActive: true,
      },
    });
    testProgrammeId = programme.id;

    const cycleCode = `CYCLE_ANALYTICS_${Date.now()}`;
    const examCycle = await prisma.examCycle.create({
      data: {
        programmeId: testProgrammeId,
        cycleCode,
        cycleYear: 2026,
        titleEn: 'KAS Analytics Exam 2026',
        titleKn: 'ಕೆಎಎಸ್ ಅನಾಲಿಟಿಕ್ಸ್ ಪರೀಕ್ಷೆ ೨೦೨೬',
        descriptionEn: 'Analytics test exam',
        descriptionKn: 'ಅನಾಲಿಟಿಕ್ಸ್ ಪರೀಕ್ಷೆ ವಿವರಣೆ',
        notificationNumber: 'NOTIF/2026/ANALYTICS',
        status: 'DRAFT',
        visibility: 'PRIVATE',
      },
    });
    testExamCycleId = examCycle.id;
  });

  describe('1. Permissions & Access Control', () => {
    it('allows Super Admin to access analytics overview', async () => {
      const res = await request(app)
        .get('/api/v1/admin/exam-analytics/overview')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.asOf).toBeDefined();
    });

    it('allows Content Manager to access analytics overview', async () => {
      const res = await request(app)
        .get('/api/v1/admin/exam-analytics/overview')
        .set('Authorization', `Bearer ${contentManagerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('allows Content Reviewer to access analytics overview', async () => {
      const res = await request(app)
        .get('/api/v1/admin/exam-analytics/overview')
        .set('Authorization', `Bearer ${contentReviewerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('denies Support Executive with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/exam-analytics/overview')
        .set('Authorization', `Bearer ${supportExecToken}`);
      expect(res.status).toBe(403);
    });

    it('denies unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/admin/exam-analytics/overview');
      expect(res.status).toBe(401);
    });
  });

  describe('2. Analytics Overview Endpoint', () => {
    it('returns portfolio overview counters with asOf timestamp', async () => {
      const res = await request(app)
        .get('/api/v1/admin/exam-analytics/overview')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.totalAuthorities).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalProgrammes).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalCycles).toBeGreaterThanOrEqual(1);
      expect(res.body.data.statusCounts).toBeDefined();
      expect(res.body.data.readinessCounts).toBeDefined();
      expect(res.body.data.bilingualCounts).toBeDefined();
      expect(res.body.data.patternReadinessCounts).toBeDefined();
      expect(res.body.data.syllabusReadinessCounts).toBeDefined();
    });

    it('filters overview by authorityId and programmeId', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/exam-analytics/overview?authorityId=${testAuthorityId}&programmeId=${testProgrammeId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.totalCycles).toBe(1);
    });
  });

  describe('3. Exam Readiness List Endpoint', () => {
    it('returns paginated exam readiness list', async () => {
      const res = await request(app)
        .get('/api/v1/admin/exam-analytics/readiness?page=1&limit=10')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(10);
    });

    it('filters readiness list by cycleYear and search term', async () => {
      const res = await request(app)
        .get('/api/v1/admin/exam-analytics/readiness?cycleYear=2026&search=KAS%20Analytics')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].id).toBe(testExamCycleId);
    });
  });

  describe('4. Workflow Queues Endpoint', () => {
    it('returns actionable workflow queues', async () => {
      const res = await request(app)
        .get('/api/v1/admin/exam-analytics/workflow')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.awaitingManager).toBeDefined();
      expect(res.body.data.awaitingReviewer).toBeDefined();
      expect(res.body.data.awaitingSuperAdmin).toBeDefined();
      expect(res.body.data.blockedByValidation).toBeDefined();
      expect(res.body.data.missingPattern).toBeDefined();
      expect(res.body.data.missingSyllabus).toBeDefined();
      expect(res.body.data.bilingualIncomplete).toBeDefined();
      expect(res.body.data.staleDrafts).toBeDefined();
    });
  });

  describe('5. Important Dates & Stale Work Endpoints', () => {
    it('returns important dates analytics breakdown', async () => {
      const res = await request(app)
        .get('/api/v1/admin/exam-analytics/important-dates')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.today).toBeDefined();
      expect(res.body.data.next7Days).toBeDefined();
      expect(res.body.data.next30Days).toBeDefined();
      expect(res.body.data.next90Days).toBeDefined();
    });

    it('returns stale work items', async () => {
      const res = await request(app)
        .get('/api/v1/admin/exam-analytics/stale')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('6. Per-Exam Readiness Detail & Issues Endpoints', () => {
    it('returns detailed readiness for a specific exam', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/exam-analytics/exams/${testExamCycleId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.overview.examId).toBe(testExamCycleId);
      expect(res.body.data.examRecordSection).toBeDefined();
      expect(res.body.data.patternSection).toBeDefined();
      expect(res.body.data.syllabusSection).toBeDefined();
      expect(res.body.data.publicationSection).toBeDefined();
      expect(res.body.data.issues).toBeDefined();
      expect(res.body.data.recentActivity).toBeDefined();
    });

    it('returns readiness issues for a specific exam', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/exam-analytics/exams/${testExamCycleId}/issues`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns 404 for unknown exam ID', async () => {
      const unknownId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/v1/admin/exam-analytics/exams/${unknownId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('EXAM_ANALYTICS_EXAM_NOT_FOUND');
    });
  });

  describe('7. Privacy & Security Safeguards', () => {
    it('does not expose student data, passwords, or session tokens in analytics response', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/exam-analytics/exams/${testExamCycleId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      const jsonStr = JSON.stringify(res.body);
      expect(jsonStr).not.toContain('passwordHash');
      expect(jsonStr).not.toContain('refreshTokenHash');
      expect(jsonStr).not.toContain('studentProfile');
    });
  });
});
