// @ts-nocheck
import { Router, Request, Response } from 'express';
import { StudyMaterialAccessService } from '../services/study-material-access.service';
import { AppError } from '../middleware/errorHandler';
import jwt from 'jsonwebtoken';

const router: Router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'study-karnataka-dev-secret-key-2026';

/**
 * Access-aware study material read endpoint for Public, Student Web, and Mobile apps.
 * GET /api/v1/content/study-materials/:slug
 */
router.get('/study-materials/:slug', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const requestedLanguage = (req.query.language as 'en' | 'kn') || 'en';

    // Parse authorization token if present
    let userId: string | undefined;
    let isStudent = false;
    let studentPreparationLanguage: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.userId;
        if (decoded.accountType === 'STUDENT') {
          isStudent = true;
          studentPreparationLanguage = decoded.preparationLanguage;
        }
      } catch (e) {
        // Ignore invalid token for anonymous fallback
      }
    }

    const result = await StudyMaterialAccessService.resolveAccessAndContent({
      slugOrId: slug,
      language: requestedLanguage,
      userId,
      isStudent,
      studentPreparationLanguage,
    });

    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
        timestamp: new Date().toISOString(),
      });
    }
    console.error('Content Access Error:', err);
    return res.status(400).json({
      success: false,
      error: { code: 'CONTENT_ACCESS_ERROR', message: err.message || 'Content request failed' },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
