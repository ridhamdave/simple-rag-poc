# RAG Chat System

A full-stack Retrieval-Augmented Generation (RAG) chat system built with React, Node.js, and Google Gemini AI. This application allows users to upload documents to a knowledge base and chat with an AI that can answer questions based on those documents.

## 🌟 Features

- **Document Processing**: Upload and process PDF, TXT, MD, and DOCX files
- **AI-Powered Chat**: Chat with Google Gemini AI that references your documents
- **User Authentication**: Google OAuth 2.0 integration
- **Persistent Chat History**: Save and manage conversation history
- **Real-time File Watching**: Automatically process new documents added to knowledge base
- **Vector Search**: Semantic search through document embeddings
- **Responsive UI**: Modern, clean interface with Tailwind CSS

## 🏗️ Architecture

### Backend
- **Node.js/Express**: REST API server
- **MongoDB**: User data and chat history storage
- **Google Gemini AI**: Text generation and embeddings
- **Custom Vector Service**: JSON-based vector storage with semantic search
- **Passport.js**: Google OAuth authentication
- **Chokidar**: File system watching for auto-processing

### Frontend
- **React**: Modern UI with hooks and context
- **Tailwind CSS**: Utility-first styling
- **Axios**: HTTP client for API calls
- **React Router**: Navigation and routing

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Google Cloud Platform account for OAuth and Gemini API

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd react-training
npm install
cd client && npm install && cd ..
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5001

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# MongoDB
MONGODB_URI=mongodb://localhost:27017/rag-system

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# URLs
CLIENT_URL=http://localhost:3000
```

### 3. Google Cloud Setup

#### Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file as `GEMINI_API_KEY`

#### Setup Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set application type to "Web application"
6. Add authorized redirect URI: `http://localhost:5001/api/auth/google/callback`
7. Copy Client ID and Client Secret to your `.env` file

### 4. Database Setup

#### Local MongoDB
```bash
# macOS with Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu
sudo apt update
sudo apt install mongodb
sudo systemctl start mongodb
```

#### Or use MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string and add to `.env` as `MONGODB_URI`

### 5. Start the Application

```bash
# Terminal 1: Start backend server
npm start

# Terminal 2: Start frontend development server
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001

## 📁 Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts (Auth)
│   │   ├── utils/          # Utility functions
│   │   └── App.js          # Main app component
│   └── package.json
├── server/                 # Node.js backend
│   ├── config/             # Database and Passport config
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── services/           # Business logic services
│   └── index.js            # Main server file
├── knowledge-base/         # Document storage (gitignored)
├── vector-db/              # Vector database files (gitignored)
├── .env                    # Environment variables (gitignored)
├── .gitignore
└── README.md
```

## 🎯 Usage

### 1. Authentication
- Visit http://localhost:3000
- Click "Sign in with Google"
- Complete OAuth flow

### 2. Upload Documents
- Go to "Knowledge Base" tab
- Upload PDF, TXT, MD, or DOCX files
- Files are automatically processed and indexed

### 3. Chat with AI
- Go to "Chat" tab
- Ask questions about your documents
- AI will provide answers with source references
- Chat history is automatically saved

### 4. Manage Conversations
- View chat history in the left sidebar
- Edit conversation titles
- Delete old conversations
- Search through conversations

## 🛠️ API Endpoints

### Authentication
- `GET /api/auth/google` - Start Google OAuth flow
- `GET /api/auth/google/callback` - OAuth callback
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Chat
- `POST /api/chat/message` - Send chat message
- `GET /api/chat/conversation/:id` - Get conversation

### Conversations
- `GET /api/conversations` - Get user conversations
- `PUT /api/conversations/:id/title` - Update conversation title
- `DELETE /api/conversations/:id` - Delete conversation

### Vector Operations
- `POST /api/vector/process-knowledge-base` - Process documents
- `GET /api/vector/stats` - Get database statistics
- `POST /api/vector/clear` - Clear vector database
- `POST /api/vector/reprocess-all` - Reprocess all documents

### Knowledge Base
- `GET /api/knowledge/files` - List uploaded files
- `POST /api/knowledge/upload` - Upload new file
- `DELETE /api/knowledge/files/:filename` - Delete file

## 🔧 Configuration

### Supported File Types
- PDF (.pdf)
- Text files (.txt)
- Markdown (.md)
- Word documents (.docx)

### Vector Search
- Uses Google Gemini `embedding-001` model
- Cosine similarity for document matching
- Configurable chunk size and overlap

### Security Features
- JWT-based authentication
- Rate limiting
- CORS protection
- Helmet security headers
- Session management

## 🚨 Troubleshooting

### Common Issues

1. **Port 5000 already in use**
   - The app uses port 5001 to avoid conflicts with macOS AirPlay
   - Check `.env` file has `PORT=5001`

2. **Google OAuth errors**
   - Verify redirect URI in Google Console matches exactly
   - Check CLIENT_ID and CLIENT_SECRET in `.env`

3. **MongoDB connection errors**
   - Ensure MongoDB is running locally
   - Check MONGODB_URI in `.env`

4. **File processing errors**
   - Verify GEMINI_API_KEY is valid
   - Check file permissions on knowledge-base directory

5. **Vector service not initialized**
   - Wait a few seconds after server start
   - Check server logs for initialization messages

### Development Tips

- Use `npm run dev` for auto-restart during development
- Check browser console for frontend errors
- Monitor server logs for backend issues
- Use MongoDB Compass for database inspection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Google Gemini AI](https://ai.google.dev/) for AI capabilities
- [MongoDB](https://www.mongodb.com/) for database
- [React](https://reactjs.org/) for the frontend framework
- [Express.js](https://expressjs.com/) for the backend framework
- [Tailwind CSS](https://tailwindcss.com/) for styling

## 📞 Support

If you encounter any issues or have questions, please:

1. Check the troubleshooting section above
2. Search existing issues in the repository
3. Create a new issue with detailed information about your problem

---

**Made with ❤️ using React, Node.js, and Google Gemini AI**