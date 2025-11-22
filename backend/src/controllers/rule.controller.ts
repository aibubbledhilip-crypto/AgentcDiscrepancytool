import { Request, Response, NextFunction } from 'express';
import { ruleService } from '../services/rule.service';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';

export class RuleController {
  /**
   * Create a new rule
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const rule = await ruleService.create({
        ...req.body,
        createdById: req.user.id,
      });

      sendSuccess(res, rule, 'Rule created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all rules
   */
  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const rules = await ruleService.findAll(
        req.user.id,
        req.user.role === 'ADMIN'
      );

      sendSuccess(res, rules, 'Rules retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rule by ID
   */
  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const rule = await ruleService.findById(
        req.params.id,
        req.user.id,
        req.user.role === 'ADMIN'
      );

      sendSuccess(res, rule, 'Rule retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update rule
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const rule = await ruleService.update(
        req.params.id,
        req.user.id,
        req.user.role === 'ADMIN',
        req.body
      );

      sendSuccess(res, rule, 'Rule updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete rule
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      await ruleService.delete(
        req.params.id,
        req.user.id,
        req.user.role === 'ADMIN'
      );

      sendSuccess(res, null, 'Rule deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Execute rule manually
   */
  async execute(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'Not authenticated', 401);
        return;
      }

      const result = await ruleService.executeRule(req.params.id, req.user.id);

      if (result.success) {
        sendSuccess(res, result, 'Rule executed successfully');
      } else {
        sendError(res, result.error || 'Execution failed', 400, result);
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get execution history
   */
  async getExecutionHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await ruleService.getExecutionHistory(
        req.params.id,
        page,
        limit
      );

      sendPaginated(
        res,
        result.executions,
        result.page,
        result.limit,
        result.total,
        'Execution history retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}

export const ruleController = new RuleController();
