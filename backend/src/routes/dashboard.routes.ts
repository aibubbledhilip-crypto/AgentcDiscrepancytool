import { Router } from 'express';
import { query } from 'express-validator';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.get(
  '/stats',
  dashboardController.getStats.bind(dashboardController)
);

router.get(
  '/recent-executions',
  validate([
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
  ]),
  dashboardController.getRecentExecutions.bind(dashboardController)
);

router.get(
  '/execution-trends',
  validate([
    query('days').optional().isInt({ min: 1, max: 90 }).withMessage('Days must be 1-90'),
  ]),
  dashboardController.getExecutionTrends.bind(dashboardController)
);

router.get(
  '/discrepancy-summary',
  validate([
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be 1-20'),
  ]),
  dashboardController.getDiscrepancySummary.bind(dashboardController)
);

router.get(
  '/upcoming-schedules',
  validate([
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be 1-20'),
  ]),
  dashboardController.getUpcomingSchedules.bind(dashboardController)
);

export default router;
