const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { getChatMessages, sendMessage, editMessage, deleteMessage, searchMessages, markAsRead } = require('../controllers/messageController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `media-${unique}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm|mp3|wav|ogg|webm|pdf|doc|docx|zip/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported'));
    }
  }
});

router.get('/:chatId', authenticate, getChatMessages);
router.post('/:chatId', authenticate, upload.single('media'), sendMessage);
router.patch('/:messageId', authenticate, editMessage);
router.delete('/:messageId', authenticate, deleteMessage);
router.get('/:chatId/search/messages', authenticate, searchMessages);
router.post('/:chatId/read', authenticate, markAsRead);

module.exports = router;
