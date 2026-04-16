const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');
const { v4: uuidv4 } = require('uuid');

const getOrCreatePrivateChat = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    if (userId === myId.toString()) return res.status(400).json({ error: 'Cannot chat with yourself' });

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Find existing private chat between exactly these two users
    let chat = await Chat.findOne({
      type: 'private',
      'participants.user': { $all: [myId, userId] }
    })
      .populate('participants.user', 'username displayName avatar status isOnline lastSeen')
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username displayName' } });

    if (!chat) {
      chat = await Chat.create({
        type: 'private',
        participants: [
          { user: myId, role: 'member' },
          { user: userId, role: 'member' }
        ],
        encryptionKey: uuidv4()
      });
      chat = await Chat.findById(chat._id)
        .populate('participants.user', 'username displayName avatar status isOnline lastSeen')
        .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username displayName' } });
    }

    res.json({ chat });
  } catch (err) { next(err); }
};

const getUserChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({
      'participants.user': req.user._id,
      isArchived: false
    })
      .populate('participants.user', 'username displayName avatar status isOnline lastSeen')
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username displayName' } })
      .sort({ lastActivity: -1 });

    // Add unread counts
    const myId = req.user._id;
    const chatsWithUnread = await Promise.all(chats.map(async chat => {
      const unreadCount = await Message.countDocuments({
        chat: chat._id,
        sender: { $ne: myId },
        'readBy.user': { $ne: myId },
        isDeleted: false,
        deletedFor: { $nin: [myId] }
      });
      return { ...chat.toObject(), unreadCount };
    }));

    res.json({ chats: chatsWithUnread });
  } catch (err) { next(err); }
};

const createGroupChat = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    let participantIds = req.body['participantIds[]'] || req.body.participantIds || [];
    if (!Array.isArray(participantIds)) {
      participantIds = typeof participantIds === 'string' 
        ? participantIds.split(',').map(id => id.trim()).filter(Boolean)
        : [];
    }
    
    const otherParticipants = participantIds.filter(id => id !== req.user._id.toString());
    if (!name?.trim()) return res.status(400).json({ error: 'Group name required' });
    if (otherParticipants.length === 0) return res.status(400).json({ error: 'Add at least one other participant' });

    const allIds = [...new Set([req.user._id.toString(), ...participantIds])];
    const participants = allIds.map(uid => ({
      user: uid,
      role: uid === req.user._id.toString() ? 'admin' : 'member'
    }));

    let chat = await Chat.create({
      type: 'group',
      name: name.trim(),
      description: description?.trim(),
      participants,
      encryptionKey: uuidv4(),
      avatar: req.file ? `/uploads/${req.file.filename}` : null
    });

    chat = await Chat.findById(chat._id)
      .populate('participants.user', 'username displayName avatar status isOnline lastSeen');

    // System message
    await Message.create({
      chat: chat._id,
      sender: req.user._id,
      type: 'system',
      content: `${req.user.displayName || req.user.username} created the group "${name.trim()}"`
    });

    res.status(201).json({ chat });
  } catch (err) { next(err); }
};

const getChatById = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      'participants.user': req.user._id
    })
      .populate('participants.user', 'username displayName avatar status isOnline lastSeen')
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'username displayName' } });

    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json({ chat });
  } catch (err) { next(err); }
};

const addGroupParticipant = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;
    const chat = await Chat.findById(chatId);
    if (!chat || chat.type !== 'group') return res.status(404).json({ error: 'Group not found' });

    const isAdmin = chat.participants.some(p => p.user.toString() === req.user._id.toString() && p.role === 'admin');
    if (!isAdmin) return res.status(403).json({ error: 'Admin required' });

    if (chat.participants.some(p => p.user.toString() === userId)) return res.status(409).json({ error: 'Already in group' });

    chat.participants.push({ user: userId, role: 'member' });
    await chat.save();

    const updated = await chat.populate('participants.user', 'username displayName avatar status isOnline lastSeen');
    res.json({ chat: updated });
  } catch (err) { next(err); }
};

const leaveGroup = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat || chat.type !== 'group') return res.status(404).json({ error: 'Group not found' });

    chat.participants = chat.participants.filter(p => p.user.toString() !== req.user._id.toString());
    await chat.save();
    res.json({ message: 'Left group' });
  } catch (err) { next(err); }
};

module.exports = { getOrCreatePrivateChat, getUserChats, createGroupChat, getChatById, addGroupParticipant, leaveGroup };
