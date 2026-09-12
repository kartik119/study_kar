import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { assertTestDatabase } from './testGuard';
import { app } from '../app';
import { prisma } from '@study-karnataka/database';
import { signAccessToken } from '../utils/jwt';
import {
  sanitizePlainText,
  extractPlainTextFromTiptapJson,
  sanitizeUrl,
  calculateReadingTimeMinutes,
} from '../utils/sanitizer';

describe('Development Prompt 8 — Bilingual Study Material Editor, Review Workflow & SEO Tests', () => {
  let superAdminToken: string;
  let contentManagerToken: string;
  let contentReviewerToken: string;
  let superAdminUserId: string;
  let contentManagerUserId: string;
  let contentReviewerUserId: string;

  let testCategoryId: string;
  let testSubcategoryId: string;
  let testTopicId: string;
  let createdMaterialId: string;

  beforeAll(async () => {
    assertTestDatabase();

    // 1. Setup Admin Users
    const superAdmin = await prisma.adminUser.upsert({
      where: { email: 'superadmin.p8@studykarnataka.com' },
      update: {},
      create: {
        email: 'superadmin.p8@studykarnataka.com',
        fullName: 'Super Admin Prompt 8',
        passwordHash: 'hash',
        accountStatus: 'ACTIVE',
      },
    });
    superAdminUserId = superAdmin.id;

    const manager = await prisma.adminUser.upsert({
      where: { email: 'manager.p8@studykarnataka.com' },
      update: {},
      create: {
        email: 'manager.p8@studykarnataka.com',
        fullName: 'Content Manager Prompt 8',
        passwordHash: 'hash',
        accountStatus: 'ACTIVE',
      },
    });
    contentManagerUserId = manager.id;

    const reviewer = await prisma.adminUser.upsert({
      where: { email: 'reviewer.p8@studykarnataka.com' },
      update: {},
      create: {
        email: 'reviewer.p8@studykarnataka.com',
        fullName: 'Content Reviewer Prompt 8',
        passwordHash: 'hash',
        accountStatus: 'ACTIVE',
      },
    });
    contentReviewerUserId = reviewer.id;

    // Tokens
    superAdminToken = signAccessToken({
      userId: superAdmin.id,
      accountType: 'ADMIN',
      roles: ['Super Admin'],
      permissions: [
        'study_materials.view',
        'study_materials.create',
        'study_materials.update',
        'study_materials.archive',
        'study_materials.delete_draft',
        'study_materials.submit_review',
        'study_materials.review',
        'study_materials.approve',
        'study_materials.publish',
        'academic_taxonomy.manage',
      ] as any,
      sessionId: 'sess_superadmin_p8',
    });

    contentManagerToken = signAccessToken({
      userId: manager.id,
      accountType: 'ADMIN',
      roles: ['Content Manager'],
      permissions: [
        'study_materials.view',
        'study_materials.create',
        'study_materials.update',
        'study_materials.submit_review',
        'academic_taxonomy.manage',
      ] as any,
      sessionId: 'sess_manager_p8',
    });

    contentReviewerToken = signAccessToken({
      userId: reviewer.id,
      accountType: 'ADMIN',
      roles: ['Content Reviewer'],
      permissions: ['study_materials.view', 'study_materials.review', 'study_materials.approve'] as any,
      sessionId: 'sess_reviewer_p8',
    });

    // 2. Setup Taxonomy hierarchy for tests
    const category = await prisma.academicCategory.create({
      data: {
        code: 'P8_CAT',
        nameEn: 'Prompt 8 Test Category',
        nameKn: 'ಪ್ರಾಂಪ್ಟ್ 8 ಪರೀಕ್ಷಾ ವರ್ಗ',
        slugEn: 'prompt-8-test-category',
        slugKn: 'prompt-8-test-category-kn',
      },
    });
    testCategoryId = category.id;

    const subcategory = await prisma.academicSubcategory.create({
      data: {
        categoryId: category.id,
        code: 'P8_SUBCAT',
        nameEn: 'Prompt 8 Subcategory',
        nameKn: 'ಪ್ರಾಂಪ್ಟ್ 8 ಉಪವರ್ಗ',
        slugEn: 'prompt-8-subcategory',
        slugKn: 'prompt-8-subcategory-kn',
      },
    });
    testSubcategoryId = subcategory.id;

    const topic = await prisma.academicTopic.create({
      data: {
        subcategoryId: subcategory.id,
        code: 'P8_TOPIC',
        nameEn: 'Prompt 8 Topic',
        nameKn: 'ಪ್ರಾಂಪ್ಟ್ 8 ವಿಷಯ',
        slugEn: 'prompt-8-topic',
        slugKn: 'prompt-8-topic-kn',
      },
    });
    testTopicId = topic.id;
  });

  afterAll(async () => {
    // Cleanup
    if (createdMaterialId) {
      await prisma.studyMaterial.delete({ where: { id: createdMaterialId } }).catch(() => {});
    }
    if (testCategoryId) {
      await prisma.academicCategory.delete({ where: { id: testCategoryId } }).catch(() => {});
    }
    await prisma.adminUser.deleteMany({
      where: {
        email: { in: ['superadmin.p8@studykarnataka.com', 'manager.p8@studykarnataka.com', 'reviewer.p8@studykarnataka.com'] },
      },
    }).catch(() => {});
  });

  describe('1. Sanitizer & Text Extractor Unit Tests', () => {
    it('should extract plain text and sanitize malicious XSS script tags', () => {
      const dirtyHtml = '<h1>Title</h1><script>alert("XSS")</script><p>Clean content paragraph</p>';
      const clean = sanitizePlainText(dirtyHtml);
      expect(clean).not.toContain('<script>');
      expect(clean).toContain('Title');
      expect(clean).toContain('Clean content paragraph');
    });

    it('should sanitize unsafe javascript: and data: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
      expect(sanitizeUrl('https://studykarnataka.com/map.jpg')).toBe('https://studykarnataka.com/map.jpg');
      expect(sanitizeUrl('/study-notes/history')).toBe('/study-notes/history');
    });

    it('should calculate reading time accurately', () => {
      const shortText = 'Word '.repeat(100);
      expect(calculateReadingTimeMinutes(shortText)).toBe(1);

      const longText = 'Word '.repeat(500);
      expect(calculateReadingTimeMinutes(longText)).toBe(3);
    });

    it('should extract plain text from Tiptap JSON node structure', () => {
      const doc = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'KPSC KAS Examination Notes' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Karnataka History & Administration overview.' }],
          },
        ],
      };
      const text = extractPlainTextFromTiptapJson(doc);
      expect(text).toBe('KPSC KAS Examination Notes Karnataka History & Administration overview.');
    });
  });

  describe('2. Revision Lifecycle, Autosave & Concurrency', () => {
    it('should create a new Study Material with initial English and Kannada revisions', async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post('/api/v1/admin/study-materials')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: `P8_SM_TEST_${timestamp}`,
          contentType: 'ARTICLE',
          initialEnglishLocale: {
            title: 'Karnataka Administrative Services Guide',
            summary: 'Comprehensive KAS guide in English',
            slug: `karnataka-administrative-services-guide-${timestamp}`,
          },
          initialKannadaLocale: {
            title: 'ಕರ್ನಾಟಕ ಆಡಳಿತ ಸೇವೆ ಮಾರ್ಗದರ್ಶಿ',
            summary: 'ಕನ್ನಡದಲ್ಲಿ ಕೆಎಎಸ್ ಕೈಪಿಡಿ',
            slug: `karnataka-adalita-seve-margadarshi-${timestamp}`,
          },
          taxonomyMapping: {
            categoryId: testCategoryId,
            subcategoryId: testSubcategoryId,
            topicId: testTopicId,
            isPrimary: true,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toMatch(/^P8_SM_TEST_/);
      createdMaterialId = res.body.data.id;
      expect(res.body.data.englishRevision).toBeDefined();
      expect(res.body.data.kannadaRevision).toBeDefined();
      expect(res.body.data.englishRevision.revisionNumber).toBe(1);
      expect(res.body.data.englishRevision.status).toBe('DRAFT');
    });

    it('should support debounced autosave endpoint for active revision', async () => {
      const detailRes = await request(app)
        .get(`/api/v1/admin/study-materials/${createdMaterialId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      const enRevId = detailRes.body.data.englishRevision.id;

      const autosaveRes = await request(app)
        .post(`/api/v1/admin/study-materials/${createdMaterialId}/locales/en/revisions/${enRevId}/autosave`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Karnataka Administrative Services Guide (Updated Draft)',
          metaTitle: 'KAS 2026 Exam Notes',
          metaDescription: 'Detailed KAS preparation notes',
        });

      expect(autosaveRes.status).toBe(200);
      expect(autosaveRes.body.data.title).toBe('Karnataka Administrative Services Guide (Updated Draft)');
      expect(autosaveRes.body.data.metaTitle).toBe('KAS 2026 Exam Notes');
    });
  });

  describe('3. Editorial Review Workflow & RBAC Enforcements', () => {
    it('should prevent Content Reviewer from submitting review (needs submit_review permission)', async () => {
      const detailRes = await request(app)
        .get(`/api/v1/admin/study-materials/${createdMaterialId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      const enRevId = detailRes.body.data.englishRevision.id;

      const res = await request(app)
        .post(`/api/v1/admin/study-materials/${createdMaterialId}/locales/en/revisions/${enRevId}/submit-review`)
        .set('Authorization', `Bearer ${contentReviewerToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow Content Manager to submit English revision for review', async () => {
      const detailRes = await request(app)
        .get(`/api/v1/admin/study-materials/${createdMaterialId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      const enRevId = detailRes.body.data.englishRevision.id;

      const res = await request(app)
        .post(`/api/v1/admin/study-materials/${createdMaterialId}/locales/en/revisions/${enRevId}/submit-review`)
        .set('Authorization', `Bearer ${contentManagerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('REVIEW_PENDING');
    });

    it('should prevent Content Manager from approving submitted revision (needs approve permission)', async () => {
      const detailRes = await request(app)
        .get(`/api/v1/admin/study-materials/${createdMaterialId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      const enRevId = detailRes.body.data.englishRevision.id;

      const res = await request(app)
        .post(`/api/v1/admin/study-materials/${createdMaterialId}/locales/en/revisions/${enRevId}/approve`)
        .set('Authorization', `Bearer ${contentManagerToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow Content Reviewer to approve submitted revision', async () => {
      const detailRes = await request(app)
        .get(`/api/v1/admin/study-materials/${createdMaterialId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      const enRevId = detailRes.body.data.englishRevision.id;

      const res = await request(app)
        .post(`/api/v1/admin/study-materials/${createdMaterialId}/locales/en/revisions/${enRevId}/approve`)
        .set('Authorization', `Bearer ${contentReviewerToken}`)
        .send({ comment: 'Approved for publication' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('APPROVED');
    });

    it('should prevent Content Reviewer from publishing approved revision (needs publish permission)', async () => {
      const detailRes = await request(app)
        .get(`/api/v1/admin/study-materials/${createdMaterialId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      const enRevId = detailRes.body.data.englishRevision.id;

      const res = await request(app)
        .post(`/api/v1/admin/study-materials/${createdMaterialId}/locales/en/revisions/${enRevId}/publish`)
        .set('Authorization', `Bearer ${contentReviewerToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow Super Admin to publish approved revision', async () => {
      const detailRes = await request(app)
        .get(`/api/v1/admin/study-materials/${createdMaterialId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      const enRevId = detailRes.body.data.englishRevision.id;

      const res = await request(app)
        .post(`/api/v1/admin/study-materials/${createdMaterialId}/locales/en/revisions/${enRevId}/publish`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PUBLISHED');
      expect(res.body.data.isCurrentPublished).toBe(true);
    });

    it('should clone published revision into a new DRAFT Revision #2', async () => {
      const detailRes = await request(app)
        .get(`/api/v1/admin/study-materials/${createdMaterialId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      const pubRev = detailRes.body.data.englishLocale.revisions.find(
        (r: any) => r.status === 'PUBLISHED'
      );
      expect(pubRev).toBeDefined();

      const cloneRes = await request(app)
        .post(`/api/v1/admin/study-materials/${createdMaterialId}/locales/en/revisions/${pubRev.id}/clone`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect([200, 201]).toContain(cloneRes.status);
      expect(cloneRes.body.data.revisionNumber).toBe(2);
      expect(cloneRes.body.data.status).toBe('DRAFT');
    });
  });

  describe('4. Review Queue & Internal Preview Endpoints', () => {
    it('should return items in Review Queue filter tabs', async () => {
      const res = await request(app)
        .get('/api/v1/admin/study-materials/review-queue?tab=awaiting_review')
        .set('Authorization', `Bearer ${contentReviewerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    it('should return preview data for internal student preview endpoint', async () => {
      const detailRes = await request(app)
        .get(`/api/v1/admin/study-materials/${createdMaterialId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      const enRevId = detailRes.body.data.englishRevision.id;

      const previewRes = await request(app)
        .get(`/api/v1/admin/study-materials/${createdMaterialId}/locales/en/revisions/${enRevId}/preview`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(previewRes.status).toBe(200);
      expect(previewRes.body.data.revision).toBeDefined();
      expect(previewRes.body.data.taxonomyPath).toBeDefined();
    });
  });

  describe('5. Automatic Code Generation & Immutability Tests', () => {
    it('should create Study Material without manually supplying a code (auto-generates SM_XXXXXX)', async () => {
      const res = await request(app)
        .post('/api/v1/admin/study-materials')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          contentType: 'ARTICLE',
          initialEnglishLocale: {
            title: 'Auto Code Generated Test Note',
            summary: 'Summary for auto code note',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toMatch(/^SM_\d{6}$/);

      // Clean up
      await prisma.studyMaterial.delete({ where: { id: res.body.data.id } });
    });

    it('should generate unique codes for sequential material creations', async () => {
      const res1 = await request(app)
        .post('/api/v1/admin/study-materials')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ contentType: 'STUDY_NOTE' });

      const res2 = await request(app)
        .post('/api/v1/admin/study-materials')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ contentType: 'GUIDE' });

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res1.body.data.code).not.toEqual(res2.body.data.code);
      expect(res1.body.data.code).toMatch(/^SM_\d{6}$/);
      expect(res2.body.data.code).toMatch(/^SM_\d{6}$/);

      await prisma.studyMaterial.deleteMany({
        where: { id: { in: [res1.body.data.id, res2.body.data.id] } },
      });
    });

    it('should keep generated code unchanged after title edit or locale updates', async () => {
      const createRes = await request(app)
        .post('/api/v1/admin/study-materials')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          contentType: 'LESSON',
          initialEnglishLocale: { title: 'Initial Title' },
        });

      const smId = createRes.body.data.id;
      const originalCode = createRes.body.data.code;

      await request(app)
        .patch(`/api/v1/admin/study-materials/${smId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ contentType: 'LESSON' });

      const checkRes = await request(app)
        .get(`/api/v1/admin/study-materials/${smId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(checkRes.body.data.code).toBe(originalCode);

      await prisma.studyMaterial.delete({ where: { id: smId } });
    });

    it('should reject when normal Content Manager attempts to edit generated system code', async () => {
      const createRes = await request(app)
        .post('/api/v1/admin/study-materials')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ contentType: 'CHAPTER' });

      const smId = createRes.body.data.id;

      const updateRes = await request(app)
        .patch(`/api/v1/admin/study-materials/${smId}`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({ code: 'ATTEMPTED_NEW_CODE' });

      expect(updateRes.status).toBe(400);

      await prisma.studyMaterial.delete({ where: { id: smId } });
    });

    it('should default contentType to ARTICLE when creating a Study Material without contentType', async () => {
      const res = await request(app)
        .post('/api/v1/admin/study-materials')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.data.contentType).toBe('ARTICLE');

      if (res.body.data?.id) {
        await prisma.studyMaterial.delete({ where: { id: res.body.data.id } });
      }
    });

    it('should handle concurrent creations without code collision', async () => {
      const creations = Array.from({ length: 5 }).map(() =>
        request(app)
          .post('/api/v1/admin/study-materials')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({ contentType: 'ARTICLE' })
      );

      const results = await Promise.all(creations);
      const codes = results.map((r) => r.body.data.code);
      const uniqueCodes = new Set(codes);

      expect(results.every((r) => r.status === 201)).toBe(true);
      expect(uniqueCodes.size).toBe(5);

      const ids = results.map((r) => r.body.data.id);
      await prisma.studyMaterial.deleteMany({ where: { id: { in: ids } } });
    });
  });
});
