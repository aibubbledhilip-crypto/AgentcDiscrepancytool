import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Send success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200,
  meta?: ApiResponse['meta']
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    meta,
  };
  return res.status(statusCode).json(response);
}

/**
 * Send error response
 */
export function sendError(
  res: Response,
  error: string,
  statusCode: number = 400,
  details?: any
): Response {
  const response: ApiResponse = {
    success: false,
    error,
    ...(details && { data: details }),
  };
  return res.status(statusCode).json(response);
}

/**
 * Send paginated response
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): Response {
  const totalPages = Math.ceil(total / limit);
  return sendSuccess(res, data, message, 200, {
    page,
    limit,
    total,
    totalPages,
  });
}
