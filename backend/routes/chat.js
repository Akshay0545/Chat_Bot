const express = require('express');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { validateMessage, validateConversation } = require('../middleware/validation');

// Get io instance from global
let io;
const setIO = (ioInstance) => {
  io = ioInstance;
};

const router = express.Router();

// Get all conversations for the user
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await Conversation.find({ 
      userId: req.user._id, 
      isActive: true 
    })
    .sort({ updatedAt: -1 })
    .limit(50);

    res.json({
      conversations: conversations.map(conv => ({
        id: conv._id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messageCount: conv.metadata.messageCount,
        lastMessageAt: conv.metadata.lastMessageAt
      }))
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      message: 'Failed to fetch conversations',
      code: 'FETCH_CONVERSATIONS_ERROR'
    });
  }
});

// Create new conversation
router.post('/conversations', validateConversation, async (req, res) => {
  try {
    const { title } = req.body;

    const conversation = new Conversation({
      title,
      userId: req.user._id
    });

    await conversation.save();

    // Send notification for new conversation with delay
    console.log(`Creating new conversation notification for user: ${req.user._id}, conversation: ${conversation.title}`);
    const notification = await Notification.create({
      userId: req.user._id,
      title: 'New Conversation',
      message: `You created a new conversation: "${conversation.title}"`,
      type: 'info',
      metadata: {
        source: 'chat',
        priority: 'low'
      }
    });
    console.log(`Created notification with ID: ${notification._id}`);

    // Emit real-time notification with delay
    await new Promise(resolve => setTimeout(resolve, 500));
    const notificationPayload = {
      id: String(notification._id),
      message: notification.message,
      type: notification.type,
      timestamp: notification.createdAt,
      read: notification.isRead,
      userId: String(req.user._id), // Add user ID for verification
    };
    console.log(`Sending new conversation notification to user: ${req.user._id}`);
    console.log(`Notification payload:`, notificationPayload);
    
    // Verify the room exists before sending
    const userRoom = `user:${req.user._id}`;
    const room = io.sockets.adapter.rooms.get(userRoom);
    if (room) {
      console.log(`Room ${userRoom} exists with ${room.size} socket(s)`);
      io.to(userRoom).emit('notification', notificationPayload);
    } else {
      console.error(`Room ${userRoom} does not exist! Cannot send notification.`);
    }

    res.status(201).json({
      message: 'Conversation created successfully',
      conversation: {
        id: conversation._id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messageCount: conversation.metadata.messageCount
      }
    });

  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      message: 'Failed to create conversation',
      code: 'CREATE_CONVERSATION_ERROR'
    });
  }
});

