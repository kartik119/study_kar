import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '@study-karnataka/database';
import { HealthStatus } from '@study-karnataka/shared-types';
import { sendSuccess } from '../utils/response';

const router: Router = Router();

export async function getHealthHandler(_req: Request, res: Response): Promise<void> {
  const isDbHealthy = await checkDatabaseHealth();
  const status: HealthStatus['status'] = isDbHealthy ? 'ok' : 'degraded';

  const healthData: HealthStatus = {
    status,
    api: true,
    database: isDbHealthy,
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  };

  const statusCode = isDbHealthy ? 200 : 503;
  res.status(statusCode).json(sendSuccess(healthData));
}

router.get('/health', getHealthHandler);
router.get('/api/v1/health', getHealthHandler);

export default router;
