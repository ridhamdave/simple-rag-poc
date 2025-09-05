import React from 'react';
import { Database } from 'lucide-react';
import UserProfile from './UserProfile';

const Header = ({ activeTab, onTabChange, tabs, vectorStats, user }) => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Database className="h-8 w-8 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">RAG Knowledge Chat</h1>
            </div>
          </div>
          
          <nav className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
          
          <div className="flex items-center space-x-4">
            {vectorStats && (
              <div className="text-sm text-gray-500">
                {vectorStats.documentCount} documents indexed
              </div>
            )}
            <UserProfile />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
