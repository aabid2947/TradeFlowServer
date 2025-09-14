import mongoose from 'mongoose';
import Trade from '../models/Trade.js';
import Listing from '../models/Listing.js';
import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * @desc    Initiate a trade to buy FUN tokens
 * @route   POST /api/trades/initiate
 * @access  Private (Buyers only)
 */
export const initiateTrade = async (req, res, next) => {
    // PIVOT: Change for FUN-token-only testing - updated variable names
    const { listingId, funTokenAmount } = req.body;
    const buyerId = req.user._id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const listing = await Listing.findById(listingId).session(session);
        const buyer = await User.findById(buyerId).session(session);

        if (!listing || listing.status !== 'active') {
            throw new AppError('Listing is not active or does not exist.', 404);
        }

        if (listing.sellerId.toString() === buyerId.toString()) {
            throw new AppError('You cannot buy from your own listing.', 400);
        }

        // PIVOT: Change for FUN-token-only testing - check against funTokenAmount limits
        if (funTokenAmount < listing.minLimit || funTokenAmount > listing.maxLimit) {
            throw new AppError(`You can only buy between ${listing.minLimit} and ${listing.maxLimit} FUN tokens.`, 400);
        }

        // PIVOT: Change for FUN-token-only testing - calculate payment in FUN tokens
        const funTokenPayment = funTokenAmount * listing.priceInFunToken;

        if (buyer.balances.funToken < funTokenPayment) {
            throw new AppError('Insufficient FUN token balance to initiate this trade.', 400);
        }
        
        // if (buyer.kyc.status !== 'approved') {
        //     throw new AppError('KYC verification must be completed to start a trade.', 403);
        // }

        // 1. PIVOT: Change for FUN-token-only testing - debit buyer's payment FUN tokens and hold in escrow
        buyer.balances.funToken -= funTokenPayment;
        await buyer.save({ session });

        // 2. Create the trade document, which acts as the escrow
        const trade = new Trade({
            listingId,
            buyerId,
            sellerId: listing.sellerId,
            // PIVOT: Change for FUN-token-only testing - updated trade fields
            funTokenAmount: funTokenAmount, // tokens being purchased
            funTokenPayment: funTokenPayment, // payment amount in FUN tokens
            priceInFunToken: listing.priceInFunToken,
        });
        await trade.save({ session });
        
        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: 'Trade initiated successfully. Payment FUN tokens are held in escrow.',
            data: trade,
        });

    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Get details of a specific trade
 * @route   GET /api/trades/:id
 * @access  Private (Buyer or Seller in the trade)
 */
