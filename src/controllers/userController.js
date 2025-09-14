import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';
import jwt from 'jsonwebtoken';

// Register a new user
export const register = async (req, res, next) => {
  try {
    const {  email, password, role, businessName, phoneNumber, address, firebaseUid } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return next(new AppError('Email already registered', 400));
      }
     
    }

    // Create user object - for regular signup without role, profile is incomplete
    const userData = {
      email,
      password,
      phoneNumber,
      address,
      isProfileComplete: !!role // Profile is complete only if role is provided (onboarding flow)
    };

    // Add role if provided (from onboarding)
    if (role) {
      userData.role = role;
    }

    // Add Firebase UID if provided
    if (firebaseUid) {
      userData.firebaseUid = firebaseUid;
    }

    // Add business name for sellers
    if (role === 'seller' && businessName) {
      userData.businessName = businessName;
    }

    // Create user
    const user = await User.create(userData);

    // Generate tokens
    const token = user.generateToken();
    const refreshToken = user.generateRefreshToken();

    // Save refresh token to user
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    // Remove password from response
    user.password = undefined;
    user.refreshTokens = undefined;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token,
        refreshToken
      }
    });

  } catch (error) {
    next(error);
  }
};

// Login user
export const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    // Authenticate user
    console.log(identifier)
    const user = await User.getAuthenticated(identifier, password);
    console.log(user)
    // Generate tokens
    const token = user.generateToken();
    const refreshToken = user.generateRefreshToken();

    // Save refresh token to user
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    // Remove sensitive data from response
    user.password = undefined;
    user.refreshTokens = undefined;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
        refreshToken
      }
    });

  } catch (error) {
    next(new AppError(error.message, 401));
  }
};

// Google authentication
export const googleAuth = async (req, res, next) => {
  try {
    const { email, displayName, photoURL, uid } = req.body;

    if (!email || !uid) {
      return next(new AppError('Email and UID are required for Google authentication', 400));
    }

    // Check if user already exists
    let user = await User.findOne({ 
      $or: [
        { email: email },
        { googleId: uid }
      ]
    });

    if (user) {
      // Update Google ID if not set
      if (!user.googleId) {
        user.googleId = uid;
        await user.save();
      }
    } else {
      // Create new user for Google sign-in
      const userData = {
        email: email,
        username: email.split('@')[0] + '_' + Date.now(), // Generate unique username
        displayName: displayName || email.split('@')[0],
        photoURL: photoURL,
        googleId: uid,
        role: 'buyer', // Default role
        isVerified: true, // Google accounts are pre-verified
        authProvider: 'google',
        isProfileComplete: false // New users need to complete profile
      };

      user = await User.create(userData);
    }

    // Generate tokens
    const token = user.generateToken();
    const refreshToken = user.generateRefreshToken();

    // Save refresh token to user
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    // Remove sensitive data from response
    user.password = undefined;
    user.refreshTokens = undefined;

    res.json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user,
        token,
        refreshToken
      }
    });

  } catch (error) {
    next(error);
  }
};

// Refresh access token
export const refreshToken = async (req, res, next) => {
  try {
    const user = req.user;
    const oldRefreshToken = req.refreshToken;

    // Generate new tokens
    const newToken = user.generateToken();
    const newRefreshToken = user.generateRefreshToken();

    // Remove old refresh token and add new one
    user.refreshTokens = user.refreshTokens.filter(
      tokenObj => tokenObj.token !== oldRefreshToken
    );
    user.refreshTokens.push({ token: newRefreshToken });
    await user.save();

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    next(error);
  }
};

// Logout user
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user._id;

    // Remove refresh token from user
    await User.updateOne(
      { _id: userId },
      { $pull: { refreshTokens: { token: refreshToken } } }
    );

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    next(error);
  }
};

// Logout from all devices
export const logoutAll = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Remove all refresh tokens
    await User.updateOne(
      { _id: userId },
      { $set: { refreshTokens: [] } }
    );

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });

  } catch (error) {
    next(error);
  }
};

// Get current user profile
export const getProfile = async (req, res, next) => {
  try {
    console.log(90)
    const user = await User.findById(req.user._id).select('-refreshTokens');
    console.log(user)

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    next(error);
  }
};

