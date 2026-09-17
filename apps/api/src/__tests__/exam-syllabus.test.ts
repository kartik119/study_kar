// @ts-nocheck
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma, seedDatabase } from '@study-karnataka/database';

import { assertTestDatabase } from './testGuard';

describe('Development Prompt 5 — Exam Syllabus Tree & Bilingual Management Integration Tests', () => {
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

  let testSyllabusId: string;
  let rootSubjectId: string;
  let childUnitId: string;
  let topicId: string;

  beforeAll(async () => {
    assertTestDatabase();
    // 1. Login Super Admin
    const superAdminRes = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({ email: 'admin@studykarnataka.com', password: 'Admin@StudyKar2026' });
    superAdminToken = superAdminRes.body.data.accessToken;

    // 2. Create test role users
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash('Password@StudyKar2026', 10);

    const cmRole = await prisma.role.findUnique({ where: { name: 'Content Manager' } });
    const crRole = await prisma.role.findUnique({ where: { name: 'Content Reviewer' } });
    const seRole = await prisma.role.findUnique({ where: { name: 'Support Executive' } });

    const cmUser = await prisma.adminUser.upsert({
      where: { email: 'cm.syllabus@studykarnataka.com' },
      update: {},
      create: {
        email: 'cm.syllabus@studykarnataka.com',
        fullName: 'Syllabus Content Manager',
        passwordHash: hash,
        accountStatus: 'ACTIVE',
      },
    });
    if (cmRole) {
      await prisma.adminRole.upsert({
        where: { adminUserId_roleId: { adminUserId: cmUser.id, roleId: cmRole.id } },
        update: {},
        create: { adminUserId: cmUser.id, roleId: cmRole.id },
      });
    }

    const crUser = await prisma.adminUser.upsert({
      where: { email: 'cr.syllabus@studykarnataka.com' },
      update: {},
      create: {
        email: 'cr.syllabus@studykarnataka.com',
        fullName: 'Syllabus Content Reviewer',
        passwordHash: hash,
        accountStatus: 'ACTIVE',
      },
    });
    if (crRole) {
      await prisma.adminRole.upsert({
        where: { adminUserId_roleId: { adminUserId: crUser.id, roleId: crRole.id } },
        update: {},
        create: { adminUserId: crUser.id, roleId: crRole.id },
      });
    }

    const seUser = await prisma.adminUser.upsert({
      where: { email: 'se.syllabus@studykarnataka.com' },
      update: {},
      create: {
        email: 'se.syllabus@studykarnataka.com',
        fullName: 'Syllabus Support Exec',
        passwordHash: hash,
        accountStatus: 'ACTIVE',
      },
    });
    if (seRole) {
      await prisma.adminRole.upsert({
        where: { adminUserId_roleId: { adminUserId: seUser.id, roleId: seRole.id } },
        update: {},
        create: { adminUserId: seUser.id, roleId: seRole.id },
      });
    }

    const cmRes = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({ email: 'cm.syllabus@studykarnataka.com', password: 'Password@StudyKar2026' });
    contentManagerToken = cmRes.body.data.accessToken;

    const crRes = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({ email: 'cr.syllabus@studykarnataka.com', password: 'Password@StudyKar2026' });
    contentReviewerToken = crRes.body.data.accessToken;

    const seRes = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({ email: 'se.syllabus@studykarnataka.com', password: 'Password@StudyKar2026' });
    supportExecToken = seRes.body.data.accessToken;

    // 3. Create test Authority & Programme & Exam Cycle
    const authRes = await request(app)
      .post('/api/v1/admin/exam-authorities')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        code: `KPSC_SYLL_${Date.now()}`,
        nameEn: 'KPSC Syllabus Testing',
        nameKn: 'ಕೆಪಿಎಸ್ಸಿ ಸಿಲಬಸ್',
        bodyType: 'STATE_PUBLIC_SERVICE_COMMISSION',
        websiteUrl: 'https://kpsc.kar.nic.in',
      });
    testAuthorityId = authRes.body.data.id;

    const progRes = await request(app)
      .post('/api/v1/admin/exam-programmes')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        authorityId: testAuthorityId,
        code: `GAS_SYLL_${Date.now()}`,
        nameEn: 'Gazetted Probationers Syllabus',
        nameKn: 'ಗೆಜೆಟೆಡ್ ಪ್ರೊಬೇಷನರ್ಸ್ ಸಿಲಬಸ್',
        groupLevel: 'GROUP_A',
      });
    testProgrammeId = progRes.body.data.id;

    testExamSlug = `kas-2026-syll-${Date.now()}`;
    const examRes = await request(app)
      .post('/api/v1/admin/exams')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        programmeId: testProgrammeId,
        cycleCode: `KAS_2026_SYLL_${Date.now()}`,
        cycleYear: 2026,
        titleEn: 'KAS 2026 Syllabus Exam',
        titleKn: 'ಕೆಎಎಸ್ 2026 ಸಿಲಬಸ್ ಪರೀಕ್ಷೆ',
        slugEn: testExamSlug,
        slugKn: `${testExamSlug}-kn`,
      });
    testExamCycleId = examRes.body.data.id;

    await prisma.examSEO.upsert({
      where: { examCycleId: testExamCycleId },
      update: { slugEn: testExamSlug, slugKn: `${testExamSlug}-kn` },
      create: {
        examCycleId: testExamCycleId,
        slugEn: testExamSlug,
        slugKn: `${testExamSlug}-kn`,
      },
    });

    // Publish parent exam cycle directly for test setup
    await prisma.examCycle.update({
      where: { id: testExamCycleId },
      data: { status: 'PUBLISHED', visibility: 'PUBLIC' },
    });

    // Create & Publish Exam Pattern
    const patRes = await request(app)
      .post(`/api/v1/admin/exams/${testExamCycleId}/patterns`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        titleEn: 'KAS Pattern 1',
        titleKn: 'ಕೆಎಎಸ್ ಮಾದರಿ 1',
      });
    testPatternId = patRes.body.data.id;

    const stageRes = await request(app)
      .post(`/api/v1/admin/exams/${testExamCycleId}/patterns/${testPatternId}/stages`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        code: 'PRELIMS',
        stageType: 'PRELIMINARY',
        nameEn: 'Preliminary Examination',
        nameKn: 'ಪೂರ್ವಭಾವಿ ಪರೀಕ್ಷೆ',
        displayOrder: 1,
      });
    testStageId = stageRes.body.data.id;

    const paperRes = await request(app)
      .post(`/api/v1/admin/stages/${testStageId}/papers`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        code: 'GS_PAPER_1',
        assessmentMode: 'OBJECTIVE',
        nameEn: 'General Studies Paper I',
        nameKn: 'ಸಾಮಾನ್ಯ ಅಧ್ಯಯನ ಪತ್ರಿಕೆ I',
        totalMarks: 200,
        displayOrder: 1,
      });
    testPaperId = paperRes.body.data.id;

    // Publish Pattern directly for test setup
    await prisma.examPattern.update({
      where: { id: testPatternId },
      data: { status: 'PUBLISHED', isCurrent: true },
    });
  });

  describe('1. Permissions & RBAC', () => {
    it('confirms total system permissions are seeded idempotently', async () => {
      await seedDatabase();
      const perms = await prisma.permission.findMany();
      expect(perms.length).toBeGreaterThanOrEqual(46);

      const syllPerm = perms.find((p) => p.code === 'exams.syllabus.manage');
      expect(syllPerm).toBeDefined();
      expect(syllPerm?.name).toBe('Manage Exam Syllabus');
    });

    it('blocks Support Executive from syllabus management (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/syllabi`)
        .set('Authorization', `Bearer ${supportExecToken}`)
        .send({
          examPatternId: testPatternId,
          titleEn: 'Unauthorized Syllabus',
          titleKn: 'ಅನಧಿಕೃತ ಸಿಲಬಸ್',
        });
      expect(res.status).toBe(403);
    });

    it('allows Content Manager to create initial DRAFT syllabus', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/syllabi`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({
          examPatternId: testPatternId,
          titleEn: 'KAS Official Syllabus 2026',
          titleKn: 'ಕೆಎಎಸ್ ಅಧಿಕೃತ ಸಿಲಬಸ್ 2026',
          descriptionEn: 'Official syllabus for Gazetted Probationers',
          descriptionKn: 'ಗೆಜೆಟೆಡ್ ಪ್ರೊಬೇಷನರ್ಸ್ ಅಧಿಕೃತ ಸಿಲಬಸ್',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.revisionNumber).toBe(1);
      expect(res.body.data.status).toBe('DRAFT');
      testSyllabusId = res.body.data.id;
    });

    it('blocks Content Manager from approving syllabus (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/syllabi/${testSyllabusId}/approve`)
        .set('Authorization', `Bearer ${contentManagerToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('2. Node Operations & Scope Rules', () => {
    it('creates a root SUBJECT node with GLOBAL scope', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/syllabi/${testSyllabusId}/nodes`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({
          code: 'HIST_KAR',
          nodeType: 'SUBJECT',
          scopeType: 'GLOBAL',
          nameEn: 'History & Heritage of Karnataka',
          nameKn: 'ಕರ್ನಾಟಕದ ಇತಿಹಾಸ ಮತ್ತು ಪಾರಂಪರ್ಯ',
          displayOrder: 1,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.depth).toBe(1);
      rootSubjectId = res.body.data.id;
    });

    it('creates a child UNIT node with STAGE scope', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/syllabi/${testSyllabusId}/nodes`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({
          parentId: rootSubjectId,
          code: 'UNIT_MODERN_KAR',
          nodeType: 'UNIT',
          scopeType: 'STAGE',
          examStageId: testStageId,
          nameEn: 'Modern Karnataka History',
          nameKn: 'ಆಧುನಿಕ ಕರ್ನಾಟಕ ಇತಿಹಾಸ',
          displayOrder: 1,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.depth).toBe(2);
      childUnitId = res.body.data.id;
    });

    it('creates a grandchild TOPIC node with PAPER scope', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/syllabi/${testSyllabusId}/nodes`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({
          parentId: childUnitId,
          code: 'TOPIC_UNIFICATION',
          nodeType: 'TOPIC',
          scopeType: 'PAPER',
          examPaperId: testPaperId,
          nameEn: 'Unification Movement of Karnataka',
          nameKn: 'ಕರ್ನಾಟಕದ ಏಕೀಕರಣ ಚಳುವಳಿ',
          displayOrder: 1,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.depth).toBe(3);
      topicId = res.body.data.id;
    });

    it('rejects duplicate node codes in the same syllabus revision', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/syllabi/${testSyllabusId}/nodes`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({
          code: 'HIST_KAR',
          nodeType: 'SUBJECT',
          nameEn: 'Duplicate Subject',
          nameKn: 'ನಕಲಿ ವಿಷಯ',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EXAM_SYLLABUS_NODE_CODE_EXISTS');
    });

    it('rejects cross-pattern stage scope linking', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/syllabi/${testSyllabusId}/nodes`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({
          code: 'INVALID_STAGE_SCOPE',
          nodeType: 'UNIT',
          scopeType: 'STAGE',
          examStageId: '00000000-0000-0000-0000-000000000000',
          nameEn: 'Invalid Stage',
          nameKn: 'ಅಮಾನ್ಯ ಹಂತ',
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EXAM_SYLLABUS_CROSS_PATTERN_SCOPE');
    });

    it('moves a node to another valid parent and updates depths recursively', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/syllabi/${testSyllabusId}/nodes/${topicId}/move`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({
          targetParentId: rootSubjectId,
        });
      expect(res.status).toBe(200);
      expect(res.body.data.parentId).toBe(rootSubjectId);
      expect(res.body.data.depth).toBe(2);
    });

    it('rejects circular parent moves', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/syllabi/${testSyllabusId}/nodes/${rootSubjectId}/move`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({
          targetParentId: topicId,
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EXAM_SYLLABUS_CIRCULAR_REFERENCE');
    });

    it('blocks deleting a node with children without explicit subtree confirmation', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/syllabi/${testSyllabusId}/nodes/${rootSubjectId}`)
        .set('Authorization', `Bearer ${contentManagerToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EXAM_SYLLABUS_SUBTREE_DELETE_CONFIRMATION_REQUIRED');
    });
  });

  describe('3. Workflow, Review & Single-Current Publication', () => {
    it('allows Content Manager to submit valid syllabus for review', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/syllabi/${testSyllabusId}/submit-review`)
        .set('Authorization', `Bearer ${contentManagerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('REVIEW_PENDING');
    });

    it('allows Content Reviewer to request changes', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/syllabi/${testSyllabusId}/request-changes`)
        .set('Authorization', `Bearer ${contentReviewerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CHANGES_REQUESTED');
    });

    it('allows resubmitting and Content Reviewer approval', async () => {
      await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/syllabi/${testSyllabusId}/submit-review`)
        .set('Authorization', `Bearer ${contentManagerToken}`);

      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/syllabi/${testSyllabusId}/approve`)
        .set('Authorization', `Bearer ${contentReviewerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('APPROVED');
    });

    it('allows Super Admin to publish syllabus, setting it as current', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/syllabi/${testSyllabusId}/publish`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PUBLISHED');
      expect(res.body.data.isCurrent).toBe(true);
    });

    it('allows direct edits on published syllabus for simplified management', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/exams/${testExamCycleId}/syllabi/${testSyllabusId}`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({
          descriptionEn: 'Updated Published Description',
        });
      expect(res.status).toBe(200);
      expect(res.body.data.descriptionEn).toBe('Updated Published Description');
    });
  });

  describe('4. Syllabus Revision Cloning', () => {
    let clonedSyllabusId: string;

    it('clones published syllabus into revision 2 in DRAFT status with full node hierarchy', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/syllabi/${testSyllabusId}/clone-revision`)
        .set('Authorization', `Bearer ${contentManagerToken}`);
      expect(res.status).toBe(201);
      expect(res.body.data.revisionNumber).toBe(2);
      expect(res.body.data.status).toBe('DRAFT');
      expect(res.body.data.isCurrent).toBe(false);
      expect(res.body.data.sourceSyllabusId).toBe(testSyllabusId);
      clonedSyllabusId = res.body.data.id;

      // Verify node cloning integrity
      const sourceNodes = await prisma.examSyllabusNode.findMany({
        where: { examSyllabusId: testSyllabusId },
        orderBy: [{ depth: 'asc' }, { displayOrder: 'asc' }],
      });
      const clonedNodes = await prisma.examSyllabusNode.findMany({
        where: { examSyllabusId: clonedSyllabusId },
        orderBy: [{ depth: 'asc' }, { displayOrder: 'asc' }],
      });

      // 1. Same node count
      expect(clonedNodes.length).toBe(sourceNodes.length);
      expect(clonedNodes.length).toBeGreaterThan(0);

      // 2. New nodes receive different IDs
      for (let i = 0; i < sourceNodes.length; i++) {
        expect(clonedNodes[i].id).not.toBe(sourceNodes[i].id);
        expect(clonedNodes[i].code).toBe(sourceNodes[i].code);
        expect(clonedNodes[i].scopeType).toBe(sourceNodes[i].scopeType);
        expect(clonedNodes[i].examStageId).toBe(sourceNodes[i].examStageId);
        expect(clonedNodes[i].examPaperId).toBe(sourceNodes[i].examPaperId);
        expect(clonedNodes[i].nameEn).toBe(sourceNodes[i].nameEn);
        expect(clonedNodes[i].nameKn).toBe(sourceNodes[i].nameKn);
      }

      // 3. Parent relationships rebuilt correctly & Root nodes remain roots
      const sourceRoot = sourceNodes.find((n) => n.parentId === null);
      const clonedRoot = clonedNodes.find((n) => n.parentId === null);
      expect(sourceRoot).toBeDefined();
      expect(clonedRoot).toBeDefined();
      expect(clonedRoot?.code).toBe(sourceRoot?.code);

      const sourceChild = sourceNodes.find((n) => n.parentId !== null);
      if (sourceChild) {
        const clonedChild = clonedNodes.find((n) => n.code === sourceChild.code);
        expect(clonedChild).toBeDefined();
        expect(clonedChild?.parentId).not.toBe(sourceChild.parentId);
        expect(clonedChild?.parentId).toBe(clonedRoot?.id);
      }
    });

    it('publishing revision 2 archives revision 1', async () => {
      await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/syllabi/${clonedSyllabusId}/submit-review`)
        .set('Authorization', `Bearer ${contentManagerToken}`);
      await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/syllabi/${clonedSyllabusId}/approve`)
        .set('Authorization', `Bearer ${contentReviewerToken}`);
      const pubRes = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/syllabi/${clonedSyllabusId}/publish`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(pubRes.status).toBe(200);

      // Check revision 1 is now ARCHIVED
      const rev1 = await request(app)
        .get(`/api/v1/admin/exams/${testExamCycleId}/syllabi/${testSyllabusId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(rev1.body.data.status).toBe('ARCHIVED');
      expect(rev1.body.data.isCurrent).toBe(false);
    });
  });

  describe('5. Localized Public API Endpoint', () => {
    it('returns English content when language=en', async () => {
      const res = await request(app).get(`/api/v1/exams/${testExamSlug}/syllabus?language=en`);
      expect(res.status).toBe(200);
      expect(res.body.data.language).toBe('en');
      expect(res.body.data.title).toBe('KAS Official Syllabus 2026');
      expect(res.body.data.tree[0].name).toBe('History & Heritage of Karnataka');
    });

    it('returns Kannada content when language=kn', async () => {
      const res = await request(app).get(`/api/v1/exams/${testExamSlug}/syllabus?language=kn`);
      expect(res.status).toBe(200);
      expect(res.body.data.language).toBe('kn');
      expect(res.body.data.title).toBe('ಕೆಎಎಸ್ ಅಧಿಕೃತ ಸಿಲಬಸ್ 2026');
      expect(res.body.data.tree[0].name).toBe('ಕರ್ನಾಟಕದ ಇತಿಹಾಸ ಮತ್ತು ಪಾರಂಪರ್ಯ');
    });

    it('filters syllabus tree by stage code', async () => {
      const res = await request(app).get(`/api/v1/exams/${testExamSlug}/syllabus?language=en&stage=prelims`);
      expect(res.status).toBe(200);
      expect(res.body.data.tree.length).toBeGreaterThan(0);
    });
  });

  describe('6. Loading, Missing ExamId & Error Edge Cases', () => {
    it('returns empty array when exam cycle has no syllabus revisions', async () => {
      const emptyCycle = await prisma.examCycle.create({
        data: {
          programmeId: testProgrammeId,
          cycleCode: `CYCLE_EMPTY_${Date.now()}`,
          cycleYear: 2026,
          titleEn: 'Empty Syllabus Cycle',
          titleKn: 'ಖಾಲಿ ಸಿಲಬಸ್ ಪರೀಕ್ಷೆ',
          status: 'DRAFT',
          visibility: 'PRIVATE',
        },
      });

      const res = await request(app)
        .get(`/api/v1/admin/exams/${emptyCycle.id}/syllabi`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('returns 404 error when fetching syllabus for invalid exam ID', async () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/v1/admin/exams/${invalidId}/syllabi/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('EXAM_SYLLABUS_NOT_FOUND');
    });

    it('returns 400 error when creating syllabus with missing pattern ID', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/exams/${testExamCycleId}/syllabi`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({
          titleEn: 'Invalid Syllabus',
          titleKn: 'ಅಮಾನ್ಯ ಸಿಲಬಸ್',
        });
      expect(res.status).toBe(400);
    });
  });
});
