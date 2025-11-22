import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { sendError } from '../utils/response';

/**
 * Middleware to validate request using express-validator
 */
export function validate(validations: ValidationChain[]) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      next();
      return;
    }

    const formattedErrors = errors.array().map((error) => ({
      field: 'path' in error ? error.path : 'unknown',
      message: error.msg,
    }));

    sendError(res, 'Validation failed', 400, { errors: formattedErrors });
  };
}
