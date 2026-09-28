import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { RazorpayAdminService } from '../services/razorpay.admin.service';

export const razorpayAdminRouter: import('express').Router = Router();

// Protect all admin razorpay endpoints
razorpayAdminRouter.use(authenticateToken);

// -----------------------------------------------------------------------------
// ADMIN PROTECTED ROUTES
// -----------------------------------------------------------------------------

/**
 * GET /metrics - Fetch KPI cards data
 */
razorpayAdminRouter.get(
  '/metrics',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await RazorpayAdminService.getMetrics();
      res.json({
        success: true,
        data: metrics,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /configuration - Fetch Razorpay configuration (secrets masked)
 */
razorpayAdminRouter.get(
  '/configuration',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const environment = req.query.environment as 'TEST' | 'LIVE' | undefined;
      const config = await RazorpayAdminService.getConfiguration(environment);
      res.json({
        success: true,
        data: config,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /configuration - Save/update Razorpay configuration
 */
razorpayAdminRouter.get(
  '/config',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const environment = req.query.environment as 'TEST' | 'LIVE' | undefined;
      const config = await RazorpayAdminService.getConfiguration(environment);
      res.json({
        success: true,
        data: config,
      });
    } catch (err) {
      next(err);
    }
  }
);

razorpayAdminRouter.post(
  '/configuration',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = {
        id: (req as any).user?.userId || (req as any).user?.id || 'admin',
        name: (req as any).user?.fullName || (req as any).user?.accountType || 'Admin',
      };
      const updated = await RazorpayAdminService.saveConfiguration(req.body, actor);
      res.json({
        success: true,
        data: updated,
        message: 'Razorpay configuration saved successfully',
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /environment/switch - Switch environment (TEST <-> LIVE)
 */
razorpayAdminRouter.post(
  '/environment/switch',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { environment } = req.body;
      if (!environment || !['TEST', 'LIVE'].includes(environment)) {
        res.status(400).json({ success: false, message: 'Valid environment (TEST or LIVE) is required' });
        return;
      }
      const actor = {
        id: (req as any).user?.userId || (req as any).user?.id || 'admin',
        name: (req as any).user?.fullName || (req as any).user?.accountType || 'Admin',
      };
      await RazorpayAdminService.switchEnvironment(environment, actor);
      const config = await RazorpayAdminService.getConfiguration(environment);
      res.json({
        success: true,
        data: config,
        message: `Successfully switched to ${environment} mode`,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /connection/test - Test credentials connection
 */
razorpayAdminRouter.post(
  '/connection/test',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { environment = 'TEST' } = req.body;
      const actor = {
        id: (req as any).user?.userId || (req as any).user?.id || 'admin',
        name: (req as any).user?.fullName || (req as any).user?.accountType || 'Admin',
      };
      const result = await RazorpayAdminService.testConnection(environment, actor);
      res.json({
        success: result.success,
        data: result,
        message: result.success ? 'Razorpay connection test succeeded' : result.error || 'Connection failed',
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Connection test failed',
      });
    }
  }
);

/**
 * GET /webhooks/logs - Recent webhook logs
 */
razorpayAdminRouter.get(
  '/webhooks/logs',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const logs = await RazorpayAdminService.getWebhookLogs(limit);
      res.json({
        success: true,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /test-payment - Create test payment (sandbox only)
 */
razorpayAdminRouter.post(
  '/test-payment',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const amount = req.body.amount ? Number(req.body.amount) : 1;
      const result = await RazorpayAdminService.createTestPayment(amount, (req as any).user?.userId);
      res.json({
        success: true,
        data: result,
        message: 'Test payment created successfully in sandbox mode',
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }
);

// -----------------------------------------------------------------------------
// PUBLIC WEBHOOK ROUTE (Razorpay calls this directly)
// -----------------------------------------------------------------------------

export const razorpayWebhookRouter: import('express').Router = Router();

razorpayWebhookRouter.post('/', async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  if (!signature) {
    res.status(400).json({ success: false, message: 'Missing Razorpay signature header' });
    return;
  }

  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const result = await RazorpayAdminService.handleWebhook(rawBody, signature);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});
