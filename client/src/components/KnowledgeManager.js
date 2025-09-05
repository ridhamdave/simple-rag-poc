import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Plus, RefreshCw, Database, AlertCircle } from 'lucide-react';
import { fetchApi } from '../utils/api';

const KnowledgeManager = ({ onVectorUpdate }) => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetchApi('/api/knowledge/files');
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error loading files:', error);
      setMessage('Error loading files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsProcessing(true);
    try {
      const response = await fetchApi('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('File uploaded successfully!');
        loadFiles();
        onVectorUpdate();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage('Error uploading file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteFile = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;

    try {
      const response = await fetchApi(`/api/knowledge/files/${filename}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage('File deleted successfully!');
        loadFiles();
        onVectorUpdate();
      } else {
        const data = await response.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      setMessage('Error deleting file');
    }
  };

  const handleCreateTextFile = async () => {
    if (!newFileName.trim() || !newFileContent.trim()) {
      setMessage('Please provide both filename and content');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetchApi('/api/knowledge/create-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: newFileName,
          content: newFileContent,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('Text file created successfully!');
        setNewFileName('');
        setNewFileContent('');
        setShowCreateForm(false);
        loadFiles();
        onVectorUpdate();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating text file:', error);
      setMessage('Error creating text file');
    } finally {
      setIsProcessing(false);
    }
  };

  const processKnowledgeBase = async () => {
    setIsProcessing(true);
    try {
      const response = await fetchApi('/api/vector/process-knowledge-base', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (response.ok) {
        if (data.processedFiles > 0) {
          setMessage(`Knowledge base processed! ${data.processedFiles} new files processed.`);
        } else if (data.skippedFiles > 0) {
          setMessage(`All files already processed. ${data.skippedFiles} files skipped.`);
        } else {
          setMessage('No files to process.');
        }
        onVectorUpdate();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error processing knowledge base:', error);
      setMessage('Error processing knowledge base');
    } finally {
      setIsProcessing(false);
    }
  };

  const reprocessAllFiles = async () => {
    if (!window.confirm('This will clear the vector database and reprocess all files. Continue?')) {
      return;
    }
    
    setIsProcessing(true);
    try {
      const response = await fetchApi('/api/vector/reprocess-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (response.ok) {
        setMessage(`Knowledge base reprocessed! ${data.processedFiles} files processed.`);
        onVectorUpdate();
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error reprocessing knowledge base:', error);
      setMessage('Error reprocessing knowledge base');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    switch (type) {
      case '.pdf':
        return '📄';
      case '.txt':
        return '📝';
      case '.md':
        return '📋';
      case '.docx':
        return '📄';
      default:
        return '📄';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Knowledge Base Manager</h2>
              <p className="text-gray-600 mt-1">Upload and manage documents for your RAG system</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={loadFiles}
                disabled={isLoading}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={processKnowledgeBase}
                disabled={isProcessing || files.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <Database className="h-4 w-4" />
                <span>Process New Files</span>
              </button>
              <button
                onClick={reprocessAllFiles}
                disabled={isProcessing || files.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Reprocess All</span>
              </button>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-lg flex items-center space-x-2 ${
            message.includes('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{message}</span>
            <button
              onClick={() => setMessage('')}
              className="ml-auto text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Upload Section */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
              <Upload className="h-4 w-4" />
              <span>Upload File</span>
              <input
                type="file"
                accept=".pdf,.txt,.md,.docx"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
            </label>
            
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <Plus className="h-4 w-4" />
              <span>Create Text File</span>
            </button>
          </div>

          {/* Create Text File Form */}
          {showCreateForm && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filename
                  </label>
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="my-document.txt"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <textarea
                    value={newFileContent}
                    onChange={(e) => setNewFileContent(e.target.value)}
                    placeholder="Enter your text content here..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateTextFile}
                    disabled={isProcessing || !newFileName.trim() || !newFileContent.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    Create File
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewFileName('');
                      setNewFileContent('');
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Files List */}
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Files ({files.length})</h3>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading files...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No files uploaded yet. Upload some documents to get started!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getFileIcon(file.type)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.size)} • {new Date(file.modified).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteFile(file.name)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                    title="Delete file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeManager;
