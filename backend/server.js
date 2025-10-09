const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { router: authRoutes, setIO: setAuthIO } = require('./routes/auth');
const { router: chatRoutes, setIO: setChatIO } = require('./routes/chat');
const { router: userRoutes, setIO } = require('./routes/user');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = createServer(app);

// ---------- CORS allowlist (shared by HTTP & Socket.IO) ----------
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  : (process.env.NODE_ENV === 'production'
      ? [
          'https://chat-bot-ten-rouge.vercel.app',
          'https://chat-bot-git-main-akshay-kashyaps-projects-650ab87d.vercel.app'
        ]
      : ['http://localhost:3000']);

// ---------- Socket.IO ----------
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }
});

// Security middleware
app.use(helmet());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// HTTP CORS
const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// DB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chat')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// set io for routes
setAuthIO(io);
setChatIO(io);
setIO(io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', authenticateToken, chatRoutes);
app.use('/api/user', authenticateToken, userRoutes);

// Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Debug endpoints
app.get('/api/debug/socket-rooms', (req, res) => {
  const rooms = [];
  for (const [roomName, room] of io.sockets.adapter.rooms) {
    if (roomName.startsWith('user:')) {
      const socketDetails = [];
      for (const socketId of room) {
        const socket = io.sockets.sockets.get(socketId);
        socketDetails.push({
          socketId,
          userId: socket?.userId,
          username: socket?.username
        });
      }
      rooms.push({
        room: roomName,
        socketCount: room.size,
        sockets: socketDetails
      });
    }
  }
  res.json({ activeUserRooms: rooms, totalRooms: rooms.length });
});

app.post('/api/debug/cleanup-sockets', (req, res) => {
  cleanupOrphanedSockets(io);
  listActiveRooms(io);
  res.json({ message: 'Socket cleanup completed' });
});

// ----- Socket auth middleware -----
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) {
      console.log('Socket authentication failed: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

    const User = require('./models/User');
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log('Socket authentication failed: User not found:', decoded.userId);
      return next(new Error('Authentication error: User not found'));
    }

    socket.userId = decoded.userId;
    socket.username = user.username;
    return next();
  } catch (err) {
    console.log('Socket authentication failed:', err.message);
    return next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id, 'userId:', socket.userId, 'username:', socket.username);

  if (socket.userId) {
    const userRoom = `user:${socket.userId}`;
    socket.join(userRoom);
    socket.userInfo = { id: socket.userId, username: socket.username, room: userRoom };

    const room = io.sockets.adapter.rooms.get(userRoom);
    if (room && room.size > 1) {
      const socketIds = Array.from(room);
      for (let i = 0; i < socketIds.length - 1; i++) {
        const oldSocket = io.sockets.sockets.get(socketIds[i]);
        if (oldSocket && oldSocket.id !== socket.id) oldSocket.disconnect();
      }
    }
  }

  socket.on('join-conversation', (conversationId) => {
    socket.join(conversationId);
  });

  socket.on('send-message', (data) => {
    socket.to(data.conversationId).emit('new-message', data);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      socket.leaveAll();
    }
  });
});

// helpers
function listActiveRooms(io) {
  console.log('=== ACTIVE SOCKET ROOMS ===');
  for (const [roomName, room] of io.sockets.adapter.rooms) {
    if (roomName.startsWith('user:')) {
      console.log(`Room: ${roomName}, Sockets: ${room.size}`);
    }
  }
  console.log('===========================');
}
function cleanupOrphanedSockets(io) {
  for (const [roomName, room] of io.sockets.adapter.rooms) {
    if (roomName.startsWith('user:')) {
      const expectedUserId = roomName.replace('user:', '');
      for (const socketId of Array.from(room)) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.userId !== expectedUserId) {
          socket.leave(roomName);
        }
      }
    }
  }
}

// errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🌐 Allowed CORS origins:', allowedOrigins.join(', '));
});

module.exports = { app, io };
