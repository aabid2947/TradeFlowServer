import mongoose from 'mongoose';

const tradeSchema = new mongoose.Schema({
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // PIVOT: Change for FUN-token-only testing - commented out USDT amount
  // usdtAmount: {
  //   type: Number,
  //   required: true,
  // },
  funTokenAmount: {
    type: Number,
    required: true,
  },
  // PIVOT: Change for FUN-token-only testing - added payment amount in FUN tokens
  funTokenPayment: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: [
      'pending',        // PIVOT: Change for FUN-token-only testing - simplified status
      'paid',           // PIVOT: Change for FUN-token-only testing - buyer confirmed payment
      'completed',      // PIVOT: Change for FUN-token-only testing - FUN token swap completed
      'cancelled',      // Trade cancelled by a user
      'disputed',       // Dispute raised
    ],
    default: 'pending',
    index: true,
  },
  // PIVOT: Change for FUN-token-only testing - commented out USDT transaction hash
  // usdtTransactionHash: {
  //   type: String,
  // },
  // PIVOT: Change for FUN-token-only testing - added timestamps for trade lifecycle
  paidAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
}, { timestamps: true });

const Trade = mongoose.model('Trade', tradeSchema);
export default Trade;
