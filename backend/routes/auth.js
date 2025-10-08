const express = require('express');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');

// Get io instance from global
let io;
const setIO = (ioInstance) => {
  io = ioInstance;
};

const router = express.Router();

// Register new user
router.post('/register', validateRegister, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(409).json({
        message: 'Username already taken',
        code: 'USER_EXISTS'
      });
    }

    // Create new user
    const user = new User({
      username,
      password
    });

    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        credits: user.credits,
        plan: user.plan,
        preferences: user.preferences
      },
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      message: 'Registration failed',
      code: 'REGISTRATION_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({
        message: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid username or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Send welcome back notification
    const notification = await Notification.create({
      userId: user._id,
      title: 'Welcome Back!',
      message: `Welcome back, ${user.username}! You have ${user.credits} credits remaining.`,
      type: 'success',
      metadata: {
        source: 'system',
        priority: 'low'
      }
    });
    
    console.log('Created welcome back notification:', notification);

    // Check if this is the first login of the day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastLogin = new Date(user.lastLogin);
    lastLogin.setHours(0, 0, 0, 0);
    
    if (lastLogin < today) {
      const firstMessageNotification = await Notification.create({
        userId: user._id,
        title: 'Good Morning!',
        message: `Good morning, ${user.username}! Ready to start your AI conversations?`,
        type: 'success',
        metadata: {
          source: 'system',
          priority: 'medium'
        }
      });

      io.to(`user:${user._id}`).emit('notification', {
        id: String(firstMessageNotification._id),
        message: firstMessageNotification.message,
        type: firstMessageNotification.type,
        timestamp: firstMessageNotification.createdAt,
        read: firstMessageNotification.isRead,
      });
    }

    // Emit real-time notification with delay
    const notificationPayload = {
      id: String(notification._id),
      message: notification.message,
      type: notification.type,
      timestamp: notification.createdAt,
      read: notification.isRead,
    };
    
    // Add delay to ensure socket is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Sending login notification to user:', user._id, notificationPayload);
    io.to(`user:${user._id}`).emit('notification', notificationPayload);
    
    // Send additional automatic notifications after login
    setTimeout(async () => {
      try {
        // Welcome bonus notification
        const bonusNotification = await Notification.create({
          userId: user._id,
          title: 'Welcome Bonus!',
          message: 'You\'ve received 50 bonus credits for logging in today!',
          type: 'success',
          metadata: {
            source: 'system',
            priority: 'medium'
          }
        });
        
        io.to(`user:${user._id}`).emit('notification', {
          id: String(bonusNotification._id),
          message: bonusNotification.message,
          type: bonusNotification.type,
          timestamp: bonusNotification.createdAt,
          read: bonusNotification.isRead,
        });
      } catch (error) {
        console.error('Bonus notification error:', error);
      }
    }, 3000);

    // Send automatic global notifications after login
    setTimeout(async () => {
      try {
        // System maintenance notification (global)
        const systemMaintenancePayload = {
          title: 'System Maintenance',
          message: 'Scheduled maintenance will occur tonight from 11 PM to 1 AM EST. Some features may be temporarily unavailable.',
          type: 'warning',
          timestamp: new Date().toISOString(),
          read: false,
        };
        
        console.log('Sending automatic global system maintenance notification');
        io.emit('notification', systemMaintenancePayload);
      } catch (error) {
        console.error('System maintenance notification error:', error);
      }
    }, 5000);

    setTimeout(async () => {
      try {
        // New feature notification (global)
        const newFeaturePayload = {
          title: 'New Feature Available!',
          message: '🎉 Real-time notifications are now live! You can receive instant updates about your conversations, credits, and system announcements.',
          type: 'info',
          timestamp: new Date().toISOString(),
          read: false,
        };
        
        console.log('Sending automatic global new feature notification');
        io.emit('notification', newFeaturePayload);
      } catch (error) {
        console.error('New feature notification error:', error);
      }
    }, 8000);

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        credits: user.credits,
        plan: user.plan,
        preferences: user.preferences,
        lastLogin: user.lastLogin
      },
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Login failed',
      code: 'LOGIN_ERROR'
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        message: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || 'fallback-secret');
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({
        message: 'Invalid user',
        code: 'INVALID_USER'
      });
    }

    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({
      message: 'Token refreshed successfully',
      token: newToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      message: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        message: 'Access token required',
        code: 'NO_TOKEN'
      });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        credits: user.credits,
        plan: user.plan,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(401).json({
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
});

module.exports = { router, setIO };
