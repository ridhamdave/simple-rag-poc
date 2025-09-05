import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ChatInterface from './components/ChatInterface';
import ChatHistory from './components/ChatHistory';
import KnowledgeManager from './components/KnowledgeManager';
import Header from './components/Header';
import Login from './components/Login';
import { fetchApi } from './utils/api';
import { MessageCircle, Database } from 'lucide-react';

function AppContent() {
  const { user, loading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');
  const [vectorStats, setVectorStats] = useState(null);
  const [currentConversationId, setCurrentConversationId] = useState('new');

  useEffect(() => {
    // Load vector database stats on app start if authenticated
    if (isAuthenticated) {
      fetchVectorStats();
    }
  }, [isAuthenticated]);

  const fetchVectorStats = async () => {
    try {
      const response = await fetchApi('/api/vector/stats');
      const data = await response.json();
      setVectorStats(data);
    } catch (error) {
      console.error('Error fetching vector stats:', error);
    }
  };

  const handleSelectConversation = (conversationId) => {
    setCurrentConversationId(conversationId);
    setActiveTab('chat'); // Switch to chat tab when selecting a conversation
  };

  const handleNewConversation = () => {
    setCurrentConversationId('new');
    setActiveTab('chat');
  };

  const handleConversationChange = (newConversationId) => {
    setCurrentConversationId(newConversationId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'knowledge', label: 'Knowledge Base', icon: Database },
  ];

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Header 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        tabs={tabs}
        vectorStats={vectorStats}
        user={user}
      />
      
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'chat' && (
          <>
            <ChatHistory
              currentConversationId={currentConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              className="w-80 flex-shrink-0"
            />
            <div className="flex-1 flex flex-col">
              <ChatInterface 
                currentConversationId={currentConversationId}
                onConversationChange={handleConversationChange}
                onVectorUpdate={fetchVectorStats} 
              />
            </div>
          </>
        )}
        {activeTab === 'knowledge' && (
          <div className="flex-1 p-6">
            <KnowledgeManager onVectorUpdate={fetchVectorStats} />
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
