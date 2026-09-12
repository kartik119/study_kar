import { Router, Response } from 'express';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/response';
import {
  createExamSyllabusSchema,
  updateExamSyllabusSchema,
  createExamSyllabusNodeSchema,
  updateExamSyllabusNodeSchema,
  moveNodeSchema,
  reorderNodesSchema,
  deleteSubtreeSchema,
  cloneSyllabusRevisionSchema,
} from '@study-karnataka/validation';
import {
  fetchSyllabi,
  fetchSyllabusById,
  createSyllabus,
  updateSyllabus,
  deleteDraftSyllabus,
  cloneSyllabusRevision,
  fetchSyllabusNodes,
  createSyllabusNode,
  updateSyllabusNode,
  moveSyllabusNode,
  reorderSyllabusNodes,
  deleteSyllabusNode,
  deleteSubtreeNodes,
  setNodeActiveState,
  validateSyllabusTree,
  calculateSyllabusSummary,
  triggerSyllabusWorkflow,
} from '../services/exam-syllabus.service';

export const examSyllabusAdminRoutes: Router = Router();

examSyllabusAdminRoutes.use('/admin', authenticateToken);

function getParam(req: AuthenticatedRequest, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val || '';
}

// -----------------------------------------------------------------------------
// SYLLABUS REVISION ENDPOINTS
// -----------------------------------------------------------------------------

