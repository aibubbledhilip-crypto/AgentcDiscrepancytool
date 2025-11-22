import { Router } from 'express';
import { body, param } from 'express-validator';
import { scheduleController } from '../controllers/schedule.controller';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const createValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('cronExpression').trim().notEmpty().withMessage('Cron expression is required'),
  body('frequency')
    .isIn(['ONCE', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'])
    .withMessage('Invalid frequency'),
  body('ruleId').isUUID().withMessage('Valid rule ID is required'),
  body('description').optional().trim(),
  body('timezone').optional().trim(),
];

const updateValidation = [
  param('id').isUUID().withMessage('Invalid schedule ID'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('cronExpression').optional().trim(),
  body('frequency')
    .optional()
    .isIn(['ONCE', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'])
    .withMessage('Invalid frequency'),
  body('description').optional().trim(),
  body('timezone').optional().trim(),
  body('isActive').optional().isBoolean(),
];

// Routes
router.post(
  '/',
  validate(createValidation),
  scheduleController.create.bind(scheduleController)
);

router.get(
  '/',
  scheduleController.findAll.bind(scheduleController)
);

router.get(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid schedule ID')]),
  scheduleController.findById.bind(scheduleController)
);

router.put(
  '/:id',
  validate(updateValidation),
  scheduleController.update.bind(scheduleController)
);

router.delete(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid schedule ID')]),
  scheduleController.delete.bind(scheduleController)
);

router.post(
  '/:id/toggle',
  validate([param('id').isUUID().withMessage('Invalid schedule ID')]),
  scheduleController.toggleActive.bind(scheduleController)
);

router.post(
  '/:id/run',
  validate([param('id').isUUID().withMessage('Invalid schedule ID')]),
  scheduleController.runNow.bind(scheduleController)
);

export default router;
