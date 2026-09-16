/**
 * Refresh Token Utilities
 * 
 * Provides cryptographic functions and helpers for secure refresh token management:
 * - Token hashing (SHA-256)
 * - Token generation and validation
 * - Reuse detection
 * - Family revocation
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const RefreshToken = require('../models/RefreshToken');
const config = require('../config');

/**
 * Hash a token using SHA-256
 * Stored in database to prevent token exposure if DB is compromised
 * @param {string} token - The raw token string
 * @returns {string} Hex-encoded hash
 */
function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

/**
 * Generate a cryptographically secure random token ID
 * @returns {string} UUID v4
 */
function generateTokenId() {
  return uuidv4();
}

/**
 * Generate a token family ID for rotation tracking
 * @returns {string} UUID v4
 */
function generateFamilyId() {
  return uuidv4();
}

/**
 * Create access token (short-lived JWT)
 * @param {string} userId - User ID
 * @param {string} team - Team ID (optional)
 * @param {string} role - User role
 * @returns {string} Signed JWT
 */
function createAccessToken(userId, team = null, role = 'user') {
  return jwt.sign(
    {
      id: userId,
      team,
      role,
      type: 'access'
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.accessTokenExpiresIn || '15m' // 15 minutes
    }
  );
}

/**
 * Create refresh token (long-lived JWT)
 * @param {string} userId - User ID
 * @param {string} tokenId - Unique token identifier
 * @param {string} family - Token family for rotation tracking
 * @returns {string} Signed JWT
 */
function createRefreshToken(userId, tokenId, family) {
  return jwt.sign(
    {
      id: userId,
      tokenId,
      family,
      type: 'refresh'
    },
    config.jwt.refreshSecret || config.jwt.secret, // Separate secret recommended
    {
      expiresIn: config.jwt.refreshTokenExpiresIn || '7d' // 7 days
    }
  );
}

/**
 * Verify and decode access token
 * @param {string} token - JWT token
 * @returns {object} Decoded payload
 * @throws {Error} If token invalid or expired
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('ACCESS_TOKEN_EXPIRED');
    }
    throw new Error('INVALID_ACCESS_TOKEN');
  }
}

/**
 * Verify and decode refresh token
 * @param {string} token - JWT token
 * @returns {object} Decoded payload
 * @throws {Error} If token invalid or expired
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(
      token,
      config.jwt.refreshSecret || config.jwt.secret
    );
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('REFRESH_TOKEN_EXPIRED');
    }
    throw new Error('INVALID_REFRESH_TOKEN');
  }
}

/**
 * Save refresh token to database
 * @param {object} data - Token data
 * @param {string} data.userId - User ID
 * @param {string} data.tokenId - Token identifier
 * @param {string} data.token - Raw JWT token (will be hashed)
 * @param {string} data.family - Token family
 * @param {Date} data.expiresAt - Expiration date
 * @param {string} data.ipAddress - Client IP
 * @param {string} data.userAgent - Client user agent
 * @param {string} data.replacedToken - ID of token being replaced (optional)
 * @returns {Promise<object>} Saved token document
 */
async function saveRefreshToken(data) {
  const {
    userId,
    tokenId,
    token,
    family,
    expiresAt,
    ipAddress,
    userAgent,
    replacedToken
  } = data;

  const tokenHash = hashToken(token);

  const refreshToken = await RefreshToken.create({
    user: userId,
    tokenId,
    tokenHash,
    family,
    expiresAt,
    ipAddress,
    userAgent,
    replacedToken: replacedToken || null
  });

  return refreshToken;
}

/**
 * Validate refresh token and detect reuse
 * @param {string} token - Raw JWT token
 * @returns {Promise<object>} Token document if valid
 * @throws {Error} If token invalid, revoked, or reused
 */
async function validateRefreshToken(token) {
  // Step 1: Verify JWT signature and decode
  const decoded = verifyRefreshToken(token);

  // Step 2: Hash token for database lookup
  const tokenHash = hashToken(token);

  // Step 3: Find token in database
  const dbToken = await RefreshToken.findOne({ tokenHash }).populate('user', 'username email role team');

  if (!dbToken) {
    throw new Error('REFRESH_TOKEN_NOT_FOUND');
  }

  // Check if user still exists (might have been deleted)
  if (!dbToken.user) {
    // User was deleted, revoke this token
    await dbToken.updateOne({ isRevoked: true, revokedAt: new Date(), revokedReason: 'user_deleted' });
    throw new Error('USER_NOT_FOUND');
  }

  // Step 4: Check if token has been revoked
  if (dbToken.isRevoked) {
    throw new Error('REFRESH_TOKEN_REVOKED');
  }

  // Step 5: Check database expiration (backup to JWT exp check)
  if (dbToken.expiresAt < new Date()) {
    throw new Error('REFRESH_TOKEN_EXPIRED');
  }

  // Step 6: CRITICAL - Detect token reuse (security breach)
  if (dbToken.replacedBy) {
    // This token has already been used and replaced
    // Someone is trying to reuse an old token - possible theft
    console.error('[SECURITY ALERT] Refresh token reuse detected!', {
      tokenId: dbToken.tokenId,
      family: dbToken.family,
      user: dbToken.user ? dbToken.user._id : 'unknown',
      username: dbToken.user ? dbToken.user.username : 'unknown',
      replacedBy: dbToken.replacedBy
    });

    // Revoke entire token family
    await RefreshToken.revokeTokenFamily(
      dbToken.family,
      'token_reuse_detected'
    );

    throw new Error('TOKEN_REUSE_DETECTED');
  }

  // Token is valid
  return dbToken;
}

