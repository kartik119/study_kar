import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '@study-karnataka/database';
import { signAccessToken } from '../utils/jwt';
import { setEntitlementResolver, MockEntitlementResolver, resetEntitlementResolver } from '../services/entitlement-resolver.service';
import { ensureStableNodeIds, extractPreviewOutline, splitContentAtNodeBoundary, evaluateStudyMaterialAccessReadiness } from '@study-karnataka/validation';

describe('Development Prompt 9 — Study Material Access Control Tests', () => {
  let superAdminToken: string;
  let contentManagerToken: string;
  let contentReviewerToken: string;
  let supportExecutiveToken: string;
  let mockResolver: MockEntitlementResolver;

  let testMaterialId: string;
  let publishedMatId: string;
  let categoryId: string;
  let subcategoryId: string;
  let topicId: string;

  beforeAll(async () => {
    // Assert test database safety
    const dbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';
    if (!dbUrl.includes('study_karnataka_test')) {
      throw new Error(`SECURITY ALERT: Tests must run against study_karnataka_test! Got: ${dbUrl}`);
    }

    mockResolver = new MockEntitlementResolver();
    setEntitlementResolver(mockResolver);

    // Create Super Admin User & Token
    const superAdmin = await prisma.adminUser.upsert({
      where: { email: 'superadmin.p9@studykarnataka.com' },
      update: {},
      create: {
        email: 'superadmin.p9@studykarnataka.com',
        fullName: 'Super Admin Prompt 9',
        passwordHash: 'hash',
        accountStatus: 'ACTIVE',
      },
    });

    superAdminToken = signAccessToken({
      userId: superAdmin.id,
      accountType: 'ADMIN',
      roles: ['Super Admin'],
      permissions: [
        'study_materials.create',
        'study_materials.update',
        'study_materials.view',
        'study_materials.submit_review',
        'study_materials.review',
        'study_materials.approve',
        'study_materials.publish',
        'study_materials.access.manage',
        'study_materials.access.preview',
        'study_materials.access.override',
      ],
      sessionId: 'test-session-superadmin-p9',
    });

    // Create Content Manager User & Token
    const cmUser = await prisma.adminUser.upsert({
      where: { email: 'cm.p9@studykarnataka.com' },
      update: {},
      create: {
        email: 'cm.p9@studykarnataka.com',
        fullName: 'Content Manager Prompt 9',
        passwordHash: 'hash',
        accountStatus: 'ACTIVE',
      },
    });

    contentManagerToken = signAccessToken({
      userId: cmUser.id,
      accountType: 'ADMIN',
      roles: ['Content Manager'],
      permissions: [
        'study_materials.create',
        'study_materials.update',
        'study_materials.view',
        'study_materials.submit_review',
        'study_materials.access.manage',
        'study_materials.access.preview',
      ],
      sessionId: 'test-session-cm-p9',
    });

    // Create Content Reviewer User & Token
    const crUser = await prisma.adminUser.upsert({
      where: { email: 'cr.p9@studykarnataka.com' },
      update: {},
      create: {
        email: 'cr.p9@studykarnataka.com',
        fullName: 'Content Reviewer Prompt 9',
        passwordHash: 'hash',
        accountStatus: 'ACTIVE',
      },
    });

    contentReviewerToken = signAccessToken({
      userId: crUser.id,
      accountType: 'ADMIN',
      roles: ['Content Reviewer'],
      permissions: [
        'study_materials.view',
        'study_materials.review',
        'study_materials.approve',
        'study_materials.access.preview',
      ],
      sessionId: 'test-session-cr-p9',
    });

    // Create Support Executive User & Token
    const seUser = await prisma.adminUser.upsert({
      where: { email: 'se.p9@studykarnataka.com' },
      update: {},
      create: {
        email: 'se.p9@studykarnataka.com',
        fullName: 'Support Executive Prompt 9',
        passwordHash: 'hash',
        accountStatus: 'ACTIVE',
      },
    });

    supportExecutiveToken = signAccessToken({
      userId: seUser.id,
      accountType: 'ADMIN',
      roles: ['Support Executive'],
      permissions: ['dashboard.view', 'students.view', 'support.view'],
      sessionId: 'test-session-se-p9',
    });

    // Seed taxonomy for tests
    const category = await prisma.academicCategory.create({
      data: { nameEn: 'Access Test Category', nameKn: 'ಪ್ರವೇಶ ಪರೀಕ್ಷಾ ವರ್ಗ', code: `ACC_CAT_${Date.now()}`, slugEn: `acc-cat-${Date.now()}`, slugKn: `acc-cat-kn-${Date.now()}` },
    });
    categoryId = category.id;

    const subcategory = await prisma.academicSubcategory.create({
      data: { categoryId, nameEn: 'Access Subcategory', nameKn: 'ಪ್ರವೇಶ ಉಪವರ್ಗ', code: `ACC_SUB_${Date.now()}`, slugEn: `acc-sub-${Date.now()}`, slugKn: `acc-sub-kn-${Date.now()}` },
    });
    subcategoryId = subcategory.id;

    const topic = await prisma.academicTopic.create({
      data: { subcategoryId, nameEn: 'Access Topic', nameKn: 'ಪ್ರವೇಶ ವಿಷಯ', code: `ACC_TOPIC_${Date.now()}`, slugEn: `acc-topic-${Date.now()}`, slugKn: `acc-topic-kn-${Date.now()}` },
    });
    topicId = topic.id;
  });

  afterAll(async () => {
    resetEntitlementResolver();
  });

  describe('1. Pure Unit & Helper Logic Tests', () => {
    it('should assign stable node IDs to Tiptap content blocks', () => {
      const rawJson = {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Section 1' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Paragraph content text' }] },
        ],
      };

      const result = ensureStableNodeIds(rawJson);
      expect(result.content[0].attrs.nodeId).toBeDefined();
      expect(result.content[1].attrs.nodeId).toBeDefined();

      // Ensure stability on second call
      const secondCall = ensureStableNodeIds(result);
      expect(secondCall.content[0].attrs.nodeId).toBe(result.content[0].attrs.nodeId);
    });

    it('should extract document outline correctly', () => {
      const contentJson = {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1, nodeId: 'node_1' }, content: [{ type: 'text', text: 'Introduction' }] },
          { type: 'paragraph', attrs: { nodeId: 'node_2' }, content: [{ type: 'text', text: 'This is free content body.' }] },
          { type: 'heading', attrs: { level: 2, nodeId: 'node_3' }, content: [{ type: 'text', text: 'Deep Analysis' }] },
          { type: 'paragraph', attrs: { nodeId: 'node_4' }, content: [{ type: 'text', text: 'This is locked paid content.' }] },
        ],
      };

      const outline = extractPreviewOutline(contentJson);
      expect(outline.length).toBe(4);
      expect(outline[0].nodeId).toBe('node_1');
      expect(outline[0].label).toContain('Introduction');
      expect(outline[2].label).toContain('H2: Deep Analysis');
    });

    it('should split Freemium content accurately at previewEndNodeId without leaking locked nodes', () => {
      const contentJson = {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { nodeId: 'node_1' }, content: [{ type: 'text', text: 'Free Intro' }] },
          { type: 'paragraph', attrs: { nodeId: 'node_2' }, content: [{ type: 'text', text: 'Free Paragraph' }] },
          { type: 'heading', attrs: { nodeId: 'node_3' }, content: [{ type: 'text', text: 'Locked Heading' }] },
          { type: 'paragraph', attrs: { nodeId: 'node_4' }, content: [{ type: 'text', text: 'Locked Secret' }] },
        ],
      };

      const split = splitContentAtNodeBoundary(contentJson, 'node_2', true);
      expect(split.previewFound).toBe(true);
      expect(split.freeContentJson.content.length).toBe(2);
      expect(split.freeContentJson.content[0].attrs.nodeId).toBe('node_1');
      expect(split.freeContentJson.content[1].attrs.nodeId).toBe('node_2');
      expect(split.lockedContentJson.content.length).toBe(2);
      expect(split.lockedContentJson.content[0].attrs.nodeId).toBe('node_3');
    });

    it('should evaluate access readiness state properly', () => {
      const freeReadiness = evaluateStudyMaterialAccessReadiness('FREE', [], []);
      expect(freeReadiness.readiness).toBe('ACCESS_READY');

      const paidReadiness = evaluateStudyMaterialAccessReadiness('PAID', [], []);
      expect(paidReadiness.readiness).toBe('ACCESS_READY');

      const freemiumIncomplete = evaluateStudyMaterialAccessReadiness('FREEMIUM', [], [
        { language: 'en', contentJson: { type: 'doc', content: [] } },
      ]);
      expect(freemiumIncomplete.readiness).toBe('ACCESS_INCOMPLETE');
      expect(freemiumIncomplete.missingRequirements.length).toBeGreaterThan(0);
    });
  });

  describe('2. Study Material Access Policy API & Security Tests', () => {
    it('should create a Study Material with default FREE access policy', async () => {
      const res = await request(app)
        .post('/api/v1/admin/study-materials')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          contentType: 'ARTICLE',
          initialEnglishLocale: {
            title: 'Free Commercial Test Material',
            slug: `free-material-${Date.now()}`,
            summary: 'Free access test summary',
          },
          taxonomyMapping: {
            categoryId,
            subcategoryId,
            topicId,
          },
        });

      expect(res.status).toBe(201);
      testMaterialId = res.body.data.id;

      // Check access policy
      const policyRes = await request(app)
        .get(`/api/v1/admin/study-materials/${testMaterialId}/access-policy`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(policyRes.status).toBe(200);
      expect(policyRes.body.data.accessType).toBe('FREE');
      expect(policyRes.body.data.entitlementKey).toBe(`STUDY_MATERIAL:${testMaterialId}:FULL`);
    });

    it('should allow Content Manager to update Access Policy to PAID', async () => {
      const updateRes = await request(app)
        .put(`/api/v1/admin/study-materials/${testMaterialId}/access-policy`)
        .set('Authorization', `Bearer ${contentManagerToken}`)
        .send({
          accessType: 'PAID',
          paywallTitleEn: 'Unlock Exclusive KAS Content',
          paywallMessageEn: 'Full article requires Study Karnataka pass.',
          freeMcqSampleCount: 5,
          freeQuickRevisionSampleCount: 10,
          reason: 'Monetizing exclusive KAS guide',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.accessType).toBe('PAID');
      expect(updateRes.body.data.freeMcqSampleCount).toBe(5);
      expect(updateRes.body.data.freeQuickRevisionSampleCount).toBe(10);
    });

    it('should enforce RBAC — forbid Support Executive from managing Access Policy', async () => {
      const res = await request(app)
        .put(`/api/v1/admin/study-materials/${testMaterialId}/access-policy`)
        .set('Authorization', `Bearer ${supportExecutiveToken}`)
        .send({
          accessType: 'FREE',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('3. Public Access-Aware Content Read & Security Leak Prevention Tests', () => {
    let publishedSlug: string;

    beforeAll(async () => {
      // Create and Publish a FREEMIUM material
      publishedSlug = `freemium-published-${Date.now()}`;
      const mat = await request(app)
        .post('/api/v1/admin/study-materials')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          contentType: 'GUIDE',
          initialEnglishLocale: {
            title: 'Published Freemium Guide',
            slug: publishedSlug,
            summary: 'English freemium summary',
          },
          taxonomyMapping: { categoryId, subcategoryId, topicId },
        });

      publishedMatId = mat.body.data.id;
      const enRevId = mat.body.data.englishRevision.id;

      // Save Tiptap content with node IDs
      const contentJson = {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1, nodeId: 'node_free_1' }, content: [{ type: 'text', text: 'Free Section Title' }] },
          { type: 'paragraph', attrs: { nodeId: 'node_free_2' }, content: [{ type: 'text', text: 'Free visible preview content.' }] },
          { type: 'callout', attrs: { calloutType: 'SHORT_NOTE', nodeId: 'node_locked_3' }, content: [{ type: 'text', text: 'Secret paid note text' }] },
          { type: 'paragraph', attrs: { nodeId: 'node_locked_4' }, content: [{ type: 'text', text: 'Locked paid paragraph content.' }] },
        ],
      };

      await request(app)
        .patch(`/api/v1/admin/study-materials/${publishedMatId}/locales/en/revisions/${enRevId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Published Freemium Guide',
          slug: publishedSlug,
          summary: 'English freemium summary',
          contentJson,
        });

      // Submit and Publish revision
      await request(app)
        .post(`/api/v1/admin/study-materials/${publishedMatId}/locales/en/revisions/${enRevId}/submit-review`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      await request(app)
        .post(`/api/v1/admin/study-materials/${publishedMatId}/locales/en/revisions/${enRevId}/approve`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      await request(app)
        .post(`/api/v1/admin/study-materials/${publishedMatId}/locales/en/revisions/${enRevId}/publish`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      // Set Access Policy to FREEMIUM with boundary node_free_2
      await request(app)
        .put(`/api/v1/admin/study-materials/${publishedMatId}/access-policy`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          accessType: 'FREEMIUM',
          previewEndNodeIdEn: 'node_free_2',
          paywallTitleEn: 'Unlock Remaining Guide',
          paywallMessageEn: 'Join Study Karnataka to read locked sections.',
        });
    });

    it('FREEMIUM content without entitlement returns ONLY free content nodes and NO locked nodes', async () => {
      const res = await request(app).get(`/api/v1/content/study-materials/${publishedSlug}?language=en`);

      expect(res.status).toBe(200);
      expect(res.body.data.accessResult.accessState).toBe('PREVIEW_ACCESS');
      expect(res.body.data.accessResult.entitled).toBe(false);

      const returnedContent = res.body.data.accessResult.freeContentJson;
      expect(returnedContent.content.length).toBe(2);
      expect(returnedContent.content[0].attrs.nodeId).toBe('node_free_1');
      expect(returnedContent.content[1].attrs.nodeId).toBe('node_free_2');

      // CRITICAL SECURITY CHECK: Full body or locked content MUST NOT BE RETURNED
      const resStr = JSON.stringify(res.body);
      expect(resStr).not.toContain('Locked paid paragraph content');
      expect(resStr).not.toContain('Secret paid note text');
    });

    it('FREEMIUM content WITH entitlement returns full content body', async () => {
      const entitlementKey = `STUDY_MATERIAL:${publishedMatId}:FULL`;
      mockResolver.grantEntitlement('student_123', entitlementKey);

      const res = await request(app)
        .get(`/api/v1/admin/study-materials/${publishedMatId}/access-preview?mode=ENTITLED_USER&language=en`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.accessResult.accessState).toBe('FULL_ACCESS');
      expect(res.body.data.accessResult.entitled).toBe(true);
    });

    it('should allow Content Reviewer to preview access in read-only mode', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/study-materials/${publishedMatId}/access-preview?mode=FULL_ADMIN_PREVIEW&language=en`)
        .set('Authorization', `Bearer ${contentReviewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.accessResult).toBeDefined();
    });
  });

  describe('Simplified Study Material Creation & Optional Taxonomy Tests', () => {
    let unmappedMaterialId: string;
    let unmappedEnRevId: string;
    let unmappedSlug = `independent-study-material-${Date.now()}`;

    it('Study Material can be created without Content Type selection and with zero taxonomy mappings', async () => {
      const res = await request(app)
        .post('/api/v1/admin/study-materials')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          initialEnglishLocale: {
            title: 'Independent Study Material Title',
            slug: unmappedSlug,
            summary: 'Summary for unmapped independent material',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.code).toMatch(/^SM_\d+$/);
      expect(res.body.data.contentType).toBe('ARTICLE');
      expect(res.body.data.englishLocale).toBeDefined();

      unmappedMaterialId = res.body.data.id;
      const localeRes = await request(app)
        .get(`/api/v1/admin/study-materials/${unmappedMaterialId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);
      const enLoc = localeRes.body.data.locales.find((l: any) => l.language === 'en');
      unmappedEnRevId = enLoc.revisions[0].id;
    });

    it('Draft saves without taxonomy mappings', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/study-materials/${unmappedMaterialId}/locales/en/revisions/${unmappedEnRevId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          title: 'Independent Study Material Title Updated',
          slug: unmappedSlug,
          summary: 'Updated summary without taxonomy',
          contentJson: { type: 'doc', content: [{ type: 'paragraph', text: 'Hello independent content' }] },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Independent Study Material Title Updated');
    });

    it('Review submission works without taxonomy mappings', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/study-materials/${unmappedMaterialId}/locales/en/revisions/${unmappedEnRevId}/submit-review`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('REVIEW_PENDING');
    });

    it('Approval works without taxonomy mappings', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/study-materials/${unmappedMaterialId}/locales/en/revisions/${unmappedEnRevId}/approve`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('APPROVED');
    });

    it('Publishing works without taxonomy mappings', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/study-materials/${unmappedMaterialId}/locales/en/revisions/${unmappedEnRevId}/publish`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PUBLISHED');

      // Verify unmapped content is publicly accessible
      const publicRes = await request(app).get(`/api/v1/content/study-materials/${unmappedSlug}?language=en`);
      expect(publicRes.status).toBe(200);
      expect(publicRes.body.data.revision.title).toBe('Independent Study Material Title Updated');
    });

    it('Taxonomy mapping may be added later', async () => {
      // Create category, subcategory, topic for mapping
      const cat = await prisma.academicCategory.create({
        data: { code: `CAT_LATER_${Date.now()}`, nameEn: 'Later Cat', nameKn: 'ನಂತರದ ವರ್ಗ', slugEn: `later-cat-${Date.now()}`, slugKn: `later-cat-kn-${Date.now()}` },
      });
      const sub = await prisma.academicSubcategory.create({
        data: { categoryId: cat.id, code: `SUB_LATER_${Date.now()}`, nameEn: 'Later Sub', nameKn: 'ನಂತರದ ಉಪವರ್ಗ', slugEn: `later-sub-${Date.now()}`, slugKn: `later-sub-kn-${Date.now()}` },
      });
      const top = await prisma.academicTopic.create({
        data: { subcategoryId: sub.id, code: `TOP_LATER_${Date.now()}`, nameEn: 'Later Topic', nameKn: 'ನಂತರದ ವಿಷಯ', slugEn: `later-top-${Date.now()}`, slugKn: `later-top-kn-${Date.now()}` },
      });

      const res = await request(app)
        .post(`/api/v1/admin/study-materials/${unmappedMaterialId}/taxonomy-mappings`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          categoryId: cat.id,
          subcategoryId: sub.id,
          topicId: top.id,
          isPrimary: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.primaryMapping?.categoryId || res.body.data.taxonomyMappings?.[0]?.categoryId).toBe(cat.id);
    });

    it('Taxonomy mapping may be removed later', async () => {
      const detail = await request(app)
        .get(`/api/v1/admin/study-materials/${unmappedMaterialId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      const mappingId = detail.body.data.taxonomyMappings[0].id;

      const delRes = await request(app)
        .delete(`/api/v1/admin/study-materials/${unmappedMaterialId}/taxonomy-mappings/${mappingId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(delRes.status).toBe(200);

      const refetched = await request(app)
        .get(`/api/v1/admin/study-materials/${unmappedMaterialId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(refetched.body.data.taxonomyMappings.length).toBe(0);
    });

    it('Invalid optional mapping is still rejected', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/study-materials/${unmappedMaterialId}/taxonomy-mappings`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          categoryId: 'invalid-uuid',
          subcategoryId: 'invalid-uuid',
          topicId: 'invalid-uuid',
        });

      expect(res.status).toBe(400);
    });

    it('Existing mapped Study Materials continue working with no lost IDs or revisions', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/study-materials/${publishedMatId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(publishedMatId);
      expect(res.body.data.locales.length).toBeGreaterThan(0);
    });
  });
});
