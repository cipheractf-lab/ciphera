const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');
const compression = require('compression');
const requestIp = require('request-ip');
const morgan = require('morgan');
const cookieParser = require('cookie-parser')

// Load environment variables FIRST - before any other imports that might use them
dotenv.config({ path: path.join(__dirname, '.env') });

// Critical environment variables validation
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not defined in .env file');
  process.exit(1);
}
console.log('[Config] JWT_SECRET loaded:', process.env.JWT_SECRET ? 'Yes (length: ' + process.env.JWT_SECRET.length + ')' : 'No');

// Now import modules that depend on environment variables
// Centralized Redis client (singleton pattern for 500+ users)
const { getRedisClient } = require('./utils/redis');

// Consolidated Security Middleware
const {
  secureHeaders,
  sanitizeInput,
  mongoSanitize,
  secureFileUpload
} = require('./middleware/security');

const { concurrencyMiddleware } = require('./middleware/concurrency');

// Import routes
const authRoutes = require('./routes/auth');
const challengeRoutes = require('./routes/challenges');
const contactRoutes = require('./routes/contact');
const newsletterRoutes = require('./routes/newsletter');
const registrationStatusRoutes = require('./routes/registrationStatus');
const blogRoutes = require('./routes/blog');
const tutorialRoutes = require('./routes/tutorials');
const teamRoutes = require('./routes/teams');
const adminTeamManagementRoutes = require('./routes/adminTeamManagement');
const noticeRoutes = require('./routes/notice');
const analyticsRoutes = require('./routes/analytics');
const configurationRoutes = require('./routes/configuration');
const realtimeRoutes = require('./routes/realtime');
const scoreboardRoutes = require('./routes/scoreboard');
const adminResetRoutes = require('./routes/adminReset');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 10000;

app.use(morgan('dev'));

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// IP address middleware (must be early in the middleware stack)
app.use(requestIp.mw());

// Security Headers
app.use(secureHeaders);

const configuredCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isLocalDevelopmentOrigin = (origin) =>
  origin.includes('localhost') || origin.includes('127.0.0.1');

// CORS with development-friendly configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow localhost for development
    if (isLocalDevelopmentOrigin(origin)) {
      return callback(null, true);
    }

    if (configuredCorsOrigins.includes(origin) || configuredCorsOrigins.includes('*')) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Initialize centralized Redis client (singleton for 500+ users)
const redisClient = getRedisClient();

// Session system removed - using JWT only for better scalability
// This saves Redis memory and prevents session/JWT confusion

// Performance middleware
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Concurrency management
app.use(concurrencyMiddleware);

// Body parsing with security limits
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({
  extended: true,
  limit: '1mb',
  parameterLimit: 20
}));

// Cookie parsing for JWT authentication
app.use(cookieParser());

// MongoDB injection protection
app.use(mongoSanitize);

// Input sanitization
app.use(sanitizeInput);

// CSRF protection for state-changing operations (disabled for development)
// app.use('/api/', (req, res, next) => {
//   if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
//     return csrfProtection(req, res, next);
//   }
//   next();
// });

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}



// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Sanitize filename
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + '-' + sanitizedFilename);
  }
});

const fileFilter = (req, file, cb) => {
  try {
    secureFileUpload.validateFile(file);
    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.FILE_UPLOAD_MAX_SIZE) || secureFileUpload.maxFileSize,
    files: 1,
    fields: 10,
    fieldNameSize: 50,
    fieldSize: 1024
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: process.memoryUsage(),
    connections: {
      active: mongoose.connection.db?.serverConfig?.connections?.length || 0,
      poolSize: mongoose.connection.db?.serverConfig?.poolSize || 0
    }
  };

  try {
    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.message = error.message;
    res.status(503).json(healthCheck);
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/categories', require('./routes/categories'));
app.use('/api/unlocks', require('./routes/unlocks')); // unlocks endpoint
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/registration-status', registrationStatusRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/tutorials', tutorialRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/team-invitations', require('./routes/teamInvitations'));
app.use('/api/admin/teams', adminTeamManagementRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/configuration', configurationRoutes);
app.use('/api/r-submission', realtimeRoutes);
app.use('/api/v1/scoreboard', scoreboardRoutes);
app.use('/api/awards', require('./routes/awards'));
app.use('/api/admin/reset', adminResetRoutes);

// Additional security headers middleware
// Note: Content-Security-Policy is set by helmet (see middleware/security.js's
// secureHeaders, applied near the top of this file) and intentionally not
// overridden here. It previously was overridden with a fully permissive
// policy ("default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; ...")
// which defeated CSP for every response, including served uploads.
app.use((req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Allow framing for better compatibility
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // HSTS for HTTPS - only in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
  next();
});

// Serve static files from uploads directory with proper security headers.
//
// IMPORTANT: this must NOT be a blanket `/uploads` mount. Challenge files live
// under uploads/challenges/<challengeId>/<filename> and are meant to be gated
// by GET /api/challenges/:challengeId/download/:filename (routes/challenges.js),
// which requires login AND checks challenge.state === 'visible'. A blanket
// static mount bypassed both checks -- anyone who learned a filename (leaked
// via a writeup, a shared link, admin preview, etc.) could download a
// draft/hidden challenge's files with no auth at all.
//
// Only mount subdirectories that are genuinely meant to be public and have no
// dedicated serving route of their own:
//   - blog-images: blog posts are public (GET /api/blog has no auth) and
//     there is no dedicated image route.
// config/ and team-avatars/ already have their own scoped, traversal-guarded
// routes (GET /api/configuration/logo/:filename, GET /api/teams/avatar/:filename)
// that the frontend actually uses, so they are intentionally left unmounted here.
// challenges/ is intentionally never mounted here -- see above.
app.use('/uploads/blog-images', express.static(path.join(__dirname, 'uploads', 'blog-images')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Log detailed error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error stack:', err.stack);
  }

  // Handle specific error types
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: 'File upload error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Invalid file upload'
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: process.env.NODE_ENV === 'development' ? messages : ['Invalid input data']
    });
  }

  // Handle mongoose duplicate key errors
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered'
    });
  }

  // Default error - never expose internal details in production
  const isProduction = process.env.NODE_ENV === 'production';

  // Log full error details server-side
  console.error('Server Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(err.status || 500).json({
    success: false,
    message: isProduction ? 'Internal server error' : err.message,
    error: isProduction ? undefined : err.stack
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('🚨 [CRITICAL] Unhandled Promise Rejection:', err);
  console.error('Stack trace:', err.stack);
  
  // In production, exit immediately to let PM2/Docker restart the process
  // This prevents the server from running in an unstable state
  console.error('Exiting process due to unhandled rejection...');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('🚨 [CRITICAL] Uncaught Exception:', err);
  console.error('Stack trace:', err.stack);
  
  // Always exit on uncaught exceptions - the process is in an undefined state
  console.error('Exiting process due to uncaught exception...');
  process.exit(1);
});