export const getTradeDetails = async (req, res, next) => {
    try {
        const trade = await Trade.findById(req.params.id)
            .populate('buyerId', 'username email')
            .populate('sellerId', 'username email bankDetails');

        if (!trade) {
            return next(new AppError('Trade not found.', 404));
        }

        const userId = req.user._id.toString();
        if (trade.buyerId._id.toString() !== userId && trade.sellerId._id.toString() !== userId) {
            return next(new AppError('You are not authorized to view this trade.', 403));
        }

        res.status(200).json({
            success: true,
            data: trade,
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Seller accepts a trade request
 * @route   POST /api/trades/:id/accept
 * @access  Private (Seller of the trade)
 */
export const acceptTrade = async (req, res, next) => {
    try {
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return next(new AppError('Trade not found.', 404));
        }

        if (trade.sellerId.toString() !== req.user._id.toString()) {
            return next(new AppError('Only the seller can accept this trade.', 403));
        }
        
        if (trade.status !== 'pending') {
            return next(new AppError('This trade cannot be accepted at this time.', 400));
        }

        trade.status = 'accepted';
        trade.acceptedAt = Date.now();
        await trade.save();
        
        // TODO: Implement WebSocket notification to buyer

        res.status(200).json({
            success: true,
            message: 'Trade accepted. Waiting for buyer to confirm payment.',
            data: trade,
        });

    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Buyer confirms they have paid the seller fiat
 * @route   POST /api/trades/:id/confirm-payment
 * @access  Private (Buyer of the trade)
 */
export const confirmPayment = async (req, res, next) => {
    try {
        const trade = await Trade.findById(req.params.id);

        if (!trade) {
            return next(new AppError('Trade not found.', 404));
        }

        if (trade.buyerId.toString() !== req.user._id.toString()) {
            return next(new AppError('Only the buyer can confirm payment.', 403));
        }
        
        if (trade.status !== 'accepted') {
            return next(new AppError('This trade is not awaiting payment confirmation.', 400));
        }

        trade.status = 'paid';
        trade.paidAt = Date.now();
        await trade.save();
        
        // TODO: Implement WebSocket notification to seller

        res.status(200).json({
            success: true,
            message: 'Payment confirmed. Waiting for the seller to release USDT.',
            data: trade,
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Complete a FUN-for-FUN trade with atomic swap
 * @route   POST /api/trades/:id/complete-trade
 * @access  Private (Seller of the trade)
 */
export const completeTrade = async (req, res, next) => {
    const { id } = req.params;
    const sellerId = req.user._id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const trade = await Trade.findById(id).session(session);

        if (!trade) {
            throw new AppError('Trade not found.', 404);
        }

        if (trade.sellerId.toString() !== sellerId.toString()) {
            throw new AppError('Only the seller can complete the trade.', 403);
        }

        if (trade.status !== 'paid') {
            throw new AppError('The buyer has not confirmed payment yet.', 400);
        }

        // PIVOT: Change for FUN-token-only testing - FUN-for-FUN atomic swap logic
        // 1. Debit the seller's onHoldFunToken by the amount sold
        await User.updateOne(
            { _id: sellerId },
            { $inc: { 'balances.onHoldFunToken': -trade.funTokenAmount } },
            { session }
        );
        
        // 2. Credit the buyer's funToken with the tokens they purchased
        await User.updateOne(
            { _id: trade.buyerId },
            { $inc: { 'balances.funToken': trade.funTokenAmount } },
            { session }
        );

        // 3. Credit the seller's funToken with the payment amount that was held in escrow
        await User.updateOne(
            { _id: sellerId },
            { $inc: { 'balances.funToken': trade.funTokenPayment } },
            { session }
        );

        // 4. Mark the trade as completed
        trade.status = 'completed';
        trade.completedAt = Date.now();
        await trade.save({ session });

        await session.commitTransaction();
        
        // TODO: Implement WebSocket notification to buyer

        res.status(200).json({
            success: true,
            message: 'Trade completed successfully. FUN token swap executed.',
            data: trade,
        });

    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};

/**
 * @desc    Get user's trades with optional filters
 * @route   GET /api/trades/my-trades
 * @access  Private
 */
export const getMyTrades = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { status, page = 1, limit = 10 } = req.query;

        // Build query
        const query = {
            $or: [
                { buyerId: userId },
                { sellerId: userId }
            ]
        };

        if (status) {
            query.status = status;
        }

        // Execute query with pagination
        const trades = await Trade.find(query)
            .populate('buyerId', 'username email')
            .populate('sellerId', 'username email')
            .populate('listingId', 'title description')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Trade.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                trades,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get pending trades where current user is the seller (for notifications)
 * @route   GET /api/trades/pending-for-me
 * @access  Private (Sellers only)
 */
export const getPendingTradesForSeller = async (req, res, next) => {
    try {
        const sellerId = req.user._id;

        const pendingTrades = await Trade.find({
            sellerId,
            status: { $in: ['pending', 'paid'] }
        })
        .populate('buyerId', 'username email')
        .populate('listingId', 'title description')
        .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: {
                trades: pendingTrades,
                count: pendingTrades.length
            }
        });

    } catch (error) {
        next(error);
    }
};
