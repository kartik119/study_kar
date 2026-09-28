import { Request, Response, NextFunction } from 'express';
import { TeamService } from '../../services/team.service';
import { sendSuccess, sendError } from '../../utils/response';

export class TeamController {
  private teamService: TeamService;

  constructor() {
    this.teamService = new TeamService();
  }

  listMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, role, status, moduleAccess, page = '1', limit = '10' } = req.query;
      const result = await this.teamService.listMembers({
        search: search as string,
        role: role as string,
        status: status as string,
        moduleAccess: moduleAccess as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });
      res.status(200).json(sendSuccess(result, 'Team members fetched successfully'));
    } catch (error) {
      next(error);
    }
  };

  getKPIs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.teamService.getKPIs();
      res.status(200).json(sendSuccess(result, 'Team KPIs fetched successfully'));
    } catch (error) {
      next(error);
    }
  };

  inviteMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Basic info, role, modules, exams
      const adminId = (req as any).user?.id; // from requireAuth
      const data = req.body;
      const result = await this.teamService.inviteMember(data, adminId);
      res.status(201).json(sendSuccess(result, 'Member invited successfully'));
    } catch (error) {
      next(error);
    }
  };

  getMemberDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.params.id as string);
      const result = await this.teamService.getMemberDetails(id);
      if (!result) {
        return res.status(404).json(sendError('NOT_FOUND', 'Team member not found'));
      }
      res.status(200).json(sendSuccess(result, 'Member details fetched successfully'));
    } catch (error) {
      next(error);
    }
  };

  getMemberActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.params.id as string);
      const { page = '1', limit = '10' } = req.query;
      const result = await this.teamService.getMemberActivity(id, parseInt(page as string), parseInt(limit as string));
      res.status(200).json(sendSuccess(result, 'Member activity fetched successfully'));
    } catch (error) {
      next(error);
    }
  };

  resendInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.params.id as string);
      const adminId = (req as any).user?.id;
      const result = await this.teamService.resendInvite(id, adminId);
      res.status(200).json(sendSuccess(result, 'Invitation resent successfully'));
    } catch (error) {
      next(error);
    }
  };

  cancelInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.params.id as string);
      const adminId = (req as any).user?.id;
      const result = await this.teamService.cancelInvite(id, adminId);
      res.status(200).json(sendSuccess(result, 'Invitation cancelled successfully'));
    } catch (error) {
      next(error);
    }
  };

  editMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.params.id as string);
      const adminId = (req as any).user?.id;
      const data = req.body;
      const result = await this.teamService.editMember(id, data, adminId);
      res.status(200).json(sendSuccess(result, 'Member updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  editAccess = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.params.id as string);
      const adminId = (req as any).user?.id;
      const data = req.body;
      const result = await this.teamService.editAccess(id, data, adminId);
      res.status(200).json(sendSuccess(result, 'Member access updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  suspendMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.params.id as string);
      const adminId = (req as any).user?.id;
      const result = await this.teamService.suspendMember(id, adminId);
      res.status(200).json(sendSuccess(result, 'Member suspended successfully'));
    } catch (error) {
      next(error);
    }
  };

  reactivateMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.params.id as string);
      const adminId = (req as any).user?.id;
      const result = await this.teamService.reactivateMember(id, adminId);
      res.status(200).json(sendSuccess(result, 'Member reactivated successfully'));
    } catch (error) {
      next(error);
    }
  };

  deactivateMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.params.id as string);
      const adminId = (req as any).user?.id;
      const result = await this.teamService.deactivateMember(id, adminId);
      res.status(200).json(sendSuccess(result, 'Member deactivated successfully'));
    } catch (error) {
      next(error);
    }
  };
}

