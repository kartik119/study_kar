// @ts-nocheck
import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { TopicPracticeService } from '../services/topic-practice.service';
import { sendSuccess, sendError } from '../utils/response';

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
 * POST /api/v1/student/topic-practice/availability
 * Preview eligible question counts & shortage
 */
router.post('/availability', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const result = await TopicPracticeService.checkAvailability(studentId, req.body);
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    res.status(400).json(sendError('BAD_REQUEST', error.message));
  }
});

/**
 * POST /api/v1/student/topic-practice/start
 * Start new practice session
 */
router.post('/start', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const result = await TopicPracticeService.startSession(studentId, req.body);
    res.status(201).json(sendSuccess(result));
  } catch (error: any) {
    res.status(400).json(sendError('START_SESSION_FAILED', error.message));
  }
});

/**
 * GET /api/v1/student/topic-practice/sessions/:id
 * Fetch active or completed practice session details
 */
router.get('/sessions/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const sessionId = getParamId(req);
    const result = await TopicPracticeService.getSession(studentId, sessionId);
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    if (error.message.includes('Forbidden')) {
      res.status(403).json(sendError('FORBIDDEN', error.message));
    } else {
      res.status(404).json(sendError('NOT_FOUND', error.message));
    }
  }
});

/**
 * POST /api/v1/student/topic-practice/sessions/:id/answer
 * Submit an answer to a practice question (instant feedback)
 */
router.post('/sessions/:id/answer', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const sessionId = getParamId(req);
    const result = await TopicPracticeService.submitAnswer(studentId, sessionId, req.body);
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    res.status(400).json(sendError('SUBMIT_ANSWER_FAILED', error.message));
  }
});

/**
 * POST /api/v1/student/topic-practice/sessions/:id/skip
 * Skip question
 */
router.post('/sessions/:id/skip', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const sessionId = getParamId(req);
    const result = await TopicPracticeService.skipQuestion(studentId, sessionId, req.body.questionId);
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    res.status(400).json(sendError('SKIP_FAILED', error.message));
  }
});

/**
 * POST /api/v1/student/topic-practice/sessions/:id/reveal
 * Reveal answer without submitting choice
 */
router.post('/sessions/:id/reveal', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const sessionId = getParamId(req);
    const result = await TopicPracticeService.revealAnswer(studentId, sessionId, req.body.questionId);
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    res.status(400).json(sendError('REVEAL_FAILED', error.message));
  }
});

/**
 * POST /api/v1/student/topic-practice/sessions/:id/revision-mark
 * Toggle mark for revision on a question
 */
router.post('/sessions/:id/revision-mark', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const sessionId = getParamId(req);
    const result = await TopicPracticeService.toggleMarkForRevision(studentId, sessionId, req.body.questionId);
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    res.status(400).json(sendError('REVISION_MARK_FAILED', error.message));
  }
});

/**
 * POST /api/v1/student/topic-practice/sessions/:id/complete
 * Complete practice session
 */
router.post('/sessions/:id/complete', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const sessionId = getParamId(req);
    const result = await TopicPracticeService.completeSession(studentId, sessionId, req.body.timeSpentSeconds);
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    res.status(400).json(sendError('COMPLETE_SESSION_FAILED', error.message));
  }
});

/**
 * POST /api/v1/student/topic-practice/sessions/:id/abandon
 * Abandon practice session
 */
router.post('/sessions/:id/abandon', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const sessionId = getParamId(req);
    const result = await TopicPracticeService.abandonSession(studentId, sessionId);
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    res.status(400).json(sendError('ABANDON_SESSION_FAILED', error.message));
  }
});

/**
 * POST /api/v1/student/topic-practice/sessions/:id/retry-incorrect
 * Create new session retrying incorrect questions
 */
router.post('/sessions/:id/retry-incorrect', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const sessionId = getParamId(req);
    const result = await TopicPracticeService.retryIncorrectSession(studentId, sessionId);
    res.status(201).json(sendSuccess(result));
  } catch (error: any) {
    res.status(400).json(sendError('RETRY_INCORRECT_FAILED', error.message));
  }
});

/**
 * GET /api/v1/student/topic-practice/history
 * Fetch student practice session history
 */
router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const result = await TopicPracticeService.getStudentPracticeHistory(studentId);
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    res.status(500).json(sendError('FETCH_HISTORY_FAILED', error.message));
  }
});

/**
 * GET /api/v1/student/topic-practice/weak-areas
 * Fetch student weak areas based on practice history
 */
router.get('/weak-areas', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const result = await TopicPracticeService.getStudentWeakAreas(studentId);
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    res.status(500).json(sendError('FETCH_WEAK_AREAS_FAILED', error.message));
  }
});

/**
 * GET /api/v1/student/topic-practice/stats
 * Fetch overall student practice progress stats
 */
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const studentId = getStudentId(req);
    const result = await TopicPracticeService.getStudentProgressStats(studentId);
    res.status(200).json(sendSuccess(result));
  } catch (error: any) {
    res.status(500).json(sendError('FETCH_STATS_FAILED', error.message));
  }
});

export default router;
