import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { PlanService } from '../services/plan.service';

const router: Router = Router();

// Middleware: Authenticate all admin requests
router.use(authenticateToken);

function handleRouteError(res: Response, err: any) {
  console.error('[PlanRoutes Error]:', err);
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

const createPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  code: z.string().optional(),
  moduleId: z.string().min(1, 'Module selection is required'),
  description: z.string().optional(),
  planType: z.enum(['FREE', 'FREEMIUM', 'PAID']),
  price: z.number().min(0, 'Price must be non-negative'),
  currency: z.string().optional().default('INR'),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'ONE_TIME', 'CUSTOM']),
  durationValue: z.number().int().min(1, 'Duration value must be at least 1'),
  durationUnit: z.enum(['DAYS', 'WEEKS', 'MONTHS', 'YEARS']),
  trialEnabled: z.boolean().optional(),
  trialDuration: z.number().int().nullable().optional(),
  trialDurationUnit: z.enum(['DAYS', 'WEEKS', 'MONTHS', 'YEARS']).nullable().optional(),
  autoRenewEligible: z.boolean().optional(),
  benefits: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
  displayOrder: z.number().int().optional(),
  publishDate: z.string().nullable().optional(),
});

const updatePlanSchema = createPlanSchema.partial();

const statusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']),
});

const managePricingSchema = z.object({
  price: z.number().min(0, 'Price must be non-negative'),
  currency: z.string().optional(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'ONE_TIME', 'CUSTOM']),
  durationValue: z.number().int().min(1, 'Duration value must be at least 1'),
  durationUnit: z.enum(['DAYS', 'WEEKS', 'MONTHS', 'YEARS']),
});

// GET /api/v1/admin/subscriptions/plans/metrics
router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = await PlanService.getPlanMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/subscriptions/plans/export
router.get('/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const csvContent = await PlanService.exportPlans(req.query as any);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=study-karnataka-plans-${Date.now()}.csv`
    );
    res.send(csvContent);
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/subscriptions/plans
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await PlanService.getPlans(req.query as any);
    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/subscriptions/plans/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = await PlanService.getPlanById(req.params.id as string);
    res.json({
      success: true,
      data: plan,
    });
  } catch (err: any) {
    if (err.message === 'Plan not found') {
      return res.status(404).json({
        success: false,
        error: { message: 'Plan not found' },
      });
    }
    handleRouteError(res, err);
  }
});

// POST /api/v1/admin/subscriptions/plans
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = createPlanSchema.parse(req.body);
    const created = await PlanService.createPlan(validatedData as any, req.user?.userId);
    res.status(201).json({
      success: true,
      data: created,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// PUT /api/v1/admin/subscriptions/plans/:id
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = updatePlanSchema.parse(req.body);
    const updated = await PlanService.updatePlan(
      req.params.id as string,
      validatedData as any,
      req.user?.userId
    );
    res.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// PATCH /api/v1/admin/subscriptions/plans/:id/status
router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const updated = await PlanService.updateStatus(
      req.params.id as string,
      status as any,
      req.user?.userId
    );
    res.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// PATCH /api/v1/admin/subscriptions/plans/:id/pricing
router.patch('/:id/pricing', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = managePricingSchema.parse(req.body);
    const updated = await PlanService.managePricing(
      req.params.id as string,
      validated as any,
      req.user?.userId
    );
    res.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/v1/admin/subscriptions/plans/:id/duplicate
router.post('/:id/duplicate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const duplicated = await PlanService.duplicatePlan(
      req.params.id as string,
      req.user?.userId
    );
    res.status(201).json({
      success: true,
      data: duplicated,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// DELETE /api/v1/admin/subscriptions/plans/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await PlanService.deletePlan(req.params.id as string, req.user?.userId);
    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

export default router;