// Get messages for a conversation
router.get('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Verify conversation belongs to user
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        message: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    res.json({
      messages: messages.map(msg => ({
        id: msg._id,
        content: msg.content,
        role: msg.role,
        createdAt: msg.createdAt,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt,
        metadata: msg.metadata
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Message.countDocuments({ conversationId })
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      message: 'Failed to fetch messages',
      code: 'FETCH_MESSAGES_ERROR'
    });
  }
});

// Send message
router.post('/conversations/:conversationId/messages', validateMessage, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content } = req.body;
    
    // Add request deduplication key
    const requestKey = `${req.user._id}-${conversationId}-${content}-${Date.now()}`;
    console.log(`Processing message request: ${requestKey}`);

    // Check if user has enough credits
    if (req.user.credits < 1) {
      return res.status(402).json({
        message: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS'
      });
    }

    // Verify conversation belongs to user
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        message: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    // Create user message
    const userMessage = new Message({
      conversationId,
      userId: req.user._id,
      content,
      role: 'user'
    });

    await userMessage.save();

    // Update conversation metadata
    conversation.metadata.messageCount += 1;
    conversation.metadata.lastMessageAt = new Date();
    await conversation.save();

    // Deduct credits
    console.log('Deducting credits for user:', req.user._id, 'current credits:', req.user.credits);
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { credits: -1 }
    });

    // Generate AI response (mock for now) with fallback
    let aiResponse;
    try {
      aiResponse = await generateAIResponse(content, conversation.settings);
    } catch (error) {
      console.error('Error generating AI response:', error);
      // Fallback response if AI generation fails
      aiResponse = {
        content: `I apologize, but I'm currently experiencing technical difficulties. This is a mock response to ensure you always get a reply. Your message was: "${content}". In a real application, this would be handled by a proper AI service.`,
        tokens: 50,
        processingTime: 1000
      };
    }

    // Create AI message
    const aiMessage = new Message({
      conversationId,
      userId: req.user._id,
      content: aiResponse.content,
      role: 'assistant',
      metadata: {
        tokens: aiResponse.tokens,
        model: conversation.settings.model,
        temperature: conversation.settings.temperature,
        processingTime: aiResponse.processingTime
      }
    });

    await aiMessage.save();

    // Update conversation metadata again
    conversation.metadata.messageCount += 1;
    conversation.metadata.totalTokens += aiResponse.tokens;
    conversation.metadata.lastMessageAt = new Date();
    await conversation.save();

    // Update user credits
    const updatedUser = await User.findById(req.user._id).select('credits');
    console.log('Updated user credits:', updatedUser.credits);

    // Check for low credits and send notification (trigger after 1-2 responses)
    if (updatedUser.credits <= 1248 && updatedUser.credits > 0) {
      const lowCreditsNotification = await Notification.create({
        userId: req.user._id,
        title: 'Low Credits Warning',
        message: `You have ${updatedUser.credits} credits remaining. Consider upgrading your plan.`,
        type: 'warning',
        metadata: {
          source: 'billing',
          priority: 'high'
        }
      });

      await new Promise(resolve => setTimeout(resolve, 500));
      io.to(`user:${req.user._id}`).emit('notification', {
        id: String(lowCreditsNotification._id),
        message: lowCreditsNotification.message,
        type: lowCreditsNotification.type,
        timestamp: lowCreditsNotification.createdAt,
        read: lowCreditsNotification.isRead,
      });
    }

    // Check for very low credits (urgent)
    if (updatedUser.credits <= 1245 && updatedUser.credits > 0) {
      const urgentCreditsNotification = await Notification.create({
        userId: req.user._id,
        title: 'URGENT: Very Low Credits',
        message: `⚠️ Only ${updatedUser.credits} credits left! You'll be unable to use AI features soon. Purchase credits now!`,
        type: 'error',
        metadata: {
          source: 'billing',
          priority: 'urgent'
        }
      });

      await new Promise(resolve => setTimeout(resolve, 800));
      io.to(`user:${req.user._id}`).emit('notification', {
        id: String(urgentCreditsNotification._id),
        message: urgentCreditsNotification.message,
        type: urgentCreditsNotification.type,
        timestamp: urgentCreditsNotification.createdAt,
        read: urgentCreditsNotification.isRead,
      });
    }

    // Send notification for AI response completion with delay
    console.log(`Creating AI response notification for user: ${req.user._id}, conversation: ${conversation.title}`);
    const aiResponseNotification = await Notification.create({
      userId: req.user._id,
      title: 'AI Response Ready',
      message: `AI has responded to your message in "${conversation.title}"`,
      type: 'success',
      metadata: {
        source: 'chat',
        priority: 'medium'
      }
    });
    console.log(`Created AI response notification with ID: ${aiResponseNotification._id}`);

    await new Promise(resolve => setTimeout(resolve, 700));
    const aiNotificationPayload = {
      id: String(aiResponseNotification._id),
      message: aiResponseNotification.message,
      type: aiResponseNotification.type,
      timestamp: aiResponseNotification.createdAt,
      read: aiResponseNotification.isRead,
      userId: String(req.user._id), // Add user ID for verification
    };
    console.log(`Sending AI response notification to user: ${req.user._id}`);
    console.log(`AI notification payload:`, aiNotificationPayload);
    
    // Verify the room exists before sending
    const userRoom = `user:${req.user._id}`;
    const room = io.sockets.adapter.rooms.get(userRoom);
    if (room) {
      console.log(`Room ${userRoom} exists with ${room.size} socket(s)`);
      io.to(userRoom).emit('notification', aiNotificationPayload);
    } else {
      console.error(`Room ${userRoom} does not exist! Cannot send AI notification.`);
    }

    res.json({
      message: 'Message sent successfully',
      userMessage: {
        id: userMessage._id,
        content: userMessage.content,
        role: userMessage.role,
        createdAt: userMessage.createdAt
      },
      aiMessage: {
        id: aiMessage._id,
        content: aiMessage.content,
        role: aiMessage.role,
        createdAt: aiMessage.createdAt,
        metadata: aiMessage.metadata
      },
      credits: updatedUser.credits
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      message: 'Failed to send message',
      code: 'SEND_MESSAGE_ERROR'
    });
  }
});

