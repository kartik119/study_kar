import { Router, Response } from 'express';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { StudentPerformanceService } from '../services/student-performance.service';
import { sendSuccess, sendError } from '../utils/response';

const router: Router = Router();

// Require Admin Authentication
router.use(authenticateToken);

/**
 * GET /api/v1/admin/performance/overview
 * Platform-wide performance analytics overview (Requires student_performance.view or performance_analytics.view)
 */
router.get('/overview', requirePermission('student_performance.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user?.userId || '';
    const overview = await StudentPerformanceService.getAdminPerformanceAnalytics(adminId);
    res.status(200).json(sendSuccess(overview));
  } catch (error: any) {
    res.status(500).json(sendError('FETCH_ADMIN_PERFORMANCE_FAILED', error.message));
  }
});

/**
 * POST /api/v1/admin/performance/reconcile-student
 * Rebuild student performance projections (Requires performance_analytics.rebuild)
 */
router.post('/reconcile-student', requirePermission('performance_analytics.rebuild'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      res.status(400).json(sendError('BAD_REQUEST', 'studentId is required'));
      return;
    }

    await StudentPerformanceService.reconcileStudentPerformance(studentId);
    res.status(200).json(sendSuccess({ message: `Successfully reconciled performance for student ${studentId}` }));
  } catch (error: any) {
    res.status(500).json(sendError('RECONCILE_FAILED', error.message));
  }
});

export default router;
