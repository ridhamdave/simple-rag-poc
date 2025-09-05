import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, Loader2 } from 'lucide-react';
import { fetchApi } from '../utils/api';

const ChatInterface = ({ 
  onVectorUpdate, 
  currentConversationId, 
  onConversationChange 
}) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Focus the input when component mounts
    inputRef.current?.focus();
  }, []);

  // Load conversation when currentConversationId changes
  useEffect(() => {
    if (currentConversationId && currentConversationId !== 'new') {
      loadConversation(currentConversationId);
    } else {
      // New conversation
      setMessages([]);
      // Focus input for new conversation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [currentConversationId]);

  const loadConversation = async (conversationId) => {
    try {
      const response = await fetchApi(`/api/chat/conversation/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        const conversation = data.conversation;
        
        // Convert messages to the format expected by the UI
        const formattedMessages = conversation.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          sources: msg.sources || []
        }));
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      // Focus input after loading conversation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const getUniqueSources = (sources) => {
    if (!sources || sources.length === 0) return [];
    
    const uniqueFiles = [...new Set(sources.map(source => source.source))];
    return uniqueFiles.map(fileName => ({
      source: fileName,
      count: sources.filter(s => s.source === fileName).length
    }));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetchApi('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: currentConversationId === 'new' ? null : currentConversationId
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
          relevantDocs: data.relevantDocs
        }]);
        
        // If this was a new conversation, update the conversation ID
        if (data.conversationId && currentConversationId === 'new') {
          onConversationChange?.(data.conversationId);
        }
        
        if (onVectorUpdate) {
          onVectorUpdate();
        }
      } else {
        const errorMessage = data.error || 'Failed to get response';
        const errorType = data.type || 'unknown';
        const isRetryable = data.retryable || false;
        
        let userFriendlyMessage = errorMessage;
        
        // Handle specific error types with helpful messages
        if (errorMessage.includes('not yet initialized')) {
          userFriendlyMessage = 'The system is still starting up. Please wait a moment and try again.';
        } else if (errorType === 'quota_exceeded' || response.status === 429) {
          userFriendlyMessage = '⚠️ API quota exceeded. The system automatically retries, but you may need to wait a few moments before trying again.';
        } else if (errorType === 'unauthorized' || response.status === 401) {
          userFriendlyMessage = '🔑 API authentication issue. Please contact the administrator.';
        } else if (errorType === 'forbidden' || response.status === 403) {
          userFriendlyMessage = '🚫 API access forbidden. Please contact the administrator.';
        } else if (isRetryable) {
          userFriendlyMessage = `⏳ ${errorMessage} Please try again in a moment.`;
        } else {
          userFriendlyMessage = `❌ ${errorMessage}`;
        }
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: userFriendlyMessage,
          isError: true,
          errorType: errorType,
          retryable: isRetryable
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Network error occurred. Please check your connection and try again.',
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      
      // Focus back to input after all processing is complete
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    // Focus input after clearing
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white h-full flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Chat with Knowledge Base</h2>
          <button
            onClick={clearConversation}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Start a conversation by asking a question about your knowledge base!</p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : message.isError
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.role === 'assistant' && !message.isError && (
                    <Bot className="h-4 w-4 mt-1 flex-shrink-0" />
                  )}
                  {message.role === 'user' && (
                    <User className="h-4 w-4 mt-1 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-600 mb-1">Sources:</p>
                        <div className="space-y-1">
                          {getUniqueSources(message.sources).map((source, idx) => (
                            <div key={idx} className="flex items-center space-x-1">
                              <FileText className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {source.source}
                                {source.count > 1 && ` (${source.count} references)`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center space-x-2">
                <Bot className="h-4 w-4" />
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="border-t border-gray-200 bg-white flex-shrink-0">
          <form onSubmit={handleSendMessage} className="p-4">
            <div className="flex space-x-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your knowledge base... (Press Enter to send, Shift+Enter for new line)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none min-h-[40px] max-h-[120px]"
              disabled={isLoading}
              rows={1}
              style={{
                height: 'auto',
                minHeight: '40px',
                maxHeight: '120px'
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 self-end"
            >
              <Send className="h-4 w-4" />
              <span>Send</span>
            </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
