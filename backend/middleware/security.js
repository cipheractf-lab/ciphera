const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const config = require('../config');

// 1. Security Headers (Helmet with comprehensive security)
const secureHeaders = helmet({
  // Content Security Policy to mitigate XSS
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for React/Vite
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
  },
  // Strict Transport Security (HSTS) - Force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  // Prevent clickjacking attacks
  frameguard: {
    action: 'deny' // X-Frame-Options: DENY
  },
  // Other security headers
  crossOriginEmbedderPolicy: false, // May break some functionality
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  ieNoOpen: true,
  noSniff: true, // X-Content-Type-Options: nosniff
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true // X-XSS-Protection: 1; mode=block
});

// 4. Input Sanitization
const sanitizeInput = (req, res, next) => {
  if (req.body) req.body = sanitizePayload(req.body);
  if (req.query) req.query = sanitizePayload(req.query);
  if (req.params) req.params = sanitizePayload(req.params);
  next();
};

const isPasswordField = (key) => {
  if (!key) return false;
  const normalized = String(key).toLowerCase();
  return normalized.includes('password');
};

const sanitizePayload = (obj, key = null) => {
  if (typeof obj === 'string') {
    if (isPasswordField(key)) {
      // Preserve password exactly as entered; trimming mutates valid secrets.
      return obj.replace(/\0/g, '');
    }
    // Basic trimming and removal of null bytes
    return obj.trim().replace(/\0/g, '');
  }
  if (typeof obj === 'object' && obj !== null) {
    if (obj.buffer) return obj; // Skip files
    Object.keys(obj).forEach(key => {
      obj[key] = sanitizePayload(obj[key], key);
    });
  }
  return obj;
};

// 5. Input Validation
const validator = require('validator');

const validateInput = {
  email: (email) => {
    if (!email || typeof email !== 'string') {
      throw new Error('Invalid email format');
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!validator.isEmail(normalizedEmail)) {
      throw new Error('Invalid email format');
    }

    return normalizedEmail;
  },

  username: (username) => {
    // Flexible username for CTF (allow alphanumeric + typical chars)
    if (!username) throw new Error('Username is required');
    if (username.length < 3 || username.length > 30) {
      throw new Error('Username length must be between 3 and 30 characters');
    }
    // Remove strict alphanumeric check to allow creative names, but sanitize output elsewhere
    return username.trim();
  },

  password: (password) => {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    return password;
  },

  flag: (flag) => {
    if (!flag || typeof flag !== 'string') {
      throw new Error('Invalid flag format');
    }
    // Enforce configurable max length from .env (default 200)
    // Length limit not exposed to users for security reasons
    const maxLength = config.validation.flagMaxLength;
    if (flag.length > maxLength) {
      throw new Error('Invalid flag format');
    }
    return flag.trim();
  },

  objectId: (id) => {
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new Error('Invalid ID');
    }
    return id;
  }
};

// Alias for compatibility if needed, or we refactor routes.
// Let's refactor routes to use 'validateInput' generally, 
// but auth.js uses 'enhancedValidation' so we export it as that too or alias.
const enhancedValidation = validateInput;

// 7. Secure File Upload Utility
const secureFileUpload = {
  maxFileSize: 5 * 1024 * 1024, // 5MB default
  validateFile: (file) => {
    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type');
    }

    // Validate file name (prevent directory traversal)
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      throw new Error('Invalid file name');
    }

    return true;
  }
};

// 2. Consolidated Export
module.exports = {
  secureHeaders,
  mongoSanitize: mongoSanitize(), // Function call to initialize
  sanitizeInput,
  validateInput,
  enhancedValidation,
  secureFileUpload
};