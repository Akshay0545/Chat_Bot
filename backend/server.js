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
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://chat-bot-ten-rouge.vercel.app',
        'https://chat-bot-git-main-akshay-kashyaps-projects-650ab87d.vercel.app'
      ] 
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chat')
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Set up io instance for routes
setAuthIO(io);
setChatIO(io);
setIO(io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', authenticateToken, chatRoutes);
app.use('/api/user', authenticateToken, userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Debug endpoint to check socket rooms
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
  res.json({
    activeUserRooms: rooms,
    totalRooms: rooms.length
  });
});

// Debug endpoint to trigger cleanup
app.post('/api/debug/cleanup-sockets', (req, res) => {
  cleanupOrphanedSockets(io);
  listActiveRooms(io);
  res.json({ message: 'Socket cleanup completed' });
});

// Socket.io connection handling with improved authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) {
      console.log('Socket authentication failed: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Verify user exists in database
    const User = require('./models/User');
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log('Socket authentication failed: User not found:', decoded.userId);
      return next(new Error('Authentication error: User not found'));
    }
    
    socket.userId = decoded.userId;
    socket.username = user.username;
    console.log('Socket authenticated successfully for user:', user.username, 'ID:', decoded.userId);
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
    console.log(`Socket ${socket.id} (${socket.username}) joined room: ${userRoom}`);
    
    // Store socket info for debugging
    socket.userInfo = {
      id: socket.userId,
      username: socket.username,
      room: userRoom
    };
    
    // Debug: List all rooms this socket is in
    console.log(`Socket ${socket.id} is now in rooms:`, Array.from(socket.rooms));
    
    // Debug: Check if there are other sockets in the same user room
    const room = io.sockets.adapter.rooms.get(userRoom);
    if (room) {
      console.log(`Room ${userRoom} now has ${room.size} socket(s):`, Array.from(room));
    }
    
    // Clean up any orphaned sockets in wrong rooms
    cleanupOrphanedSockets(io);
    
    // Check if this user already has a socket connected
    const existingRoom = io.sockets.adapter.rooms.get(userRoom);
    if (existingRoom && existingRoom.size > 1) {
      console.log(`WARNING: User ${socket.userId} has ${existingRoom.size} sockets connected!`);
      // Keep only the newest socket, disconnect older ones
      const socketIds = Array.from(existingRoom);
      for (let i = 0; i < socketIds.length - 1; i++) {
        const oldSocket = io.sockets.sockets.get(socketIds[i]);
        if (oldSocket && oldSocket.id !== socket.id) {
          console.log(`Disconnecting old socket ${oldSocket.id} for user ${socket.userId}`);
          oldSocket.disconnect();
        }
      }
    }
  } else {
    console.log('No userId found for socket:', socket.id);
  }
  
  socket.on('join-conversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`User ${socket.username} (${socket.id}) joined conversation ${conversationId}`);
  });
  
  socket.on('send-message', (data) => {
    // Broadcast message to all users in the conversation
    socket.to(data.conversationId).emit('new-message', data);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id, 'username:', socket.username);
    if (socket.userId) {
      const userRoom = `user:${socket.userId}`;
      console.log(`Socket ${socket.id} left room: ${userRoom}`);
      
      // Explicitly leave all rooms to ensure cleanup
      socket.leaveAll();
      
      // Debug: Check room status after disconnect
      const room = io.sockets.adapter.rooms.get(userRoom);
      if (room) {
        console.log(`Room ${userRoom} now has ${room.size} socket(s) after disconnect`);
      } else {
        console.log(`Room ${userRoom} is now empty`);
      }
    }
  });
});

// Helper functions to emit notifications with better logging
function sendGlobalNotification(io, payload) {
  console.log('Sending GLOBAL notification:', payload.message);
  io.emit('notification', payload);
}

function sendUserNotification(io, userId, payload) {
  const userRoom = `user:${userId}`;
  console.log(`Sending notification to user ${userId} in room: ${userRoom}`);
  console.log('Notification payload:', payload.message);
  
  // Validate userId is a valid ObjectId
  if (!userId || typeof userId !== 'string') {
    console.error('Invalid userId provided for notification:', userId);
    return;
  }
  
  // Check if room exists
  const room = io.sockets.adapter.rooms.get(userRoom);
  if (room) {
    console.log(`Room ${userRoom} has ${room.size} socket(s)`);
    // Log socket IDs in the room for debugging
    const socketIds = Array.from(room);
    console.log(`Socket IDs in room: ${socketIds.join(', ')}`);
    
    // Verify all sockets in the room belong to the correct user
    for (const socketId of socketIds) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && socket.userId !== userId) {
        console.error(`CRITICAL: Socket ${socketId} in room ${userRoom} belongs to different user ${socket.userId}!`);
        // Remove the socket from the room
        socket.leave(userRoom);
      }
    }
  } else {
    console.log(`WARNING: Room ${userRoom} does not exist!`);
  }
  
  io.to(userRoom).emit('notification', payload);
}

// Debug function to list all active rooms
function listActiveRooms(io) {
  console.log('=== ACTIVE SOCKET ROOMS ===');
  for (const [roomName, room] of io.sockets.adapter.rooms) {
    if (roomName.startsWith('user:')) {
      console.log(`Room: ${roomName}, Sockets: ${room.size}`);
    }
  }
  console.log('===========================');
}

// Function to clean up orphaned sockets in wrong rooms
function cleanupOrphanedSockets(io) {
  console.log('Cleaning up orphaned sockets...');
  for (const [roomName, room] of io.sockets.adapter.rooms) {
    if (roomName.startsWith('user:')) {
      const expectedUserId = roomName.replace('user:', '');
      const socketIds = Array.from(room);
      
      for (const socketId of socketIds) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.userId !== expectedUserId) {
          console.log(`Removing orphaned socket ${socketId} from room ${roomName} (belongs to user ${socket.userId})`);
          socket.leave(roomName);
        }
      }
    }
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.NODE_ENV === 'production' ? 'https://chat-bot-ten-rouge.vercel.app, https://chat-bot-git-main-akshay-kashyaps-projects-650ab87d.vercel.app' : 'http://localhost:3000'}`);
});

module.exports = { app, io };
