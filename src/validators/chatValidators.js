import { body, param, validationResult } from 'express-validator';
import { AppError } from '../middleware/errorHandler.js';

// Validation middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(new AppError(errorMessages.join('. '), 400));
  }
  next();
};

// Validate chat creation
export const validateChatCreation = [
  body('participantId')
    .notEmpty()
    .withMessage('Participant ID is required')
    .isMongoId()
    .withMessage('Participant ID must be a valid MongoDB ObjectId'),
  
  body('tradeId')
    .optional()
    .isMongoId()
    .withMessage('Trade ID must be a valid MongoDB ObjectId'),

  handleValidationErrors
];

// Validate message sending
export const validateMessageSending = [
  param('chatId')
    .isMongoId()
    .withMessage('Chat ID must be a valid MongoDB ObjectId'),
    
  body('content')
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be between 1 and 1000 characters')
    .trim(),
    
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file', 'system'])
    .withMessage('Message type must be one of: text, image, file, system'),

  handleValidationErrors
];

// Validate chat ID parameter
export const validateChatId = [
  param('chatId')
    .isMongoId()
    .withMessage('Chat ID must be a valid MongoDB ObjectId'),

  handleValidationErrors
];
