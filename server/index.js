const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const chatRoutes = require('./routes/chat');
const knowledgeRoutes = require('./routes/knowledge');
const vectorRoutes = require('./routes/vector');
const conversationRoutes = require('./routes/conversations');
const { router: authRoutes } = require('./routes/auth');

// Import services and config
const SimpleVectorService = require('./services/simpleVectorService');
const serviceRegistry = require('./services/serviceRegistry');
const connectDB = require('./config/database');
const passport = require('./config/passport');

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();

// Initialize vector service globally
const vectorService = new SimpleVectorService();

// Register services
serviceRegistry.register('vectorService', vectorService);

// Security middleware
app.use(helmet());

// Rate limiting - exclude auth routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Apply rate limiting to all API routes except auth
app.use('/api/', (req, res, next) => {
  if (req.path.startsWith('/auth/')) {
    return next(); // Skip rate limiting for auth routes
  }
  return limiter(req, res, next);
});

// Separate rate limiter for auth routes (more lenient)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Allow more auth attempts
  message: 'Too many authentication attempts, please try again later.'
});
app.use('/api/auth/', authLimiter);

// CORS configuration
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware - only for non-file upload routes
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve static files
app.use(express.static(path.join(__dirname, '../client/build')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', express.json({ limit: '10mb' }), conversationRoutes);
app.use('/api/chat', express.json({ limit: '10mb' }), chatRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/vector', express.json({ limit: '10mb' }), vectorRoutes);

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await vectorService.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await vectorService.cleanup();
  process.exit(0);
});

// Initialize vector service and start server
async function startServer() {
  try {
    console.log('Initializing vector service...');
    await vectorService.initialize();
    console.log('Vector service initialized with file watching');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Knowledge base directory: ${path.join(__dirname, '../knowledge-base')}`);
      console.log('File watching enabled - no need to restart when adding files!');
    });
  } catch (error) {
    console.error('Failed to initialize vector service:', error);
    process.exit(1);
  }
}

startServer();
