import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  permissions: {
    canManageKYC: { type: Boolean, default: false },
    canResolveDisputes: { type: Boolean, default: false },
    canViewTransactions: { type: Boolean, default: true },
    canManageUsers: { type: Boolean, default: false },
  },
  twoFactorAuth: {
    secret: String,
    isEnabled: { type: Boolean, default: false },
  },
  lastLogin: Date,
  activityLogs: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

adminSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

adminSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

adminSchema.methods.generateToken = function() {
    return jwt.sign({ id: this._id, type: 'admin' }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_ADMIN_EXPIRE || '8h'
    });
};

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
