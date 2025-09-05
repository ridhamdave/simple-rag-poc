const express = require('express');
const { authenticateToken } = require('./auth');
const Conversation = require('../models/Conversation');
const router = express.Router();

// Get all conversations for authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const conversations = await Conversation.find({ 
      userId: req.user.userId,
      isArchived: false 
    })
    .sort({ updatedAt: -1 })
    .select('title createdAt updatedAt messages');

    // Add message count and last message preview to each conversation
    const conversationsWithPreview = conversations.map(conv => ({
      _id: conv._id,
      title: conv.title,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messageCount: conv.messages.length,
      lastMessage: conv.messages.length > 0 ? 
        conv.messages[conv.messages.length - 1].content.substring(0, 100) + '...' : 
        'No messages'
    }));

    res.json(conversationsWithPreview);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get specific conversation with all messages
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Create new conversation
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, firstMessage } = req.body;

    const conversation = new Conversation({
      userId: req.user.userId,
      title: title || 'New Conversation',
      messages: firstMessage ? [{
        role: 'user',
        content: firstMessage,
        timestamp: new Date()
      }] : []
    });

    await conversation.save();
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Add message to conversation
router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { role, content, sources } = req.body;

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const newMessage = {
      role,
      content,
      sources: sources || [],
      timestamp: new Date()
    };

    conversation.messages.push(newMessage);
    
    // Auto-generate title from first user message if no title set
    if (conversation.messages.length === 1 && role === 'user' && conversation.title === 'New Conversation') {
      conversation.title = content.substring(0, 50).trim() + (content.length > 50 ? '...' : '');
    }

    await conversation.save();
    res.json({ message: newMessage, conversation });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Update conversation title
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { title },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete conversation
router.delete('/:id', authenticateToken, async (req, res) => {
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

// Search conversations
router.get('/search/:query', authenticateToken, async (req, res) => {
  try {
    const query = req.params.query;
    
    const conversations = await Conversation.find({
      userId: req.user.userId,
      isArchived: false,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { 'messages.content': { $regex: query, $options: 'i' } }
      ]
    })
    .sort({ updatedAt: -1 })
    .limit(20);

    res.json(conversations);
  } catch (error) {
    console.error('Search conversations error:', error);
    res.status(500).json({ error: 'Failed to search conversations' });
  }
});

module.exports = router;
