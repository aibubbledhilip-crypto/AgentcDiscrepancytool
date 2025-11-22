import { Request, Response, NextFunction } from 'express';
import { schedulerService } from '../services/scheduler.service';
import { sendSuccess, sendError } from '../utils/response';

export class ScheduleController {
  /**
   * Create a new schedule
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const schedule = await schedulerService.create({
        ...req.body,
        createdById: req.user.id,
      });

      sendSuccess(res, schedule, 'Schedule created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all schedules
   */
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const schedules = await schedulerService.findAll(
        req.user.id,
        req.user.role === 'ADMIN'
      );

      sendSuccess(res, schedules, 'Schedules retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get schedule by ID
   */
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schedule = await schedulerService.findById(req.params.id);

      sendSuccess(res, schedule, 'Schedule retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update schedule
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schedule = await schedulerService.update(req.params.id, req.body);

      sendSuccess(res, schedule, 'Schedule updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete schedule
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await schedulerService.delete(req.params.id);

      sendSuccess(res, null, 'Schedule deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle schedule active status
   */
  async toggleActive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schedule = await schedulerService.toggleActive(req.params.id);

      sendSuccess(res, schedule, `Schedule ${schedule.isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Run schedule immediately
   */
  async runNow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      await schedulerService.runNow(req.params.id, req.user.id);

      sendSuccess(res, null, 'Schedule executed successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const scheduleController = new ScheduleController();
