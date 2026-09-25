import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { InvoiceAdminService } from '../services/invoice.admin.service';

const router: Router = Router();

router.use(authenticateToken);

function handleRouteError(res: Response, err: any) {
  console.error('[InvoiceAdminRoutes Error]:', err);
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

// GET /api/v1/admin/subscriptions/invoices/metrics
router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = await InvoiceAdminService.getMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/subscriptions/invoices/export
router.get('/export', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const csvContent = await InvoiceAdminService.exportInvoices(req.query as any);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=study-karnataka-invoices-${Date.now()}.csv`
    );
    res.send(csvContent);
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/v1/admin/subscriptions/invoices/generate-from-transaction
router.post('/generate-from-transaction', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { transactionId } = req.body;
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: { message: 'transactionId is required' },
      });
    }
    const invoice = await InvoiceAdminService.createInvoiceForTransaction(transactionId);
    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice generated successfully',
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/subscriptions/invoices/:id/pdf
router.get('/:id/pdf', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pdfBuffer = await InvoiceAdminService.generateInvoicePdfBuffer(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${req.params.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// POST /api/v1/admin/subscriptions/invoices/:id/regenerate-pdf
router.post('/:id/regenerate-pdf', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pdfBuffer = await InvoiceAdminService.generateInvoicePdfBuffer(req.params.id);
    res.json({
      success: true,
      message: 'PDF regenerated successfully',
      data: {
        pdfSize: pdfBuffer.length,
        regeneratedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/subscriptions/invoices/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const invoice = await InvoiceAdminService.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { message: 'Invoice not found' },
      });
    }
    res.json({
      success: true,
      data: invoice,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

// GET /api/v1/admin/subscriptions/invoices
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await InvoiceAdminService.getInvoices(req.query as any);
    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    handleRouteError(res, err);
  }
});

export default router;
