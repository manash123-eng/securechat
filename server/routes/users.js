const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { searchUsers, getContacts, addContact, removeContact, getUserProfile } = require('../controllers/userController');

router.get('/search', authenticate, searchUsers);
router.get('/contacts', authenticate, getContacts);
router.post('/contacts/:userId', authenticate, addContact);
router.delete('/contacts/:userId', authenticate, removeContact);
router.get('/:userId', authenticate, getUserProfile);

module.exports = router;
