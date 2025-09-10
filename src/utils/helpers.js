import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Generate random token
export const generateRandomToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate secure password reset token
export const generatePasswordResetToken = () => {
  const resetToken = crypto.randomBytes(20).toString('hex');
  
  // Hash token and set expiry
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  return { resetToken, hashedToken, expires };
};

// Generate email verification token
export const generateEmailVerificationToken = () => {
  const verificationToken = crypto.randomBytes(20).toString('hex');
  
  const hashedToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  return { verificationToken, hashedToken, expires };
};

// Verify JWT token without throwing error
export const verifyTokenSafe = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};

// Format user data for response (remove sensitive fields)
export const formatUserResponse = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  delete userObj.password;
  delete userObj.refreshTokens;
  delete userObj.passwordResetToken;
  delete userObj.passwordResetExpires;
  delete userObj.emailVerificationToken;
  delete userObj.emailVerificationExpires;
  delete userObj.loginAttempts;
  delete userObj.lockUntil;
  return userObj;
};

// Calculate pagination metadata
export const calculatePagination = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 10;
  const totalItems = parseInt(total);
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;
  
  return {
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    hasNextPage,
    hasPreviousPage
  };
};

// Sanitize search query
export const sanitizeSearchQuery = (query) => {
  if (!query || typeof query !== 'string') return '';
  
  // Remove special characters that could be used for injection
  return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
};

// Generate API response format
export const apiResponse = (success, message, data = null, statusCode = 200) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return { response, statusCode };
};

// Validate MongoDB ObjectId
export const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Generate username suggestions
export const generateUsernameSuggestions = (baseUsername, existingUsernames = []) => {
  const suggestions = [];
  const base = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  if (!existingUsernames.includes(base)) {
    suggestions.push(base);
  }
  
  // Add numbers
  for (let i = 1; i <= 5; i++) {
    const suggestion = `${base}${i}`;
    if (!existingUsernames.includes(suggestion)) {
      suggestions.push(suggestion);
    }
  }
  
  // Add random numbers
  for (let i = 0; i < 3; i++) {
    const randomNum = Math.floor(Math.random() * 1000);
    const suggestion = `${base}${randomNum}`;
    if (!existingUsernames.includes(suggestion)) {
      suggestions.push(suggestion);
    }
  }
  
  return suggestions.slice(0, 5);
};
