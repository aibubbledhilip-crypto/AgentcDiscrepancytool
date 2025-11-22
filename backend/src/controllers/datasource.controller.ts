import { Request, Response, NextFunction } from 'express';
import { dataSourceService } from '../services/datasource.service';
import { sendSuccess, sendError } from '../utils/response';

export class DataSourceController {
  /**
   * Create a new data source
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const dataSource = await dataSourceService.create({
        ...req.body,
        createdById: req.user.id,
      });

      sendSuccess(res, dataSource, 'Data source created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all data sources
   */
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const dataSources = await dataSourceService.findAll(
        req.user.id,
        req.user.role === 'ADMIN'
      );

      sendSuccess(res, dataSources, 'Data sources retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get data source by ID
   */
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const dataSource = await dataSourceService.findById(
        req.params.id,
        req.user.id,
        req.user.role === 'ADMIN'
      );

      sendSuccess(res, dataSource, 'Data source retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update data source
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const dataSource = await dataSourceService.update(
        req.params.id,
        req.user.id,
        req.user.role === 'ADMIN',
        req.body
      );

      sendSuccess(res, dataSource, 'Data source updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete data source
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      await dataSourceService.delete(
        req.params.id,
        req.user.id,
        req.user.role === 'ADMIN'
      );

      sendSuccess(res, null, 'Data source deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test data source connection
   */
  async testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await dataSourceService.testConnection(req.params.id);

      if (result.success) {
        sendSuccess(res, result, 'Connection test successful');
      } else {
        sendError(res, result.message, 400);
      }
    } catch (error) {
      next(error);
    }
  }
}

export const dataSourceController = new DataSourceController();
