import express from 'express';
import { 
    initiateTrade,
    getTradeDetails,
    acceptTrade,
    confirmPayment,
    completeTrade, // PIVOT: Change for FUN-token-only testing - renamed from releaseUsdt
    getMyTrades,
    getPendingTradesForSeller
} from '../controllers/tradeController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateTradeInitiation } from '../validators/tradeValidators.js';

const router = express.Router();

// All routes below are protected
router.use(authenticate);

// @route   POST /api/trades/initiate
// @desc    A buyer starts a trade from a listing
// @access  Private (Buyers only)
router.post('/initiate', authorize('buyer'), validateTradeInitiation, initiateTrade);

// @route   GET /api/trades/my-trades
// @desc    Get user's trades with optional filters
// @access  Private
router.get('/my-trades', getMyTrades);

// @route   GET /api/trades/pending-for-me
// @desc    Get pending trades where current user is the seller
// @access  Private (Sellers only)
router.get('/pending-for-me', authorize('seller', 'buyer'), getPendingTradesForSeller);

// @route   GET /api/trades/:id
// @desc    Get details of a single trade
// @access  Private (Participants only)
router.get('/:id', getTradeDetails);

// @route   POST /api/trades/:id/accept
// @desc    Seller accepts a trade request
// @access  Private (Seller of this trade only)
router.post('/:id/accept', authorize('seller'), acceptTrade);

// @route   POST /api/trades/:id/confirm-payment
// @desc    Buyer confirms they have sent the fiat payment
// @access  Private (Buyer of this trade only)
router.post('/:id/confirm-payment', authorize('buyer'), confirmPayment);

// @route   POST /api/trades/:id/complete-trade
// @desc    Seller completes the FUN-for-FUN token swap
// @access  Private (Seller of this trade only)
router.post('/:id/complete-trade', authorize('seller'), completeTrade); // PIVOT: Change for FUN-token-only testing - updated route and function

export default router;
