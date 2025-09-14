import { body, validationResult } from 'express-validator';
import { AppError } from '../middleware/errorHandler.js';

// Validation error handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  next();
};

// User registration validation
export const validateRegistration = [
  // body('username')
  //   .isLength({ min: 3, max: 30 })
  //   .withMessage('Username must be between 3 and 30 characters')
  //   .matches(/^[a-zA-Z0-9_]+$/)
  //   .withMessage('Username can only contain letters, numbers, and underscores')
  //   .trim(),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_=])[A-Za-z\d@$!%*?&#+\-_=]+$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  // body('role')
  //   .isIn(['buyer', 'seller'])
  //   .withMessage('Role must be either buyer or seller'),
  
  // body('businessName')
  //   .if(body('role').equals('seller'))
  //   .notEmpty()
  //   .withMessage('Business name is required for sellers')
  //   .isLength({ min: 2, max: 100 })
  //   .withMessage('Business name must be between 2 and 100 characters'),
  
  body('phoneNumber')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  
  handleValidationErrors
];

// User login validation
export const validateLogin = [
  body('identifier')
    .notEmpty()
    .withMessage('Email or username is required')
    .trim(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Google authentication validation
export const validateGoogleAuth = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .toLowerCase(),
  
  body('uid')
    .notEmpty()
    .withMessage('Google UID is required')
    .trim(),
  
  body('displayName')
    .optional()
    .trim(),
  
  body('photoURL')
    .optional()
    .isURL()
    .withMessage('Photo URL must be a valid URL'),
  
  handleValidationErrors
];

// Password change validation
export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+\-_=])[A-Za-z\d@$!%*?&#+\-_=]+$/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  
  handleValidationErrors
];

// Profile update validation
export const validateProfileUpdate = [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .trim(),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  
  body('phoneNumber')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('businessName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  
  body('businessDescription')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Business description cannot exceed 500 characters'),
  
  handleValidationErrors
];

// Token transfer validation
export const validateTokenTransfer = [
  body('recipientId')
    .notEmpty()
    .withMessage('Recipient ID is required')
    .isMongoId()
    .withMessage('Invalid recipient ID'),
  
  body('amount')
    .isInt({ min: 1 })
    .withMessage('Amount must be a positive integer'),
  
  handleValidationErrors
];
