import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('role').optional().isIn(['ADMIN', 'USER', 'VIEWER']).withMessage('Invalid role'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain uppercase, lowercase, and number'),
];

// Routes
router.post(
  '/register',
  validate(registerValidation),
  authController.register.bind(authController)
);

router.post(
  '/login',
  validate(loginValidation),
  authController.login.bind(authController)
);

router.post('/refresh', authController.refreshToken.bind(authController));

router.get(
  '/profile',
  authenticate,
  authController.getProfile.bind(authController)
);

router.put(
  '/profile',
  authenticate,
  authController.updateProfile.bind(authController)
);

router.put(
  '/change-password',
  authenticate,
  validate(changePasswordValidation),
  authController.changePassword.bind(authController)
);

export default router;
