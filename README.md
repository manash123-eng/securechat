# 🔐 SecureChat v2 — Fixed & Upgraded

End-to-end encrypted WhatsApp-style messenger. All messaging bugs fixed.

---

## 🐛 Bugs Fixed in v2

| # | Bug | File | Fix |
|---|-----|------|-----|
| 1 | Messages not sending | `socketHandler.js` | AES key now correctly padded to 32 bytes |
| 2 | Race condition on login | `app.js` | Removed duplicate submit listeners, clean callback chain |
| 3 | `hasPendingMedia is not a function` crash | `messages.js` | Fixed function name mismatch (`hasPending`) |
| 4 | Socket drops lost all messages | `socket.js` | Added reconnection + room re-join |
| 5 | Private chat query finding wrong chats | `chatController.js` | Fixed `$all` query |
| 6 | Encryption key mismatch REST vs Socket | `messageController.js` | Both now use same `getRawKey()` helper |
| 7 | Group participant IDs not parsed | `chatController.js` | Handles both `participantIds` and `participantIds[]` |
| 8 | Messages duplicated in group chats | `messages.js` | Fixed sender ID comparison (`_id` vs string) |

---

## ⚡ Quick Start

```bash
# 1. Extract
tar -xzf securechat.tar.gz && cd securechat

# 2. Install
npm install

# 3. Configure — edit .env with your values
cp .env.example .env

# 4. Start MongoDB (separate terminal)
mongod

# 5. Run
npm run dev   # development
npm start     # production
```

Open **http://localhost:3000**

---

## 📁 Project Structure

```
securechat/
├── server/
│   ├── index.js                   Express + Socket.IO server
│   ├── controllers/
│   │   ├── authController.js      Register, login, profile
│   │   ├── chatController.js ✅   Private/group chat (fixed query)
│   │   ├── messageController.js ✅ AES-256 encrypt/decrypt (fixed key)
│   │   └── userController.js      Search, contacts
│   ├── models/
│   │   ├── User.js                bcrypt passwords, online status
│   │   ├── Chat.js                Private + group schema
│   │   └── Message.js             Encrypted messages, reactions
│   ├── routes/                    auth / users / chats / messages / upload
│   ├── middleware/
│   │   ├── auth.js                JWT + Socket.IO authentication
│   │   ├── errorHandler.js        Global error handler
│   │   └── validation.js          Input validation rules
│   └── utils/
│       └── socketHandler.js ✅   Real-time events (fixed encryption)
├── client/
│   ├── index.html                 Single-page app shell (redesigned)
│   ├── css/
│   │   └── main.css               Premium UI — dark/light, glassmorphism
│   └── js/
│       ├── api.js                 REST client
│       ├── socket.js ✅           Socket.IO wrapper (fixed reconnection)
│       ├── ui.js                  Toasts, modals, avatars, formatters
│       ├── auth.js ✅             Login/register (fixed race condition)
│       ├── chat.js ✅             Sidebar, search, new chat/group
│       ├── messages.js ✅        Render + send (all crashes fixed)
│       ├── media.js               File upload, voice, lightbox
│       └── app.js ✅             Boot sequence (fixed)
├── .env                           Your config (never commit)
├── .env.example                   Template
├── Dockerfile                     Container build
├── docker-compose.yml             App + MongoDB
└── setup.sh                       One-command local setup
```

---

## 🔒 Environment Variables

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/securechat
JWT_SECRET=<64-char random hex string>
JWT_EXPIRES_IN=7d
ENCRYPTION_KEY=<exactly 32 characters>
MAX_FILE_SIZE=50000000
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
```

**Generate keys:**
```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (exactly 32 chars)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

---

## 🚀 Deploy Options

### Railway (easiest)
```bash
git init && git add . && git commit -m "init"
git push to GitHub → connect on railway.app → add env vars → deploy
```

### Docker
```bash
cp .env.example .env   # fill in values
docker compose up -d
```

### PM2 on VPS
```bash
npm install -g pm2
npm install
pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup
```

---

## ✅ Feature List

**Messaging**
- One-to-one private chats
- Group chats with admin roles
- Text, image, video, audio, file messages
- Voice message recording
- Reply to any message
- Edit messages (with "edited" tag)
- Delete for me / delete for everyone
- Emoji reactions (click to toggle)

**Real-time**
- Instant Socket.IO delivery
- Online/offline presence
- Typing indicators
- Read receipts (✓ sent, ✓✓ delivered, blue ✓✓ read)
- Auto-reconnect on connection drop

**UI**
- WhatsApp-style sidebar + chat window
- Glassmorphism dark theme
- Light/dark mode toggle (saved to profile)
- Mobile responsive with slide animation
- Message search
- Chat + user search
- Media lightbox (click image to expand)
- Context menus (right-click messages/chats)
- Toast notifications
- Connection status indicator

**Security**
- AES-256-CBC end-to-end encryption
- bcrypt password hashing (cost 12)
- JWT authentication
- Helmet.js security headers
- Rate limiting (100 req/15min, 20 auth/15min)
- Input validation on all endpoints
- XSS escaping on all rendered content
- File type validation on uploads
