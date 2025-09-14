import express from 'express';
import User from '../models/User.js';
import {
  register,
  login,
  googleAuth,
  refreshToken,
  logout,
  logoutAll,
  getProfile,
  getDashboardStats,
  updateProfile,
  changePassword,
  getAllUsers,
  transferTokens,
  deactivateAccount,
  completeProfile
} from '../controllers/userController.js';
import {
  authenticate,
  authorize,
  verifyRefreshToken,
  checkOwnership
} from '../middleware/auth.js';
import {
  validateRegistration,
  validateLogin,
  validateGoogleAuth,
  validatePasswordChange,
  validateProfileUpdate,
  validateTokenTransfer
} from '../validators/userValidators.js';

const router = express.Router();

// Public routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);
router.post('/google-auth', validateGoogleAuth, googleAuth);
router.post('/refresh-token', verifyRefreshToken, refreshToken);

// Protected routes (require authentication)
router.use(authenticate); // Apply authentication middleware to all routes below

// User profile routes
router.get('/profile', getProfile);
router.get('/dashboard-stats', getDashboardStats);
router.put('/profile', validateProfileUpdate, updateProfile);
router.put('/change-password', validatePasswordChange, changePassword);
router.post('/complete-profile', completeProfile);

// Logout routes
router.post('/logout', logout);
router.post('/logout-all', logoutAll);

// Token transfer
router.post('/transfer-tokens', validateTokenTransfer, transferTokens);

// Account management
router.put('/deactivate', deactivateAccount);

// Admin routes
router.get('/all', authorize('admin'), getAllUsers);

// User-specific routes (user can only access their own data)
router.get('/:id', checkOwnership('id'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshTokens');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
