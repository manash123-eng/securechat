# 🔐 SecureChat v2 — 

A real-time secure messaging application built using full-stack development.
This project focuses on fast communication, encryption, and user-friendly design.

🟢 Introduction

SecureChat is a chat application where users can communicate in real time securely.
The goal of this project is to create a system similar to WhatsApp that supports messaging, media sharing, and live updates while maintaining data privacy and security.

 

🔗 Important Links

👉 Live Project (Deployment):
https://securechat-production-da90.up.railway.app/

👉 Project Presentation (PPT/Video):
https://youtu.be/CFO5N1KiUTM?si=tQgFb6KzUqkMmwAg 

👉 GitHub Repository:
https://github.com/manash123-eng/securechat
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

🌐 Deployment

I deployed this project using Railway.

Steps:

Uploaded code to GitHub
Connected repository with Railway
Added environment variables

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
👇

💻 Frontend (Client Side)

The frontend is the part of the application that the user directly interacts with.

In my project, I built the frontend using:

HTML
CSS
JavaScript

It is responsible for:

Displaying the chat interface (sidebar, messages, user list)
Taking user input (typing messages, login/signup)
Showing real-time updates like typing indicator and read receipts
Handling UI features like dark/light mode

I also used Socket.IO (client side) so messages appear instantly without refreshing the page.

⚙️ Backend (Server Side)

The backend handles all the logic, data, and security of the application.

In my project, I used:

Node.js
Express.js
MongoDB

It is responsible for:

User authentication (login/signup using JWT)
Storing and retrieving messages from database
Encrypting and decrypting messages
Managing chats (private and group)
Handling real-time communication using Socket.IO

     
