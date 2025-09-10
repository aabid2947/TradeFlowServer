import { body, validationResult } from 'express-validator';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Validation rules for trade initiation
 */
export const validateTradeInitiation = [
  body('listingId')
    .notEmpty()
    .withMessage('Listing ID is required')
    .isMongoId()
    .withMessage('Invalid listing ID format'),
    
  body('funTokenAmount')
    .isNumeric()
    .withMessage('FUN token amount must be a number')
    .isFloat({ min: 1 })
    .withMessage('FUN token amount must be at least 1'),

  // Middleware to handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => error.msg);
      return next(new AppError(errorMessages.join(', '), 400));
    }
    next();
  },
];
