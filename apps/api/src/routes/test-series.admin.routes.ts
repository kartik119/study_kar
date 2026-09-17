// @ts-nocheck
import { Router, Request, Response, NextFunction } from 'express';
import {
  CreateTestSeriesSchema,
  UpdateTestSeriesSchema,
  ReorderTestSeriesTestsSchema,
  RequestSeriesChangesSchema,
} from '@study-karnataka/validation';
import { TestSeriesService, TestSeriesServiceError } from '../services/test-series.service';
import { requirePermission } from '../middleware/auth';

const router: Router = Router();

const getParamId = (idParam: string | string[]): string => {
  return Array.isArray(idParam) ? idParam[0] : idParam;
};

const p = (val: any): string | undefined => {
  if (typeof val === 'string') return val;
  if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
  return undefined;
};

/**
 * GET /api/v1/admin/mcq-library/test-series/next-code
 * READ-ONLY sequence code preview. Does NOT mutate database.
 */
router.get(
  '/next-code',
  requirePermission('test_series.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await TestSeriesService.getNextSeriesCodePreview();
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/mcq-library/test-series/eligible-tests
 * Search candidate tests for Test Series Picker
 */
router.get(
  '/eligible-tests',
  requirePermission('test_series.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const examProgrammeId = p(req.query.examProgrammeId);
      if (!examProgrammeId) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'examProgrammeId is required to search eligible tests' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await TestSeriesService.searchEligibleTestsForSeries({
        examProgrammeId,
        seriesId: p(req.query.seriesId),
        search: p(req.query.search),
        status: p(req.query.status),
        page: req.query.page ? parseInt(p(req.query.page)!, 10) : undefined,
        pageSize: req.query.pageSize ? parseInt(p(req.query.pageSize)!, 10) : undefined,
      });

      res.json({
        success: true,
        data: result.items,
        meta: result.pagination,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/mcq-library/test-series
 */
router.get(
  '/',
  requirePermission('test_series.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await TestSeriesService.getTestSeriesList({
        search: p(req.query.search),
        examProgrammeId: p(req.query.examProgrammeId),
        status: p(req.query.status) as any,
        accessClassification: p(req.query.accessClassification) as any,
        releaseMode: p(req.query.releaseMode) as any,
        questionReusePolicy: p(req.query.questionReusePolicy) as any,
        page: req.query.page ? parseInt(p(req.query.page)!, 10) : undefined,
        pageSize: req.query.pageSize ? parseInt(p(req.query.pageSize)!, 10) : undefined,
      });

      res.json({
        success: true,
        data: result.items,
        meta: result.pagination,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/mcq-library/test-series/:id
 */
router.get(
  '/:id',
  requirePermission('test_series.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const series = await TestSeriesService.getTestSeriesById(getParamId(req.params.id));
      res.json({
        success: true,
        data: series,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestSeriesServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'NOT_FOUND', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/test-series
 */
router.post(
  '/',
  requirePermission('test_series.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateTestSeriesSchema.parse(req.body);
      const series = await TestSeriesService.createTestSeries(parsed, (req as any).user?.userId);
      res.status(201).json({
        success: true,
        data: series,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      if (err instanceof TestSeriesServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: err.message, details: err.details },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      if ((err as any)?.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: (err as any).errors?.[0]?.message || 'Validation error',
            details: (err as any).errors,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/mcq-library/test-series/:id
 */
router.patch(
  '/:id',
  requirePermission('test_series.edit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = UpdateTestSeriesSchema.parse(req.body);
      const series = await TestSeriesService.updateTestSeries(
        getParamId(req.params.id),
        parsed,
        (req as any).user?.userId
      );
      res.json({
        success: true,
        data: series,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      if (err instanceof TestSeriesServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: err.message, details: err.details },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/test-series/:id/reorder
 */
router.post(
  '/:id/reorder',
  requirePermission('test_series.edit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = ReorderTestSeriesTestsSchema.parse(req.body);
      const series = await TestSeriesService.reorderSeriesTests(getParamId(req.params.id), parsed.items);
      res.json({
        success: true,
        data: series,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      if (err instanceof TestSeriesServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/test-series/:id/submit-review
 */
router.post(
  '/:id/submit-review',
  requirePermission('test_series.submit_review'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const series = await TestSeriesService.submitForReview(getParamId(req.params.id), (req as any).user?.userId);
      res.json({
        success: true,
        data: series,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestSeriesServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: err.message, details: err.details },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/test-series/:id/request-changes
 */
router.post(
  '/:id/request-changes',
  requirePermission('test_series.review'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = RequestSeriesChangesSchema.parse(req.body);
      const series = await TestSeriesService.requestChanges(
        getParamId(req.params.id),
        parsed.rejectionReason,
        (req as any).user?.userId
      );
      res.json({
        success: true,
        data: series,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestSeriesServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/test-series/:id/approve
 */
router.post(
  '/:id/approve',
  requirePermission('test_series.approve'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const series = await TestSeriesService.approveTestSeries(getParamId(req.params.id), (req as any).user?.userId);
      res.json({
        success: true,
        data: series,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestSeriesServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: err.message, details: err.details },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/test-series/:id/publish
 */
router.post(
  '/:id/publish',
  requirePermission('test_series.publish'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const series = await TestSeriesService.publishTestSeries(getParamId(req.params.id), (req as any).user?.userId);
      res.json({
        success: true,
        data: series,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestSeriesServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: err.message, details: err.details },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/test-series/:id/archive
 */
router.post(
  '/:id/archive',
  requirePermission('test_series.archive'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const series = await TestSeriesService.archiveTestSeries(getParamId(req.params.id), (req as any).user?.userId);
      res.json({
        success: true,
        data: series,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestSeriesServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

  /**
   * POST /api/v1/admin/mcq-library/test-series/:id/reopen
   */
  router.post(
    '/:id/reopen',
    requirePermission('test_series.edit'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const series = await TestSeriesService.reopenTestSeries(getParamId(req.params.id), (req as any).user?.userId);
        res.json({
          success: true,
          data: series,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        if (err instanceof TestSeriesServiceError) {
          res.status(err.status).json({
            success: false,
            error: { code: 'BAD_REQUEST', message: err.message },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        next(err);
      }
    }
  );

  /**
   * DELETE /api/v1/admin/mcq-library/test-series/:id
   */
  router.delete(
    '/:id',
    requirePermission('test_series.delete'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await TestSeriesService.deleteTestSeries(getParamId(req.params.id));
        res.json({
          success: true,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        if (err instanceof TestSeriesServiceError) {
          res.status(err.status).json({
            success: false,
            error: { code: 'BAD_REQUEST', message: err.message },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        next(err);
      }
    }
  );

export default router;
