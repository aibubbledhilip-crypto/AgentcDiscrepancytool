import { Router } from 'express';
import { body, param } from 'express-validator';
import { dataSourceController } from '../controllers/datasource.controller';
import { authenticate, requireAdmin, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const createValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('type')
    .isIn(['POSTGRESQL', 'MYSQL', 'ATHENA', 'SQLSERVER', 'ORACLE'])
    .withMessage('Invalid data source type'),
  body('description').optional().trim(),
  body('host').optional().trim(),
  body('port').optional().isInt({ min: 1, max: 65535 }).withMessage('Invalid port number'),
  body('database').optional().trim(),
  body('username').optional().trim(),
  body('password').optional(),
  body('awsRegion').optional().trim(),
  body('awsAccessKeyId').optional().trim(),
  body('awsSecretKey').optional(),
  body('athenaWorkgroup').optional().trim(),
  body('athenaOutputLocation').optional().trim(),
  body('athenaCatalog').optional().trim(),
];

const updateValidation = [
  param('id').isUUID().withMessage('Invalid data source ID'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('description').optional().trim(),
  body('host').optional().trim(),
  body('port').optional().isInt({ min: 1, max: 65535 }).withMessage('Invalid port number'),
  body('database').optional().trim(),
  body('username').optional().trim(),
  body('password').optional(),
  body('isActive').optional().isBoolean(),
];

// Routes - Admin only for create, update, delete
router.post(
  '/',
  requireAdmin,
  validate(createValidation),
  dataSourceController.create.bind(dataSourceController)
);

router.get(
  '/',
  dataSourceController.findAll.bind(dataSourceController)
);

router.get(
  '/:id',
  param('id').isUUID().withMessage('Invalid data source ID'),
  validate([param('id').isUUID()]),
  dataSourceController.findById.bind(dataSourceController)
);

router.put(
  '/:id',
  requireAdmin,
  validate(updateValidation),
  dataSourceController.update.bind(dataSourceController)
);

router.delete(
  '/:id',
  requireAdmin,
  param('id').isUUID().withMessage('Invalid data source ID'),
  validate([param('id').isUUID()]),
  dataSourceController.delete.bind(dataSourceController)
);

router.post(
  '/:id/test',
  requireAdmin,
  param('id').isUUID().withMessage('Invalid data source ID'),
  validate([param('id').isUUID()]),
  dataSourceController.testConnection.bind(dataSourceController)
);

export default router;
