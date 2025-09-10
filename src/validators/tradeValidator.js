import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';

export const validateTradeInitiation = [
    body('listingId')
        .notEmpty().withMessage('Listing ID is required.')
        .isMongoId().withMessage('Invalid Listing ID format.'),
    
    // PIVOT: Change for FUN-token-only testing - validate funTokenAmount instead of usdtAmount
    body('funTokenAmount')
        .isFloat({ gt: 0 }).withMessage('FUN token amount must be a positive number.'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const message = errors.array().map(err => err.msg).join(', ');
            return next(new AppError(message, 400));
        }
        next();
    },
];
