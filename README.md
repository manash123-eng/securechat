<div align="center">

# 🔐 SecureChat

### End-to-End Encrypted Real-Time Messaging Platform

A modern real-time secure chat application that enables users to communicate privately through encrypted messaging, group conversations, and secure media sharing.

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Backend-green?style=for-the-badge&logo=node.js" />
  <img src="https://img.shields.io/badge/Express.js-API-black?style=for-the-badge&logo=express" />
  <img src="https://img.shields.io/badge/MongoDB-Database-green?style=for-the-badge&logo=mongodb" />
  <img src="https://img.shields.io/badge/Socket.IO-RealTime-black?style=for-the-badge&logo=socket.io" />
  <img src="https://img.shields.io/badge/JWT-Authentication-blue?style=for-the-badge&logo=jsonwebtokens" />
  <img src="https://img.shields.io/badge/Docker-Containerized-blue?style=for-the-badge&logo=docker" />
</p>

### 🚀 Live Demo
🔗 https://securechat-production-da90.up.railway.app/

</div>

---

# 📑 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Application Screenshots](#-application-screenshots)
- [Architecture](#-architecture)
- [Folder Structure](#-folder-structure)
- [Environment Variables](#-environment-variables)
- [Installation & Setup](#-installation--setup)
- [Docker Setup](#-docker-setup)
- [API Routes](#-api-routes)
- [Real-Time Features](#-real-time-features)
- [Security Features](#-security-features)
- [Deployment](#-deployment)
- [Future Improvements](#-future-improvements)
- [Author](#-author)

---

# 📌 Overview

SecureChat is a secure real-time messaging platform designed for private and encrypted communication. The application supports one-to-one messaging, group conversations, media sharing, typing indicators, and online presence tracking using WebSockets.

The project focuses heavily on:
- Real-time communication
- Secure authentication
- Encrypted messaging
- Responsive UI
- Scalable backend architecture

---

# ✨ Features

## 🔐 Authentication & Security
- JWT-based authentication
- Secure login & signup system
- Password encryption
- End-to-end encrypted messaging
- Protected API routes
- Rate limiting support

## 💬 Messaging Features
- Real-time messaging using Socket.IO
- One-to-one private chat
- Group chat functionality
- Typing indicators
- Online/offline user status
- Instant message updates

## 📁 Media Features
- Secure file sharing
- Media upload support
- Upload management system

## 🎨 User Experience
- Modern dark UI
- Responsive design
- Theme toggle support
- Fast and interactive interface

## ⚙️ Additional Features
- Docker support
- Shell setup scripts
- Railway deployment
- Structured MVC backend architecture

---

# 🛠 Tech Stack

## Frontend
- HTML5
- Tailwind CSS
- Vanilla JavaScript

## Backend
- Node.js
- Express.js

## Database
- MongoDB

## Authentication
- JWT (JSON Web Tokens)

## Real-Time Communication
- Socket.IO

## Deployment
- Railway

## DevOps & Tools
- Docker
- Shell Scripts

---

# 🖼 Application Screenshots

## 🔑 Authentication Page

### Sign In
<img width="1342" height="893" alt="Screenshot 2026-05-12 072744" src="https://github.com/user-attachments/assets/903afb21-b34a-4dcb-8385-1aedd83ddcf9" />


### Sign Up
<img width="1021" height="861" alt="Screenshot 2026-05-12 072759" src="https://github.com/user-attachments/assets/f2a7c958-cde9-4160-9b7e-d15c5f55359d" />


---

## 💬 Chat Dashboard

<img width="1901" height="910" alt="Screenshot 2026-05-12 072846" src="https://github.com/user-attachments/assets/466f48e4-3f63-469e-b46d-18e6d8243dcf" />


---

## 🎛 Dashboard Controls

The top-left control panel includes:

| Button | Function |
|---|---|
| ✏️ | New Chat |
| 👥 | Create Group |
| ⚙️ | Toggle Theme |
| 🚪 | Logout |

---

# 🏗 Architecture

The project follows a modular MVC-based backend architecture.

```bash
Client → REST API → Express Server → MongoDB
               ↘
             Socket.IO
```

### Backend Layers

- Controllers → Business logic
- Routes → API endpoints
- Models → MongoDB schemas
- Middleware → Authentication & validation
- Utils → Socket handling & helpers

---

# 📂 Folder Structure

```bash
securechat/
│
├── client/
│   ├── css/
│   │   └── main.css
│   │
│   ├── js/
│   │   ├── api.js
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── chat.js
│   │   ├── media.js
│   │   ├── messages.js
│   │   ├── socket.js
│   │   └── ui.js
│   │
│   └── index.html
│
├── server/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── chatController.js
│   │   ├── messageController.js
│   │   └── userController.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── validation.js
│   │
│   ├── models/
│   │   ├── Chat.js
│   │   ├── Message.js
│   │   └── User.js
│   │
│   ├── routes/
│   │   ├── auth.js
│   │   ├── chats.js
│   │   ├── messages.js
│   │   ├── uploads.js
│   │   └── users.js
│   │
│   ├── uploads/
│   │   └── .gitkeep
│   │
│   ├── utils/
│   │   └── socketHandler.js
│   │
│   └── index.js
│
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.js
├── setup.sh
├── package.json
└── README.md
```

---

# 🔑 Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=
MONGO_URI=
JWT_SECRET=
PORT=
JWT_EXPIRES_IN=
ENCRYPTION_KEY=
CLIENT_URL=
RATE_LIMIT_WINDOW_MS=
RATE_LIMIT_MAX=
```

---

# ⚙️ Installation & Setup

## 1️⃣ Clone Repository

```bash
git clone https://github.com/manash123-eng/securechat.git
```

## 2️⃣ Navigate to Project

```bash
cd securechat
```

## 3️⃣ Install Dependencies

```bash
npm install
```

## 4️⃣ Configure Environment Variables

Create `.env` file and add required values.

## 5️⃣ Start Development Server

```bash
npm run dev
```

---

# 🐳 Docker Setup

## Build Docker Container

```bash
docker build -t securechat .
```

## Run Container

```bash
docker run -p 5000:5000 securechat
```

## Docker Compose

```bash
docker-compose up
```

---

# 🔌 API Routes

## Authentication Routes

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |

---

## Chat Routes

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/chats` | Fetch chats |
| POST | `/api/chats` | Create chat |

---

## Message Routes

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/messages/:chatId` | Fetch messages |
| POST | `/api/messages` | Send message |

---

## Upload Routes

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/uploads` | Upload media |

---

# ⚡ Real-Time Features

SecureChat uses Socket.IO for bidirectional communication.

### Real-Time Events
- Instant messaging
- Typing indicators
- Online/offline updates
- Live chat synchronization
- Group communication updates

---

# 🔒 Security Features

- JWT Authentication
- Encrypted communication
- Protected routes
- Rate limiting
- Secure media handling
- Environment-based configuration

---

# 🚀 Deployment

The application is deployed on Railway.

### Live URL
🔗 https://securechat-production-da90.up.railway.app/

---

# 📈 Future Improvements

- Voice & video calling
- Message reactions
- Push notifications
- Message search
- Read receipts
- AI moderation
- Mobile application
- Redis caching
- WebRTC integration

---

# 👨‍💻 Author

### Manash

GitHub:
🔗 https://github.com/manash123-eng

---

# ⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub.