// Get dashboard statistics
export const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select('balances');

    // For now, we'll return basic stats based on user data
    // In a real app, you'd calculate these from actual trade/listing data
    const stats = [
      {
        title: "Total Balance",
        value: `${(user.balances.funToken + user.balances.usdt).toFixed(2)} tokens`,
        change: "+12.5%",
        changeValue: "+1,234 tokens",
        color: "text-green-600",
        bgGradient: "from-green-50 via-green-25 to-white",
        iconBg: "bg-green-100 group-hover:bg-green-200",
        borderColor: "hover:border-green-300",
        shadowColor: "hover:shadow-green-200/50",
        icon: "Wallet"
      },
      {
        title: "Active Trades", 
        value: "0", // This would come from actual trade data
        change: "+0",
        changeValue: "this week",
        color: "text-violet-600",
        bgGradient: "from-violet-50 via-violet-25 to-white",
        iconBg: "bg-violet-100 group-hover:bg-violet-200",
        borderColor: "hover:border-violet-300", 
        shadowColor: "hover:shadow-violet-200/50",
        icon: "TrendingUp"
      },
      {
        title: "P2P Volume",
        value: `${user.balances.funToken.toFixed(2)} FUN`,
        change: "+0%",
        changeValue: "vs last month",
        color: "text-cyan-600",
        bgGradient: "from-cyan-50 via-cyan-25 to-white",
        iconBg: "bg-cyan-100 group-hover:bg-cyan-200",
        borderColor: "hover:border-cyan-300",
        shadowColor: "hover:shadow-cyan-200/50",
        icon: "Coins"
      },
      {
        title: "USDT Balance",
        value: `${user.balances.usdt.toFixed(2)} USDT`,
        change: "0%",
        changeValue: "stable",
        color: "text-emerald-600",
        bgGradient: "from-emerald-50 via-emerald-25 to-white",
        iconBg: "bg-emerald-100 group-hover:bg-emerald-200",
        borderColor: "hover:border-emerald-300",
        shadowColor: "hover:shadow-emerald-200/50",
        icon: "Shield"
      }
    ];

    res.json({
      success: true,
      data: { stats }
    });

  } catch (error) {
    next(error);
  }
};

// Update user profile
export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Remove fields that shouldn't be updated this way
    delete updates.password;
    delete updates.role;
    delete updates.token;
    delete updates.refreshTokens;
    delete updates.isActive;
    delete updates.isVerified;

    // Check if username or email is being updated and if they're unique
    if (updates.username || updates.email) {
      const existingUser = await User.findOne({
        _id: { $ne: userId },
        $or: [
          ...(updates.username ? [{ username: updates.username }] : []),
          ...(updates.email ? [{ email: updates.email }] : [])
        ]
      });

      if (existingUser) {
        if (existingUser.username === updates.username) {
          return next(new AppError('Username already taken', 400));
        }
        if (existingUser.email === updates.email) {
          return next(new AppError('Email already registered', 400));
        }
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password -refreshTokens');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });

  } catch (error) {
    next(error);
  }
};

// Change password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Get user with password
    const user = await User.findById(userId).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new AppError('Current password is incorrect', 400));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Remove all refresh tokens to force re-login on all devices
    user.refreshTokens = [];
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again on all devices.'
    });

  } catch (error) {
    next(error);
  }
};

// Get all users (admin only)
export const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const role = req.query.role;
    const search = req.query.search;

    // Build filter
    const filter = { isActive: true };
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Get users
    const users = await User.find(filter)
      .select('-password -refreshTokens')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

// Transfer tokens between users
export const transferTokens = async (req, res, next) => {
  try {
    const { recipientId, amount } = req.body;
    const senderId = req.user._id;

    // Check if sender has enough tokens
    const sender = await User.findById(senderId);
    if (sender.token < amount) {
      return next(new AppError('Insufficient tokens', 400));
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return next(new AppError('Recipient not found', 404));
    }

    // Perform transfer
    sender.token -= amount;
    recipient.token += amount;

    await Promise.all([sender.save(), recipient.save()]);

    res.json({
      success: true,
      message: 'Tokens transferred successfully',
      data: {
        senderBalance: sender.token,
        recipientBalance: recipient.token
      }
    });

  } catch (error) {
    next(error);
  }
};

// Deactivate user account
export const deactivateAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, {
      isActive: false,
      refreshTokens: []
    });

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });

  } catch (error) {
    next(error);
  }
};

// Complete user profile after first-time Google sign-in
export const completeProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { username, role, phoneNumber, address, businessName } = req.body;

    // Check if username is already taken by another user
    const existingUser = await User.findOne({
      username: username,
      _id: { $ne: userId }
    });

    if (existingUser) {
      return next(new AppError('Username already taken', 400));
    }

    // Prepare update data
    const updateData = {
      username,
      role,
      phoneNumber: phoneNumber || undefined,
      address: address || undefined,
      isProfileComplete: true
    };

    // Add business name for sellers
    if (role === 'seller' && businessName) {
      updateData.businessName = businessName;
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -refreshTokens');

    res.json({
      success: true,
      message: 'Profile completed successfully',
      data: {
        user
      }
    });

  } catch (error) {
    next(error);
  }
};

