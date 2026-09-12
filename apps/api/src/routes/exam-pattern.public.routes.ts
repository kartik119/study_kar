import { Router, Request, Response } from 'express';
import * as patternService from '../services/exam-pattern.service';

export const examPatternPublicRoutes: Router = Router();

examPatternPublicRoutes.get('/exams/:slug/pattern', async (req: Request, res: Response) => {
  try {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const langParam = req.query.language;
    const language = (Array.isArray(langParam) ? langParam[0] : langParam) === 'kn' ? 'kn' : 'en';

    const pattern = await patternService.serializePublicExamPattern(slug, language);
    res.json({
      success: true,
      data: pattern,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(err.status || 404).json({
      success: false,
      error: { code: err.code || 'NOT_FOUND', message: err.message },
      timestamp: new Date().toISOString(),
    });
  }
});
