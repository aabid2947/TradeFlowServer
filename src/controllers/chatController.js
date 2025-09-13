import mongoose from 'mongoose';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * @desc    Get or create a chat between two users
 * @route   POST /api/chats/start
 * @access  Private
 */
export const startChat = async (req, res, next) => {
  try {
    const { participantId, tradeId } = req.body;
    const currentUserId = req.user._id;

    // Validate participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return next(new AppError('Participant not found.', 404));
    }

    // Can't chat with yourself
    if (participantId === currentUserId.toString()) {
      return next(new AppError('Cannot start chat with yourself.', 400));
    }

    // Check if chat already exists between these users
    let chat = await Chat.findOne({
      participants: { $all: [currentUserId, participantId] }
    }).populate('participants', 'username email')
      .populate('lastMessage');

    // If chat doesn't exist, create new one
    if (!chat) {
      chat = new Chat({
        participants: [currentUserId, participantId],
        tradeId: tradeId || undefined
      });
      await chat.save();
      
      // Populate the participants after saving
      await chat.populate('participants', 'username email');
    }

    res.status(200).json({
      success: true,
      message: 'Chat started successfully.',
      data: chat
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all chats for current user
 * @route   GET /api/chats
 * @access  Private
 */
export const getUserChats = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    const chats = await Chat.find({
      participants: currentUserId,
      isActive: true
    })
    .populate('participants', 'username email')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

    const total = await Chat.countDocuments({
      participants: currentUserId,
      isActive: true
    });

    res.status(200).json({
      success: true,
      data: {
        chats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get chat details by ID
 * @route   GET /api/chats/:chatId
 * @access  Private
 */
export const getChatDetails = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId)
      .populate('participants', 'username email')
      .populate('lastMessage');

    if (!chat) {
      return next(new AppError('Chat not found.', 404));
    }

    // Check if user is participant in this chat
    const isParticipant = chat.participants.some(
      participant => participant._id.toString() === currentUserId.toString()
    );

    if (!isParticipant) {
      return next(new AppError('You are not authorized to view this chat.', 403));
    }

    res.status(200).json({
      success: true,
      data: chat
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send a message in a chat
 * @route   POST /api/chats/:chatId/messages
 * @access  Private
 */
export const sendMessage = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { chatId } = req.params;
    const { content, messageType = 'text' } = req.body;
    const senderId = req.user._id;

    // Validate chat exists and user is participant
    const chat = await Chat.findById(chatId).session(session);
    if (!chat) {
      throw new AppError('Chat not found.', 404);
    }

    const isParticipant = chat.participants.some(
      participantId => participantId.toString() === senderId.toString()
    );

    if (!isParticipant) {
      throw new AppError('You are not authorized to send messages in this chat.', 403);
    }

    // Get receiver ID (the other participant)
    const receiverId = chat.participants.find(
      participantId => participantId.toString() !== senderId.toString()
    );

    // Create message
    const message = new Message({
      chatId,
      senderId,
      receiverId,
      content,
      messageType
    });

    await message.save({ session });

    // Update chat's last message and timestamp
    chat.lastMessage = message._id;
    chat.lastMessageAt = new Date();
    await chat.save({ session });

    await session.commitTransaction();

    // Populate sender info for response
    await message.populate('senderId', 'username email');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully.',
      data: message
    });

  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get messages in a chat
 * @route   GET /api/chats/:chatId/messages
 * @access  Private
 */
export const getChatMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const currentUserId = req.user._id;

    // Validate chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return next(new AppError('Chat not found.', 404));
    }

    const isParticipant = chat.participants.some(
      participantId => participantId.toString() === currentUserId.toString()
    );

    if (!isParticipant) {
      return next(new AppError('You are not authorized to view messages in this chat.', 403));
    }

    // Get messages with pagination (newest first)
    const messages = await Message.find({ chatId })
      .populate('senderId', 'username email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({ chatId });

    res.status(200).json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark messages as read
 * @route   PATCH /api/chats/:chatId/messages/read
 * @access  Private
 */
export const markMessagesAsRead = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user._id;

    // Validate chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return next(new AppError('Chat not found.', 404));
    }

    const isParticipant = chat.participants.some(
      participantId => participantId.toString() === currentUserId.toString()
    );

    if (!isParticipant) {
      return next(new AppError('You are not authorized to access this chat.', 403));
    }

    // Mark all unread messages where current user is receiver as read
    const result = await Message.updateMany(
      {
        chatId,
        receiverId: currentUserId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} messages marked as read.`,
      data: {
        markedCount: result.modifiedCount
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get unread message count for user
 * @route   GET /api/chats/unread-count
 * @access  Private
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const currentUserId = req.user._id;

    const unreadCount = await Message.countDocuments({
      receiverId: currentUserId,
      isRead: false
    });

    res.status(200).json({
      success: true,
      data: {
        unreadCount
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a chat (mark as inactive)
 * @route   DELETE /api/chats/:chatId
 * @access  Private
 */
export const deleteChat = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return next(new AppError('Chat not found.', 404));
    }

    const isParticipant = chat.participants.some(
      participantId => participantId.toString() === currentUserId.toString()
    );

    if (!isParticipant) {
      return next(new AppError('You are not authorized to delete this chat.', 403));
    }

    // Mark chat as inactive instead of actually deleting
    chat.isActive = false;
    await chat.save();

    res.status(200).json({
      success: true,
      message: 'Chat deleted successfully.'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Store message from Firebase for reference
 * @route   POST /api/chats/store-message
 * @access  Private
 */
export const storeMessage = async (req, res, next) => {
  try {
    const { 
      chatId, 
      senderId, 
      receiverId, 
      content, 
      messageType = 'text',
      firebaseMessageId 
    } = req.body;
    
    const currentUserId = req.user._id.toString();

    // Verify sender is the current user
    if (senderId !== currentUserId) {
      return next(new AppError('You can only send messages as yourself.', 403));
    }

    // Parse the chatId to get participant IDs
    const participantIds = chatId.split('_');
    if (participantIds.length !== 2 || 
        (!participantIds.includes(senderId) || !participantIds.includes(receiverId))) {
      return next(new AppError('Invalid chat ID format.', 400));
    }

    // Find or create chat document
    let chat = await Chat.findOne({
      participants: { $all: [senderId, receiverId] }
    });

    if (!chat) {
      // Create new chat if it doesn't exist
      chat = new Chat({
        participants: [senderId, receiverId],
        lastMessageAt: new Date()
      });
      await chat.save();
    }

    // Create message document for reference
    const message = new Message({
      chatId: chat._id,
      senderId,
      receiverId,
      content,
      messageType,
      firebaseMessageId // Store Firebase message ID for reference
    });

    await message.save();

    // Update chat's last message info
    chat.lastMessage = message._id;
    chat.lastMessageAt = new Date();
    await chat.save();

    res.status(201).json({
      success: true,
      message: 'Message stored successfully.',
      data: {
        messageId: message._id,
        chatId: chat._id
      }
    });

  } catch (error) {
    // Don't fail if storage fails - Firebase is the primary storage
    console.error('Message storage error:', error);
    res.status(200).json({
      success: true,
      message: 'Message processed (storage warning).',
      warning: error.message
    });
  }
};
