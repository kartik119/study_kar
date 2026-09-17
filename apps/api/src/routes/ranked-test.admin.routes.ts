// @ts-nocheck
import { Router, Request, Response, NextFunction } from 'express';
import {
  CreateRankedTestSchema,
  InvalidateAttemptSchema,
} from '@study-karnataka/validation';
import { RankedTestService, RankedTestServiceError } from '../services/ranked-test.service';
import { requirePermission } from '../middleware/auth';

const router: Router = Router();

const getParamId = (idParam: string | string[]): string => {
  return Array.isArray(idParam) ? idParam[0] : idParam;
};

/**
 * GET /api/v1/admin/mcq-library/ranked-tests/next-code
 * Preview next sequence code (Read-only)
 */
router.get(
  '/next-code',
  requirePermission('ranked_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await RankedTestService.getNextRankedCodePreview();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/mcq-library/ranked-tests
 * List Ranked Tests
 */
router.get(
  '/',
  requirePermission('ranked_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, mode, status, examCycleId, page, pageSize } = req.query;
      const result = await RankedTestService.getRankedTestList({
        search: search as string,
        mode: mode as string,
        status: status as string,
        examCycleId: examCycleId as string,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      });

      res.json({
        success: true,
        data: result.items,
        meta: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/mcq-library/ranked-tests/:id
 * Get single Ranked Test detail
 */
router.get(
  '/:id',
  requirePermission('ranked_tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParamId(req.params.id);
      const data = await RankedTestService.getRankedTestById(id);
      res.json({ success: true, data });
    } catch (err) {
      if (err instanceof RankedTestServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'RANKED_TEST_ERROR', message: err.message, details: err.details },
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/ranked-tests
 * Create Ranked Test Config
 */
router.post(
  '/',
  requirePermission('ranked_tests.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = CreateRankedTestSchema.parse(req.body);
      const adminUserId = (req as any).user?.userId;
      const data = await RankedTestService.createRankedTest(validated, adminUserId);
      res.status(201).json({ success: true, data });
    } catch (err: any) {
      if (err instanceof RankedTestServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'RANKED_TEST_ERROR', message: err.message, details: err.details },
        });
        return;
      }
      if (err.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message || 'Validation failed', details: err.errors },
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/ranked-tests/:id/activate
 * Activate Ranked Test
 */
router.post(
  '/:id/activate',
  requirePermission('ranked_tests.activate'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParamId(req.params.id);
      const adminUserId = (req as any).user?.userId;
      const data = await RankedTestService.activateRankedTest(id, adminUserId);
      res.json({ success: true, data });
    } catch (err) {
      if (err instanceof RankedTestServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'RANKED_TEST_ERROR', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/ranked-tests/:id/close
 * Close Ranked Test
 */
router.post(
  '/:id/close',
  requirePermission('ranked_tests.close'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParamId(req.params.id);
      const adminUserId = (req as any).user?.userId;
      const data = await RankedTestService.closeRankedTest(id, adminUserId);
      res.json({ success: true, data });
    } catch (err) {
      if (err instanceof RankedTestServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'RANKED_TEST_ERROR', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/ranked-tests/:id/generate-rankings
 * Generate Competition Rankings
 */
router.post(
  '/:id/generate-rankings',
  requirePermission('ranked_tests.results.generate'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParamId(req.params.id);
      const adminUserId = (req as any).user?.userId;
      const data = await RankedTestService.generateRankings(id, adminUserId);
      res.json({ success: true, data });
    } catch (err) {
      if (err instanceof RankedTestServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'RANKED_TEST_ERROR', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/ranked-tests/:id/publish-results
 * Publish Results
 */
router.post(
  '/:id/publish-results',
  requirePermission('ranked_tests.results.publish'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParamId(req.params.id);
      const adminUserId = (req as any).user?.userId;
      const data = await RankedTestService.publishResults(id, adminUserId);
      res.json({ success: true, data });
    } catch (err) {
      if (err instanceof RankedTestServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'RANKED_TEST_ERROR', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/ranked-tests/attempts/:attemptId/invalidate
 * Invalidate Student Attempt
 */
router.post(
  '/attempts/:attemptId/invalidate',
  requirePermission('ranked_tests.attempts.invalidate'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const attemptId = getParamId(req.params.attemptId);
      const validated = InvalidateAttemptSchema.parse(req.body);
      const adminUserId = (req as any).user?.userId;
      const data = await RankedTestService.invalidateAttempt(attemptId, validated, adminUserId);
      res.json({ success: true, data });
    } catch (err: any) {
      if (err instanceof RankedTestServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'RANKED_TEST_ERROR', message: err.message },
        });
        return;
      }
      if (err.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message || 'Validation failed' },
        });
        return;
      }
      next(err);
    }
  }
);

export default router;
