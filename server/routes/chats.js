const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// ✅ Correct upload path for Railway
const uploadPath = path.join(__dirname, '../uploads');

// ✅ Configure multer properly
const upload = multer({
  dest: uploadPath,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const {
  getOrCreatePrivateChat,
  getUserChats,
  createGroupChat,
  getChatById,
  addGroupParticipant,
  leaveGroup
} = require('../controllers/chatController');

// Routes
router.get('/', authenticate, getUserChats);
router.post('/private/:userId', authenticate, getOrCreatePrivateChat);
router.post('/group', authenticate, upload.single('avatar'), createGroupChat);
router.get('/:chatId', authenticate, getChatById);
router.post('/:chatId/participants', authenticate, addGroupParticipant);
router.delete('/:chatId/leave', authenticate, leaveGroup);

module.exports = router;