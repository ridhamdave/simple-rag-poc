import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Bot, Database, MessageSquare } from 'lucide-react';

const Login = () => {
  const { login, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-primary-600 rounded-full p-4">
              <Bot className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to RAG System
          </h2>
          <p className="text-gray-600 mb-8">
            Your intelligent knowledge base assistant powered by AI
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center space-x-3 text-gray-700">
            <MessageSquare className="h-5 w-5 text-primary-600" />
            <span>Chat with your documents using AI</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-700">
            <Database className="h-5 w-5 text-primary-600" />
            <span>Persistent chat history and conversations</span>
          </div>
          <div className="flex items-center space-x-3 text-gray-700">
            <Bot className="h-5 w-5 text-primary-600" />
            <span>Powered by Google Gemini AI</span>
          </div>
        </div>

        {/* Login Button */}
        <div>
          <button
            onClick={login}
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <LogIn className="h-5 w-5 text-primary-500 group-hover:text-primary-400" />
            </span>
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Secure authentication powered by Google OAuth
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