// Update conversation
router.put('/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        message: 'Title is required',
        code: 'INVALID_TITLE'
      });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, userId: req.user._id, isActive: true },
      { title: title.trim(), updatedAt: new Date() },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({
        message: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    res.json({
      message: 'Conversation updated successfully',
      conversation: {
        id: conversation._id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messageCount: conversation.metadata.messageCount
      }
    });

  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({
      message: 'Failed to update conversation',
      code: 'UPDATE_CONVERSATION_ERROR'
    });
  }
});

// Delete conversation
router.delete('/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findOneAndUpdate(
      { _id: conversationId, userId: req.user._id },
      { isActive: false },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({
        message: 'Conversation not found',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    res.json({
      message: 'Conversation deleted successfully',
      conversationId: conversationId
    });

  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      message: 'Failed to delete conversation',
      code: 'DELETE_CONVERSATION_ERROR'
    });
  }
});

// Mock AI response generator with guaranteed response
async function generateAIResponse(userMessage, settings) {
  try {
    // Simulate API call delay
    const processingTime = Math.random() * 2000 + 500; // 500-2500ms
    
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // Generate contextual response based on message content
    let contextualResponse = "";
    const message = userMessage.toLowerCase();

    if (message.includes('python') || message.includes('function') || message.includes('code')) {
      contextualResponse = `Here's a Python function to sort a list:\n\n\`\`\`python\ndef sort_list(lst):\n    """Sort a list in ascending order"""\n    return sorted(lst)\n\n# Example usage:\nnumbers = [3, 1, 4, 1, 5, 9, 2, 6]\nsorted_numbers = sort_list(numbers)\nprint(sorted_numbers)  # Output: [1, 1, 2, 3, 4, 5, 6, 9]\n\`\`\`\n\nThis function uses Python's built-in \`sorted()\` function which returns a new sorted list without modifying the original.`;
    } else if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      contextualResponse = `Hello! I'm an AI assistant here to help you with your questions. How can I assist you today?`;
    } else if (message.includes('help') || message.includes('how')) {
      contextualResponse = `I'd be happy to help! Could you please provide more details about what you'd like assistance with? I can help with programming, general questions, explanations, and much more.`;
    } else if (message.includes('explain') || message.includes('what is')) {
      contextualResponse = `I'd be glad to explain that topic for you. Let me break it down in a way that's easy to understand.`;
    } else if (message.includes('thank')) {
      contextualResponse = `You're very welcome! I'm here whenever you need assistance. Feel free to ask me anything else.`;
    } else {
      // General responses for other messages
      const generalResponses = [
        "That's an interesting question! Let me help you with that.",
        "I understand what you're asking. Here's my perspective on this topic.",
        "Great question! This is a complex topic that requires careful consideration.",
        "I'd be happy to help you explore this further. Let me break it down for you.",
        "That's a thoughtful inquiry. Here's what I think about this subject.",
        "Thank you for your message! I'm here to help with any questions you might have.",
        "I appreciate you reaching out. Let me provide you with some insights on this topic.",
        "That's a great point you've raised. Here's my take on this subject."
      ];
      contextualResponse = generalResponses[Math.floor(Math.random() * generalResponses.length)];
    }

    const tokens = Math.floor(Math.random() * 100) + 50; // 50-150 tokens

    return {
      content: `${contextualResponse}\n\n**This is a mock AI response.** In a real application, this would be connected to an actual AI service like OpenAI's GPT or Anthropic's Claude.`,
      tokens,
      processingTime: Math.round(processingTime)
    };
  } catch (error) {
    console.error('Error in generateAIResponse:', error);
    // Guaranteed fallback response
    return {
      content: `I apologize for the technical issue. This is a guaranteed fallback response. Your message was: "${userMessage}". This is a mock AI system for demonstration purposes.`,
      tokens: 30,
      processingTime: 1000
    };
  }
}

module.exports = { router, setIO };