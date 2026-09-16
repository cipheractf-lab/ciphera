const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');

const { getRedisClient } = require('../utils/redis');
const redisClient = getRedisClient();
const CACHE_TTL = Math.floor(config.redis.ttl.userCache / 1000); // Convert ms to seconds

const isRedisReady = () => redisClient && redisClient.status === 'ready';

// Protect routes
exports.protect = async (req, res, next) => {
  let token;
  let tokenType = 'legacy'; // Track which token type was used

  // Priority 1: Check new access_token cookie (short-lived, refresh token system)
  if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
    tokenType = 'access';
  }
  // Priority 2: Check legacy token cookie (backward compatibility)
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
    tokenType = 'legacy';
  }
  // Priority 3: Check Bearer token in header (API/mobile clients)
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
    tokenType = 'bearer';
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
      requiresAuth: true
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // For access tokens, verify type
    if (tokenType === 'access' && decoded.type && decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Legacy token refresh logic (only for old 24h tokens)
    if (tokenType === 'legacy') {
      // Calculate token lifetime and refresh threshold
      const tokenIssued = decoded.iat * 1000;
      const tokenExp = decoded.exp * 1000;
      const tokenLifetime = tokenExp - tokenIssued;
      const refreshThreshold = tokenLifetime * 0.10; // 10% of lifetime
      const now = Date.now();
      const timeRemaining = tokenExp - now;

      if (timeRemaining < refreshThreshold && timeRemaining > 0) {
        // Generate new legacy token
        const newToken = jwt.sign(
          { id: decoded.id },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRE || '24h' }
        );

        // Set new token in response header
        res.setHeader('X-New-Token', newToken);
        console.log(`[Auth] Legacy token refreshed for user ${decoded.id} (${Math.round(timeRemaining / 60000)}min remaining)`);
      }
    }

    // Check cache first to reduce database load.
    // Auth must not fail when Redis is unavailable.
    const cacheKey = `user:${decoded.id}`;

    let user;
    if (isRedisReady()) {
      try {
        const cachedStr = await redisClient.get(cacheKey);
        if (cachedStr) {
          const cachedData = JSON.parse(cachedStr);
          // Restore Date objects for password check
          if (cachedData.passwordChangedAt) {
            cachedData.passwordChangedAt = new Date(cachedData.passwordChangedAt);
          }
          // Ensure _id is always a string for consistency
          if (cachedData._id && typeof cachedData._id === 'object') {
            cachedData._id = cachedData._id.toString();
          }
          user = cachedData;
        }
      } catch (e) {
        console.warn('Redis cache read error:', e.message);
      }
    }

    if (!user) {
      // Get user from database with team pre-populated
      const dbUser = await User.findById(decoded.id)
        .select('-password')
        .populate('team', '_id name points members captain')
        .lean(); // Use lean() for better performance (plain JS object)

      if (!dbUser) {
        // Remove from cache if user no longer exists
        if (isRedisReady()) {
          try {
            await redisClient.del(cacheKey);
          } catch (e) {
            console.warn('Redis cache delete error:', e.message);
          }
        }
        return res.status(401).json({
          success: false,
          message: 'User no longer exists'
        });
      }

      // Ensure _id is string for consistency
      dbUser._id = dbUser._id.toString();
      if (dbUser.team && dbUser.team._id) {
        dbUser.team._id = dbUser.team._id.toString();
      }
      
      user = dbUser;

      // Cache the user data with populated team (15 min TTL for production)
      if (isRedisReady()) {
        const productionCacheTTL = 900; // 15 minutes for production
        try {
          await redisClient.setex(cacheKey, productionCacheTTL, JSON.stringify(dbUser));
        } catch (e) {
          console.warn('Redis cache write error:', e.message);
        }
      }
    }

    // Check if user's password was changed after the token was issued
    if (user.passwordChangedAt) {
      const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          success: false,
          message: 'User recently changed password. Please login again'
        });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Legacy helper kept for compatibility: admin-only authorization
exports.authorizeSuperadmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only admin can access this route'
    });
  }
  next();
};
