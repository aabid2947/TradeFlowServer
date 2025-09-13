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

export const validateTokenWithdrawal = [
    body('tokenAmount')
        .isNumeric().withMessage('Token amount must be a number.')
        .isInt({ gt: 0 }).withMessage('Token amount must be a positive integer.')
        .custom((value) => {
            if (value < 1) {
                throw new Error('Minimum withdrawal amount is 1 FUN token.');
            }
            if (value > 100000) {
                throw new Error('Maximum withdrawal amount is 100,000 FUN tokens per transaction.');
            }
            return true;
        }),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const message = errors.array().map(err => err.msg).join(', ');
            return next(new AppError(message, 400));
        }
        next();
    },
];
