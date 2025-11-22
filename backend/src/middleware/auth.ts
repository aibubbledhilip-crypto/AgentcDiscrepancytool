import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role } from '@prisma/client';
import config from '../config';
import { sendError } from '../utils/response';
import logger from '../utils/logger';

const prisma = new PrismaClient();

interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

/**
 * Middleware to authenticate JWT token
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'No token provided', 401);
      return;
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      sendError(res, 'User not found or inactive', 401);
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      sendError(res, 'Invalid token', 401);
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      sendError(res, 'Token expired', 401);
      return;
    }
    logger.error('Authentication error:', error);
    sendError(res, 'Authentication failed', 500);
  }
}

/**
 * Middleware to check if user has required role
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Not authenticated', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, 'Insufficient permissions', 403);
      return;
    }

    next();
  };
}

/**
 * Middleware to check if user is admin
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    sendError(res, 'Not authenticated', 401);
    return;
  }

  if (req.user.role !== 'ADMIN') {
    sendError(res, 'Admin access required', 403);
    return;
  }

  next();
}
