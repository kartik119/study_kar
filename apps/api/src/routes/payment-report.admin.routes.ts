import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { PaymentReportService } from '../services/payment-report.service';

export const paymentReportAdminRouter = Router();

// Protect all report endpoints
paymentReportAdminRouter.use(authenticateToken);

/**
 * GET /summary - Comprehensive Payment Report
 */
paymentReportAdminRouter.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await PaymentReportService.getPaymentReport(req.query as any);
    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET / - Alias for /summary
 */
paymentReportAdminRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await PaymentReportService.getPaymentReport(req.query as any);
    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /filters - Filter dropdown options (Exams, Modules, Plans, Statuses, Methods)
 */
paymentReportAdminRouter.get('/filters', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const options = await PaymentReportService.getFilterOptions();
    res.json({
      success: true,
      data: options,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /export - Export CSV report
 */
paymentReportAdminRouter.get('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const csvData = await PaymentReportService.exportReportCSV(req.query as any);
    const fileName = `study-karnataka-payment-report-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csvData);
  } catch (err) {
    next(err);
  }
});
