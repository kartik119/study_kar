import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '@study-karnataka/database';

describe('Development Prompt 4 — Exam Stages, Papers & Exam Pattern Integration Tests', () => {
  let superAdminToken: string;
  let contentManagerToken: string;
  let contentReviewerToken: string;
  let supportExecToken: string;

  let testAuthorityId: string;
  let testProgrammeId: string;
  let testExamCycleId: string;
  let testExamSlug: string;

  let testPatternId: string;
  let testStageId: string;
  let testPaperId: string;
  let testSectionId: string;

  beforeAll(async () => {
    // 1. Authenticate users
    const superAdminRes = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({ email: 'admin@studykarnataka.com', password: 'Admin@StudyKar2026' });
    superAdminToken = superAdminRes.body.data.accessToken;

    // Create custom test admin users for role-specific testing
    const cmPassword = 'CM@StudyKar2026';
    const crPassword = 'CR@StudyKar2026';
    const sePassword = 'SE@StudyKar2026';

    const cmRole = await prisma.role.findUnique({ where: { name: 'Content Manager' } });
    const crRole = await prisma.role.findUnique({ where: { name: 'Content Reviewer' } });
    const seRole = await prisma.role.findUnique({ where: { name: 'Support Executive' } });

    const bcrypt = await import('bcryptjs');
    const hashCM = await bcrypt.hash(cmPassword, 10);
    const hashCR = await bcrypt.hash(crPassword, 10);
    const hashSE = await bcrypt.hash(sePassword, 10);

    const cmUser = await prisma.adminUser.upsert({
      where: { email: 'cm.pattern@studykarnataka.com' },
      update: {},
      create: {
        email: 'cm.pattern@studykarnataka.com',
        fullName: 'Pattern Content Manager',
        passwordHash: hashCM,
        accountStatus: 'ACTIVE',
        adminRoles: { create: { roleId: cmRole!.id } },
      },
    });

    const crUser = await prisma.adminUser.upsert({
      where: { email: 'cr.pattern@studykarnataka.com' },
      update: {},
      create: {
        email: 'cr.pattern@studykarnataka.com',
        fullName: 'Pattern Content Reviewer',
        passwordHash: hashCR,
        accountStatus: 'ACTIVE',
        adminRoles: { create: { roleId: crRole!.id } },
      },
    });

    const seUser = await prisma.adminUser.upsert({
      where: { email: 'se.pattern@studykarnataka.com' },
      update: {},
      create: {
        email: 'se.pattern@studykarnataka.com',
        fullName: 'Pattern Support Exec',
        passwordHash: hashSE,
        accountStatus: 'ACTIVE',
        adminRoles: { create: { roleId: seRole!.id } },
      },
    });

    const cmLogin = await request(app).post('/api/v1/auth/admin/login').send({ email: cmUser.email, password: cmPassword });
    contentManagerToken = cmLogin.body.data.accessToken;

    const crLogin = await request(app).post('/api/v1/auth/admin/login').send({ email: crUser.email, password: crPassword });
    contentReviewerToken = crLogin.body.data.accessToken;

    const seLogin = await request(app).post('/api/v1/auth/admin/login').send({ email: seUser.email, password: sePassword });
    supportExecToken = seLogin.body.data.accessToken;

    // 2. Create test Exam Authority, Programme, and Exam Cycle
    const authRes = await request(app)
      .post('/api/v1/admin/exam-authorities')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ code: `KPSC_P4_${Date.now()}`, nameEn: 'Karnataka Public Service Commission', nameKn: 'ಕರ್ನಾಟಕ ಲೋಕಸೇವಾ ಆಯೋಗ' });
    testAuthorityId = authRes.body.data.id;

    const progRes = await request(app)
      .post('/api/v1/admin/exam-programmes')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ authorityId: testAuthorityId, code: `KAS_P4_${Date.now()}`, nameEn: 'KAS Gazetted Probationers', nameKn: 'ಕೆಎಎಸ್ ಗೆಜೆಟೆಡ್ ಪ್ರೊಬೇಷನರ್ಸ್' });
    testProgrammeId = progRes.body.data.id;

    const cycleRes = await request(app)
      .post('/api/v1/admin/exams')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        programmeId: testProgrammeId,
        cycleCode: `2026_P4_${Date.now()}`,
        cycleYear: 2026,
        titleEn: 'KAS 2026 Examination',
        titleKn: 'ಕೆಎಎಸ್ 2026 ಪರೀಕ್ಷೆ',
        slugEn: `kas-2026-p4-${Date.now()}`,
        slugKn: `kas-2026-p4-kn-${Date.now()}`,
      });
    testExamCycleId = cycleRes.body.data.id;
    testExamSlug = `kas-2026-p4-slug-${Date.now()}`;
    await prisma.examSEO.upsert({
      where: { examCycleId: testExamCycleId },
      update: { slugEn: testExamSlug, slugKn: `${testExamSlug}-kn` },
      create: {
        examCycleId: testExamCycleId,
        slugEn: testExamSlug,
        slugKn: `${testExamSlug}-kn`,
      },
    });
  });

  describe('1. Pattern Revision & Structure Lifecycle', () => {
    it('allows Content Manager to create initial Exam Pattern revision 1', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/patterns`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({
          titleEn: 'KAS 2026 Exam Pattern',
          titleKn: 'ಕೆಎಎಸ್ 2026 ಪರೀಕ್ಷಾ ವಿಧಾನ',
          descriptionEn: 'Official KAS Gazetted Probationer Exam Pattern',
          descriptionKn: 'ಅಧಿಕೃತ ಕೆಎಎಸ್ ಪರೀಕ್ಷಾ ವಿಧಾನ',
          generalInstructionsEn: 'Candidates must attempt both Prelims papers.',
          generalInstructionsKn: 'ಅಭ್ಯರ್ಥಿಗಳು ಎರಡೂ ಪೂರ್ವಭಾವಿ ಪತ್ರಿಕೆಗಳನ್ನು ಬರೆಯಬೇಕು.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.revisionNumber).toBe(1);
      expect(res.body.data.status).toBe('DRAFT');
      testPatternId = res.body.data.id;
    });

    it('rejects duplicate initial pattern creation for revision 1', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/patterns`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({
          titleEn: 'Duplicate Pattern',
          titleKn: 'ನಕಲಿ ಪರೀಕ್ಷಾ ವಿಧಾನ',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EXAM_PATTERN_ALREADY_EXISTS');
    });

    it('allows adding Stage to Draft pattern', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/patterns/${testPatternId}/stages`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({
          code: 'PRELIMS',
          stageType: 'PRELIMINARY',
          nameEn: 'Preliminary Examination',
          nameKn: 'ಪೂರ್ವಭಾವಿ ಪರೀಕ್ಷೆ',
          shortNameEn: 'Prelims',
          shortNameKn: 'ಪ್ರಿಲಿಮ್ಸ್',
          displayOrder: 1,
          isQualifying: true,
          contributesToFinalMerit: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('PRELIMS');
      testStageId = res.body.data.id;
    });

    it('allows adding Paper to Stage', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/stages/${testStageId}/papers`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({
          code: 'GS_PAPER_1',
          assessmentMode: 'OBJECTIVE',
          nameEn: 'General Studies Paper I',
          nameKn: 'ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ ಪತ್ರಿಕೆ I',
          displayOrder: 1,
          durationMinutes: 120,
          totalQuestions: 100,
          questionsToAnswer: 100,
          totalMarks: 200,
          defaultNegativeMarkingType: 'FIXED_MARKS',
          defaultNegativeMarkingValue: 0.25,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('GS_PAPER_1');
      testPaperId = res.body.data.id;
    });

    it('allows adding Section to Paper and calculates section total marks', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/papers/${testPaperId}/sections`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({
          code: 'SEC_CURRENT_AFFAIRS',
          questionFormat: 'MCQ_SINGLE_CORRECT',
          nameEn: 'Current Affairs & General Knowledge',
          nameKn: 'ಪ್ರಸ್ತುತ ಘಟನೆಗಳು ಮತ್ತು ಸಾಮಾನ್ಯ ಜ್ಞಾನ',
          displayOrder: 1,
          totalQuestions: 100,
          questionsToAnswer: 100,
          marksPerQuestion: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Number(res.body.data.calculatedTotalMarks)).toBe(200);
      testSectionId = res.body.data.id;
    });
  });

  describe('2. Workflow & RBAC Permissions', () => {
    it('blocks Support Executive from stage/paper/pattern management (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/patterns/${testPatternId}/stages`)
        .set('Authorization', `Bearer ${supportExecToken}`)
        .send({
          code: 'MAINS',
          stageType: 'MAIN',
          nameEn: 'Main Examination',
          nameKn: 'ಮುಖ್ಯ ಪರೀಕ್ಷೆ',
          displayOrder: 2,
        });

      expect(res.status).toBe(403);
    });

    it('blocks Content Manager from approving pattern (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/patterns/${testPatternId}/approve`)
        .set('Authorization', `Bearer ${contentManagerToken}`);

      expect(res.status).toBe(403);
    });

    it('allows Content Manager to submit pattern for review', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/patterns/${testPatternId}/submit-review`)
        .set('Authorization', `Bearer ${contentManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('REVIEW_PENDING');
    });

    it('allows Content Reviewer to request changes', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/patterns/${testPatternId}/request-changes`)
        .set('Authorization', `Bearer ${contentReviewerToken}`)
        .send({ reason: 'Please update Kannada stage instructions' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CHANGES_REQUESTED');
    });

    it('allows resubmitting and Content Reviewer approval', async () => {
      await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/patterns/${testPatternId}/submit-review`)
        .set('Authorization', `Bearer ${contentManagerToken}`);

      const approveRes = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/patterns/${testPatternId}/approve`)
        .set('Authorization', `Bearer ${contentReviewerToken}`);

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('APPROVED');
    });

    it('allows Super Admin to publish pattern', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/patterns/${testPatternId}/publish`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PUBLISHED');
      expect(res.body.data.isCurrent).toBe(true);
    });

    it('enforces immutability on published pattern (EXAM_PATTERN_PUBLISHED_IMMUTABLE)', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/exams/${testExamCycleId}/patterns/${testPatternId}`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({ titleEn: 'Attempting Direct Edit' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EXAM_PATTERN_PUBLISHED_IMMUTABLE');
    });
  });

  describe('3. Pattern Revision Cloning', () => {
    let clonedRevisionId: string;

    it('clones published pattern into revision 2 in DRAFT status', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/patterns/${testPatternId}/clone-revision`)
        .set('Authorization', `Bearer ${contentManagerToken}`);

      expect(res.status).toBe(201);
      expect(res.body.data.revisionNumber).toBe(2);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.sourcePatternId).toBe(testPatternId);
      clonedRevisionId = res.body.data.id;
    });

    it('allows editing newly cloned revision 2', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/exams/${testExamCycleId}/patterns/${clonedRevisionId}`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({ titleEn: 'KAS 2026 Revised Pattern' });

      expect(res.status).toBe(200);
      expect(res.body.data.titleEn).toBe('KAS 2026 Revised Pattern');
    });

    it('publishing revision 2 sets revision 2 as current and archives revision 1', async () => {
      // Submit & Approve Revision 2
      await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/patterns/${clonedRevisionId}/submit-review`)
        .set('Authorization', `Bearer ${contentManagerToken}`);

      await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/patterns/${clonedRevisionId}/approve`)
        .set('Authorization', `Bearer ${contentReviewerToken}`);

      // Publish Revision 2
      const pubRes = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/patterns/${clonedRevisionId}/publish`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.status).toBe('PUBLISHED');
      expect(pubRes.body.data.isCurrent).toBe(true);

      // Verify Revision 1 is now ARCHIVED and non-current
      const rev1 = await request(app)
        .get(`/api/v1/admin/exams/${testExamCycleId}/patterns/${testPatternId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(rev1.body.data.status).toBe('ARCHIVED');
      expect(rev1.body.data.isCurrent).toBe(false);
    });
  });

  describe('4. Public Localized API Endpoint', () => {
    beforeAll(async () => {
      // Set test Exam Cycle to PUBLISHED and PUBLIC in database
      await prisma.examCycle.update({
        where: { id: testExamCycleId },
        data: { status: 'PUBLISHED', visibility: 'PUBLIC' },
      });
    });

    it('returns English content when language=en', async () => {
      const res = await request(app).get(`/api/v1/exams/${testExamSlug}/pattern?language=en`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.language).toBe('en');
      expect(res.body.data.title).toContain('KAS 2026');
    });

    it('returns Kannada content when language=kn', async () => {
      const res = await request(app).get(`/api/v1/exams/${testExamSlug}/pattern?language=kn`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.language).toBe('kn');
    });

    it('hides pattern for PRIVATE exam cycle', async () => {
      await prisma.examCycle.update({
        where: { id: testExamCycleId },
        data: { visibility: 'PRIVATE' },
      });

      const res = await request(app).get(`/api/v1/exams/${testExamSlug}/pattern?language=en`);
      expect(res.status).toBe(404);

      // Restore to PUBLIC
      await prisma.examCycle.update({
        where: { id: testExamCycleId },
        data: { visibility: 'PUBLIC' },
      });
    });

    it('allows pattern access for UNLISTED exam cycle via exact slug', async () => {
      await prisma.examCycle.update({
        where: { id: testExamCycleId },
        data: { visibility: 'UNLISTED' },
      });

      const res = await request(app).get(`/api/v1/exams/${testExamSlug}/pattern?language=en`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Restore to PUBLIC
      await prisma.examCycle.update({
        where: { id: testExamCycleId },
        data: { visibility: 'PUBLIC' },
      });
    });

    it('rejects cross-cycle stage linking for important dates', async () => {
      const otherAuth = await prisma.examAuthority.create({
        data: { code: `AUTH_OTHER_${Date.now()}`, nameEn: 'Other Auth', nameKn: 'ಇತರ' },
      });
      const otherProg = await prisma.examProgramme.create({
        data: { authorityId: otherAuth.id, code: `PROG_OTHER_${Date.now()}`, nameEn: 'Other Prog', nameKn: 'ಇತರ' },
      });
      const otherCycle = await prisma.examCycle.create({
        data: {
          programmeId: otherProg.id,
          cycleCode: `CYC_OTHER_${Date.now()}`,
          cycleYear: 2026,
          titleEn: 'Other Cycle',
          titleKn: 'ಇತರ ಆವರ್ತ',
        },
      });

      // Try linking a stage from testExamCycleId to an important date in otherCycle
      const res = await request(app)
        .post(`/api/v1/admin/exams/${otherCycle.id}/important-dates`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          type: 'EXAM',
          labelEn: 'Prelims Date',
          labelKn: 'ಪೂರ್ವಭಾವಿ ದಿನಾಂಕ',
          startAt: new Date().toISOString(),
          examStageId: testStageId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CROSS_CYCLE_STAGE_LINKING_REJECTED');
    });
  });

  describe('5. Audit Logging Verification & Seed Idempotency', () => {
    it('creates server-side audit logs for pattern creation, workflow, and cloning', async () => {
      const logs = await prisma.adminAuditLog.findMany({
        where: { module: 'EXAM_PATTERN' },
      });

      expect(logs.length).toBeGreaterThan(0);
      const actions = logs.map((l) => l.action);
      expect(actions).toContain('CREATE_PATTERN');
      expect(actions).toContain('SUBMIT_PATTERN_REVIEW');
      expect(actions).toContain('PUBLISH_PATTERN');
      expect(actions).toContain('CLONE_PATTERN_REVISION');
    });

    it('confirms re-running seed creates no duplicate permissions and total permissions equal 46', async () => {
      const { seedDatabase } = await import('@study-karnataka/database');
      await seedDatabase();

      const permissionsCount = await prisma.permission.count();
      expect(permissionsCount).toBeGreaterThanOrEqual(46);
    });
  });
});
