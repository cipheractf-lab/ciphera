/**
 * Centralized Configuration Module
 * All runtime behavior is driven by .env variables
 * NO HARDCODED VALUES - everything configurable
 */

// Helper to parse duration strings (e.g., "24h", "30m", "5s") to milliseconds
const parseDuration = (value, defaultMs) => {
  if (!value) return defaultMs;
  if (typeof value === 'number') return value;
  
  const match = value.match(/^(\d+)([smhd])$/);
  if (!match) return defaultMs;
  
  const [, num, unit] = match;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number.parseInt(num, 10) * (multipliers[unit] || 1000);
};

// Helper to parse boolean strings
const parseBoolean = (value, defaultValue) => {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
};

// Helper to parse integer
const parseIntHelper = (value, defaultValue) => {
  const parsed = Number.parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Debug: Log JWT_SECRET availability
console.log('[Config Module] JWT_SECRET from env:', process.env.JWT_SECRET ? 'EXISTS (length: ' + process.env.JWT_SECRET.length + ')' : 'MISSING');

module.exports = {
  // Server Configuration
  server: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseIntHelper(process.env.PORT, 10000),
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production'
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ciphera',
    maxPoolSize: parseIntHelper(process.env.MONGO_MAX_POOL_SIZE, 500),
    minPoolSize: parseIntHelper(process.env.MONGO_MIN_POOL_SIZE, 50)
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: {
      userCache: parseDuration(process.env.REDIS_USER_CACHE_TTL || '5m', 300000), // 5 minutes
      challengeCache: parseDuration(process.env.REDIS_CHALLENGE_CACHE_TTL || '5m', 300000),
      scoreboardCache: parseDuration(process.env.REDIS_SCOREBOARD_CACHE_TTL || '30s', 30000)
    }
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRE || '24h', // Legacy - for backward compatibility
    // New: Short-lived access tokens
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRE || '15m', // 15 minutes
    // New: Long-lived refresh tokens
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d', // 7 days
    // Separate refresh token secret (recommended for security)
    refreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    // Refresh token when this % of lifetime remains (default 10%)
    refreshThresholdPercent: parseIntHelper(process.env.JWT_REFRESH_THRESHOLD_PERCENT, 10)
  },

  // Session Configuration
  session: {
    secret: process.env.SESSION_SECRET,
    maxAge: parseDuration(process.env.SESSION_MAX_AGE || '24h', 86400000) // 24 hours
  },

  // Security Configuration - Relaxed for CTF UX
  security: {
    maxLoginAttempts: parseIntHelper(process.env.MAX_LOGIN_ATTEMPTS, 100), // Very high - won't block users
    loginTimeoutMinutes: parseIntHelper(process.env.LOGIN_TIMEOUT, 1),
    bcryptRounds: parseIntHelper(process.env.BCRYPT_ROUNDS, 10), // Reduced for faster response
    hstsMaxAge: parseIntHelper(process.env.HSTS_MAX_AGE_SECONDS, 31536000) // 1 year
  },

  // Rate Limiting Configuration (Identity-Based, NAT-Safe)
  rateLimit: {
    // Legacy flag submission config (still used by some routes)
    flagSubmit: {
      maxAttempts: parseIntHelper(process.env.FLAG_RL_LIMIT, 3),
      windowSeconds: parseIntHelper(process.env.FLAG_RL_WINDOW, 60),
      cooldownSeconds: parseIntHelper(process.env.FLAG_LOCK_TIME, 300)
    }
  },
  
  // Input Validation Limits
  validation: {
    flagMaxLength: parseIntHelper(process.env.FLAG_MAX_LENGTH, 200) // Default 200 chars, configurable for security
  },

  // Real-time / SSE Configuration
  realtime: {
    heartbeatIntervalMs: parseDuration(process.env.SSE_HEARTBEAT_INTERVAL || '30s', 30000)
  },

  // Application URLs
  app: {
    // Used to build password-reset / verification links in outbound email.
    // NEVER derive this from the request's Host or Origin header: on an
    // unauthenticated endpoint that is a reset-link poisoning vector.
    frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: parseBoolean(process.env.CORS_CREDENTIALS, true)
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseIntHelper(process.env.SMTP_PORT, 587),
      secure: parseBoolean(process.env.SMTP_SECURE, true),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    // When false, registration auto-verifies and skips OTP entirely.
    // An escape hatch so a broken SMTP setup can never lock anyone out.
    required: parseBoolean(process.env.EMAIL_REQUIRED, true)
  },

  // Analytics Timeframes (configurable)
  analytics: {
    activeUserDays: parseIntHelper(process.env.ANALYTICS_ACTIVE_USER_DAYS, 30),
    recentActivityDays: parseIntHelper(process.env.ANALYTICS_RECENT_ACTIVITY_DAYS, 7)
  },

  // File Upload Configuration
  fileUpload: {
    maxSize: parseIntHelper(process.env.MAX_FILE_SIZE, 20 * 1024 * 1024), // 20MB default
    maxFiles: parseIntHelper(process.env.MAX_FILES_PER_CHALLENGE, 10), // 10 files max
    uploadDir: process.env.UPLOAD_DIR || 'uploads/challenges'
  }
};
