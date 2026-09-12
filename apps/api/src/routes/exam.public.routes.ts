import { Router, Request, Response } from 'express';
import { prisma } from '@study-karnataka/database';
import { sendSuccess, sendError } from '../utils/response';
import { serializePublicExam } from '../services/exam.service';

const router: Router = Router();

// GET /api/v1/exams (Public Published Exam List)
router.get('/exams', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawLang = req.query.language as string | undefined;
    const language: 'en' | 'kn' = rawLang === 'kn' ? 'kn' : 'en';

    const cycles = await prisma.examCycle.findMany({
      where: {
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
      },
      orderBy: { notificationDate: 'desc' },
      include: {
        programme: { include: { authority: true } },
        eligibility: true,
        importantDates: { orderBy: { displayOrder: 'asc' } },
        officialResources: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } },
        seo: true,
      },
    });

    const serialized = cycles.map((c) => serializePublicExam(c, language));
    res.status(200).json(sendSuccess(serialized));
  } catch (err: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Failed to fetch public exams'));
  }
});

// GET /api/v1/exams/:slug (Public Localized Exam Detail by Slug)
router.get('/exams/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawSlug = req.params.slug;
    const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
    const rawLang = req.query.language as string | undefined;
    const language: 'en' | 'kn' = rawLang === 'kn' ? 'kn' : 'en';

    // Find cycle by slugEn or slugKn in SEO record
    const seoRecord = await prisma.examSEO.findFirst({
      where: {
        OR: [{ slugEn: slug }, { slugKn: slug }],
      },
    });

    if (!seoRecord) {
      res.status(404).json(sendError('EXAM_NOT_FOUND', `Exam not found for slug '${slug}'`));
      return;
    }

    const cycle = await prisma.examCycle.findUnique({
      where: { id: seoRecord.examCycleId },
      include: {
        programme: { include: { authority: true } },
        eligibility: true,
        importantDates: { orderBy: { displayOrder: 'asc' } },
        officialResources: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } },
        seo: true,
      },
    });

    if (!cycle || cycle.status !== 'PUBLISHED' || (cycle.visibility !== 'PUBLIC' && cycle.visibility !== 'UNLISTED')) {
      res.status(404).json(sendError('EXAM_NOT_FOUND', `Exam not available for slug '${slug}'`));
      return;
    }

    const serialized = serializePublicExam(cycle, language);
    res.status(200).json(sendSuccess(serialized));
  } catch (err: any) {
    res.status(500).json(sendError('INTERNAL_ERROR', err.message || 'Failed to fetch exam detail'));
  }
});

export default router;
