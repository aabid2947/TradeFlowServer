import User from '../models/User.js';
import { generateRandomToken, formatUserResponse } from '../utils/helpers.js';
import { AppError } from '../middleware/errorHandler.js';

class UserService {
  // Create a new user
  static async createUser(userData) {
    try {
      const user = new User(userData);
      await user.save();
      return formatUserResponse(user);
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  static async findUserById(userId) {
    try {
      const user = await User.findById(userId).select('-password -refreshTokens');
      if (!user) {
        throw new AppError('User not found', 404);
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Find user by email
  static async findUserByEmail(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Find user by username
  static async findUserByUsername(username) {
    try {
      const user = await User.findOne({ username });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Update user by ID
  static async updateUser(userId, updateData) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password -refreshTokens');
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Delete user by ID (soft delete)
  static async deleteUser(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false, refreshTokens: [] },
        { new: true }
      );
      
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  // Get users with pagination and filters
  static async getUsers(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search = ''
      } = options;

      // Build query
      const query = { isActive: true, ...filters };
      
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { businessName: { $regex: search, $options: 'i' } }
        ];
      }

      // Calculate skip
      const skip = (page - 1) * limit;

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Execute query
      const [users, total] = await Promise.all([
        User.find(query)
          .select('-password -refreshTokens')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        User.countDocuments(query)
      ]);

      return {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Transfer tokens between users
  static async transferTokens(senderId, recipientId, amount) {
    try {
      // Use transaction for atomic operation
      const session = await User.startSession();
      
      try {
        await session.withTransaction(async () => {
          const sender = await User.findById(senderId).session(session);
          const recipient = await User.findById(recipientId).session(session);

          if (!sender || !recipient) {
            throw new AppError('User not found', 404);
          }

          if (sender.token < amount) {
            throw new AppError('Insufficient tokens', 400);
          }

          sender.token -= amount;
          recipient.token += amount;

          await sender.save({ session });
          await recipient.save({ session });
        });

        return { success: true };
      } finally {
        await session.endSession();
      }
    } catch (error) {
      throw error;
    }
  }

  // Add tokens to user
  static async addTokens(userId, amount) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $inc: { token: amount } },
        { new: true, runValidators: true }
      ).select('-password -refreshTokens');

      if (!user) {
        throw new AppError('User not found', 404);
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Get user statistics
  static async getUserStats() {
    try {
      const stats = await User.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            totalBuyers: {
              $sum: { $cond: [{ $eq: ['$role', 'buyer'] }, 1, 0] }
            },
            totalSellers: {
              $sum: { $cond: [{ $eq: ['$role', 'seller'] }, 1, 0] }
            },
            totalTokens: { $sum: '$token' },
            averageTokens: { $avg: '$token' }
          }
        }
      ]);

      return stats[0] || {
        totalUsers: 0,
        totalBuyers: 0,
        totalSellers: 0,
        totalTokens: 0,
        averageTokens: 0
      };
    } catch (error) {
      throw error;
    }
  }

  // Clean up expired refresh tokens
  static async cleanupExpiredTokens() {
    try {
      const result = await User.updateMany(
        {},
        {
          $pull: {
            refreshTokens: {
              createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
          }
        }
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  // Verify user account
  static async verifyAccount(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isVerified: true },
        { new: true }
      ).select('-password -refreshTokens');

      if (!user) {
        throw new AppError('User not found', 404);
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Get users by role
  static async getUsersByRole(role, options = {}) {
    try {
      return await this.getUsers({ role }, options);
    } catch (error) {
      throw error;
    }
  }

  // Search users
  static async searchUsers(searchTerm, options = {}) {
    try {
      const { limit = 10 } = options;
      
      const users = await User.find({
        isActive: true,
        $or: [
          { username: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { businessName: { $regex: searchTerm, $options: 'i' } }
        ]
      })
      .select('username email role businessName profilePicture')
      .limit(limit);

      return users;
    } catch (error) {
      throw error;
    }
  }
}

export default UserService;
