const { authenticateSocket } = require('../middleware/auth');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const User = require('../models/User');
const CryptoJS = require('crypto-js');

// Pad/truncate key to exactly 32 bytes for AES-256
const getRawKey = () => {
  const key = process.env.ENCRYPTION_KEY || 'securechat-default-key-32chars!!';
  return CryptoJS.enc.Utf8.parse(key.padEnd(32, '0').substring(0, 32));
};

const encryptMessage = (text) => {
  try {
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(text, getRawKey(), {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return { encryptedContent: encrypted.toString(), iv: iv.toString() };
  } catch (e) {
    console.error('Encryption error:', e);
    return { encryptedContent: null, iv: null };
  }
};

const decryptMessage = (encryptedContent, ivStr) => {
  try {
    if (!encryptedContent || !ivStr) return '';
    const iv = CryptoJS.enc.Hex.parse(ivStr);
    const decrypted = CryptoJS.AES.decrypt(encryptedContent, getRawKey(), {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8) || '';
  } catch {
    return '';
  }
};

// userId -> Set of socketIds
const onlineUsers = new Map();

const socketHandler = (io) => {
  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 Connected: ${socket.user.username} (${socket.id})`);

    // ── Track online ─────────────────────────────────────────
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    try {
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
      socket.join(`user:${userId}`);

      const chats = await Chat.find({ 'participants.user': userId }).select('_id');
      chats.forEach(c => socket.join(`chat:${c._id}`));

      const user = await User.findById(userId).populate('contacts', '_id');
      (user?.contacts || []).forEach(contact => {
        io.to(`user:${contact._id}`).emit('user:status', {
          userId, isOnline: true, lastSeen: new Date()
        });
      });
    } catch (err) {
      console.error('Connection setup error:', err);
    }

    // ── Send Message ─────────────────────────────────────────
    socket.on('message:send', async (data, callback) => {
      try {
        const { chatId, content, type = 'text', replyTo, mediaUrl, mediaType, mediaSize, mediaName } = data;

        if (!chatId) return callback?.({ error: 'chatId is required' });

        const chat = await Chat.findOne({ _id: chatId, 'participants.user': userId });
        if (!chat) return callback?.({ error: 'Access denied' });

        const messageData = {
          chat: chatId,
          sender: userId,
          type: type || 'text',
          replyTo: replyTo || null,
          readBy: [],
          deliveredTo: [],
          reactions: []
        };

        // Encrypt text content
        if (content && (type === 'text' || !type)) {
          const { encryptedContent, iv } = encryptMessage(content);
          if (encryptedContent) {
            messageData.encryptedContent = encryptedContent;
            messageData.iv = iv;
          }
          // Also store plain for fallback (remove in strict prod)
          messageData.content = content;
        }

        // Media fields
        if (mediaUrl) {
          messageData.mediaUrl = mediaUrl;
          messageData.mediaType = mediaType || '';
          messageData.mediaSize = mediaSize || 0;
          messageData.mediaName = mediaName || 'file';
          messageData.type = type || 'file';
        }

        let message = await Message.create(messageData);
        message = await Message.findById(message._id)
          .populate('sender', 'username displayName avatar')
          .populate({ path: 'replyTo', populate: { path: 'sender', select: 'username displayName' } });

        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: message._id,
          lastActivity: new Date()
        });

        // Build emit object — always include plain content
        const msgObj = message.toObject();
        if (msgObj.encryptedContent && msgObj.iv) {
          const decrypted = decryptMessage(msgObj.encryptedContent, msgObj.iv);
          if (decrypted) msgObj.content = decrypted;
          delete msgObj.encryptedContent;
          delete msgObj.iv;
        }

        // Broadcast to everyone in the chat room
        io.to(`chat:${chatId}`).emit('message:new', msgObj);

        // Notify offline participants
        chat.participants.forEach(p => {
          const pid = p.user.toString();
          if (pid !== userId && !onlineUsers.has(pid)) {
            io.to(`user:${pid}`).emit('notification:new', {
              type: 'message',
              chatId,
              sender: socket.user.displayName || socket.user.username,
              preview: type === 'text' ? (content || '').substring(0, 60) : `Sent a ${type}`
            });
          }
        });

        callback?.({ success: true, message: msgObj });
      } catch (err) {
        console.error('❌ message:send error:', err);
        callback?.({ error: err.message || 'Failed to send message' });
      }
    });

    // ── Typing ───────────────────────────────────────────────
    socket.on('typing:start', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing:start', {
        chatId, userId,
        username: socket.user.displayName || socket.user.username
      });
    });

    socket.on('typing:stop', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing:stop', { chatId, userId });
    });

    // ── Read Receipts ────────────────────────────────────────
    socket.on('message:read', async ({ chatId, messageIds }) => {
      try {
        if (!messageIds?.length) return;
        await Message.updateMany(
          { _id: { $in: messageIds }, 'readBy.user': { $ne: userId } },
          { $push: { readBy: { user: userId, readAt: new Date() } } }
        );
        socket.to(`chat:${chatId}`).emit('message:read', { chatId, messageIds, readBy: userId });
      } catch (err) {
        console.error('message:read error:', err);
      }
    });

    // ── Edit Message ─────────────────────────────────────────
    socket.on('message:edit', async ({ messageId, content }, callback) => {
      try {
        if (!messageId || !content) return callback?.({ error: 'Invalid data' });
        const message = await Message.findOne({ _id: messageId, sender: userId, isDeleted: false });
        if (!message) return callback?.({ error: 'Message not found' });

        const { encryptedContent, iv } = encryptMessage(content);
        message.encryptedContent = encryptedContent;
        message.iv = iv;
        message.content = content;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        io.to(`chat:${message.chat}`).emit('message:edited', {
          messageId, content, isEdited: true, editedAt: message.editedAt
        });
        callback?.({ success: true });
      } catch (err) {
        console.error('message:edit error:', err);
        callback?.({ error: 'Failed to edit' });
      }
    });

    // ── Delete Message ───────────────────────────────────────
    socket.on('message:delete', async ({ messageId, forEveryone }, callback) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return callback?.({ error: 'Not found' });

        const isSender = message.sender.toString() === userId;

        if (forEveryone && isSender) {
          message.isDeleted = true;
          message.deletedAt = new Date();
          message.content = '';
          message.encryptedContent = null;
          message.mediaUrl = null;
          await message.save();
          io.to(`chat:${message.chat}`).emit('message:deleted', { messageId, forEveryone: true });
        } else {
          if (!message.deletedFor.includes(userId)) {
            message.deletedFor.push(userId);
            await message.save();
          }
          socket.emit('message:deleted', { messageId, forEveryone: false });
        }
        callback?.({ success: true });
      } catch (err) {
        console.error('message:delete error:', err);
        callback?.({ error: 'Failed to delete' });
      }
    });

    // ── Reactions ────────────────────────────────────────────
    socket.on('message:react', async ({ messageId, emoji }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        const idx = message.reactions.findIndex(r => r.user.toString() === userId);
        if (idx >= 0) {
          if (message.reactions[idx].emoji === emoji) {
            message.reactions.splice(idx, 1);
          } else {
            message.reactions[idx].emoji = emoji;
          }
        } else {
          message.reactions.push({ user: userId, emoji });
        }
        await message.save();
        io.to(`chat:${message.chat}`).emit('message:reacted', {
          messageId, reactions: message.reactions
        });
      } catch (err) {
        console.error('message:react error:', err);
      }
    });

    // ── Join Room ────────────────────────────────────────────
    socket.on('chat:join', async ({ chatId }) => {
      // Verify user is participant before joining
      const chat = await Chat.findOne({ _id: chatId, 'participants.user': userId });
      if (chat) socket.join(`chat:${chatId}`);
    });

    // ── Disconnect ───────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔴 Disconnected: ${socket.user.username}`);
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          const lastSeen = new Date();
          try {
            await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
            const u = await User.findById(userId).populate('contacts', '_id');
            (u?.contacts || []).forEach(contact => {
              io.to(`user:${contact._id}`).emit('user:status', { userId, isOnline: false, lastSeen });
            });
          } catch (err) {
            console.error('Disconnect cleanup error:', err);
          }
        }
      }
    });
  });
};

module.exports = { socketHandler };
