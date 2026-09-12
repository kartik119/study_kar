import { Router, Request, Response, NextFunction } from 'express';
import { SaveRankedAnswerSchema } from '@study-karnataka/validation';
import { RankedTestService, RankedTestServiceError } from '../services/ranked-test.service';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

const getParamId = (idParam: string | string[]): string => {
  return Array.isArray(idParam) ? idParam[0] : idParam;
};

/**
 * GET /api/v1/student/ranked-tests
 * List available Ranked Tests for authenticated student
 */
router.get(
  '/',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = (req as any).user?.userId;
      if (!studentId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
        return;
      }

      const data = await RankedTestService.getStudentRankedTests(studentId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/student/ranked-tests/:id/start
 * Start or Resume Ranked Test Attempt (Transactional & Concurrency Safe)
 */
router.post(
  '/:id/start',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rankedTestId = getParamId(req.params.id);
      const studentId = (req as any).user?.userId;
      if (!studentId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
        return;
      }

      const data = await RankedTestService.startOrResumeAttempt(rankedTestId, studentId);
      res.json({ success: true, data });
    } catch (err) {
      if (err instanceof RankedTestServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'RANKED_ATTEMPT_ERROR', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * GET /api/v1/student/ranked-tests/attempts/:attemptId/questions
 * Get frozen snapshot questions (NO correct answers or explanations leaked)
 */
router.get(
  '/attempts/:attemptId/questions',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const attemptId = getParamId(req.params.attemptId);
      const studentId = (req as any).user?.userId;
      if (!studentId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
        return;
      }

      const data = await RankedTestService.getAttemptQuestions(attemptId, studentId);
      res.json({ success: true, data });
    } catch (err) {
      if (err instanceof RankedTestServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'RANKED_ATTEMPT_ERROR', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * POST /api/v1/student/ranked-tests/attempts/:attemptId/answer
 * Idempotent Answer Autosave
 */
router.post(
  '/attempts/:attemptId/answer',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const attemptId = getParamId(req.params.attemptId);
      const studentId = (req as any).user?.userId;
      if (!studentId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
        return;
      }

      const validated = SaveRankedAnswerSchema.parse(req.body);
      const data = await RankedTestService.saveAnswer(attemptId, studentId, validated);
      res.json({ success: true, data });
    } catch (err: any) {
      if (err instanceof RankedTestServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'RANKED_AUTOSAVE_ERROR', message: err.message },
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

/**
 * POST /api/v1/student/ranked-tests/attempts/:attemptId/submit
 * Manual Final Submit
 */
router.post(
  '/attempts/:attemptId/submit',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const attemptId = getParamId(req.params.attemptId);
      const studentId = (req as any).user?.userId;
      if (!studentId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
        return;
      }

      const data = await RankedTestService.submitAttempt(attemptId, studentId);
      res.json({ success: true, data });
    } catch (err) {
      if (err instanceof RankedTestServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'RANKED_SUBMIT_ERROR', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * GET /api/v1/student/ranked-tests/:id/result
 * Get My Result
 */
router.get(
  '/:id/result',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rankedTestId = getParamId(req.params.id);
      const studentId = (req as any).user?.userId;
      if (!studentId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
        return;
      }

      const data = await RankedTestService.getStudentResult(rankedTestId, studentId);
      res.json({ success: true, data });
    } catch (err) {
      if (err instanceof RankedTestServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'RANKED_RESULT_ERROR', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * GET /api/v1/student/ranked-tests/:id/leaderboard
 * Get Privacy-Safe Leaderboard & My Rank
 */
router.get(
  '/:id/leaderboard',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rankedTestId = getParamId(req.params.id);
      const studentId = (req as any).user?.userId;
      if (!studentId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
        return;
      }

      const { page, pageSize } = req.query;
      const result = await RankedTestService.getLeaderboard(rankedTestId, studentId, {
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      });

      res.json({
        success: true,
        data: result.entries,
        myRank: result.myRank,
        meta: result.pagination,
      });
    } catch (err) {
      if (err instanceof RankedTestServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'LEADERBOARD_ERROR', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

/**
 * GET /api/v1/student/ranked-tests/:id/solutions
 * Solution Review (Only available AFTER result publication if policy permits)
 */
router.get(
  '/:id/solutions',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rankedTestId = getParamId(req.params.id);
      const studentId = (req as any).user?.userId;
      if (!studentId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
        return;
      }

      const data = await RankedTestService.getSolutionReview(rankedTestId, studentId);
      res.json({ success: true, data });
    } catch (err) {
      if (err instanceof RankedTestServiceError) {
        res.status(err.status).json({
          success: false,
          error: { code: 'SOLUTION_REVIEW_ERROR', message: err.message },
        });
        return;
      }
      next(err);
    }
  }
);

export default router;
