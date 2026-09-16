const crypto = require('crypto');

// Security configuration constants
const SECURITY_CONFIG = {
  // Password policy - Relaxed for better UX
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: false,
    REQUIRE_LOWERCASE: false,
    REQUIRE_NUMBERS: false,
    REQUIRE_SPECIAL_CHARS: false,
    BCRYPT_ROUNDS: 10,
    HISTORY_COUNT: 0 // Don't check password history
  },

  // Session security
  SESSION: {
    MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    SECURE: process.env.NODE_ENV === 'production',
    HTTP_ONLY: true,
    SAME_SITE: 'strict',
    NAME: 'ciphera.sid'
  },

  // JWT configuration
  JWT: {
    ACCESS_TOKEN_EXPIRE: '15m',
    REFRESH_TOKEN_EXPIRE: '7d',
    ALGORITHM: 'HS256',
    ISSUER: 'ciphera',
    AUDIENCE: 'ciphera-users'
  },

  // Rate limiting - Very relaxed for CTF event UX
  RATE_LIMIT: {
    LOGIN: {
      WINDOW_MS: 15 * 60 * 1000, // 15 minutes
      MAX_ATTEMPTS: 50, // Very generous limit
      BLOCK_DURATION: 5 * 60 * 1000 // Only 5 minutes block
    },
    API: {
      WINDOW_MS: 15 * 60 * 1000,
      MAX_REQUESTS: 1000 // High limit for smooth experience
    },
    CHALLENGE_SUBMIT: {
      WINDOW_MS: 60 * 1000, // 1 minute
      MAX_ATTEMPTS: 20 // Allow rapid-fire attempts
    }
  },

  // File upload security
  FILE_UPLOAD: {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    SCAN_FOR_MALWARE: true,
    QUARANTINE_SUSPICIOUS: true
  },

  // Content Security Policy
  CSP: {
    DEFAULT_SRC: ["'self'"],
    SCRIPT_SRC: ["'self'", "'unsafe-inline'"],
    STYLE_SRC: ["'self'", "'unsafe-inline'"],
    IMG_SRC: ["'self'", "data:", "https:"],
    FONT_SRC: ["'self'"],
    CONNECT_SRC: ["'self'"],
    FRAME_ANCESTORS: ["'none'"],
    OBJECT_SRC: ["'none'"],
    UPGRADE_INSECURE_REQUESTS: true
  },

  // Security headers
  HEADERS: {
    HSTS_MAX_AGE: 31536000, // 1 year
    HSTS_INCLUDE_SUBDOMAINS: true,
    HSTS_PRELOAD: true,
    X_FRAME_OPTIONS: 'DENY',
    X_CONTENT_TYPE_OPTIONS: 'nosniff',
    X_XSS_PROTECTION: '1; mode=block',
    REFERRER_POLICY: 'strict-origin-when-cross-origin'
  },

  // Input validation patterns
  VALIDATION: {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    USERNAME_REGEX: /^[a-zA-Z0-9_-]+$/,
    OBJECTID_REGEX: /^[0-9a-fA-F]{24}$/,
    
    // Dangerous patterns to block
    SQL_INJECTION_PATTERNS: [
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/gi,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
      /((\%27)|(\'))union/gi,
      /exec(\s|\+)+(s|x)p\w+/gi,
      /UNION(?:\s+ALL)?\s+SELECT/gi,
      /(DROP|CREATE|ALTER|TRUNCATE|INSERT|DELETE)\s+(TABLE|DATABASE|INDEX)/gi
    ],
    
    XSS_PATTERNS: [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /vbscript:/gi,
      /data:text\/html/gi
    ],
    
    NOSQL_INJECTION_PATTERNS: [
      /\$where/gi,
      /\$ne/gi,
      /\$gt/gi,
      /\$lt/gi,
      /\$regex/gi,
      /\$or/gi,
      /\$and/gi
    ]
  },

  // Logging configuration
  LOGGING: {
    SECURITY_EVENTS: true,
    FAILED_LOGINS: true,
    SUSPICIOUS_ACTIVITY: true,
    ADMIN_ACTIONS: true,
    FILE_UPLOADS: true,
    LOG_RETENTION_DAYS: 90
  },

  // Two-Factor Authentication
  TWO_FACTOR: {
    ENABLED: false, // Can be enabled later
    ISSUER: 'Ciphera',
    WINDOW: 2, // Allow 2 time steps
    STEP: 30 // 30 seconds
  }
};

// Generate secure random strings
const generateSecureRandom = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate CSRF token
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Validate password strength - RELAXED for CTF UX
const validatePasswordStrength = (password) => {
  const config = SECURITY_CONFIG.PASSWORD;
  const errors = [];

  // Only check minimum length - keep it simple!
  if (password.length < config.MIN_LENGTH) {
    errors.push(`Password must be at least ${config.MIN_LENGTH} characters`);
  }

  if (password.length > config.MAX_LENGTH) {
    errors.push(`Password must not exceed ${config.MAX_LENGTH} characters`);
  }

  // Skip all complexity requirements - they're disabled in config
  // No uppercase, lowercase, number, or special char requirements
  // Users can choose simple passwords for this CTF event

  // Skip weak password check - let users use what they want
  // This is a 2-day CTF, not a banking app

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Check for suspicious patterns in input
const detectSuspiciousInput = (input) => {
  if (typeof input !== 'string') return false;

  const patterns = [
    ...SECURITY_CONFIG.VALIDATION.SQL_INJECTION_PATTERNS,
    ...SECURITY_CONFIG.VALIDATION.XSS_PATTERNS,
    ...SECURITY_CONFIG.VALIDATION.NOSQL_INJECTION_PATTERNS
  ];

  return patterns.some(pattern => pattern.test(input));
};

// Security event logger
const logSecurityEvent = (event, details = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    details,
    severity: details.severity || 'medium'
  };

  console.log(`[SECURITY_EVENT] ${JSON.stringify(logEntry)}`);
  
  // In production, you might want to send this to a security monitoring service
  // or store in a dedicated security log database
};

module.exports = {
  SECURITY_CONFIG,
  generateSecureRandom,
  generateCSRFToken,
  validatePasswordStrength,
  detectSuspiciousInput,
  logSecurityEvent
};