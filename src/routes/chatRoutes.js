import express from 'express';
import {
  startChat,
  getUserChats,
  getChatDetails,
  sendMessage,
  getChatMessages,
  markMessagesAsRead,
  getUnreadCount,
  deleteChat,
  storeMessage
} from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';
import { validateChatCreation, validateMessageSending } from '../validators/chatValidators.js';

const router = express.Router();

// All routes below are protected
router.use(authenticate);

// @route   POST /api/chats/start
// @desc    Start or get existing chat between two users
// @access  Private
router.post('/start', validateChatCreation, startChat);

// @route   POST /api/chats/store-message
// @desc    Store message from Firebase for reference
// @access  Private
router.post('/store-message', storeMessage);

// @route   GET /api/chats/unread-count
// @desc    Get unread message count for current user
// @access  Private
router.get('/unread-count', getUnreadCount);

// @route   GET /api/chats
// @desc    Get all chats for current user
// @access  Private
router.get('/', getUserChats);

// @route   GET /api/chats/:chatId
// @desc    Get chat details by ID
// @access  Private
router.get('/:chatId', getChatDetails);

// @route   POST /api/chats/:chatId/messages
// @desc    Send a message in a chat
// @access  Private
router.post('/:chatId/messages', validateMessageSending, sendMessage);

// @route   GET /api/chats/:chatId/messages
// @desc    Get messages in a chat
// @access  Private
router.get('/:chatId/messages', getChatMessages);

// @route   PATCH /api/chats/:chatId/messages/read
// @desc    Mark messages as read
// @access  Private
router.patch('/:chatId/messages/read', markMessagesAsRead);

// @route   DELETE /api/chats/:chatId
// @desc    Delete a chat (mark as inactive)
// @access  Private
router.delete('/:chatId', deleteChat);

export default router;
