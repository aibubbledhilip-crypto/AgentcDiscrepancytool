import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { sendSuccess, sendError } from '../utils/response';

export class DashboardController {
  /**
   * Get dashboard statistics
   */
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const stats = await dashboardService.getStats(
        req.user.id,
        req.user.role === 'ADMIN'
      );

      sendSuccess(res, stats, 'Dashboard stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent executions
   */
  async getRecentExecutions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const limit = parseInt(req.query.limit as string) || 10;

      const executions = await dashboardService.getRecentExecutions(
        req.user.id,
        req.user.role === 'ADMIN',
        limit
      );

      sendSuccess(res, executions, 'Recent executions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get execution trends
   */
  async getExecutionTrends(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const days = parseInt(req.query.days as string) || 7;

      const trends = await dashboardService.getExecutionTrends(
        req.user.id,
        req.user.role === 'ADMIN',
        days
      );

      sendSuccess(res, trends, 'Execution trends retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get breach summary
   */
  async getBreachSummary(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const limit = parseInt(req.query.limit as string) || 5;

      const summary = await dashboardService.getBreachSummary(
        req.user.id,
        req.user.role === 'ADMIN',
        limit
      );

      sendSuccess(res, summary, 'Breach summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get upcoming schedules
   */
  async getUpcomingSchedules(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const limit = parseInt(req.query.limit as string) || 5;

      const schedules = await dashboardService.getUpcomingSchedules(
        req.user.id,
        req.user.role === 'ADMIN',
        limit
      );

      sendSuccess(res, schedules, 'Upcoming schedules retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
