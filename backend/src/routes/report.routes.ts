import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { reportController } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const createValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('sqlQuery').trim().notEmpty().withMessage('SQL query is required'),
  body('dataSourceId').isUUID().withMessage('Valid data source ID is required'),
  body('description').optional().trim(),
  body('ruleId').optional().isUUID().withMessage('Invalid rule ID'),
];

// Routes
router.post(
  '/',
  validate(createValidation),
  reportController.create.bind(reportController)
);

router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  ]),
  reportController.findAll.bind(reportController)
);

router.get(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid report ID')]),
  reportController.findById.bind(reportController)
);

router.delete(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid report ID')]),
  reportController.delete.bind(reportController)
);

router.get(
  '/:id/export/csv',
  validate([param('id').isUUID().withMessage('Invalid report ID')]),
  reportController.exportCsv.bind(reportController)
);

router.get(
  '/:id/export/json',
  validate([param('id').isUUID().withMessage('Invalid report ID')]),
  reportController.exportJson.bind(reportController)
);

export default router;
