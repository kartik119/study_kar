import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { SubscriptionModuleService } from '../services/subscription-module.service';

const router: Router = Router();

// Middleware: Authenticate all admin requests
router.use(authenticateToken);

function handleRouteError(res: Response, err: any) {
  console.error('[SubscriptionModuleRoutes Error]:', err);
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: err.errors,
      },
    });
  }
  return res.status(400).json({
    success: false,
    error: {
      message: err.message || 'Operation failed',
    },
  });
}

const createModuleSchema = z.object({
  name: z.string().min(1, 'Module name is required'),
  code: z.string().optional(),
  description: z.string().optional(),
  examId: z.string().nullable().optional(),
  scopeType: z.enum(['ENTIRE_EXAM', 'SELECTED_FEATURES', 'GLOBAL']),
  moduleType: z.enum([
    'FULL_EXAM',
    'MCQ',
    'STUDY_MATERIALS',
    'MOCK_TESTS',
    'CURRENT_AFFAIRS',
    'QUICK_REVISION',
    'STUDY_PLANS',
    'TEST_SERIES',
    'CUSTOM_BUNDLE',
  ]),
  accessType: z.enum(['FREE', 'FREEMIUM', 'PAID']),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  iconUrl: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  features: z.array(z.string()).optional(),
  displayOrder: z.number().optional(),
  publishDate: z.string().nullable().optional(),
  entitlements: z
    .array(
      z.object({
        featureKey: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        stageId: z.string().nullable().optional(),
        paperId: z.string().nullable().optional(),
        subjectId: z.string().nullable().optional(),
      })
    )
    .min(1, 'At least one feature entitlement is required'),
});

const updateModuleSchema = createModuleSchema.partial();

/**
 * GET /api/v1/admin/subscriptions/modules/metrics
 * Returns 4 KPI summary cards (Total, Active, Paid, Students Enrolled)
 */
router.get('/metrics', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = await SubscriptionModuleService.getModuleMetrics();
    return res.json({ success: true, data: metrics });
  } catch (err) {
    return handleRouteError(res, err);
  }
});

/**
 * GET /api/v1/admin/subscriptions/modules/export
 * Downloads filtered module catalog as CSV
 */
router.get('/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const csvContent = await SubscriptionModuleService.exportModules(req.query as any);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=modules_export_${Date.now()}.csv`);
    return res.status(200).send(csvContent);
  } catch (err) {
    return handleRouteError(res, err);
  }
});

/**
 * GET /api/v1/admin/subscriptions/modules
 * List modules with filters, search, and pagination
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await SubscriptionModuleService.getModules(req.query as any);
    return res.json({ success: true, data: result.items, pagination: result.pagination });
  } catch (err) {
    return handleRouteError(res, err);
  }
});

/**
 * GET /api/v1/admin/subscriptions/modules/:id
 * Retrieve module details by ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const mod = await SubscriptionModuleService.getModuleById(req.params.id as string);
    if (!mod) {
      return res.status(404).json({ success: false, error: { message: 'Module not found' } });
    }
    return res.json({ success: true, data: mod });
  } catch (err) {
    return handleRouteError(res, err);
  }
});

/**
 * POST /api/v1/admin/subscriptions/modules
 * Create a new module (FREE, FREEMIUM, or PAID)
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = createModuleSchema.parse(req.body);
    const created = await SubscriptionModuleService.createModule(validatedData as any, req.user?.userId);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    return handleRouteError(res, err);
  }
});

/**
 * PUT /api/v1/admin/subscriptions/modules/:id
 * Update module information
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = updateModuleSchema.parse(req.body);
    const updated = await SubscriptionModuleService.updateModule(
      req.params.id as string,
      validatedData as any,
      req.user?.userId
    );
    return res.json({ success: true, data: updated });
  } catch (err) {
    return handleRouteError(res, err);
  }
});

/**
 * PATCH /api/v1/admin/subscriptions/modules/:id/status
 * Update module status (ACTIVE, INACTIVE, DRAFT, ARCHIVED)
 */
router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
    }
    const updated = await SubscriptionModuleService.updateStatus(
      req.params.id as string,
      status,
      req.user?.userId
    );
    return res.json({ success: true, data: updated });
  } catch (err) {
    return handleRouteError(res, err);
  }
});

/**
 * PATCH /api/v1/admin/subscriptions/modules/:id/archive
 * Archive module
 */
router.patch('/:id/archive', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await SubscriptionModuleService.updateStatus(
      req.params.id as string,
      'ARCHIVED',
      req.user?.userId
    );
    return res.json({ success: true, data: updated });
  } catch (err) {
    return handleRouteError(res, err);
  }
});

/**
 * DELETE /api/v1/admin/subscriptions/modules/:id
 * Permanently delete draft module
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await SubscriptionModuleService.deleteModule(req.params.id as string);
    return res.json({ success: true, message: 'Module deleted successfully' });
  } catch (err) {
    return handleRouteError(res, err);
  }
});

export default router;
