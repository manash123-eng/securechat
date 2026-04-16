require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chats');
const messageRoutes = require('./routes/messages');
const uploadRoutes = require('./routes/uploads');
const { socketHandler } = require('./utils/socketHandler');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// ✅ Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  maxHttpBufferSize: 1e8
});

// ✅ Security middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

// ✅ Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100
});

app.use('/api/', limiter);

// ✅ Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ✅ Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ✅ Static files
app.use(express.static(path.join(__dirname, '../client')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);

// ✅ Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ✅ Root route (FIXES 502)
app.get('/', (req, res) => {
  res.send('🚀 SecureChat API is running');
});

// ✅ Serve frontend fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ✅ Error handler
app.use(errorHandler);

// ✅ Socket handler
socketHandler(io);

// ❗ Ensure MONGO_URI exists
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is missing');
  process.exit(1);
}

// ✅ MongoDB connection (FIXED)
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = { app, server, io };