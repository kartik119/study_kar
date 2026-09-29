import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

import {
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignmentStatus,
  getKpis
} from '../controllers/admin/work-assignment.controller';

const router: any = Router();

router.use(authenticateToken as any);

// Define permissions when implemented, e.g. checkPermission(['team.work_assignments.view'])
router.get('/', getAssignments);
router.get('/kpi', getKpis);
router.get('/:id', getAssignmentById);
router.post('/', createAssignment);
router.patch('/:id/status', updateAssignmentStatus);

export default router;