/**
 * Rotate refresh token (create new one, mark old as replaced)
 * @param {object} oldToken - Existing token document
 * @param {string} ipAddress - Client IP
 * @param {string} userAgent - Client user agent
 * @returns {Promise<object>} New token pair { accessToken, refreshToken, tokenId }
 */
async function rotateRefreshToken(oldToken, ipAddress, userAgent) {
  // Ensure user exists
  if (!oldToken.user) {
    throw new Error('USER_NOT_FOUND');
  }
  
  const userId = oldToken.user._id || oldToken.user;
  const userTeam = oldToken.user.team;
  const userRole = oldToken.user.role;
  
  // Generate new token IDs (keep same family for rotation tracking)
  const newTokenId = generateTokenId();
  const family = oldToken.family; // Same family as old token

  // Calculate new expiration (full refresh token lifetime)
  const refreshTokenLifetime = config.jwt.refreshTokenExpiresIn || '7d';
  const expiresAt = new Date();
  
  // Parse expiration time
  if (refreshTokenLifetime.endsWith('d')) {
    expiresAt.setDate(expiresAt.getDate() + parseInt(refreshTokenLifetime));
  } else if (refreshTokenLifetime.endsWith('h')) {
    expiresAt.setHours(expiresAt.getHours() + parseInt(refreshTokenLifetime));
  } else if (refreshTokenLifetime.endsWith('m')) {
    expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(refreshTokenLifetime));
  } else {
    expiresAt.setDate(expiresAt.getDate() + 7); // Default 7 days
  }

  // Create new token pair
  const newAccessToken = createAccessToken(userId, userTeam, userRole);
  const newRefreshToken = createRefreshToken(userId, newTokenId, family);

  // Save new refresh token to database
  const newDbToken = await saveRefreshToken({
    userId,
    tokenId: newTokenId,
    token: newRefreshToken,
    family,
    expiresAt,
    ipAddress,
    userAgent,
    replacedToken: oldToken._id
  });

  // Mark old token as replaced (DON'T revoke - keep for reuse detection)
  await oldToken.markAsReplaced(newDbToken._id);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    tokenId: newTokenId,
    expiresAt
  };
}

/**
 * Create initial token pair on login
 * @param {object} user - User object
 * @param {string} ipAddress - Client IP
 * @param {string} userAgent - Client user agent
 * @returns {Promise<object>} Token pair { accessToken, refreshToken, tokenId, family }
 */
async function createTokenPair(user, ipAddress, userAgent) {
  const userId = user._id;
  const userTeam = user.team;
  const userRole = user.role || 'user';

  // Generate unique IDs
  const tokenId = generateTokenId();
  const family = generateFamilyId(); // New family for new login

  // Calculate expiration
  const refreshTokenLifetime = config.jwt.refreshTokenExpiresIn || '7d';
  const expiresAt = new Date();
  
  if (refreshTokenLifetime.endsWith('d')) {
    expiresAt.setDate(expiresAt.getDate() + parseInt(refreshTokenLifetime));
  } else if (refreshTokenLifetime.endsWith('h')) {
    expiresAt.setHours(expiresAt.getHours() + parseInt(refreshTokenLifetime));
  } else if (refreshTokenLifetime.endsWith('m')) {
    expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(refreshTokenLifetime));
  } else {
    expiresAt.setDate(expiresAt.getDate() + 7); // Default 7 days
  }

  // Create tokens
  const accessToken = createAccessToken(userId, userTeam, userRole);
  const refreshToken = createRefreshToken(userId, tokenId, family);

  // Save refresh token to database
  await saveRefreshToken({
    userId,
    tokenId,
    token: refreshToken,
    family,
    expiresAt,
    ipAddress,
    userAgent
  });

  return {
    accessToken,
    refreshToken,
    tokenId,
    family,
    expiresAt
  };
}

/**
 * Revoke refresh token
 * @param {string} token - Raw JWT token
 * @param {string} reason - Revocation reason
 * @returns {Promise<boolean>} Success status
 */
async function revokeRefreshToken(token, reason = 'user_logout') {
  try {
    const tokenHash = hashToken(token);
    const dbToken = await RefreshToken.findOne({ tokenHash });

    if (!dbToken) {
      return false; // Token not found
    }

    await dbToken.revoke(reason);
    return true;
  } catch (error) {
    console.error('[Token Revocation Error]', error);
    return false;
  }
}

/**
 * Revoke all refresh tokens for a user
 * @param {string} userId - User ID
 * @param {string} reason - Revocation reason
 * @returns {Promise<number>} Number of tokens revoked
 */
async function revokeAllUserTokens(userId, reason = 'password_changed') {
  return RefreshToken.revokeAllUserTokens(userId, reason);
}

/**
 * Get user's active sessions
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Active token documents
 */
async function getUserSessions(userId) {
  return RefreshToken.getActiveTokens(userId);
}

/**
 * Count user's active sessions
 * @param {string} userId - User ID
 * @returns {Promise<number>} Session count
 */
async function countUserSessions(userId) {
  return RefreshToken.countActiveSessions(userId);
}

module.exports = {
  hashToken,
  generateTokenId,
  generateFamilyId,
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  saveRefreshToken,
  validateRefreshToken,
  rotateRefreshToken,
  createTokenPair,
  revokeRefreshToken,
  revokeAllUserTokens,
  getUserSessions,
  countUserSessions
};
