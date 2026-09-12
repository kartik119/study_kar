import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { StudentPerformanceService } from '../services/student-performance.service';
import { sendSuccess, sendError } from '../utils/response';
import { PerformanceTimeframe } from '@study-karnataka/shared-types';

const router: Router = Router();

// Require Student Authentication for all routes
router.use(authenticateToken);

function getStudentId(req: AuthenticatedRequest): string {
  if (!req.user?.userId) {
    throw new Error('Unauthenticated student user');
  }
  return req.user.userId;
}

function getParamId(req: AuthenticatedRequest): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

/**
 * GET /api/v1/student/performance/overview
 * Overview stats (total answered, accuracy, ranked vs practice split, timeframe filter)
 */
router.get('/performance/overview', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const timeframe = (req.query.timeframe as PerformanceTimeframe) || '30D';
    const sourceType = (req.query.sourceType as string) || 'ALL';

    const result = await StudentPerformanceService.getPerformanceOverview(studentId, { timeframe, sourceType });
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    res.status(500).json(sendError('FETCH_OVERVIEW_FAILED', error.message));
  }
});

/**
 * GET /api/v1/student/performance/categories
 * Performance by Category
 */
router.get('/performance/categories', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const result = await StudentPerformanceService.getTaxonomyPerformance(studentId, 'CATEGORY');
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    res.status(500).json(sendError('FETCH_CATEGORIES_FAILED', error.message));
  }
});

/**
 * GET /api/v1/student/performance/categories/:id
 * Category drilldown (Subcategory performance)
 */
router.get('/performance/categories/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const categoryId = getParamId(req);
    const subcategories = await StudentPerformanceService.getTaxonomyPerformance(studentId, 'SUBCATEGORY', categoryId);
    res.status(200).json(sendSuccess(subcategories));
  } catch (error: any) {
    res.status(500).json(sendError('FETCH_CATEGORY_DETAIL_FAILED', error.message));
  }
});

/**
 * GET /api/v1/student/performance/weak-areas
 * Personal Weak Areas (NEEDS_REVIEW) ordered by priority score
 */
router.get('/performance/weak-areas', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const result = await StudentPerformanceService.getWeakAreas(studentId);
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    res.status(500).json(sendError('FETCH_WEAK_AREAS_FAILED', error.message));
  }
});

/**
 * GET /api/v1/student/performance/strong-areas
 * Personal Strong Areas
 */
router.get('/performance/strong-areas', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const result = await StudentPerformanceService.getStrongAreas(studentId);
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    res.status(500).json(sendError('FETCH_STRONG_AREAS_FAILED', error.message));
  }
});

/**
 * GET /api/v1/student/performance/questions/frequently-wrong
 * MCQs answered incorrectly multiple times
 */
router.get('/performance/questions/frequently-wrong', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const result = await StudentPerformanceService.getFrequentlyWrongQuestions(studentId);
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    res.status(500).json(sendError('FETCH_FREQUENTLY_WRONG_FAILED', error.message));
  }
});

/**
 * GET /api/v1/student/performance/recommendations
 * Deterministic practice recommendations with content availability validation
 */
router.get('/performance/recommendations', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const result = await StudentPerformanceService.getPerformanceRecommendations(studentId);
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    res.status(500).json(sendError('FETCH_RECOMMENDATIONS_FAILED', error.message));
  }
});

/**
 * GET /api/v1/student/results
 * Unified discovery history (Ranked Tests + Practice Sessions)
 */
router.get('/results', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const sourceType = (req.query.sourceType as string) || 'ALL';
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);

    const result = await StudentPerformanceService.getUnifiedResults(studentId, { sourceType, page, pageSize });
    res.status(200).json(sendSuccess(result.results, 'Fetched unified results', { total: result.total, page: result.page, totalPages: result.totalPages }));
  } catch (error: any) {
    res.status(500).json(sendError('FETCH_RESULTS_FAILED', error.message));
  }
});

export default router;
