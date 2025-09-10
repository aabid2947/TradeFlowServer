import express from 'express';
import { createOrder, verifyPayment, verifyPaymentByFrontend } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { validateTokenPurchase } from '../validators/paymentValidators.js';

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

// @route   POST /api/payments/webhook/razorpay
// @desc    Razorpay webhook for payment confirmation (deprecated - use verify-payment instead)
// @access  Public
// This route is called by Razorpay's servers, not by the user's browser.
router.post('/webhook/razorpay', verifyPayment);

export default router;
