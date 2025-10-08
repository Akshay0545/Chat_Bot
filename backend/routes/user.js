const express = require('express');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { body, validationResult } = require('express-validator');

// Get io instance from global or pass it from server
let io;
const setIO = (ioInstance) => {
  io = ioInstance;
};

const router = express.Router();

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    res.json({
      user: {
        id: user._id,
        username: user.username,
        credits: user.credits,
        plan: user.plan,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Failed to fetch profile',
      code: 'FETCH_PROFILE_ERROR'
    });
  }
});

// Update user profile
router.put('/profile', [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark'])
    .withMessage('Theme must be either light or dark'),
  
  body('preferences.notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notifications must be a boolean value')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, preferences } = req.body;
    const updateData = {};

    if (username) {
      // Check if username is already taken
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: req.user._id } 
      });
      
      if (existingUser) {
        return res.status(409).json({
          message: 'Username already taken',
          code: 'USERNAME_TAKEN'
        });
      }
      
      updateData.username = username;
    }

    if (preferences) {
      updateData.preferences = {
        ...req.user.preferences,
        ...preferences
      };
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    // Send notification for profile update
    const notification = await Notification.create({
      userId: req.user._id,
      title: 'Profile Updated',
      message: 'Your profile has been updated successfully',
      type: 'success',
      metadata: {
        source: 'system',
        priority: 'low'
      }
    });

    // Emit real-time notification
    io.to(`user:${req.user._id}`).emit('notification', {
      id: String(notification._id),
      message: notification.message,
      type: notification.type,
      timestamp: notification.createdAt,
      read: notification.isRead,
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        credits: user.credits,
        plan: user.plan,
        preferences: user.preferences,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Failed to update profile',
      code: 'UPDATE_PROFILE_ERROR'
    });
  }
});

// Get user notifications
router.get('/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const filter = { userId: req.user._id };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user._id, 
      isRead: false 
    });

    res.json({
      notifications: notifications.map(notif => ({
        id: notif._id,
        title: notif.title,
        message: notif.message,
        type: notif.type,
        isRead: notif.isRead,
        readAt: notif.readAt,
        actionUrl: notif.actionUrl,
        metadata: notif.metadata,
        createdAt: notif.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        unreadCount
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      message: 'Failed to fetch notifications',
      code: 'FETCH_NOTIFICATIONS_ERROR'
    });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    res.json({
      message: 'Notification marked as read',
      notification: {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead,
        readAt: notification.readAt,
        createdAt: notification.createdAt
      }
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      message: 'Failed to mark notification as read',
      code: 'MARK_NOTIFICATION_READ_ERROR'
    });
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      message: 'Failed to mark all notifications as read',
      code: 'MARK_ALL_NOTIFICATIONS_READ_ERROR'
    });
  }
});

// Delete notification
router.delete('/notifications/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        message: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    res.json({
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      message: 'Failed to delete notification',
      code: 'DELETE_NOTIFICATION_ERROR'
    });
  }
});

// Test endpoint to send a notification to current user
router.post('/notifications/test', async (req, res) => {
  try {
    const notification = await Notification.create({
      userId: req.user._id,
      title: 'Test Notification',
      message: 'This is a test notification to verify real-time functionality!',
      type: 'info',
      metadata: {
        source: 'system',
        priority: 'low'
      }
    });

    const notificationPayload = {
      id: String(notification._id),
      message: notification.message,
      type: notification.type,
      timestamp: notification.createdAt,
      read: notification.isRead,
    };
    
    // Add delay to ensure socket is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Sending test notification to user:', req.user._id, notificationPayload);
    io.to(`user:${req.user._id}`).emit('notification', notificationPayload);
    
    res.json({ success: true, message: 'Test notification sent' });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ message: 'Failed to send test notification' });
  }
});

// Simulate credit purchase notification
router.post('/notifications/simulate-credit-purchase', async (req, res) => {
  try {
    // Get current user credits for notification
    const user = await User.findById(req.user._id).select('credits');
    
    const notification = await Notification.create({
      userId: req.user._id,
      title: 'Credits Purchase Simulation',
      message: `This is a test notification. Your current credits: ${user.credits}. No actual credits were added.`,
      type: 'info',
      metadata: {
        source: 'billing',
        priority: 'medium'
      }
    });

    // Add delay to ensure socket is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Sending credit purchase notification to user:', req.user._id);
    io.to(`user:${req.user._id}`).emit('notification', {
      id: String(notification._id),
      message: notification.message,
      type: notification.type,
      timestamp: notification.createdAt,
      read: notification.isRead,
    });
    
    res.json({ success: true, message: 'Credit purchase simulated' });
  } catch (error) {
    console.error('Credit purchase simulation error:', error);
    res.status(500).json({ message: 'Failed to simulate credit purchase' });
  }
});

