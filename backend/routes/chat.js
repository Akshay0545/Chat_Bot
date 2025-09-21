const express = require('express');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { validateMessage, validateConversation } = require('../middleware/validation');

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
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { credits: -1 }
    });

    // Generate AI response (mock for now)
    const aiResponse = await generateAIResponse(content, conversation.settings);

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

// Mock AI response generator
async function generateAIResponse(userMessage, settings) {
  // Simulate API call delay
  const processingTime = Math.random() * 2000 + 500; // 500-2500ms
  
  await new Promise(resolve => setTimeout(resolve, processingTime));

  // Mock responses based on message content
  const responses = [
    "That's an interesting question! Let me help you with that.",
    "I understand what you're asking. Here's my perspective on this topic.",
    "Great question! This is a complex topic that requires careful consideration.",
    "I'd be happy to help you explore this further. Let me break it down for you.",
    "That's a thoughtful inquiry. Here's what I think about this subject."
  ];

  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  const tokens = Math.floor(Math.random() * 100) + 50; // 50-150 tokens

  return {
    content: `${randomResponse}\n\nThis is a mock AI response. In a real application, this would be connected to an actual AI service like OpenAI's GPT or Anthropic's Claude. The response would be generated based on the conversation context and user's message.`,
    tokens,
    processingTime: Math.round(processingTime)
  };
}

module.exports = router;