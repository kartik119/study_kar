// @ts-nocheck
import { Router, Response } from 'express';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { AcademicTaxonomyService, TaxonomyError } from '../services/academic-taxonomy.service';

const router: Router = Router();

router.use(authenticateToken);

function p(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || '';
  return val || '';
}

function handleError(res: Response, err: any) {
  if (err instanceof TaxonomyError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
      timestamp: new Date().toISOString(),
    });
  }
  
  if (err?.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input data', details: err.errors },
      timestamp: new Date().toISOString(),
    });
  }

  console.error('Unhandled Taxonomy Error:', err instanceof Error ? err.stack : String(err));
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: err?.message || 'Taxonomy operation failed' },
    timestamp: new Date().toISOString(),
  });
}

// Tree view
router.get('/tree', requirePermission('academic_taxonomy.manage', 'study_materials.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filters = {
      search: req.query.search as string,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      categoryId: req.query.categoryId as string,
      moduleType: req.query.moduleType as string,
    };
    const tree = await AcademicTaxonomyService.getTaxonomyTree(filters);
    return res.json({ success: true, data: tree, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// Categories
router.get('/categories', requirePermission('academic_taxonomy.manage', 'study_materials.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await AcademicTaxonomyService.getCategories({
      search: req.query.search as string,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      moduleType: req.query.moduleType as string,
    });
    return res.json({ success: true, data: list, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/categories', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const created = await AcademicTaxonomyService.createCategory(req.body, req.user!.userId);
    return res.status(201).json({ success: true, data: created, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/categories/:categoryId', requirePermission('academic_taxonomy.manage', 'study_materials.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const cat = await AcademicTaxonomyService.getCategoryById(p(req.params.categoryId));
    return res.json({ success: true, data: cat, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.patch('/categories/:categoryId', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await AcademicTaxonomyService.updateCategory(p(req.params.categoryId), req.body, req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.delete('/categories/:categoryId', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await AcademicTaxonomyService.deleteCategory(p(req.params.categoryId), req.user!.userId);
    return res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/categories/reorder', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await AcademicTaxonomyService.reorderCategories(req.body.items, req.user!.userId);
    return res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/categories/:categoryId/activate', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await AcademicTaxonomyService.toggleCategoryActive(p(req.params.categoryId), true, req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/categories/:categoryId/deactivate', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await AcademicTaxonomyService.toggleCategoryActive(p(req.params.categoryId), false, req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// Subcategories
router.get('/subcategories', requirePermission('academic_taxonomy.manage', 'study_materials.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await AcademicTaxonomyService.getSubcategories(req.query.categoryId ? p(req.query.categoryId as any) : undefined, {
      search: req.query.search as string,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      moduleType: req.query.moduleType as string,
    });
    return res.json({ success: true, data: list, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/subcategories', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const created = await AcademicTaxonomyService.createSubcategory(req.body, req.user!.userId);
    return res.status(201).json({ success: true, data: created, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/subcategories/:subcategoryId', requirePermission('academic_taxonomy.manage', 'study_materials.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sub = await AcademicTaxonomyService.getSubcategoryById(p(req.params.subcategoryId));
    return res.json({ success: true, data: sub, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.patch('/subcategories/:subcategoryId', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await AcademicTaxonomyService.updateSubcategory(p(req.params.subcategoryId), req.body, req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/subcategories/:subcategoryId/move', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await AcademicTaxonomyService.moveSubcategory(
      p(req.params.subcategoryId),
      req.body.targetParentId,
      req.body.reason,
      req.user!.userId
    );
    return res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/subcategories/reorder', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await AcademicTaxonomyService.reorderSubcategories(req.body.items, req.user!.userId);
    return res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.delete('/subcategories/:subcategoryId', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await AcademicTaxonomyService.deleteSubcategory(p(req.params.subcategoryId), req.user!.userId);
    return res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/subcategories/:subcategoryId/activate', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await AcademicTaxonomyService.toggleSubcategoryActive(p(req.params.subcategoryId), true, req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/subcategories/:subcategoryId/deactivate', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await AcademicTaxonomyService.toggleSubcategoryActive(p(req.params.subcategoryId), false, req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// Topics
router.get('/topics', requirePermission('academic_taxonomy.manage', 'study_materials.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await AcademicTaxonomyService.getTopics(req.query.subcategoryId ? p(req.query.subcategoryId as any) : undefined, {
      search: req.query.search as string,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      moduleType: req.query.moduleType as string,
    });
    return res.json({ success: true, data: list, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/topics', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const created = await AcademicTaxonomyService.createTopic(req.body, req.user!.userId);
    return res.status(201).json({ success: true, data: created, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/topics/:topicId', requirePermission('academic_taxonomy.manage', 'study_materials.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const top = await AcademicTaxonomyService.getTopicById(p(req.params.topicId));
    return res.json({ success: true, data: top, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.patch('/topics/:topicId', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await AcademicTaxonomyService.updateTopic(p(req.params.topicId), req.body, req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/topics/:topicId/move', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await AcademicTaxonomyService.moveTopic(
      p(req.params.topicId),
      req.body.targetParentId,
      req.body.reason,
      req.user!.userId
    );
    return res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/topics/reorder', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await AcademicTaxonomyService.reorderTopics(req.body.items, req.user!.userId);
    return res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.delete('/topics/:topicId', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await AcademicTaxonomyService.deleteTopic(p(req.params.topicId), req.user!.userId);
    return res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/topics/:topicId/activate', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await AcademicTaxonomyService.toggleTopicActive(p(req.params.topicId), true, req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/topics/:topicId/deactivate', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await AcademicTaxonomyService.toggleTopicActive(p(req.params.topicId), false, req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// Knowledge Areas
router.get('/knowledge-areas', requirePermission('academic_taxonomy.manage', 'study_materials.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await AcademicTaxonomyService.getKnowledgeAreas(req.query.topicId ? p(req.query.topicId as any) : undefined, {
      search: req.query.search as string,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
    });
    return res.json({ success: true, data: list, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/knowledge-areas', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const created = await AcademicTaxonomyService.createKnowledgeArea(req.body, req.user!.userId);
    return res.status(201).json({ success: true, data: created, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/knowledge-areas/:knowledgeAreaId', requirePermission('academic_taxonomy.manage', 'study_materials.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ka = await AcademicTaxonomyService.getKnowledgeAreaById(p(req.params.knowledgeAreaId));
    return res.json({ success: true, data: ka, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.patch('/knowledge-areas/:knowledgeAreaId', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await AcademicTaxonomyService.updateKnowledgeArea(p(req.params.knowledgeAreaId), req.body, req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/knowledge-areas/:knowledgeAreaId/move', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await AcademicTaxonomyService.moveKnowledgeArea(
      p(req.params.knowledgeAreaId),
      req.body.targetParentId,
      req.body.reason,
      req.user!.userId
    );
    return res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/knowledge-areas/reorder', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await AcademicTaxonomyService.reorderKnowledgeAreas(req.body.items, req.user!.userId);
    return res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.delete('/knowledge-areas/:knowledgeAreaId', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await AcademicTaxonomyService.deleteKnowledgeArea(p(req.params.knowledgeAreaId), req.user!.userId);
    return res.json({ success: true, data: result, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/knowledge-areas/:knowledgeAreaId/activate', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await AcademicTaxonomyService.toggleKnowledgeAreaActive(p(req.params.knowledgeAreaId), true, req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/knowledge-areas/:knowledgeAreaId/deactivate', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await AcademicTaxonomyService.toggleKnowledgeAreaActive(p(req.params.knowledgeAreaId), false, req.user!.userId);
    return res.json({ success: true, data: updated, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

export default router;
