import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { TopicPracticeService } from '../services/topic-practice.service';
import { sendSuccess, sendError } from '../utils/response';

const router: Router = Router();

// Require Admin Authentication
router.use(authenticateToken);

/**
 * GET /api/v1/admin/topic-practice/configs
 */
router.get('/configs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const configs = await TopicPracticeService.getAdminConfigs();
    res.status(200).json(sendSuccess(configs));
  } catch (error: any) {
    res.status(500).json(sendError('FETCH_CONFIGS_FAILED', error.message));
  }
});

/**
 * POST /api/v1/admin/topic-practice/configs
 */
router.post('/configs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = await TopicPracticeService.upsertAdminConfig(req.body);
    res.status(200).json(sendSuccess(config));
  } catch (error: any) {
    res.status(400).json(sendError('UPSERT_CONFIG_FAILED', error.message));
  }
});

export default router;
