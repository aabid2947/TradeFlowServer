import Razorpay from 'razorpay';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// Initialize Razorpay client
const inititeRazorpay = () => {
    let razorpay = null;
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        console.log('Razorpay initialized successfully');
    } else {
        console.warn('Warning: Razorpay credentials not found. Payment functionality will not work.');
    }
    return razorpay;
}
// Define the price per FUN token in INR.
// In a real application, this would come from a config file or database.
const PRICE_PER_FUN_TOKEN_INR = 1;

/**
 * @desc    Create a Razorpay order to purchase FUN tokens
 * @route   POST /api/payments/create-order
 * @access  Private
 */
export const createOrder = async (req, res, next) => {
    try {
        // Check if Razorpay is initialized
        const razorpay = inititeRazorpay();
        if (!razorpay) {
            return next(new AppError('Payment service is not configured. Please contact administrator.', 503));
        }

        const { tokenAmount } = req.body;
        const userId = req.user._id;

        if (!tokenAmount || tokenAmount <= 0) {
            return next(new AppError('A valid token amount is required.', 400));
        }

        // KYC check: Ensure user is KYC approved before allowing purchase
        // if (req.user.kyc.status !== 'approved') {
        //     return next(new AppError('KYC verification must be completed to purchase tokens.', 403));
        // }

        const amountInINR = tokenAmount * PRICE_PER_FUN_TOKEN_INR;
        const amountInPaise = amountInINR * 100;

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_${userId.toString().slice(-8)}_${Date.now().toString().slice(-8)}`,
        };

        const order = await razorpay.orders.create(options);

        // Create a pending transaction record in our database
        await Transaction.create({
            userId,
            type: 'purchase_fun',
            amount: tokenAmount,
            currency: 'INR',
            status: 'pending',
            paymentGatewayDetails: {
                razorpayOrderId: order.id,
                amountInPaise: order.amount,
            },
        });
     
        res.status(201).json({
            success: true,
            message: 'Order created successfully.',
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: process.env.RAZORPAY_KEY_ID,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Verify Razorpay payment and credit tokens (called by frontend)
 * @route   POST /api/payments/verify-payment
 * @access  Private
 */
export const verifyPaymentByFrontend = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const userId = req.user._id;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return next(new AppError('Missing required payment details.', 400));
        }

        // Verify the payment signature
        const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const digest = shasum.digest('hex');

        if (digest !== razorpay_signature) {
            console.error('Invalid payment signature');
            return next(new AppError('Invalid payment signature.', 400));
        }

        console.log('Payment signature verified for order:', razorpay_order_id);

        // Find the transaction
        const transaction = await Transaction.findOne({
            'paymentGatewayDetails.razorpayOrderId': razorpay_order_id,
            userId: userId
        });

        if (!transaction) {
            console.error(`Transaction not found for order_id: ${razorpay_order_id}`);
            return next(new AppError('Transaction not found.', 404));
        }

        if (transaction.status === 'completed') {
            return res.status(200).json({
                success: true,
                message: 'Payment already processed.',
                data: {
                    tokensCredited: transaction.amount,
                    transactionId: transaction._id
                }
            });
        }

        // Use database transaction for atomicity
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Update the transaction status and add payment details
            transaction.status = 'completed';
            transaction.paymentGatewayDetails.razorpayPaymentId = razorpay_payment_id;
            transaction.paymentGatewayDetails.razorpaySignature = razorpay_signature;
            await transaction.save({ session });

            // 2. Credit the user's FUN token balance
            const updateResult = await User.updateOne(
                { _id: userId },
                { $inc: { 'balances.funToken': transaction.amount } },
                { session }
            );

            if (updateResult.matchedCount === 0) {
                throw new Error('User not found for balance update');
            }

            await session.commitTransaction();
            console.log(`Successfully credited ${transaction.amount} FUN tokens to user ${userId}`);

            // Get updated user balance
            const updatedUser = await User.findById(userId).select('balances.funToken');

            res.status(200).json({
                success: true,
                message: 'Payment verified and tokens credited successfully.',
                data: {
                    tokensCredited: transaction.amount,
                    newBalance: updatedUser.balances.funToken,
                    transactionId: transaction._id,
                    paymentId: razorpay_payment_id
                }
            });

        } catch (error) {
            await session.abortTransaction();
            console.error(`Failed to process payment for order_id: ${razorpay_order_id}`, error);
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error('Payment verification error:', error);
        next(error);
    }
};

/**
 * @desc    Verify Razorpay payment and credit tokens (webhook - deprecated)
 * @route   POST /api/payments/webhook/razorpay
 * @access  Public (Webhook)
 */
export const verifyPayment = async (req, res, next) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    try {
        console.log('Received Razorpay webhook:', req.body);
        const shasum = crypto.createHmac('sha256', secret);
        shasum.update(JSON.stringify(req.body));
        const digest = shasum.digest('hex');

        if (digest !== signature) {
            return res.status(400).json({ success: false, message: 'Invalid signature.' });
        }
        console.log('Webhook signature verified.');
        const { order_id } = req.body.payload.payment.entity;

        const transaction = await Transaction.findOne({
            'paymentGatewayDetails.razorpayOrderId': order_id,
        });
        console.log('Found transaction for order_id:', order_id, transaction);


        if (!transaction) {
            console.error(`Webhook Error: No transaction found for order_id: ${order_id}`);
            return res.status(404).json({ success: false, message: 'Transaction not found.' });
        }
        console.log('Transaction status:', transaction.status);

        if (transaction.status === 'completed') {
            return res.status(200).json({ success: true, message: 'Transaction already processed.' });
        }
        console.log('Processing transaction for order_id:', order_id);

        // Use a database transaction for atomicity
        const session = await mongoose.startSession();
        session.startTransaction();
        console.log('Database transaction started for order_id:', order_id);

        try {
            // 1. Update the transaction status to 'completed'
            transaction.status = 'completed';
            await transaction.save({ session });
            console.log('Transaction status updated to completed for order_id:', order_id);

            // 2. Credit the user's FUN token balance
            await User.updateOne(
                { _id: transaction.userId },
                { $inc: { 'balances.funToken': transaction.amount } },
                { session }
            );
            console.log('User balance updated for userId:', transaction.userId);

            await session.commitTransaction();
            console.log(`Successfully credited ${transaction.amount} FUN tokens to user ${transaction.userId}`);
        } catch (error) {
            await session.abortTransaction();
            console.error(`Failed to process transaction for order_id: ${order_id}`, error);
            // Don't throw, as Razorpay will retry. Let it fail silently for now.
        } finally {
            session.endSession();
        }

        res.status(200).json({ success: true });

    } catch (error) {
        // Log the error but send a generic response
        console.error('Webhook processing error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
