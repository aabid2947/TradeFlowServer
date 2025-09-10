import { body, validationResult } from 'express-validator';
import { AppError } from '../middleware/errorHandler.js';

export const validateListingCreation = [
    // PIVOT: Change for FUN-token-only testing - validate funTokenAmount instead of usdtAmount
    body('funTokenAmount')
        .isFloat({ gt: 0 }).withMessage('FUN token amount must be a positive number.'),
    // PIVOT: Change for FUN-token-only testing - validate priceInFunToken instead of pricePerUsdt
    body('priceInFunToken')
        .isFloat({ gt: 0 }).withMessage('Price in FUN tokens must be a positive number.'),
    body('minLimit')
        .isFloat({ gt: 0 }).withMessage('Minimum limit must be a positive number.'),
    body('maxLimit')
        .isFloat({ gt: 0 }).withMessage('Maximum limit must be a positive number.')
        .custom((value, { req }) => {
            if (parseFloat(value) < parseFloat(req.body.minLimit)) {
                throw new Error('Maximum limit cannot be less than the minimum limit.');
            }
            // PIVOT: Change for FUN-token-only testing - check against funTokenAmount
            if (parseFloat(value) > parseFloat(req.body.funTokenAmount)) {
                throw new Error('Maximum limit cannot exceed the total FUN token amount.');
            }
            return true;
        }),
    body('paymentMethods')
        .isArray({ min: 1 }).withMessage('At least one payment method is required.')
        .custom((value) => {
            const validMethods = ['Bank Transfer', 'UPI'];
            const isValid = value.every(method => validMethods.includes(method));
            if (!isValid) {
                throw new Error('Invalid payment method provided.');
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
