import { Request, Response, NextFunction } from 'express';
import { TeamRoleService } from '../../services/team-role.service';
import { sendSuccess, sendError } from '../../utils/response';

export class TeamRoleController {
  private roleService: TeamRoleService;

  constructor() {
    this.roleService = new TeamRoleService();
  }

  listRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, status, type, module } = req.query;
      const result = await this.roleService.listRoles({
        search: search as string,
        status: status as string,
        type: type as string,
        module: module as string
      });
      res.status(200).json(sendSuccess(result, 'Roles fetched successfully'));
    } catch (error) {
      next(error);
    }
  };

  getRoleDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.roleService.getRoleDetails(id);
      res.status(200).json(sendSuccess(result, 'Role details fetched successfully'));
    } catch (error) {
      next(error);
    }
  };

  createRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminId = (req as any).user?.id;
      const result = await this.roleService.createRole(req.body, adminId);
      res.status(201).json(sendSuccess(result, 'Role created successfully'));
    } catch (error) {
      next(error);
    }
  };

  updateRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?.id;
      const result = await this.roleService.updateRole(id, req.body, adminId);
      res.status(200).json(sendSuccess(result, 'Role updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  getAllPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.roleService.getAllPermissions();
      res.status(200).json(sendSuccess(result, 'Permissions fetched successfully'));
    } catch (error) {
      next(error);
    }
  };
}
