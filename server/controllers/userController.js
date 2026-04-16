const User = require('../models/User');

const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: q.trim(), $options: 'i' } },
        { displayName: { $regex: q.trim(), $options: 'i' } },
        { email: { $regex: q.trim(), $options: 'i' } }
      ],
      _id: { $ne: req.user._id },
      blockedUsers: { $nin: [req.user._id] }
    })
    .select('username displayName avatar status isOnline lastSeen')
    .limit(20);

    res.json({ users });
  } catch (err) {
    next(err);
  }
};

const getContacts = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('contacts', 'username displayName avatar status isOnline lastSeen');
    res.json({ contacts: user.contacts });
  } catch (err) {
    next(err);
  }
};

const addContact = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot add yourself as contact' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await User.findById(req.user._id);
    if (user.contacts.includes(userId)) {
      return res.status(409).json({ error: 'Already in contacts' });
    }

    user.contacts.push(userId);
    await user.save();

    res.json({
      message: 'Contact added',
      contact: {
        _id: targetUser._id,
        username: targetUser.username,
        displayName: targetUser.displayName,
        avatar: targetUser.avatar,
        status: targetUser.status,
        isOnline: targetUser.isOnline,
        lastSeen: targetUser.lastSeen
      }
    });
  } catch (err) {
    next(err);
  }
};

const removeContact = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { contacts: userId }
    });
    res.json({ message: 'Contact removed' });
  } catch (err) {
    next(err);
  }
};

const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('username displayName avatar status isOnline lastSeen');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

module.exports = { searchUsers, getContacts, addContact, removeContact, getUserProfile };
