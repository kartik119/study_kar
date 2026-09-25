import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { TransactionAdminService } from '../services/transaction.admin.service';

const router: Router = Router();

router.use(authenticateToken);

function handleRouteError(res: Response, err: any) {
  console.error('[TransactionAdminRoutes Error]:', err);
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

// GET /api/v1/admin/transactions/metrics
router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = await TransactionAdminService.getMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/transactions/export
router.get('/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const csvContent = await TransactionAdminService.exportTransactions(req.query as any);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=study-karnataka-transactions-${Date.now()}.csv`
    );
    res.send(csvContent);
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/transactions
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await TransactionAdminService.getTransactions(req.query as any);
    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/transactions/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const transaction = await TransactionAdminService.getTransactionById(req.params.id);
    res.json({
      success: true,
      data: transaction,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

export default router;
