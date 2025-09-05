const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  sources: [{
    source: String,
    chunk_index: Number,
    relevance_score: Number
  }],
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  messages: [messageSchema],
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ userId: 1, title: 'text' });

// Auto-generate title from first user message
conversationSchema.pre('save', function(next) {
  if (this.isNew && this.messages.length > 0) {
    const firstMessage = this.messages.find(msg => msg.role === 'user');
    if (firstMessage && !this.title) {
      // Create title from first 50 characters of first message
      this.title = firstMessage.content.substring(0, 50).trim() + (firstMessage.content.length > 50 ? '...' : '');
    }
  }
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);
