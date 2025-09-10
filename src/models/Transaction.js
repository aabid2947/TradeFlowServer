import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'purchase_fun',   // Buying FUN tokens with fiat
      'withdrawal_fun', // Cashing out FUN tokens to fiat
      'trade_debit',    // FUN tokens sent as buyer
      'trade_credit',   // FUN tokens received as seller
      'usdt_deposit',   // USDT deposited from external wallet
      'usdt_withdrawal',// USDT sent to external wallet
    ],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    enum: ['FUN', 'USDT', 'INR'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  tradeId: { // Link to a trade if applicable
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
  },
  paymentGatewayDetails: {
    type: Object, // To store details from Razorpay, etc.
  },
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
