// @ts-nocheck
import { Router, Response } from 'express';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { CurrentAffairsService, CurrentAffairsError } from '../services/current-affairs.service';
import { CurrentAffairsPdfService } from '../services/current-affairs-pdf.service';
import { CurrentAffairsQuizService } from '../services/current-affairs-quiz.service';
import { CurrentAffairsTrendingTopicService } from '../services/current-affairs-trending.service';

const router: Router = Router();
router.use(authenticateToken);

function handleError(res: Response, err: any) {
  if (err instanceof CurrentAffairsError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
      timestamp: new Date().toISOString(),
    });
  }
  console.error('Unhandled Current Affairs Error:', err);
  return res.status(400).json({
    success: false,
    error: { code: 'CURRENT_AFFAIRS_ERROR', message: err.message || 'Operation failed' },
    timestamp: new Date().toISOString(),
  });
}

// Calendar API
router.get('/calendar', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const data = await CurrentAffairsService.getCalendar(year, month);
    return res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// Supporting APIs for dropdowns
router.get('/categories', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await CurrentAffairsService.getCategories();
    return res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/categories', requirePermission('current_affairs.create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await CurrentAffairsService.createCategory(req.body);
    return res.status(201).json({ success: true, data: item, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.delete('/categories/:id', requirePermission('current_affairs.delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await CurrentAffairsService.deleteCategory(req.params.id);
    return res.json({ success: true, data: item, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/sources', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await CurrentAffairsService.getSources();
    return res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/sources', requirePermission('current_affairs.create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await CurrentAffairsService.createSource(req.body);
    return res.status(201).json({ success: true, data: item, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.delete('/sources/:id', requirePermission('current_affairs.delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await CurrentAffairsService.deleteSource(req.params.id);
    return res.json({ success: true, data: item, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/tags', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await CurrentAffairsService.getTags();
    return res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// Main CRUD
router.get('/', requirePermission('current_affairs.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const filters = {
      search: req.query.search as string,
      categoryId: req.query.categoryId as string,
      sourceId: req.query.sourceId as string,
      status: req.query.status as any,
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 20,
    };
    const result = await CurrentAffairsService.listCurrentAffairs(filters);
    return res.json({ success: true, data: result.items, meta: result.meta, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/:id', requirePermission('current_affairs.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await CurrentAffairsService.getById(req.params.id);
    return res.json({ success: true, data: item, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/', requirePermission('current_affairs.create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await CurrentAffairsService.create(req.body, req.user!.userId);
    return res.status(201).json({ success: true, data: item, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.patch('/:id', requirePermission('current_affairs.edit'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await CurrentAffairsService.update(req.params.id, req.body, req.user!.userId);
    return res.json({ success: true, data: item, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.delete('/:id', requirePermission('current_affairs.delete'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await CurrentAffairsService.softDelete(req.params.id, req.user!.userId);
    return res.json({ success: true, data: item, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/:id/publish', requirePermission('current_affairs.publish'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await CurrentAffairsService.publish(req.params.id, req.user!.userId);
    return res.json({ success: true, data: item, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/:id/duplicate', requirePermission('current_affairs.create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await CurrentAffairsService.duplicate(req.params.id, req.user!.userId);
    return res.status(201).json({ success: true, data: item, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// PDFs
router.get('/pdfs', requirePermission('current_affairs.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await CurrentAffairsPdfService.listPdfs(req.query);
    return res.json({ success: true, data: result.items, meta: result.meta, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/pdfs', requirePermission('current_affairs.create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await CurrentAffairsPdfService.create(req.body, req.user!.userId);
    return res.status(201).json({ success: true, data: item, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// Trending Topics
router.get('/trending-topics', requirePermission('current_affairs.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await CurrentAffairsTrendingTopicService.listTopics();
    return res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/trending-topics', requirePermission('current_affairs.create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await CurrentAffairsTrendingTopicService.create(req.body);
    return res.status(201).json({ success: true, data: item, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

// Quizzes
router.get('/quizzes', requirePermission('current_affairs.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await CurrentAffairsQuizService.listQuizzes(req.query);
    return res.json({ success: true, data: result.items, meta: result.meta, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/quizzes', requirePermission('current_affairs.create'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = await CurrentAffairsQuizService.create(req.body, req.user!.userId);
    return res.status(201).json({ success: true, data: item, timestamp: new Date().toISOString() });
  } catch (err) {
    return handleError(res, err);
  }
});

export const currentAffairsAdminRoutes = router;
