import express from 'express';
import { createOrder, verifyPayment, verifyPaymentByFrontend, withdrawFunTokens, getWithdrawalHistory } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { validateTokenPurchase, validateTokenWithdrawal } from '../validators/paymentValidators.js';

const router = express.Router();

// @route   POST /api/payments/create-order
// @desc    Create a payment order to buy FUN tokens
// @access  Private
// This route is called by the frontend when a user wants to buy tokens.
router.post('/create-order', authenticate, validateTokenPurchase, createOrder);

// @route   POST /api/payments/verify-payment
// @desc    Verify Razorpay payment and credit FUN tokens
// @access  Private
// This route is called by the frontend after successful Razorpay payment.
router.post('/verify-payment', authenticate, verifyPaymentByFrontend);

// @route   POST /api/payments/withdraw
// @desc    Withdraw FUN tokens to bank account
// @access  Private
// This route allows users to withdraw their FUN tokens as INR to their bank account
router.post('/withdraw', authenticate, validateTokenWithdrawal, withdrawFunTokens);

// @route   GET /api/payments/withdrawals
// @desc    Get withdrawal history for user
// @access  Private
// This route returns the user's withdrawal transaction history
router.get('/withdrawals', authenticate, getWithdrawalHistory);

// @route   POST /api/payments/webhook/razorpay
// @desc    Razorpay webhook for payment confirmation (deprecated - use verify-payment instead)
// @access  Public
// This route is called by Razorpay's servers, not by the user's browser.
router.post('/webhook/razorpay', verifyPayment);

export default router;
