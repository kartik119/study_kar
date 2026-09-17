// @ts-nocheck
import { Router, Response } from 'express';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import {
  createExamPatternSchema,
  updateExamPatternSchema,
  createExamStageSchema,
  updateExamStageSchema,
  createExamPaperSchema,
  updateExamPaperSchema,
  createExamPaperSectionSchema,
  updateExamPaperSectionSchema,
  reorderSchema,
} from '@study-karnataka/validation';

import * as patternService from '../services/exam-pattern.service';

export const examPatternAdminRoutes: Router = Router();

examPatternAdminRoutes.use('/admin', authenticateToken);

function getParam(req: AuthenticatedRequest, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val || '';
}

// -----------------------------------------------------------------------------
// PATTERN ENDPOINTS
// -----------------------------------------------------------------------------

examPatternAdminRoutes.get(
  '/admin/exams/:examId/patterns',
  requirePermission('exams.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const patterns = await patternService.getPatternsByExamCycle(getParam(req, 'examId'));
      res.json({ success: true, data: patterns, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 500).json({
        success: false,
        error: { code: err.code || 'INTERNAL_ERROR', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.post(
  '/admin/exams/:examId/patterns',
  requirePermission('exams.pattern.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payload = createExamPatternSchema.parse(req.body);
      const pattern = await patternService.createInitialPattern(getParam(req, 'examId'), payload, req.user!.userId);
      res.status(201).json({ success: true, data: pattern, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'VALIDATION_ERROR', message: err.message, details: err.errors },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.get(
  '/admin/exams/:examId/patterns/:patternId',
  requirePermission('exams.view'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pattern = await patternService.getPatternById(getParam(req, 'patternId'));
      res.json({ success: true, data: pattern, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 404).json({
        success: false,
        error: { code: err.code || 'NOT_FOUND', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.patch(
  '/admin/exams/:examId/patterns/:patternId',
  requirePermission('exams.pattern.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payload = updateExamPatternSchema.parse(req.body);
      const pattern = await patternService.updatePattern(getParam(req, 'patternId'), payload, req.user!.userId);
      res.json({ success: true, data: pattern, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'VALIDATION_ERROR', message: err.message, details: err.errors },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.delete(
  '/admin/exams/:examId/patterns/:patternId',
  requirePermission('exams.pattern.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await patternService.deleteDraftPattern(getParam(req, 'patternId'), req.user!.userId);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'ACTION_FAILED', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.post(
  '/admin/exams/:examId/patterns/:patternId/clone-revision',
  requirePermission('exams.pattern.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const cloned = await patternService.clonePatternRevision(getParam(req, 'patternId'), req.user!.userId);
      res.status(201).json({ success: true, data: cloned, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'CLONE_FAILED', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// -----------------------------------------------------------------------------
// WORKFLOW ENDPOINTS
// -----------------------------------------------------------------------------

examPatternAdminRoutes.post(
  '/admin/exams/:examId/patterns/:patternId/submit-review',
  requirePermission('exams.submit_review'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pattern = await patternService.submitPatternForReview(getParam(req, 'patternId'), req.user!.userId);
      res.json({ success: true, data: pattern, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'TRANSITION_FAILED', message: err.message, details: err.details },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.post(
  '/admin/exams/:examId/patterns/:patternId/request-changes',
  requirePermission('exams.review'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const reason = req.body.reason || 'Changes requested by reviewer';
      const pattern = await patternService.requestPatternChanges(getParam(req, 'patternId'), reason, req.user!.userId);
      res.json({ success: true, data: pattern, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'TRANSITION_FAILED', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.post(
  '/admin/exams/:examId/patterns/:patternId/approve',
  requirePermission('exams.approve'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pattern = await patternService.approvePattern(getParam(req, 'patternId'), req.user!.userId);
      res.json({ success: true, data: pattern, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'TRANSITION_FAILED', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.post(
  '/admin/exams/:examId/patterns/:patternId/publish',
  requirePermission('exams.publish'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pattern = await patternService.publishPattern(getParam(req, 'patternId'), req.user!.userId);
      res.json({ success: true, data: pattern, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'TRANSITION_FAILED', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// -----------------------------------------------------------------------------
// STAGE ENDPOINTS
// -----------------------------------------------------------------------------

examPatternAdminRoutes.post(
  '/admin/exams/:examId/patterns/:patternId/stages',
  requirePermission('exams.stages.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payload = createExamStageSchema.parse(req.body);
      const stage = await patternService.createStage(getParam(req, 'patternId'), payload, req.user!.userId);
      res.status(201).json({ success: true, data: stage, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'VALIDATION_ERROR', message: err.message, details: err.errors },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.patch(
  '/admin/exams/:examId/patterns/:patternId/stages/:stageId',
  requirePermission('exams.stages.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payload = updateExamStageSchema.parse(req.body);
      const stage = await patternService.updateStage(getParam(req, 'patternId'), getParam(req, 'stageId'), payload, req.user!.userId);
      res.json({ success: true, data: stage, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'VALIDATION_ERROR', message: err.message, details: err.errors },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.delete(
  '/admin/exams/:examId/patterns/:patternId/stages/:stageId',
  requirePermission('exams.stages.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await patternService.deleteDraftStage(getParam(req, 'patternId'), getParam(req, 'stageId'), req.user!.userId);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'ACTION_FAILED', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.post(
  '/admin/exams/:examId/patterns/:patternId/stages/reorder',
  requirePermission('exams.stages.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payload = reorderSchema.parse(req.body);
      const result = await patternService.reorderStages(getParam(req, 'patternId'), payload.orderedIds, req.user!.userId);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'REORDER_FAILED', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// -----------------------------------------------------------------------------
// PAPER ENDPOINTS
// -----------------------------------------------------------------------------

examPatternAdminRoutes.post(
  '/admin/stages/:stageId/papers',
  requirePermission('exams.papers.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payload = createExamPaperSchema.parse(req.body);
      const paper = await patternService.createPaper(getParam(req, 'stageId'), payload, req.user!.userId);
      res.status(201).json({ success: true, data: paper, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'VALIDATION_ERROR', message: err.message, details: err.errors },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.patch(
  '/admin/stages/:stageId/papers/:paperId',
  requirePermission('exams.papers.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payload = updateExamPaperSchema.parse(req.body);
      const paper = await patternService.updatePaper(getParam(req, 'stageId'), getParam(req, 'paperId'), payload, req.user!.userId);
      res.json({ success: true, data: paper, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'VALIDATION_ERROR', message: err.message, details: err.errors },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.delete(
  '/admin/stages/:stageId/papers/:paperId',
  requirePermission('exams.papers.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await patternService.deleteDraftPaper(getParam(req, 'stageId'), getParam(req, 'paperId'), req.user!.userId);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'ACTION_FAILED', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.post(
  '/admin/stages/:stageId/papers/reorder',
  requirePermission('exams.papers.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payload = reorderSchema.parse(req.body);
      const result = await patternService.reorderPapers(getParam(req, 'stageId'), payload.orderedIds, req.user!.userId);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'REORDER_FAILED', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// -----------------------------------------------------------------------------
// SECTION ENDPOINTS
// -----------------------------------------------------------------------------

examPatternAdminRoutes.post(
  '/admin/papers/:paperId/sections',
  requirePermission('exams.papers.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payload = createExamPaperSectionSchema.parse(req.body);
      const section = await patternService.createSection(getParam(req, 'paperId'), payload, req.user!.userId);
      res.status(201).json({ success: true, data: section, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'VALIDATION_ERROR', message: err.message, details: err.errors },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.patch(
  '/admin/papers/:paperId/sections/:sectionId',
  requirePermission('exams.papers.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payload = updateExamPaperSectionSchema.parse(req.body);
      const section = await patternService.updateSection(getParam(req, 'paperId'), getParam(req, 'sectionId'), payload, req.user!.userId);
      res.json({ success: true, data: section, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'VALIDATION_ERROR', message: err.message, details: err.errors },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.delete(
  '/admin/papers/:paperId/sections/:sectionId',
  requirePermission('exams.papers.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await patternService.deleteDraftSection(getParam(req, 'paperId'), getParam(req, 'sectionId'), req.user!.userId);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'ACTION_FAILED', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);

examPatternAdminRoutes.post(
  '/admin/papers/:paperId/sections/reorder',
  requirePermission('exams.papers.manage'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const payload = reorderSchema.parse(req.body);
      const result = await patternService.reorderSections(getParam(req, 'paperId'), payload.orderedIds, req.user!.userId);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: { code: err.code || 'REORDER_FAILED', message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
  }
);