// Start server
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ctf-platform';

// Enhanced MongoDB connection options for 400 concurrent users support
const mongoOptions = {
  // Connection pool settings - Optimized for PM2 Cluster (Total ~600 connections with 4 instances)
  maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE) || 150,
  minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE) || 15,
  maxIdleTimeMS: parseInt(process.env.MONGO_MAX_IDLE_TIME) || 60000, // Close connections after 60 seconds of inactivity
  serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT) || 10000, // How long to try selecting a server
  socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT) || 60000, // How long a send or receive on a socket can take before timing out
  heartbeatFrequencyMS: parseInt(process.env.MONGO_HEARTBEAT_FREQUENCY) || 5000, // How often to check the status of the connection

  // Connection wait queue settings
  waitQueueTimeoutMS: parseInt(process.env.MONGO_WAIT_QUEUE_TIMEOUT) || 10000,

  // Retry settings
  retryWrites: true,
  retryReads: true,

  // Read/Write concerns for consistency
  readPreference: process.env.MONGO_READ_PREFERENCE || 'primary',
  readConcern: { level: process.env.MONGO_READ_CONCERN || 'majority' },
  writeConcern: { w: process.env.MONGO_WRITE_CONCERN || 'majority', j: true, wtimeout: 10000 }
};

// Set mongoose-specific options separately (not passed to MongoDB driver)
mongoose.set('bufferCommands', false); // Disable mongoose buffering
mongoose.set('strictQuery', true); // Enable strict mode for queries

let mongoRetryTimer = null;
const mongoRetryDelayMs = parseInt(process.env.MONGO_RETRY_DELAY_MS, 5000);
const allowMemoryMongo =
  process.env.NODE_ENV !== 'production' && process.env.ENABLE_MEMORY_MONGO === 'true';
let memoryMongoServer = null;

const scheduleMongoReconnect = () => {
  if (mongoRetryTimer) return;
  mongoRetryTimer = setTimeout(() => {
    mongoRetryTimer = null;
    connectToMongo();
  }, mongoRetryDelayMs);
};

const connectToMongo = async () => {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, mongoOptions);
    console.log('MongoDB connected successfully with enhanced connection pooling');
    console.log(`Connection pool: min=${mongoOptions.minPoolSize}, max=${mongoOptions.maxPoolSize}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);

    if (allowMemoryMongo && !memoryMongoServer) {
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        console.warn('[MongoDB] Falling back to in-memory MongoDB for local development');
        memoryMongoServer = await MongoMemoryServer.create();
        const memoryUri = memoryMongoServer.getUri('ctf-platform');

        await mongoose.connect(memoryUri, mongoOptions);
        console.log('[MongoDB] In-memory MongoDB connected');
        return;
      } catch (memoryErr) {
        console.error('[MongoDB] In-memory fallback failed:', memoryErr.message);
      }
    }

    console.error(`[MongoDB] Retrying in ${Math.round(mongoRetryDelayMs / 1000)}s...`);
    scheduleMongoReconnect();
  }
};

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`Server accessible at http://localhost:${PORT}`);
  console.log(`MongoDB connection pool configured for ${mongoOptions.maxPoolSize} concurrent connections`);
  connectToMongo();
});
