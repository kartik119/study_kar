import { Request, Response } from 'express';
import { workAssignmentService } from '../../services/work-assignment.service';

export const getAssignments = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const filters = {
      search: req.query.search,
      assignmentType: req.query.assignmentType,
      roleId: req.query.roleId,
      status: req.query.status,
      priority: req.query.priority,
      examScopeId: req.query.examScopeId,
    };

    const result = await workAssignmentService.getAssignments(filters, page, limit);
    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAssignmentById = async (req: Request, res: Response) => {
  try {
    const result = await workAssignmentService.getAssignmentById(req.params.id as string);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message });
  }
};

export const createAssignment = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user?.userId; // from auth middleware
    const result = await workAssignmentService.createAssignment(req.body, adminId);
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateAssignmentStatus = async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user?.userId;
    const { status, comments } = req.body;
    const result = await workAssignmentService.updateStatus(req.params.id as string, status, adminId, comments);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getKpis = async (req: Request, res: Response) => {
  try {
    const result = await workAssignmentService.getKpis();
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
