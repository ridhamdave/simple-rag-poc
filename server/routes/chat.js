const express = require('express');
const router = express.Router();
const ChatService = require('../services/chatService');
const Conversation = require('../models/Conversation');
const { authenticateToken } = require('./auth');
const serviceRegistry = require('../services/serviceRegistry');

// Get services from registry
let vectorService;
let chatService;

// Initialize services when the module loads
setTimeout(() => {
  vectorService = serviceRegistry.get('vectorService');
  if (vectorService && vectorService.searchSimilar) {
    chatService = new ChatService(vectorService);
    console.log('Chat service initialized with vector service');
  } else {
    console.error('Vector service not available or not properly initialized for chat service');
  }
}, 1000); // Wait 1 second for the main server to initialize

router.post('/message', authenticateToken, async (req, res) => {
  if (!chatService) {
    return res.status(503).json({ error: 'Chat service not yet initialized. Please try again in a moment.' });
  }

  if (!vectorService || !chatService.vectorService) {
    return res.status(503).json({ error: 'Vector service not yet initialized. Please try again in a moment.' });
  }

  try {
    const { message, conversationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let conversation;

    // Find or create conversation
    if (conversationId && conversationId !== 'default') {
      conversation = await Conversation.findOne({
        _id: conversationId,
        userId: req.user.userId
      });
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
    } else {
      // Create new conversation
      conversation = new Conversation({
        userId: req.user.userId,
        title: message.substring(0, 50).trim() + (message.length > 50 ? '...' : ''),
        messages: []
      });
      await conversation.save();
    }

    // Add user message to conversation
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    conversation.messages.push(userMessage);

    // Generate AI response using conversation history
    const conversationHistory = conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const response = await chatService.generateResponse(message, conversationHistory);
    
    // Add AI response to conversation
    const aiMessage = {
      role: 'assistant',
      content: response.answer,
      sources: response.sources || [],
      timestamp: new Date()
    };
    conversation.messages.push(aiMessage);

    // Save conversation with both messages
    await conversation.save();
    
    res.json({
      answer: response.answer,
      sources: response.sources || [],
      relevantDocs: response.relevantDocs || [],
      conversationId: conversation._id,
      conversation: {
        _id: conversation._id,
        title: conversation.title,
        messageCount: conversation.messages.length
      }
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to generate response',
      details: error.message 
    });
  }
});

// Get conversation by ID (for loading chat history)
router.get('/conversation/:id', authenticateToken, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ conversation });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Delete conversation
router.delete('/conversation/:id', authenticateToken, async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

module.exports = router;