// @ts-nocheck
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@study-karnataka/database';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { TestCreationService, TestCreationServiceError } from '../services/test-creation.service';
import {
  CreateTestSchema,
  UpdateTestSchema,
  AvailabilityCheckSchema,
  ManualQuestionSelectionSchema,
  ReplaceQuestionSchema,
  ReorderQuestionsSchema,
} from '@study-karnataka/validation';

const getParamId = (param: any): string => (Array.isArray(param) ? param[0] : String(param));

const router: Router = Router();

router.use(authenticateToken);

function p(val: any): string | undefined {
  if (Array.isArray(val)) return val[0];
  return val !== undefined && val !== null ? String(val) : undefined;
}

/**
 * GET /api/v1/admin/mcq-library/tests/next-code
 */
router.get(
  '/next-code',
  requirePermission('tests.view'),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await TestCreationService.getNextTestCodePreview();
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
 * GET /api/v1/admin/mcq-library/tests/eligible-questions
 */
router.get(
  '/eligible-questions',
  requirePermission('tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await TestCreationService.searchEligibleQuestions({
        search: p(req.query.search),
        categoryId: p(req.query.categoryId),
        subcategoryId: p(req.query.subcategoryId),
        topicId: p(req.query.topicId),
        knowledgeAreaId: p(req.query.knowledgeAreaId),
        difficulty: p(req.query.difficulty),
        isPyq: req.query.isPyq !== undefined ? req.query.isPyq === 'true' : undefined,
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
 * POST /api/v1/admin/mcq-library/tests/availability-check
 */
router.post(
  '/availability-check',
  requirePermission('tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = AvailabilityCheckSchema.parse(req.body);
      const result = await TestCreationService.checkAvailability(parsed as any);
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestCreationServiceError) {
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
 * GET /api/v1/admin/mcq-library/tests
 */
router.get(
  '/',
  requirePermission('tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await TestCreationService.getTests({
        search: p(req.query.search),
        examCycleId: p(req.query.examCycleId),
        selectionMode: p(req.query.selectionMode) as any,
        status: p(req.query.status) as any,
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
 * POST /api/v1/admin/mcq-library/tests
 */
router.post(
  '/',
  requirePermission('tests.create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateTestSchema.parse(req.body);
      const test = await TestCreationService.createTest(parsed, (req as any).user?.userId);
      res.status(201).json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      if (err instanceof TestCreationServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: err.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      if ((err as any)?.name === 'ZodError') {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: (err as any).errors?.[0]?.message || 'Validation error', details: (err as any).errors },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * GET /api/v1/admin/mcq-library/tests/:id
 */
router.get(
  '/:id',
  requirePermission('tests.view'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const test = await TestCreationService.getTestById(getParamId(req.params.id));
      res.json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestCreationServiceError) {
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
 * PUT /api/v1/admin/mcq-library/tests/:id
 */
router.put(
  '/:id',
  requirePermission('tests.edit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = UpdateTestSchema.parse(req.body);
      const test = await TestCreationService.updateTest(getParamId(req.params.id), parsed, (req as any).user?.userId);
      res.json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestCreationServiceError) {
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
 * POST /api/v1/admin/mcq-library/tests/:id/manual-selection
 */
router.post(
  '/:id/manual-selection',
  requirePermission('tests.edit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { questionIds } = ManualQuestionSelectionSchema.parse(req.body);
      const test = await TestCreationService.saveManualSelection(getParamId(req.params.id), questionIds);
      res.json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestCreationServiceError) {
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
 * POST /api/v1/admin/mcq-library/tests/:id/questions (Legacy route)
 */
router.post(
  '/:id/questions',
  requirePermission('tests.edit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const mockTestId = getParamId(req.params.id);
      const { questionIds } = req.body;
      const qIds = questionIds || [];
      for (let i = 0; i < qIds.length; i++) {
        await prisma.mockTestQuestion.upsert({
          where: { mockTestId_questionId: { mockTestId, questionId: qIds[i] } },
          update: { displayOrder: i + 1 },
          create: { mockTestId, questionId: qIds[i], displayOrder: i + 1 },
        });
      }
      res.json({
        success: true,
        data: { count: qIds.length },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/tests/:id/auto-generate
 */
router.post(
  '/:id/auto-generate',
  requirePermission('tests.edit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const seed = req.body?.seed ? String(req.body.seed) : undefined;
      const test = await TestCreationService.generateAutomaticSelection(getParamId(req.params.id), seed);
      res.json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      if (err instanceof TestCreationServiceError) {
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
 * POST /api/v1/admin/mcq-library/tests/:id/replace-question
 */
router.post(
  '/:id/replace-question',
  requirePermission('tests.edit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldQuestionId, newQuestionId } = ReplaceQuestionSchema.parse(req.body);
      const test = await TestCreationService.replaceQuestion(getParamId(req.params.id), oldQuestionId, newQuestionId);
      res.json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestCreationServiceError) {
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
 * POST /api/v1/admin/mcq-library/tests/:id/reorder
 */
router.post(
  '/:id/reorder',
  requirePermission('tests.edit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { questionOrder } = ReorderQuestionsSchema.parse(req.body);
      const test = await TestCreationService.reorderQuestions(getParamId(req.params.id), questionOrder);
      res.json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestCreationServiceError) {
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
 * POST /api/v1/admin/mcq-library/tests/:id/submit-review
 */
router.post(
  '/:id/submit-review',
  requirePermission('tests.submit_review'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const test = await TestCreationService.submitForReview(getParamId(req.params.id), (req as any).user?.userId);
      res.json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestCreationServiceError) {
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
 * POST /api/v1/admin/mcq-library/tests/:id/request-changes
 */
router.post(
  '/:id/request-changes',
  requirePermission('tests.review'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rejectionReason = req.body?.rejectionReason;
      const test = await TestCreationService.requestChanges(getParamId(req.params.id), rejectionReason, (req as any).user?.userId);
      res.json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestCreationServiceError) {
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
 * POST /api/v1/admin/mcq-library/tests/:id/approve
 */
router.post(
  '/:id/approve',
  requirePermission('tests.approve'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const test = await TestCreationService.approveTest(getParamId(req.params.id), (req as any).user?.userId);
      res.json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestCreationServiceError) {
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
 * POST /api/v1/admin/mcq-library/tests/:id/publish
 */
router.post(
  '/:id/publish',
  requirePermission('tests.publish'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const test = await TestCreationService.publishTest(getParamId(req.params.id), (req as any).user?.userId);
      res.json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestCreationServiceError) {
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
 * POST /api/v1/admin/mcq-library/tests/:id/reopen
 */
router.post(
  '/:id/reopen',
  requirePermission('tests.edit'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParamId(req.params.id);
      const adminUserId = (req as any).user?.id;
      const test = await TestCreationService.reopenTest(id, adminUserId);
      res.status(200).json({ success: true, data: test });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/admin/mcq-library/tests/:id/archive
 */
router.post(
  '/:id/archive',
  requirePermission('tests.archive'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const test = await TestCreationService.archiveTest(getParamId(req.params.id), (req as any).user?.userId);
      res.json({
        success: true,
        data: test,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestCreationServiceError) {
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
 * DELETE /api/v1/admin/mcq-library/tests/:id
 */
router.delete(
  '/:id',
  requirePermission('tests.archive'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await TestCreationService.deleteTest(getParamId(req.params.id), (req as any).user?.userId);
      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof TestCreationServiceError) {
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
