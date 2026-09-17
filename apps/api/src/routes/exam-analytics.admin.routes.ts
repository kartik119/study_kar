// @ts-nocheck
import { Router, Response } from 'express';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import { examAnalyticsFiltersSchema } from '@study-karnataka/validation';
import { ExamAnalyticsService } from '../services/exam-analytics.service';

export const examAnalyticsAdminRoutes: Router = Router();

/**
 * GET /api/v1/admin/exam-analytics/overview
 */
examAnalyticsAdminRoutes.get(
  '/admin/exam-analytics/overview',
  authenticateToken,
  requirePermission('exams.analytics.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = examAnalyticsFiltersSchema.safeParse(req.query);
      if (!parseResult.success) {
        res.status(400).json(sendError('EXAM_ANALYTICS_INVALID_FILTER', 'Invalid query filters', parseResult.error.flatten()));
        return;
      }
      const overview = await ExamAnalyticsService.getPortfolioOverview(parseResult.data as any);
      res.status(200).json(sendSuccess(overview, 'Portfolio analytics overview retrieved successfully'));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json(sendError(error.code || 'EXAM_ANALYTICS_FAILED', error.message || 'Failed to calculate portfolio analytics overview'));
    }
  }
);

/**
 * GET /api/v1/admin/exam-analytics/readiness
 */
examAnalyticsAdminRoutes.get(
  '/admin/exam-analytics/readiness',
  authenticateToken,
  requirePermission('exams.analytics.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = examAnalyticsFiltersSchema.safeParse(req.query);
      if (!parseResult.success) {
        res.status(400).json(sendError('EXAM_ANALYTICS_INVALID_FILTER', 'Invalid query filters', parseResult.error.flatten()));
        return;
      }
      const result = await ExamAnalyticsService.getReadinessList(parseResult.data as any);
      res.status(200).json(sendSuccess(result.data, 'Exam readiness list retrieved successfully', result.meta as any));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json(sendError(error.code || 'EXAM_ANALYTICS_FAILED', error.message || 'Failed to retrieve exam readiness list'));
    }
  }
);

/**
 * GET /api/v1/admin/exam-analytics/workflow
 */
examAnalyticsAdminRoutes.get(
  '/admin/exam-analytics/workflow',
  authenticateToken,
  requirePermission('exams.analytics.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = examAnalyticsFiltersSchema.safeParse(req.query);
      if (!parseResult.success) {
        res.status(400).json(sendError('EXAM_ANALYTICS_INVALID_FILTER', 'Invalid query filters', parseResult.error.flatten()));
        return;
      }
      const queues = await ExamAnalyticsService.getWorkflowQueues(parseResult.data as any);
      res.status(200).json(sendSuccess(queues, 'Workflow queues retrieved successfully'));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json(sendError(error.code || 'EXAM_ANALYTICS_FAILED', error.message || 'Failed to retrieve workflow queues'));
    }
  }
);

/**
 * GET /api/v1/admin/exam-analytics/important-dates
 */
examAnalyticsAdminRoutes.get(
  '/admin/exam-analytics/important-dates',
  authenticateToken,
  requirePermission('exams.analytics.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = examAnalyticsFiltersSchema.safeParse(req.query);
      if (!parseResult.success) {
        res.status(400).json(sendError('EXAM_ANALYTICS_INVALID_FILTER', 'Invalid query filters', parseResult.error.flatten()));
        return;
      }
      const analytics = await ExamAnalyticsService.getImportantDatesAnalytics(parseResult.data as any);
      res.status(200).json(sendSuccess(analytics, 'Important dates analytics retrieved successfully'));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json(sendError(error.code || 'EXAM_ANALYTICS_FAILED', error.message || 'Failed to retrieve important dates analytics'));
    }
  }
);

/**
 * GET /api/v1/admin/exam-analytics/stale
 */
examAnalyticsAdminRoutes.get(
  '/admin/exam-analytics/stale',
  authenticateToken,
  requirePermission('exams.analytics.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = examAnalyticsFiltersSchema.safeParse(req.query);
      if (!parseResult.success) {
        res.status(400).json(sendError('EXAM_ANALYTICS_INVALID_FILTER', 'Invalid query filters', parseResult.error.flatten()));
        return;
      }
      const items = await ExamAnalyticsService.getStaleWorkItems(parseResult.data as any);
      res.status(200).json(sendSuccess(items, 'Stale work items retrieved successfully'));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json(sendError(error.code || 'EXAM_ANALYTICS_FAILED', error.message || 'Failed to retrieve stale work items'));
    }
  }
);

/**
 * GET /api/v1/admin/exam-analytics/exams/:examId
 */
examAnalyticsAdminRoutes.get(
  '/admin/exam-analytics/exams/:examId',
  authenticateToken,
  requirePermission('exams.analytics.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const examId = req.params.examId as string;
      const detail = await ExamAnalyticsService.getPerExamReadinessDetail(examId);
      res.status(200).json(sendSuccess(detail, 'Per-exam readiness detail retrieved successfully'));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json(sendError(error.code || 'EXAM_ANALYTICS_FAILED', error.message || 'Failed to retrieve per-exam readiness detail'));
    }
  }
);

/**
 * GET /api/v1/admin/exam-analytics/exams/:examId/issues
 */
examAnalyticsAdminRoutes.get(
  '/admin/exam-analytics/exams/:examId/issues',
  authenticateToken,
  requirePermission('exams.analytics.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const examId = req.params.examId as string;
      const { category, severity, blocking } = req.query;
      const filters: any = {};
      if (typeof category === 'string') filters.category = category;
      if (typeof severity === 'string') filters.severity = severity;
      if (typeof blocking === 'string') filters.blocking = blocking === 'true';

      const issues = await ExamAnalyticsService.getPerExamIssues(examId, filters);
      res.status(200).json(sendSuccess(issues, 'Per-exam issues retrieved successfully'));
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json(sendError(error.code || 'EXAM_ANALYTICS_FAILED', error.message || 'Failed to retrieve per-exam readiness issues'));
    }
  }
);
