import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  X,
  Clock
} from 'lucide-react';
import { fetchApi } from '../utils/api';
import { format, isToday, isYesterday } from 'date-fns';

const ChatHistory = ({ 
  currentConversationId, 
  onSelectConversation, 
  onNewConversation,
  className = ''
}) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await fetchApi('/api/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = () => {
    onNewConversation();
  };

  const handleSelectConversation = (conversationId) => {
    onSelectConversation(conversationId);
  };

  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const response = await fetchApi(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setConversations(prev => prev.filter(conv => conv._id !== conversationId));
        
        // If we deleted the current conversation, start a new one
        if (conversationId === currentConversationId) {
          onNewConversation();
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleEditTitle = (conversation, e) => {
    e.stopPropagation();
    setEditingId(conversation._id);
    setEditTitle(conversation.title);
  };

  const handleSaveTitle = async (conversationId) => {
    try {
      const response = await fetchApi(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: editTitle })
      });

      if (response.ok) {
        setConversations(prev => prev.map(conv => 
          conv._id === conversationId 
            ? { ...conv, title: editTitle }
            : conv
        ));
        setEditingId(null);
        setEditTitle('');
      }
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedConversations = filteredConversations.reduce((groups, conv) => {
    const date = new Date(conv.updatedAt);
    let groupKey;

    if (isToday(date)) {
      groupKey = 'Today';
    } else if (isYesterday(date)) {
      groupKey = 'Yesterday';
    } else {
      groupKey = format(date, 'MMMM yyyy');
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(conv);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className={`bg-white border-r border-gray-200 ${className}`}>
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={handleNewConversation}
          className="w-full flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {Object.keys(groupedConversations).length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No conversations yet</p>
            <p className="text-sm">Start a new chat to begin</p>
          </div>
        ) : (
          Object.entries(groupedConversations).map(([group, convs]) => (
            <div key={group} className="mb-4">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {group}
              </div>
              <div className="space-y-1">
                {convs.map((conversation) => (
                  <div
                    key={conversation._id}
                    onClick={() => handleSelectConversation(conversation._id)}
                    className={`mx-2 p-3 rounded-lg cursor-pointer transition-colors group ${
                      currentConversationId === conversation._id
                        ? 'bg-primary-50 border border-primary-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {editingId === conversation._id ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTitle(conversation._id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveTitle(conversation._id);
                              }}
                              className="p-1 text-green-600 hover:text-green-700"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEdit();
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {conversation.title}
                            </h3>
                            <div className="flex items-center mt-1 space-x-2 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(conversation.updatedAt)}</span>
                              <span>•</span>
                              <span>{conversation.messageCount} messages</span>
                            </div>
                          </>
                        )}
                      </div>
                      
                      {editingId !== conversation._id && (
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleEditTitle(conversation, e)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Edit title"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteConversation(conversation._id, e)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Delete conversation"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatHistory;
