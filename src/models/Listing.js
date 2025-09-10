import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // PIVOT: Change for FUN-token-only testing - commented out USDT fields
  // usdtAmount: {
  //   type: Number,
  //   required: [true, 'USDT amount is required'],
  //   min: [1, 'Must list at least 1 USDT'],
  // },
  // pricePerUsdt: {
  //   type: Number,
  //   required: [true, 'Price per USDT in FUN tokens is required'],
  //   min: 0,
  // },
  // PIVOT: Change for FUN-token-only testing - new FUN token fields
  funTokenAmount: {
    type: Number,
    required: [true, 'FUN token amount is required'],
    min: [1, 'Must list at least 1 FUN token'],
  },
  priceInFunToken: {
    type: Number,
    required: [true, 'Price in FUN tokens is required'],
    min: [1, 'Price must be at least 1 FUN token'],
  },
  minLimit: {
    type: Number,
    required: true,
    min: 1,
  },
  maxLimit: {
    type: Number,
    required: true,
  },
  paymentMethods: [{
    type: String,
    enum: ['Bank Transfer', 'UPI'],
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed'],
    default: 'active',
    index: true,
  },
}, { timestamps: true });

listingSchema.pre('save', function(next) {
    if (this.minLimit > this.maxLimit) {
        next(new Error('Minimum limit cannot be greater than the maximum limit.'));
    }
    // PIVOT: Change for FUN-token-only testing - updated validation for funTokenAmount
    if (this.maxLimit > this.funTokenAmount) {
        next(new Error('Maximum limit cannot be greater than the total FUN token amount.'));
    }
    next();
});

const Listing = mongoose.model('Listing', listingSchema);
export default Listing;
