const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: '../uploads/', limits: { fileSize: 5 * 1024 * 1024 } });
const {
  getOrCreatePrivateChat,
  getUserChats,
  createGroupChat,
  getChatById,
  addGroupParticipant,
  leaveGroup
} = require('../controllers/chatController');

router.get('/', authenticate, getUserChats);
router.post('/private/:userId', authenticate, getOrCreatePrivateChat);
router.post('/group', authenticate, upload.single('avatar'), createGroupChat);
router.get('/:chatId', authenticate, getChatById);
router.post('/:chatId/participants', authenticate, addGroupParticipant);
router.delete('/:chatId/leave', authenticate, leaveGroup);

module.exports = router;
