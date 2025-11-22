import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ruleController } from '../controllers/rule.controller';
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
  body('expectedResult').optional().trim(),
  body('threshold').optional().isFloat().withMessage('Threshold must be a number'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'DRAFT']).withMessage('Invalid status'),
  body('category').optional().trim(),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
];

const updateValidation = [
  param('id').isUUID().withMessage('Invalid rule ID'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('sqlQuery').optional().trim().notEmpty().withMessage('SQL query cannot be empty'),
  body('description').optional().trim(),
  body('expectedResult').optional().trim(),
  body('threshold').optional().isFloat().withMessage('Threshold must be a number'),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'DRAFT']).withMessage('Invalid status'),
  body('category').optional().trim(),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
];

// Routes
router.post(
  '/',
  validate(createValidation),
  ruleController.create.bind(ruleController)
);

router.get(
  '/',
  ruleController.findAll.bind(ruleController)
);

router.get(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid rule ID')]),
  ruleController.findById.bind(ruleController)
);

router.put(
  '/:id',
  validate(updateValidation),
  ruleController.update.bind(ruleController)
);

router.delete(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid rule ID')]),
  ruleController.delete.bind(ruleController)
);

router.post(
  '/:id/execute',
  validate([param('id').isUUID().withMessage('Invalid rule ID')]),
  ruleController.execute.bind(ruleController)
);

router.get(
  '/:id/executions',
  validate([
    param('id').isUUID().withMessage('Invalid rule ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  ]),
  ruleController.getExecutionHistory.bind(ruleController)
);

export default router;