// List all syllabus revisions for an exam cycle
examSyllabusAdminRoutes.get(
  '/admin/exams/:examId/syllabi',
  requirePermission('exams.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await fetchSyllabi(getParam(req, 'examId'));
      res.json(sendSuccess(data));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Get single syllabus details with tree validation and summary
examSyllabusAdminRoutes.get(
  '/admin/exams/:examId/syllabi/:syllabusId',
  requirePermission('exams.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await fetchSyllabusById(getParam(req, 'examId'), getParam(req, 'syllabusId'));
      res.json(sendSuccess(data));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Get tree validation
examSyllabusAdminRoutes.get(
  '/admin/exams/:examId/syllabi/:syllabusId/validate',
  requirePermission('exams.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await validateSyllabusTree(getParam(req, 'syllabusId'));
      res.json(sendSuccess(data));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Get syllabus summary
examSyllabusAdminRoutes.get(
  '/admin/exams/:examId/syllabi/:syllabusId/summary',
  requirePermission('exams.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await calculateSyllabusSummary(getParam(req, 'syllabusId'));
      res.json(sendSuccess(data));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Create initial draft syllabus revision
examSyllabusAdminRoutes.post(
  '/admin/exams/:examId/syllabi',
  requirePermission('exams.syllabus.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = createExamSyllabusSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(sendError('VALIDATION_ERROR', parseResult.error.message, parseResult.error.errors));
        return;
      }

      const data = await createSyllabus(getParam(req, 'examId'), parseResult.data, req.user?.userId);
      res.status(201).json(sendSuccess(data, 'Exam syllabus revision created successfully'));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Update draft syllabus metadata
examSyllabusAdminRoutes.patch(
  '/admin/exams/:examId/syllabi/:syllabusId',
  requirePermission('exams.syllabus.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = updateExamSyllabusSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(sendError('VALIDATION_ERROR', parseResult.error.message, parseResult.error.errors));
        return;
      }

      const data = await updateSyllabus(getParam(req, 'examId'), getParam(req, 'syllabusId'), parseResult.data, req.user?.userId);
      res.json(sendSuccess(data, 'Exam syllabus revision updated successfully'));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Delete draft syllabus
examSyllabusAdminRoutes.delete(
  '/admin/exams/:examId/syllabi/:syllabusId',
  requirePermission('exams.syllabus.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await deleteDraftSyllabus(getParam(req, 'examId'), getParam(req, 'syllabusId'), req.user?.userId);
      res.json(sendSuccess(data, 'Draft syllabus revision deleted successfully'));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Clone syllabus revision into next DRAFT revision
examSyllabusAdminRoutes.post(
  '/admin/exams/:examId/syllabi/:syllabusId/clone-revision',
  requirePermission('exams.syllabus.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = cloneSyllabusRevisionSchema.safeParse(req.body || {});
      if (!parseResult.success) {
        res.status(400).json(sendError('VALIDATION_ERROR', parseResult.error.message, parseResult.error.errors));
        return;
      }

      const data = await cloneSyllabusRevision(
        getParam(req, 'examId'),
        getParam(req, 'syllabusId'),
        parseResult.data.targetPatternId || undefined,
        req.user?.userId
      );
      res.status(201).json(sendSuccess(data, 'Syllabus revision cloned successfully'));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Workflow Action: Submit for Review
examSyllabusAdminRoutes.post(
  '/admin/exams/:examId/syllabi/:syllabusId/submit-review',
  requirePermission('exams.submit_review'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await triggerSyllabusWorkflow(getParam(req, 'examId'), getParam(req, 'syllabusId'), 'submit-review', req.user?.userId);
      res.json(sendSuccess(data, 'Syllabus submitted for review'));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message, error.details));
    }
  }
);

// Workflow Action: Request Changes
examSyllabusAdminRoutes.post(
  '/admin/exams/:examId/syllabi/:syllabusId/request-changes',
  requirePermission('exams.review'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await triggerSyllabusWorkflow(getParam(req, 'examId'), getParam(req, 'syllabusId'), 'request-changes', req.user?.userId);
      res.json(sendSuccess(data, 'Changes requested for syllabus revision'));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Workflow Action: Approve
examSyllabusAdminRoutes.post(
  '/admin/exams/:examId/syllabi/:syllabusId/approve',
  requirePermission('exams.approve'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await triggerSyllabusWorkflow(getParam(req, 'examId'), getParam(req, 'syllabusId'), 'approve', req.user?.userId);
      res.json(sendSuccess(data, 'Syllabus revision approved successfully'));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Workflow Action: Publish
examSyllabusAdminRoutes.post(
  '/admin/exams/:examId/syllabi/:syllabusId/publish',
  requirePermission('exams.publish'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await triggerSyllabusWorkflow(getParam(req, 'examId'), getParam(req, 'syllabusId'), 'publish', req.user?.userId);
      res.json(sendSuccess(data, 'Syllabus revision published successfully'));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// -----------------------------------------------------------------------------
// SYLLABUS NODE ENDPOINTS
// -----------------------------------------------------------------------------

// Fetch all nodes for a syllabus
examSyllabusAdminRoutes.get(
  '/admin/syllabi/:syllabusId/nodes',
  requirePermission('exams.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await fetchSyllabusNodes(getParam(req, 'syllabusId'));
      res.json(sendSuccess(data));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Create a new syllabus node
examSyllabusAdminRoutes.post(
  '/admin/syllabi/:syllabusId/nodes',
  requirePermission('exams.syllabus.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = createExamSyllabusNodeSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(sendError('VALIDATION_ERROR', parseResult.error.message, parseResult.error.errors));
        return;
      }

      const data = await createSyllabusNode(getParam(req, 'syllabusId'), parseResult.data, req.user?.userId);
      res.status(201).json(sendSuccess(data, 'Syllabus node created successfully'));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Update a syllabus node
examSyllabusAdminRoutes.patch(
  '/admin/syllabi/:syllabusId/nodes/:nodeId',
  requirePermission('exams.syllabus.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = updateExamSyllabusNodeSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(sendError('VALIDATION_ERROR', parseResult.error.message, parseResult.error.errors));
        return;
      }

      const data = await updateSyllabusNode(getParam(req, 'syllabusId'), getParam(req, 'nodeId'), parseResult.data, req.user?.userId);
      res.json(sendSuccess(data, 'Syllabus node updated successfully'));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Move a node to another parent
examSyllabusAdminRoutes.post(
  '/admin/syllabi/:syllabusId/nodes/:nodeId/move',
  requirePermission('exams.syllabus.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = moveNodeSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(sendError('VALIDATION_ERROR', parseResult.error.message, parseResult.error.errors));
        return;
      }

      const data = await moveSyllabusNode(
        getParam(req, 'syllabusId'),
        getParam(req, 'nodeId'),
        parseResult.data.targetParentId,
        parseResult.data.displayOrder,
        req.user?.userId
      );
      res.json(sendSuccess(data, 'Syllabus node moved successfully'));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Reorder nodes
examSyllabusAdminRoutes.post(
  '/admin/syllabi/:syllabusId/nodes/reorder',
  requirePermission('exams.syllabus.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = reorderNodesSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(sendError('VALIDATION_ERROR', parseResult.error.message, parseResult.error.errors));
        return;
      }

      const data = await reorderSyllabusNodes(getParam(req, 'syllabusId'), parseResult.data.orderedIds, req.user?.userId);
      res.json(sendSuccess(data, 'Syllabus nodes reordered successfully'));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Delete leaf node
examSyllabusAdminRoutes.delete(
  '/admin/syllabi/:syllabusId/nodes/:nodeId',
  requirePermission('exams.syllabus.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await deleteSyllabusNode(getParam(req, 'syllabusId'), getParam(req, 'nodeId'), req.user?.userId);
      res.json(sendSuccess(data, 'Syllabus node deleted successfully'));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Delete node subtree with explicit confirmation
examSyllabusAdminRoutes.post(
  '/admin/syllabi/:syllabusId/nodes/:nodeId/delete-subtree',
  requirePermission('exams.syllabus.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = deleteSubtreeSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json(sendError('VALIDATION_ERROR', parseResult.error.message, parseResult.error.errors));
        return;
      }

      const data = await deleteSubtreeNodes(getParam(req, 'syllabusId'), getParam(req, 'nodeId'), req.user?.userId);
      res.json(sendSuccess(data, 'Syllabus node subtree deleted successfully'));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Activate node
examSyllabusAdminRoutes.post(
  '/admin/syllabi/:syllabusId/nodes/:nodeId/activate',
  requirePermission('exams.syllabus.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await setNodeActiveState(getParam(req, 'syllabusId'), getParam(req, 'nodeId'), true, req.user?.userId);
      res.json(sendSuccess(data, 'Syllabus node activated'));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);

// Deactivate node
examSyllabusAdminRoutes.post(
  '/admin/syllabi/:syllabusId/nodes/:nodeId/deactivate',
  requirePermission('exams.syllabus.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await setNodeActiveState(getParam(req, 'syllabusId'), getParam(req, 'nodeId'), false, req.user?.userId);
      res.json(sendSuccess(data, 'Syllabus node deactivated'));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);
