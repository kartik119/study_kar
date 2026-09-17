// @ts-nocheck
import { Router, Response } from 'express';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { StudyMaterialService, StudyMaterialError } from '../services/study-material.service';
import { StudyMaterialWorkflowService } from '../services/study-material-workflow.service';
import { prisma } from '@study-karnataka/database';
import { ZodError } from 'zod';

const router: Router = Router();

router.use(authenticateToken);

function p(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || '';
  return val || '';
}

function handleError(res: Response, err: any) {
  if (err instanceof StudyMaterialError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
      timestamp: new Date().toISOString(),
    });
  }
  
  if (err instanceof ZodError) {
    const errorMessages = err.errors.map(e => e.message).join(', ');
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: `Validation failed: ${errorMessages}`, details: err.errors },
      timestamp: new Date().toISOString(),
    });
  }

  console.error('Unhandled Study Material Error:', err);
  return res.status(500).json({
    success: false,
    error: { code: 'STUDY_MATERIAL_ERROR', message: err.message || 'Study material operation failed' },
    timestamp: new Date().toISOString(),
  });
}

// Review Queue Endpoint (Must be defined before parameterized routes)
router.get('/review-queue', requirePermission('study_materials.view', 'study_materials.review'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filters = {
      search: req.query.search as string,
      language: req.query.language as any,
      contentType: req.query.contentType as any,
      categoryId: req.query.categoryId as string,
      subcategoryId: req.query.subcategoryId as string,
      topicId: req.query.topicId as string,
      reviewerId: req.query.reviewerId as string,
      status: req.query.status as any,
      tab: req.query.tab as any,
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 20,
    };
    const result = await StudyMaterialWorkflowService.getReviewQueue(filters);
    return res.json({ success: true, data: result.items, meta: result.meta, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// List & Pagination
router.get('/', requirePermission('study_materials.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filters = {
      search: req.query.search as string,
      code: req.query.code as string,
      contentType: req.query.contentType as any,
      recordStatus: req.query.recordStatus as any,
      hasEnglishLocale: req.query.hasEnglishLocale !== undefined ? req.query.hasEnglishLocale === 'true' : undefined,
      hasKannadaLocale: req.query.hasKannadaLocale !== undefined ? req.query.hasKannadaLocale === 'true' : undefined,
      foundationReadiness: req.query.foundationReadiness as any,
      bilingualStatus: req.query.bilingualStatus as any,
      categoryId: req.query.categoryId as string,
      subcategoryId: req.query.subcategoryId as string,
      topicId: req.query.topicId as string,
      knowledgeAreaId: req.query.knowledgeAreaId as string,
      includeArchived: req.query.includeArchived === 'true',
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 20,
    };
    const result = await StudyMaterialService.getStudyMaterials(filters);
    return res.json({ success: true, data: result.items, meta: result.meta, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// Create Canonical Record
router.post('/', requirePermission('study_materials.create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const created = await StudyMaterialService.createStudyMaterial(req.body, req.user!.userId);
    return res.status(201).json({ success: true, data: created, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// Detail View
router.get('/:studyMaterialId', requirePermission('study_materials.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const detail = await StudyMaterialService.getStudyMaterialById(p(req.params.studyMaterialId));
    return res.json({ success: true, data: detail, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// Update Canonical Record
router.patch('/:studyMaterialId', requirePermission('study_materials.update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await StudyMaterialService.updateStudyMaterial(p(req.params.studyMaterialId), req.body, req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// Locales (Legacy Prompt 7 & Revision 1 initialization)
router.put('/:studyMaterialId/locales/en', requirePermission('study_materials.create', 'study_materials.update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await StudyMaterialService.saveLocale(p(req.params.studyMaterialId), 'en', req.body, req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.put('/:studyMaterialId/locales/kn', requirePermission('study_materials.create', 'study_materials.update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await StudyMaterialService.saveLocale(p(req.params.studyMaterialId), 'kn', req.body, req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// REVISION & WORKFLOW ENDPOINTS (PROMPT 8)

// Autosave Revision
router.post(
  '/:studyMaterialId/locales/:language/revisions/:revisionId/autosave',
  requirePermission('study_materials.create', 'study_materials.update'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await StudyMaterialWorkflowService.saveRevision(
        p(req.params.revisionId),
        req.body,
        req.user!.userId,
        true // isAutosave = true
      );
      return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
    } catch (err) {
      return handleError(res, err);
    }
  }
);

// Save Revision (Manual)
router.patch(
  '/:studyMaterialId/locales/:language/revisions/:revisionId',
  requirePermission('study_materials.create', 'study_materials.update'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await StudyMaterialWorkflowService.saveRevision(
        p(req.params.revisionId),
        req.body,
        req.user!.userId,
        false
      );
      return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
    } catch (err) {
      return handleError(res, err);
    }
  }
);

// Submit Revision for Review
router.post(
  '/:studyMaterialId/locales/:language/revisions/:revisionId/submit-review',
  requirePermission('study_materials.submit_review'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await StudyMaterialWorkflowService.submitForReview(p(req.params.revisionId), req.user!.userId);
      return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
    } catch (err) {
      return handleError(res, err);
    }
  }
);

// Request Changes on Revision
router.post(
  '/:studyMaterialId/locales/:language/revisions/:revisionId/request-changes',
  requirePermission('study_materials.review'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await StudyMaterialWorkflowService.requestChanges(
        p(req.params.revisionId),
        req.body.comment,
        req.user!.userId
      );
      return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
    } catch (err) {
      return handleError(res, err);
    }
  }
);

// Approve Revision
router.post(
  '/:studyMaterialId/locales/:language/revisions/:revisionId/approve',
  requirePermission('study_materials.approve'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await StudyMaterialWorkflowService.approveRevision(
        p(req.params.revisionId),
        req.body.comment,
        req.user!.userId
      );
      return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
    } catch (err) {
      return handleError(res, err);
    }
  }
);

// Publish Revision
router.post(
  '/:studyMaterialId/locales/:language/revisions/:revisionId/publish',
  requirePermission('study_materials.publish'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = await StudyMaterialWorkflowService.publishRevision(p(req.params.revisionId), req.user!.userId);
      return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
    } catch (err) {
      return handleError(res, err);
    }
  }
);

// Clone Published Revision to New Draft
router.post(
  '/:studyMaterialId/locales/:language/revisions/:revisionId/clone',
  requirePermission('study_materials.create', 'study_materials.update'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const newDraft = await StudyMaterialWorkflowService.cloneNewRevision(p(req.params.revisionId), req.user!.userId);
      return res.status(201).json({ success: true, data: newDraft, timestamp: new Date().toISOString() });
    } catch (err) {
      return handleError(res, err);
    }
  }
);

// Internal Preview Endpoint
router.get(
  '/:studyMaterialId/locales/:language/revisions/:revisionId/preview',
  requirePermission('study_materials.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const revision = await prisma.studyMaterialLocaleRevision.findUnique({
        where: { id: p(req.params.revisionId) },
        include: {
          studyMaterialLocale: {
            include: { studyMaterial: { include: { taxonomyMappings: { include: { category: true, subcategory: true, topic: true } } } } },
          },
          reviewEvents: { orderBy: { createdAt: 'desc' } },
        },
      });

      if (!revision) throw new StudyMaterialError('Revision not found', 'STUDY_MATERIAL_REVISION_NOT_FOUND', 404);

      return res.json({
        success: true,
        data: {
          revision,
          studyMaterial: revision.studyMaterialLocale.studyMaterial,
          taxonomyPath: revision.studyMaterialLocale.studyMaterial.taxonomyMappings[0]
            ? `${revision.studyMaterialLocale.studyMaterial.taxonomyMappings[0].category.nameEn} > ${revision.studyMaterialLocale.studyMaterial.taxonomyMappings[0].subcategory.nameEn} > ${revision.studyMaterialLocale.studyMaterial.taxonomyMappings[0].topic.nameEn}`
            : 'Unassigned Taxonomy',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return handleError(res, err);
    }
  }
);

// Review Events Endpoint
router.get(
  '/:studyMaterialId/locales/:language/revisions/:revisionId/review-events',
  requirePermission('study_materials.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const events = await prisma.studyMaterialReviewEvent.findMany({
        where: { localeRevisionId: p(req.params.revisionId) },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ success: true, data: events, timestamp: new Date().toISOString() });
    } catch (err) {
      return handleError(res, err);
    }
  }
);

// Taxonomy Mappings
router.post('/:studyMaterialId/taxonomy-mappings', requirePermission('study_materials.update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await StudyMaterialService.addTaxonomyMapping(p(req.params.studyMaterialId), req.body, req.user!.userId);
    return res.status(201).json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.delete('/:studyMaterialId/taxonomy-mappings/:mappingId', requirePermission('study_materials.update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await StudyMaterialService.deleteTaxonomyMapping(p(req.params.studyMaterialId), p(req.params.mappingId), req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/:studyMaterialId/taxonomy-mappings/:mappingId/make-primary', requirePermission('study_materials.update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await StudyMaterialService.makePrimaryTaxonomyMapping(p(req.params.studyMaterialId), p(req.params.mappingId), req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// Archive & Restore
router.post('/:studyMaterialId/archive', requirePermission('study_materials.archive'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await StudyMaterialService.archiveStudyMaterial(p(req.params.studyMaterialId), req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/:studyMaterialId/restore', requirePermission('study_materials.archive'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await StudyMaterialService.restoreStudyMaterial(p(req.params.studyMaterialId), req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// Delete Draft
router.delete('/:studyMaterialId', requirePermission('study_materials.delete_draft'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await StudyMaterialService.deleteDraftStudyMaterial(p(req.params.studyMaterialId), req.user!.userId);
    return res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// Prompt 9 — Access Policy & Monetization Endpoints
router.get(
  '/:studyMaterialId/access-policy',
  requirePermission('study_materials.access.manage', 'study_materials.access.preview', 'study_materials.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { StudyMaterialAccessService } = await import('../services/study-material-access.service');
      const policy = await StudyMaterialAccessService.getAccessPolicy(p(req.params.studyMaterialId));
      return res.json({ success: true, data: policy, timestamp: new Date().toISOString() });
    } catch (err) {
      return handleError(res, err);
    }
  }
);

router.put(
  '/:studyMaterialId/access-policy',
  requirePermission('study_materials.access.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { StudyMaterialAccessService } = await import('../services/study-material-access.service');
      const updated = await StudyMaterialAccessService.updateAccessPolicy(
        p(req.params.studyMaterialId),
        req.body,
        req.user!.userId
      );
      return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
    } catch (err) {
      return handleError(res, err);
    }
  }
);

router.get(
  '/:studyMaterialId/access-preview',
  requirePermission('study_materials.access.preview', 'study_materials.access.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { StudyMaterialAccessService } = await import('../services/study-material-access.service');
      const previewMode = (req.query.mode as any) || 'ANONYMOUS_VISITOR';
      const language = (req.query.language as any) || 'en';

      const result = await StudyMaterialAccessService.resolveAccessAndContent({
        slugOrId: p(req.params.studyMaterialId),
        language,
        previewMode,
      });

      return res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err) {
      return handleError(res, err);
    }
  }
);

router.get(
  '/:studyMaterialId/locales/:language/revisions/:revisionId/preview-outline',
  requirePermission('study_materials.access.manage', 'study_materials.access.preview'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { StudyMaterialAccessService } = await import('../services/study-material-access.service');
      const outline = await StudyMaterialAccessService.getPreviewOutline(
        p(req.params.studyMaterialId),
        p(req.params.language) as 'en' | 'kn',
        p(req.params.revisionId)
      );
      return res.json({ success: true, data: outline, timestamp: new Date().toISOString() });
    } catch (err) {
      return handleError(res, err);
    }
  }
);

router.post(
  '/:studyMaterialId/access-policy/validate',
  requirePermission('study_materials.access.manage', 'study_materials.access.preview'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { StudyMaterialAccessService } = await import('../services/study-material-access.service');
      const { evaluateStudyMaterialAccessReadiness } = await import('@study-karnataka/validation');

      const policy = await StudyMaterialAccessService.getAccessPolicy(p(req.params.studyMaterialId));
      const material = await StudyMaterialService.getStudyMaterialById(p(req.params.studyMaterialId));

      const locales = [
        material.englishRevision ? { language: 'en', contentJson: material.englishRevision.contentJson, isCurrentPublished: true } : null,
        material.kannadaRevision ? { language: 'kn', contentJson: material.kannadaRevision.contentJson, isCurrentPublished: true } : null,
      ].filter(Boolean) as any[];

      const readiness = evaluateStudyMaterialAccessReadiness(
        policy.accessType as any,
        policy.previewConfigs || [],
        locales
      );

      return res.json({ success: true, data: readiness, timestamp: new Date().toISOString() });
    } catch (err) {
      return handleError(res, err);
    }
  }
);

export default router;
