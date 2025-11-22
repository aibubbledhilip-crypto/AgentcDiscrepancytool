import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

export class ReportController {
  /**
   * Create a new report
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const report = await reportService.create({
        ...req.body,
        createdById: req.user.id,
      });

      sendSuccess(res, report, 'Report generated successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all reports
   */
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { reports, total } = await reportService.findAll(
        req.user.id,
        req.user.role === 'ADMIN',
        page,
        limit
      );

      sendPaginated(res, reports, page, limit, total, 'Reports retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get report by ID
   */
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const report = await reportService.findById(
        req.params.id,
        req.user.id,
        req.user.role === 'ADMIN'
      );

      sendSuccess(res, report, 'Report retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete report
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      await reportService.delete(
        req.params.id,
        req.user.id,
        req.user.role === 'ADMIN'
      );

      sendSuccess(res, null, 'Report deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export report to CSV
   */
  async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const report = await reportService.findById(
        req.params.id,
        req.user.id,
        req.user.role === 'ADMIN'
      );

      const csv = reportService.exportToCsv(report);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${report.name}.csv"`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export report to JSON
   */
  async exportJson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const report = await reportService.findById(
        req.params.id,
        req.user.id,
        req.user.role === 'ADMIN'
      );

      const json = reportService.exportToJson(report);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${report.name}.json"`);
      res.send(json);
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
