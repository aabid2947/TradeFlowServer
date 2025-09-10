import { body, validationResult } from 'express-validator';
import { AppError } from '../middleware/errorHandler.js';

export const validateTokenPurchase = [
    body('tokenAmount')
        .isNumeric().withMessage('Token amount must be a number.')
        .isInt({ gt: 0 }).withMessage('Token amount must be a positive integer.'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const message = errors.array().map(err => err.msg).join(', ');
            return next(new AppError(message, 400));
        }
        next();
    },
];
