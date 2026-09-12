import { Router, Response } from 'express';
import { authenticateToken, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { AcademicStageService } from '../services/academic-stage.service';
import { z } from 'zod';

const router: Router = Router();

router.use(authenticateToken);

function handleError(res: Response, err: any) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ success: false, error: { message: 'Validation failed', details: err.errors } });
  }
  return res.status(400).json({ success: false, error: { message: err.message || 'Operation failed' } });
}

// GET all stages
router.get('/', requirePermission('academic_taxonomy.manage', 'study_materials.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stages = await AcademicStageService.getAllStages();
    return res.json({ success: true, data: stages });
  } catch (err) {
    return handleError(res, err);
  }
});

// GET single stage
router.get('/:id', requirePermission('academic_taxonomy.manage', 'study_materials.view'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stage = await AcademicStageService.getStageById(req.params.id);
    if (!stage) return res.status(404).json({ success: false, error: { message: 'Stage not found' } });
    return res.json({ success: true, data: stage });
  } catch (err) {
    return handleError(res, err);
  }
});

// CREATE stage
router.post('/', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stage = await AcademicStageService.createStage(req.body);
    return res.status(201).json({ success: true, data: stage });
  } catch (err) {
    return handleError(res, err);
  }
});

// UPDATE stage
router.put('/:id', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stage = await AcademicStageService.updateStage(req.params.id, req.body);
    return res.json({ success: true, data: stage });
  } catch (err) {
    return handleError(res, err);
  }
});

// DELETE stage
router.delete('/:id', requirePermission('academic_taxonomy.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await AcademicStageService.deleteStage(req.params.id);
    return res.json({ success: true, message: 'Stage deleted successfully' });
  } catch (err) {
    return handleError(res, err);
  }
});

export default router;
