import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { StudentSubscriptionService } from '../services/student-subscription.service';

const router: Router = Router();

// Middleware: Authenticate all admin requests
router.use(authenticateToken);

function handleRouteError(res: Response, err: any) {
  console.error('[StudentSubscriptionRoutes Error]:', err);
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

const createSubscriptionSchema = z.object({
  studentId: z.string().min(1, 'Student selection is required'),
  planId: z.string().min(1, 'Plan selection is required'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  overrideExpiry: z.boolean().optional(),
  overrideReason: z.string().optional(),
  assignmentSource: z.enum([
    'PAID_PURCHASE',
    'ADMIN_GRANT',
    'FREE_PLAN',
    'PROMOTION',
    'MIGRATION',
    'COMPENSATION',
  ]).optional(),
  paymentStatus: z.enum([
    'PAID',
    'PENDING',
    'NOT_REQUIRED',
    'FAILED',
    'REFUNDED',
    'PARTIALLY_REFUNDED',
  ]).optional(),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional(),
  amount: z.number().min(0).optional(),
  currency: z.string().optional(),
  autoRenew: z.boolean().optional(),
  adminNotes: z.string().optional(),
  allowOverlap: z.boolean().optional(),
});

const renewSubscriptionSchema = z.object({
  durationValue: z.number().int().min(1).optional(),
  durationUnit: z.enum(['DAYS', 'WEEKS', 'MONTHS', 'YEARS']).optional(),
  amount: z.number().min(0).optional(),
  paymentStatus: z.string().optional(),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional(),
  reason: z.string().optional(),
});

const changePlanSchema = z.object({
  newPlanId: z.string().min(1, 'New plan is required'),
  recalculateExpiry: z.boolean().optional(),
  reason: z.string().min(1, 'Reason for changing plan is required'),
});

const pauseSubscriptionSchema = z.object({
  reason: z.string().min(1, 'Reason for pausing subscription is required'),
  resumeDate: z.string().optional(),
});

const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().optional(),
  reason: z.string().min(1, 'Reason for cancellation is required'),
});

// GET /api/v1/admin/subscriptions/student-subscriptions/metrics
router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = await StudentSubscriptionService.getMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/subscriptions/student-subscriptions/export
router.get('/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const csvContent = await StudentSubscriptionService.exportSubscriptions(req.query as any);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=study-karnataka-student-subscriptions-${Date.now()}.csv`
    );
    res.send(csvContent);
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/subscriptions/student-subscriptions/students-search
router.get('/students-search', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const students = await StudentSubscriptionService.searchStudents(query);
    res.json({
      success: true,
      data: students,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/subscriptions/student-subscriptions/plans-options
router.get('/plans-options', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plans = await StudentSubscriptionService.getPlansForSelection();
    res.json({
      success: true,
      data: plans,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/v1/admin/subscriptions/student-subscriptions/process-expirations
router.post('/process-expirations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await StudentSubscriptionService.processExpirations();
    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/subscriptions/student-subscriptions
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await StudentSubscriptionService.getSubscriptions(req.query as any);
    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/subscriptions/student-subscriptions/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const subscription = await StudentSubscriptionService.getSubscriptionById((req.params.id as string));
    res.json({
      success: true,
      data: subscription,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/v1/admin/subscriptions/student-subscriptions
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = createSubscriptionSchema.parse(req.body);
    const created = await StudentSubscriptionService.createSubscription(
      validated as any,
      req.user?.userId,
      'Admin'
    );
    res.status(201).json({
      success: true,
      data: created,
      message: 'Student subscription created successfully',
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/v1/admin/subscriptions/student-subscriptions/:id/renew
router.post('/:id/renew', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = renewSubscriptionSchema.parse(req.body);
    const updated = await StudentSubscriptionService.renewSubscription(
      (req.params.id as string),
      validated as any,
      req.user?.userId,
      'Admin'
    );
    res.json({
      success: true,
      data: updated,
      message: 'Subscription renewed successfully',
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/v1/admin/subscriptions/student-subscriptions/:id/change-plan
router.post('/:id/change-plan', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = changePlanSchema.parse(req.body);
    const updated = await StudentSubscriptionService.changePlan(
      (req.params.id as string),
      validated as any,
      req.user?.userId,
      'Admin'
    );
    res.json({
      success: true,
      data: updated,
      message: 'Subscription plan changed successfully',
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/v1/admin/subscriptions/student-subscriptions/:id/pause
router.post('/:id/pause', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = pauseSubscriptionSchema.parse(req.body);
    const updated = await StudentSubscriptionService.pauseSubscription(
      (req.params.id as string),
      validated as any,
      req.user?.userId,
      'Admin'
    );
    res.json({
      success: true,
      data: updated,
      message: 'Subscription paused successfully',
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/v1/admin/subscriptions/student-subscriptions/:id/resume
router.post('/:id/resume', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await StudentSubscriptionService.resumeSubscription(
      (req.params.id as string),
      req.user?.userId,
      'Admin'
    );
    res.json({
      success: true,
      data: updated,
      message: 'Subscription resumed successfully',
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/v1/admin/subscriptions/student-subscriptions/:id/cancel
router.post('/:id/cancel', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validated = cancelSubscriptionSchema.parse(req.body);
    const updated = await StudentSubscriptionService.cancelSubscription(
      (req.params.id as string),
      validated as any,
      req.user?.userId,
      'Admin'
    );
    res.json({
      success: true,
      data: updated,
      message: validated.immediate === false 
        ? 'Subscription cancellation scheduled at end of period'
        : 'Subscription cancelled successfully',
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

export default router;