// Send system maintenance notification (global)
router.post('/notifications/system-maintenance', async (req, res) => {
  try {
    // Allow all authenticated users to send global notifications for testing

    const payload = {
      title: '[Global] System Maintenance',
      message: 'Scheduled maintenance will occur tonight from 11 PM to 1 AM EST. Some features may be temporarily unavailable.',
      type: 'warning',
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Add delay for global notification
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Sending global system maintenance notification');
    io.emit('notification', payload);
    
    res.json({ success: true, message: 'System maintenance notification sent globally' });
  } catch (error) {
    console.error('System maintenance notification error:', error);
    res.status(500).json({ message: 'Failed to send system maintenance notification' });
  }
});

// Send new feature announcement (global)
router.post('/notifications/new-feature', async (req, res) => {
  try {
    // Allow all authenticated users to send global notifications for testing

    const payload = {
      title: '[Global] New Feature Available!',
      message: '🎉 Real-time notifications are now live! You can receive instant updates about your conversations, credits, and system announcements.',
      type: 'info',
      timestamp: new Date().toISOString(),
      read: false,
    };

    // Add delay for global notification
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Sending global new feature notification');
    io.emit('notification', payload);
    
    res.json({ success: true, message: 'New feature notification sent globally' });
  } catch (error) {
    console.error('New feature notification error:', error);
    res.status(500).json({ message: 'Failed to send new feature notification' });
  }
});

// Send security alert notification
router.post('/notifications/security-alert', async (req, res) => {
  try {
    const notification = await Notification.create({
      userId: req.user._id,
      title: 'Security Alert',
      message: 'Your account was accessed from a new device. If this wasn\'t you, please change your password immediately.',
      type: 'error',
      metadata: {
        source: 'security',
        priority: 'high'
      }
    });

    // Add delay to ensure socket is ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Sending security alert to user:', req.user._id);
    io.to(`user:${req.user._id}`).emit('notification', {
      id: String(notification._id),
      message: notification.message,
      type: notification.type,
      timestamp: notification.createdAt,
      read: notification.isRead,
    });
    
    res.json({ success: true, message: 'Security alert sent' });
  } catch (error) {
    console.error('Security alert error:', error);
    res.status(500).json({ message: 'Failed to send security alert' });
  }
});

// Admin-style endpoint to send global/targeted notifications
router.post('/notifications/admin/send', [
  body('target').optional().isIn(['global', 'user']).withMessage('target must be global or user'),
  body('userId').optional().isString(),
  body('message').isString().trim().isLength({ min: 1, max: 500 }),
  body('title').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('type').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    // Simple authorization example: allow only pro plan users to send admin notifications
    if (req.user.plan !== 'pro') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { target = 'global', userId, title = 'Announcement', message, type = 'system' } = req.body;

    const payload = {
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false,
    };

    if (target === 'global') {
      io.emit('notification', payload);
      return res.json({ success: true, target: 'global' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'userId required for targeted notifications' });
    }

    const doc = await Notification.create({ userId, title, message, type });
    io.to(`user:${userId}`).emit('notification', {
      id: String(doc._id),
      message: doc.message,
      type: doc.type,
      timestamp: doc.createdAt,
      read: doc.isRead,
    });
    return res.json({ success: true, target: 'user', userId });
  } catch (error) {
    console.error('Admin send notification error:', error);
    res.status(500).json({ message: 'Failed to send notification' });
  }
});

// Get user stats
router.get('/stats', async (req, res) => {
  try {
    const Conversation = require('../models/Conversation');
    const Message = require('../models/Message');

    const [conversationCount, messageCount, unreadNotifications] = await Promise.all([
      Conversation.countDocuments({ userId: req.user._id, isActive: true }),
      Message.countDocuments({ userId: req.user._id }),
      Notification.countDocuments({ userId: req.user._id, isRead: false })
    ]);

    res.json({
      stats: {
        conversations: conversationCount,
        messages: messageCount,
        unreadNotifications,
        credits: req.user.credits,
        plan: req.user.plan
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      message: 'Failed to fetch stats',
      code: 'FETCH_STATS_ERROR'
    });
  }
});

module.exports = { router, setIO };
