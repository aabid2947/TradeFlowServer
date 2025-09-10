import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware to verify JWT token
export const authenticate = async (req, res, next) => {
  try {
    let token;
    
    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
     
    }
    
    if (!token) {
      console.error('No token provided in request headers');
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }
    
    try {
      // Verify token
    
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Get user from token
      const user = await User.findById(decoded.id).select('-password -refreshTokens');

      if (!user) {
        console.error('User not found for token:', decoded);
        return res.status(401).json({
          success: false,
          message: 'Token is not valid. User not found.'
        });
      }
      
      if (!user.isActive) {
        console.log('Attempt to access with deactivated account:', user._id);
        return res.status(401).json({
          success: false,
          message: 'Account has been deactivated.'
        });
      }
      
      // Add user to request object
      req.user = user;
      next();
      
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired.',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token.'
        });
      } else {
        throw jwtError;
      }
    }
    
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

// Middleware to check if user has specific role
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.error('Authorization attempted without authenticated user');
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not authenticated.'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      console.error(`User role ${req.user.role} not authorized for this action`);
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }
    
    next();
  };
};

// Middleware to verify refresh token
export const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      console.error('No refresh token provided in request body');
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required.'
      });
    }
    
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
        issuer: 'p2pserver',
        audience: 'p2pserver-users'
      });
      
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token type.'
        });
      }
      
      // Find user and check if refresh token exists
      const user = await User.findOne({
        _id: decoded.id,
        'refreshTokens.token': refreshToken,
        isActive: true
      });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token.'
        });
      }
      
      req.user = user;
      req.refreshToken = refreshToken;
      next();
      
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Refresh token has expired.',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token.'
        });
      }
    }
    
  } catch (error) {
    console.error('Refresh token verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during token verification.'
    });
  }
};

// Middleware to check if user owns the resource or is admin
export const checkOwnership = (resourceIdField = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not authenticated.'
      });
    }
    
    const resourceId = req.params[resourceIdField];
    const userId = req.user._id.toString();
    
    // Allow if user owns the resource or is accessing their own data
    if (resourceId === userId || req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }
  };
};
