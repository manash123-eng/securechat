const Message = require('../models/Message');
const Chat = require('../models/Chat');
const CryptoJS = require('crypto-js');

// Must match socketHandler.js exactly — pad/truncate to 32 bytes
const getRawKey = () => {
  const key = process.env.ENCRYPTION_KEY || 'securechat-default-key-32chars!!';
  return CryptoJS.enc.Utf8.parse(key.padEnd(32, '0').substring(0, 32));
};

const encryptMessage = (text) => {
  try {
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(text, getRawKey(), {
      iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
    });
    return { encryptedContent: encrypted.toString(), iv: iv.toString() };
  } catch { return { encryptedContent: null, iv: null }; }
};

const decryptMessage = (encryptedContent, ivStr) => {
  try {
    if (!encryptedContent || !ivStr) return '';
    const iv = CryptoJS.enc.Hex.parse(ivStr);
    const decrypted = CryptoJS.AES.decrypt(encryptedContent, getRawKey(), {
      iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8) || '';
  } catch { return ''; }
};

const getChatMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const chat = await Chat.findOne({ _id: chatId, 'participants.user': req.user._id });
    if (!chat) return res.status(403).json({ error: 'Access denied' });

    const messages = await Message.find({
      chat: chatId,
      deletedFor: { $nin: [req.user._id] }
    })
      .populate('sender', 'username displayName avatar')
      .populate({ path: 'replyTo', populate: { path: 'sender', select: 'username displayName' } })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const decrypted = messages.map(msg => {
      const m = msg.toObject();
      if (m.encryptedContent && m.iv) {
        const plain = decryptMessage(m.encryptedContent, m.iv);
        if (plain) m.content = plain;
        delete m.encryptedContent;
        delete m.iv;
      }
      return m;
    });

    // Mark as read
    const myId = req.user._id.toString();
    const unreadIds = messages
      .filter(m => m.sender?._id?.toString() !== myId && !m.readBy?.some(r => r.user?.toString() === myId))
      .map(m => m._id);

    if (unreadIds.length) {
      await Message.updateMany(
        { _id: { $in: unreadIds } },
        { $push: { readBy: { user: req.user._id, readAt: new Date() } } }
      );
    }

    res.json({ messages: decrypted.reverse(), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

const sendMessage = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { content, type = 'text', replyTo } = req.body;

    const chat = await Chat.findOne({ _id: chatId, 'participants.user': req.user._id });
    if (!chat) return res.status(403).json({ error: 'Access denied' });

    const messageData = {
      chat: chatId,
      sender: req.user._id,
      type,
      replyTo: replyTo || null,
      readBy: [],
      deliveredTo: [],
      reactions: []
    };

    if (content && type === 'text') {
      const { encryptedContent, iv } = encryptMessage(content);
      if (encryptedContent) { messageData.encryptedContent = encryptedContent; messageData.iv = iv; }
      messageData.content = content;
    }

    if (req.file) {
      messageData.mediaUrl  = `/uploads/${req.file.filename}`;
      messageData.mediaType = req.file.mimetype;
      messageData.mediaSize = req.file.size;
      messageData.mediaName = req.file.originalname;
    }

    let message = await Message.create(messageData);
    message = await Message.findById(message._id)
      .populate('sender', 'username displayName avatar')
      .populate({ path: 'replyTo', populate: { path: 'sender', select: 'username displayName' } });

    await Chat.findByIdAndUpdate(chatId, { lastMessage: message._id, lastActivity: new Date() });

    const msgObj = message.toObject();
    delete msgObj.encryptedContent;
    delete msgObj.iv;

    res.status(201).json({ message: msgObj });
  } catch (err) { next(err); }
};

const editMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const message = await Message.findOne({ _id: messageId, sender: req.user._id, isDeleted: false });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.type !== 'text') return res.status(400).json({ error: 'Can only edit text messages' });

    const { encryptedContent, iv } = encryptMessage(content);
    message.encryptedContent = encryptedContent;
    message.iv = iv;
    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const msgObj = message.toObject();
    delete msgObj.encryptedContent;
    delete msgObj.iv;
    res.json({ message: msgObj });
  } catch (err) { next(err); }
};

const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { forEveryone = false } = req.body;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    const isSender = message.sender.toString() === req.user._id.toString();
    if (forEveryone && isSender) {
      message.isDeleted = true;
      message.deletedAt = new Date();
      message.content = '';
      message.encryptedContent = null;
      message.mediaUrl = null;
    } else {
      if (!message.deletedFor.includes(req.user._id)) message.deletedFor.push(req.user._id);
    }
    await message.save();
    res.json({ message: 'Deleted', messageId, forEveryone: forEveryone && isSender });
  } catch (err) { next(err); }
};

const searchMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.status(400).json({ error: 'Query too short' });

    const chat = await Chat.findOne({ _id: chatId, 'participants.user': req.user._id });
    if (!chat) return res.status(403).json({ error: 'Access denied' });

    const messages = await Message.find({
      chat: chatId, type: 'text', isDeleted: false,
      deletedFor: { $nin: [req.user._id] }
    })
      .populate('sender', 'username displayName avatar')
      .sort({ createdAt: -1 })
      .limit(300);

    const results = messages
      .map(msg => {
        const m = msg.toObject();
        if (m.encryptedContent && m.iv) {
          m.content = decryptMessage(m.encryptedContent, m.iv);
          delete m.encryptedContent; delete m.iv;
        }
        return m;
      })
      .filter(m => m.content?.toLowerCase().includes(q.toLowerCase()));

    res.json({ messages: results.slice(0, 50) });
  } catch (err) { next(err); }
};

const markAsRead = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    await Message.updateMany(
      { chat: chatId, sender: { $ne: req.user._id }, 'readBy.user': { $ne: req.user._id } },
      { $push: { readBy: { user: req.user._id, readAt: new Date() } } }
    );
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
};

module.exports = { getChatMessages, sendMessage, editMessage, deleteMessage, searchMessages, markAsRead };
