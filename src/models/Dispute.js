import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema({
  tradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    required: true,
    unique: true,
  },
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reason: {
    type: String,
    required: [true, 'A reason for the dispute is required.'],
    maxlength: 1000,
  },
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved'],
    default: 'open',
    index: true,
  },
  resolution: {
    type: String,
    maxlength: 2000,
  },
  resolvedBy: { // Admin who resolved it
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  winner: { // ID of the user who won the dispute
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
  }
}, { timestamps: true });

const Dispute = mongoose.model('Dispute', disputeSchema);
export default Dispute;
