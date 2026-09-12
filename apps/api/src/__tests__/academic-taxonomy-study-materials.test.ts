import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '@study-karnataka/database';
import { assertTestDatabase } from './testGuard';

describe('Prompt 7: Academic Taxonomy & Study Materials Foundation API', () => {
  let adminToken: string;
  let createdCategoryId: string;
  let createdSubcategoryId: string;
  let createdTopicId: string;
  let createdKnowledgeAreaId: string;
  let createdStudyMaterialId: string;

  beforeAll(async () => {
    assertTestDatabase();

    // Reset test database tables for prompt 7 & 8 entities safely
    await prisma.studyMaterialReviewEvent.deleteMany();
    await prisma.studyMaterialLocaleRevision.deleteMany();
    await prisma.studyMaterialTaxonomyMapping.deleteMany();
    await prisma.studyMaterialLocale.deleteMany();
    await prisma.studyMaterial.deleteMany();
    await prisma.academicKnowledgeArea.deleteMany();
    await prisma.academicTopic.deleteMany();
    await prisma.academicSubcategory.deleteMany();
    await prisma.academicCategory.deleteMany();

    // Authenticate Super Admin
    const loginRes = await request(app).post('/api/v1/auth/admin/login').send({
      email: 'admin@studykarnataka.com',
      password: 'Admin@StudyKar2026',
    });

    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.data?.accessToken || loginRes.headers['set-cookie']?.[0] || '';
  });

  // ==========================================
  // ACADEMIC TAXONOMY TESTS
  // ==========================================
  describe('Academic Category APIs', () => {
    it('should create a new Academic Category with code uppercase normalization', async () => {
      const res = await request(app)
        .post('/api/v1/admin/academic-taxonomy/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'karnataka_history', // lowercase, should normalize to KARNATAKA_HISTORY
          nameEn: 'Karnataka History',
          nameKn: 'ಕರ್ನಾಟಕ ಇತಿಹಾಸ',
          slugEn: 'karnataka-history',
          slugKn: 'ಕರ್ನಾಟಕ-ಇತಿಹಾಸ',
          descriptionEn: 'Comprehensive history of Karnataka from ancient to modern eras',
          displayOrder: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('KARNATAKA_HISTORY');
      expect(res.body.data.bilingualReadiness).toBe('BOTH_COMPLETE');
      createdCategoryId = res.body.data.id;
    });

    it('should reject duplicate Category code with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/admin/academic-taxonomy/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'KARNATAKA_HISTORY',
          nameEn: 'Duplicate History',
          nameKn: 'ನಕಲಿ ಇತಿಹಾಸ',
          slugEn: 'duplicate-history',
          slugKn: 'ನಕಲಿ-ಇತಿಹಾಸ',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ACADEMIC_CATEGORY_CODE_EXISTS');
    });

    it('should update Category details', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/academic-taxonomy/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          shortNameEn: 'Kar History',
          shortNameKn: 'ಕರ್ನ ಇತಿಹಾಸ',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.shortNameEn).toBe('Kar History');
    });
  });

  describe('Academic Subcategory & Topic APIs', () => {
    it('should create a Subcategory under Category', async () => {
      const res = await request(app)
        .post('/api/v1/admin/academic-taxonomy/subcategories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          categoryId: createdCategoryId,
          code: 'MODERN_KARNATAKA',
          nameEn: 'Modern Karnataka History',
          nameKn: 'ಆಧುನಿಕ ಕರ್ನಾಟಕ ಇತಿಹಾಸ',
          slugEn: 'modern-karnataka',
          slugKn: 'ಆಧುನಿಕ-ಕರ್ನಾಟಕ',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('MODERN_KARNATAKA');
      createdSubcategoryId = res.body.data.id;
    });

    it('should create a Topic under Subcategory', async () => {
      const res = await request(app)
        .post('/api/v1/admin/academic-taxonomy/topics')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subcategoryId: createdSubcategoryId,
          code: 'UNIFICATION_MOVEMENT',
          nameEn: 'Karnataka Unification Movement',
          nameKn: 'ಕರ್ನಾಟಕ ಏಕೀಕರಣ ಚಳುವಳಿ',
          slugEn: 'unification-movement',
          slugKn: 'ಏಕೀಕರಣ-ಚಳುವಳಿ',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('UNIFICATION_MOVEMENT');
      createdTopicId = res.body.data.id;
    });

    it('should create a Knowledge Area under Topic', async () => {
      const res = await request(app)
        .post('/api/v1/admin/academic-taxonomy/knowledge-areas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          topicId: createdTopicId,
          code: 'MYSORE_STATE_RENAMING_1973',
          nameEn: 'Renaming of Mysore State to Karnataka (1973)',
          nameKn: 'ಮೈಸೂರು ರಾಜ್ಯ ಕರ್ನಾಟಕ ಎಂದು ಮರುನಾಮಕರಣ (1973)',
          slugEn: 'renaming-1973',
          slugKn: 'ಮರುನಾಮಕರಣ-1973',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('MYSORE_STATE_RENAMING_1973');
      createdKnowledgeAreaId = res.body.data.id;
    });

    it('should fetch complete 4-level Taxonomy Tree', async () => {
      const res = await request(app)
        .get('/api/v1/admin/academic-taxonomy/tree')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalCategories).toBeGreaterThanOrEqual(1);
      const cat = res.body.data.categories.find((c: any) => c.id === createdCategoryId);
      expect(cat).toBeDefined();
      expect(cat.subcategories).toHaveLength(1);
      expect(cat.subcategories[0].topics).toHaveLength(1);
      expect(cat.subcategories[0].topics[0].knowledgeAreas).toHaveLength(1);
    });

    it('should prevent deletion of Category when subcategories exist', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/academic-taxonomy/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ACADEMIC_CATEGORY_IN_USE');
    });
  });

  // ==========================================
  // STUDY MATERIALS FOUNDATION TESTS
  // ==========================================
  describe('Study Materials Canonical & Locale APIs', () => {
    it('should create a canonical Study Material record', async () => {
      const res = await request(app)
        .post('/api/v1/admin/study-materials')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'sm_hist_001',
          contentType: 'ARTICLE',
          initialEnglishLocale: {
            title: 'Karnataka Unification Movement and 1973 Renaming',
            summary: 'Comprehensive overview of Karnataka unification milestones.',
          },
          taxonomyMapping: {
            categoryId: createdCategoryId,
            subcategoryId: createdSubcategoryId,
            topicId: createdTopicId,
            knowledgeAreaId: createdKnowledgeAreaId,
            isPrimary: true,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toBe('SM_HIST_001');
      expect(res.body.data.hasEnglishLocale).toBe(true);
      expect(res.body.data.hasKannadaLocale).toBe(false);
      expect(res.body.data.foundationReadiness).toBe('ENGLISH_READY');
      createdStudyMaterialId = res.body.data.id;
    });

    it('should save Kannada locale and update foundation readiness to BOTH_LANGUAGES_READY', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/study-materials/${createdStudyMaterialId}/locales/kn`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'ಕರ್ನಾಟಕ ಏಕೀಕರಣ ಚಳುವಳಿ ಮತ್ತು 1973 ರ ಮರುನಾಮಕರಣ',
          slug: 'karnataka-unification-kn',
          summary: 'ಕರ್ನಾಟಕ ಏಕೀಕರಣದ ಪ್ರಮುಖ ಮೈಲಿಗಲ್ಲುಗಳ ಸಮಗ್ರ ಮಾಹಿತಿ.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.hasKannadaLocale).toBe(true);
      expect(res.body.data.foundationReadiness).toBe('BOTH_LANGUAGES_READY');
    });

    it('should list Study Materials with pagination and readiness filter', async () => {
      const res = await request(app)
        .get('/api/v1/admin/study-materials?foundationReadiness=BOTH_LANGUAGES_READY')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(createdStudyMaterialId);
    });

    it('should fetch Study Material details with audit trail history', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/study-materials/${createdStudyMaterialId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.englishLocale).toBeDefined();
      expect(res.body.data.kannadaLocale).toBeDefined();
      expect(res.body.data.primaryMapping).toBeDefined();
      expect(res.body.data.auditLogs.length).toBeGreaterThan(0);
    });

    it('should archive and restore Study Material record', async () => {
      const archiveRes = await request(app)
        .post(`/api/v1/admin/study-materials/${createdStudyMaterialId}/archive`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.recordStatus).toBe('ARCHIVED');

      const restoreRes = await request(app)
        .post(`/api/v1/admin/study-materials/${createdStudyMaterialId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(restoreRes.status).toBe(200);
      expect(restoreRes.body.data.recordStatus).toBe('ACTIVE');
    });
  });

  describe('RBAC & Security Verification for Study Materials', () => {
    it('should return 401 Unauthorized when requesting without auth token', async () => {
      const res = await request(app).get('/api/v1/admin/study-materials');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('should return 403 Forbidden for user lacking study_materials.view permission', async () => {
      const { signAccessToken } = await import('../utils/jwt');
      const restrictedToken = signAccessToken({
        userId: 'test-user-id',
        sessionId: 'test-session-id',
        accountType: 'ADMIN',
        roles: ['Support Executive'],
        permissions: ['support.view' as any],
      });

      const res = await request(app)
        .get('/api/v1/admin/study-materials')
        .set('Authorization', `Bearer ${restrictedToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow read-only GET access but reject POST create for Content Reviewer without create permission', async () => {
      const { signAccessToken } = await import('../utils/jwt');
      const reviewerToken = signAccessToken({
        userId: 'reviewer-user-id',
        sessionId: 'reviewer-session-id',
        accountType: 'ADMIN',
        roles: ['Content Reviewer'],
        permissions: ['study_materials.view' as any],
      });

      // GET should succeed (200)
      const getRes = await request(app)
        .get('/api/v1/admin/study-materials')
        .set('Authorization', `Bearer ${reviewerToken}`);
      expect(getRes.status).toBe(200);

      // POST create should fail with 403
      const postRes = await request(app)
        .post('/api/v1/admin/study-materials')
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({ code: 'TEST_READONLY', contentType: 'ARTICLE' });
      expect(postRes.status).toBe(403);
    });
  });
});
