import { Request, Response, NextFunction } from 'express';
import { ActivityLogsService } from '../../services/activity-logs.service';
import { sendSuccess } from '../../utils/response';

export class ActivityLogsController {
  private activityLogsService: ActivityLogsService;

  constructor() {
    this.activityLogsService = new ActivityLogsService();
  }

  listActivityLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { search, activityType, actorId, module, dateFrom, dateTo, page = '1', limit = '20' } = req.query;
      const result = await this.activityLogsService.listActivityLogs({
        search: search as string,
        activityType: activityType as string,
        actorId: actorId as string,
        module: module as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });
      res.status(200).json(sendSuccess(result, 'Activity logs fetched successfully'));
    } catch (error) {
      next(error);
    }
  };

  getKPIs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const [kpi, summary] = await Promise.all([
        this.activityLogsService.getKPIs({ dateFrom: dateFrom as string, dateTo: dateTo as string }),
        this.activityLogsService.getSummary({ dateFrom: dateFrom as string, dateTo: dateTo as string })
      ]);
      res.status(200).json(sendSuccess({ ...kpi, summary }, 'Activity logs KPIs fetched successfully'));
    } catch (error) {
      next(error);
    }
  };

  getActivityLogDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.activityLogsService.getActivityLogDetails(id as string);
      res.status(200).json(sendSuccess(result, 'Activity log details fetched successfully'));
    } catch (error) {
      next(error);
    }
  };
}
