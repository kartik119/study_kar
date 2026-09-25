import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { RefundAdminService } from '../services/refund.admin.service';

const router: Router = Router();

router.use(authenticateToken);

function handleRouteError(res: Response, err: any) {
  console.error('[RefundAdminRoutes Error]:', err);
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

// GET /api/v1/admin/subscriptions/refunds/metrics
router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = await RefundAdminService.getMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/subscriptions/refunds/export
router.get('/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const csvContent = await RefundAdminService.exportRefunds(req.query as any);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=study-karnataka-refunds-${Date.now()}.csv`
    );
    res.send(csvContent);
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/subscriptions/refunds/refundable-amount/:transactionId
router.get('/refundable-amount/:transactionId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = await RefundAdminService.calculateRemainingRefundableAmount(req.params.transactionId);
    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/v1/admin/subscriptions/refunds (Request a refund)
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = req.user ? { id: req.user.userId, name: req.user.email || 'Admin' } : undefined;
    const refund = await RefundAdminService.requestRefund(req.body, actor);
    res.status(201).json({
      success: true,
      data: refund,
      message: 'Refund request created successfully',
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/v1/admin/subscriptions/refunds/:id/approve
router.post('/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = { id: req.user?.userId || 'admin', name: req.user?.email || 'Admin' };
    const refund = await RefundAdminService.approveRefund(req.params.id, actor);
    res.json({
      success: true,
      data: refund,
      message: 'Refund approved successfully',
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/v1/admin/subscriptions/refunds/:id/reject
router.post('/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { rejectionReason, internalNotes } = req.body;
    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Rejection reason is mandatory to reject a refund request' },
      });
    }
    const actor = { id: req.user?.userId || 'admin', name: req.user?.email || 'Admin' };
    const refund = await RefundAdminService.rejectRefund(
      req.params.id,
      rejectionReason,
      internalNotes,
      actor
    );
    res.json({
      success: true,
      data: refund,
      message: 'Refund request rejected',
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/v1/admin/subscriptions/refunds/:id/process
router.post('/:id/process', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const actor = { id: req.user?.userId || 'admin', name: req.user?.email || 'Admin' };
    const refund = await RefundAdminService.processRefund(req.params.id, actor, req.body);
    res.json({
      success: true,
      data: refund,
      message: 'Refund processed successfully',
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/subscriptions/refunds/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const refund = await RefundAdminService.getRefundById(req.params.id);
    if (!refund) {
      return res.status(404).json({
        success: false,
        error: { message: 'Refund not found' },
      });
    }
    res.json({
      success: true,
      data: refund,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/subscriptions/refunds
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await RefundAdminService.getRefunds(req.query as any);
    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

export default router;
