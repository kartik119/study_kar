// @ts-nocheck
import { Router, Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { fetchPublicSyllabus } from '../services/exam-syllabus.service';
import { Language } from '@study-karnataka/shared-types';

export const examSyllabusPublicRoutes: Router = Router();

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : val || '';
}

// GET /api/v1/exams/:slug/syllabus
examSyllabusPublicRoutes.get(
  '/api/v1/exams/:slug/syllabus',
  async (req: Request, res: Response) => {
    try {
      const slug = getParam(req, 'slug');
      const language = (req.query.language as Language) || 'en';
      const stage = req.query.stage as string | undefined;
      const paper = req.query.paper as string | undefined;

      const data = await fetchPublicSyllabus(slug, language, { stage, paper });
      res.json(sendSuccess(data));
    } catch (error: any) {
      res.status(error.status || 500).json(sendError(error.code || 'INTERNAL_ERROR', error.message));
    }
  }
);
