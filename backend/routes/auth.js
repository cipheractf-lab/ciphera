const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const Configuration = require('../models/Configuration');
const LoginLog = require('../models/LoginLog');
const { protect, authorize } = require('../middleware/auth');

const {
  sanitizeInput,
  validateInput,
  enhancedValidation
} = require('../middleware/security');

const {
  sendOTPEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendAccountExistsEmail
} = require('../utils/email');
const requestIp = require('request-ip');
const UAParser = require('ua-parser-js');
const moment = require('moment-timezone');

// Real-time logging function
const logActivity = (action, details = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] AUTH: ${action}`, details);
};

/**
 * server.js sets `mongoose.set('bufferCommands', false)`, so any query made
 * while the DB connection is down (Atlas unreachable, IP not whitelisted,
 * mid-reconnect, etc.) throws immediately with an internal Mongoose message
 * ("Cannot call `users.findOne()` before initial connection is complete...").
 * That string must never reach a client -- it's an infrastructure detail,
 * not something a locked-out user can act on, and it was leaking straight
 * into the login form's error banner (dev-mode error passthrough below).
 */
const isDbUnavailableError = (error) => {
  const name = error?.name || '';
  const message = error?.message || '';
  return (
    name === 'MongoServerSelectionError' ||
    name === 'MongoNetworkError' ||
    name === 'MongoNotConnectedError' ||
    (name === 'MongooseError' && /before initial connection is complete|buffering timed out/i.test(message))
  );
};

// Sends a clean response for a caught route error. DB-outage errors always
// get the same safe, generic 503 regardless of NODE_ENV; anything else keeps
// the existing dev-mode passthrough for genuine debugging.
const sendServerError = (res, error, logPrefix, fallbackMessage) => {
  if (isDbUnavailableError(error)) {
    console.error(`${logPrefix} (database unavailable):`, error.message);
    return res.status(503).json({
      success: false,
      message: 'Service is temporarily unavailable. Please try again in a moment.'
    });
  }

  console.error(logPrefix, error.message, error.stack);
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? error.message : fallbackMessage
  });
};
const crypto = require('crypto');
const { getRedisClient } = require('../utils/redis');
// Use centralized Redis client for scoreboard caching
const redisClient = getRedisClient();

// Helper function to get real IP address using request-ip
const getRealIP = (req) => {
  const clientIp = requestIp.getClientIp(req);
  // Clean up IPv6 mapped IPv4 addresses
  if (clientIp && clientIp.startsWith('::ffff:')) {
    return clientIp.substring(7);
  }
  return clientIp || 'Unknown';
};

// Helper function to parse user agent
const parseUserAgent = (userAgentString) => {
  if (!userAgentString) return 'Unknown';

  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  const browser = result.browser.name ? `${result.browser.name} ${result.browser.version}` : 'Unknown Browser';
  const os = result.os.name ? `${result.os.name} ${result.os.version}` : 'Unknown OS';
  const device = result.device.type ? result.device.type : 'desktop';

  return `${browser} on ${os} (${device})`;
};

// Helper function to create login log
const createLoginLog = async (user, req, status, failureReason = null) => {
  try {
    // Only create log if user exists (has valid _id)
    if (user && user._id) {
      // Get real IP address using request-ip library
      const realIP = getRealIP(req);

      // Parse user agent for better readability
      const rawUserAgent = req.get('User-Agent') || 'Unknown';
      const parsedUserAgent = parseUserAgent(rawUserAgent);

      // Create timestamp in Indian Standard Time (IST)
      const istTime = moment().tz('Asia/Kolkata').toDate();

      const logData = {
        user: user._id,
        email: user.email,
        username: user.username,
        ipAddress: realIP,
        userAgent: parsedUserAgent,
        loginTime: istTime,
        status,
        failureReason
      };

      const loginLog = await LoginLog.create(logData);

      console.log(`Login log created: ${user.username} - ${status} - IP: ${realIP} - Agent: ${parsedUserAgent}`);
      return loginLog;
    }
  } catch (error) {
    console.error('Error creating login log:', error);
  }
};

// Generate JWT Token (fully env-driven)
const generateToken = (id) => {
  try {
    console.log('[JWT Debug] process.env.JWT_SECRET:', process.env.JWT_SECRET ? 'EXISTS' : 'MISSING');
    console.log('[JWT Debug] config.jwt.secret:', config.jwt.secret ? 'EXISTS' : 'MISSING');
    console.log('[JWT Debug] config.jwt:', JSON.stringify(config.jwt));
    
    if (!config.jwt.secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    return jwt.sign({ id }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
  } catch (error) {
    console.error('[JWT Error]', error.message);
    throw error;
  }
};

// Helper: Set JWT in secure httpOnly cookie (XSS protection)
const setTokenCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Calculate maxAge from JWT_ACCESS_EXPIRE (e.g., '15m' -> 15 * 60 * 1000)
  const accessExpire = config.jwt.accessTokenExpiresIn || '15m';
  let maxAge = 15 * 60 * 1000; // Default 15 minutes
  
  if (accessExpire.endsWith('m')) {
    maxAge = parseInt(accessExpire) * 60 * 1000;
  } else if (accessExpire.endsWith('h')) {
    maxAge = parseInt(accessExpire) * 60 * 60 * 1000;
  } else if (accessExpire.endsWith('d')) {
    maxAge = parseInt(accessExpire) * 24 * 60 * 60 * 1000;
  }
  
  res.cookie('token', token, {
    httpOnly: true,        // Cannot be accessed by JavaScript (XSS protection)
    secure: isProduction,  // Only sent over HTTPS in production
    sameSite: 'lax',       // CSRF protection while allowing same-site navigation
    maxAge: maxAge,        // Match JWT expiry from config
    path: '/'
  });
};

// Helper: Clear token cookie on logout
const clearTokenCookie = (res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',  // Must match setTokenCookie setting
    maxAge: 0,        // Use maxAge: 0 instead of expires for reliable clearing
    path: '/'
  });
};

// Helper: turn an expiry string like '15m' / '2h' / '7d' into milliseconds.
const expiryToMs = (value, fallbackMs) => {
  if (typeof value !== 'string') return fallbackMs;
  const amount = parseInt(value, 10);
  if (!Number.isFinite(amount)) return fallbackMs;
  if (value.endsWith('m')) return amount * 60 * 1000;
  if (value.endsWith('h')) return amount * 60 * 60 * 1000;
  if (value.endsWith('d')) return amount * 24 * 60 * 60 * 1000;
  return fallbackMs;
};

/**
 * Helper: mint a real access+refresh token pair and set all three cookies.
 *
 * Every path that logs somebody in MUST go through this. The older
 * generateToken() + setTokenCookie() pair produces a session with no
 * RefreshToken row, which is invisible to GET /sessions, cannot be revoked by
 * logout-all, and cannot be refreshed -- it dies silently at expiry.
 */
const issueSession = async (res, user, req) => {
  const refreshTokenUtils = require('../utils/refreshToken');
  const clientIp = getRealIP(req);
  const userAgentParsed = parseUserAgent(req.get('User-Agent'));

  const tokens = await refreshTokenUtils.createTokenPair(user, clientIp, userAgentParsed);

  const isProduction = process.env.NODE_ENV === 'production';
  const accessMaxAge = expiryToMs(config.jwt.accessTokenExpiresIn, 15 * 60 * 1000);
  const refreshMaxAge = expiryToMs(config.jwt.refreshTokenExpiresIn, 7 * 24 * 60 * 60 * 1000);

  const base = { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' };

  res.cookie('access_token', tokens.accessToken, { ...base, maxAge: accessMaxAge });
  res.cookie('refresh_token', tokens.refreshToken, { ...base, maxAge: refreshMaxAge });
  // Legacy cookie, kept for backward compatibility with older clients.
  res.cookie('token', tokens.accessToken, { ...base, maxAge: accessMaxAge });

  return { tokens, clientIp, userAgentParsed };
};

// Only this institution's mail addresses may self-register. Admin-created
// accounts (POST /register-admin) are unaffected -- this only gates the
// public signup form.
const ALLOWED_REGISTRATION_DOMAIN = 'sece.ac.in';

const isAllowedRegistrationEmail = (email) => {
  const domain = String(email || '').toLowerCase().split('@')[1] || '';
  return domain === ALLOWED_REGISTRATION_DOMAIN;
};

// Helper: is public registration currently open?
const isRegistrationOpen = async () => {
  const cfg = await Configuration.findOne({ key: 'global' }).select('visibility').lean();
  return (cfg?.visibility?.registration || 'private') === 'public';
};

// @route   GET /api/auth/registration-status
// @desc    Whether public signup is open, so the form can render its closed
//          state without having to probe POST /register
// @access  Public
router.get('/registration-status', async (req, res) => {
  try {
    return res.json({
      success: true,
      registrationOpen: await isRegistrationOpen(),
      emailRequired: config.email.required,
      allowedEmailDomain: ALLOWED_REGISTRATION_DOMAIN
    });
  } catch (error) {
    console.error('[Auth] Registration status check failed:', error.message);
    // Fail closed: if we cannot tell, do not advertise an open door.
    return res.json({
      success: true,
      registrationOpen: false,
      emailRequired: config.email.required,
      allowedEmailDomain: ALLOWED_REGISTRATION_DOMAIN
    });
  }
});

// @route   POST /api/auth/register
// @desc    Public self-service registration
// @access  Public
router.post('/register', sanitizeInput, async (req, res) => {
  try {
    if (!(await isRegistrationOpen())) {
      // Shape kept identical to the previous stub -- the frontend keys off it.
      return res.status(403).json({
        success: false,
        message: 'Public registration is currently disabled.',
        registrationDisabled: true
      });
    }

    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a username, email and password'
      });
    }

    let validatedUsername;
    let validatedEmail;
    let validatedPassword;
    try {
      validatedUsername = enhancedValidation.username(username);
      validatedEmail = enhancedValidation.email(email);
      validatedPassword = enhancedValidation.password(password);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message
      });
    }

    if (!isAllowedRegistrationEmail(validatedEmail)) {
      return res.status(403).json({
        success: false,
        field: 'email',
        message: `Registration is restricted to @${ALLOWED_REGISTRATION_DOMAIN} email addresses.`
      });
    }

    // The schema enforces this too, but a schema failure here would surface as
    // a 500 -- validateInput.username does not check the character set.
    if (!/^[a-zA-Z0-9_-]+$/.test(validatedUsername)) {
      return res.status(400).json({
        success: false,
        field: 'username',
        message: 'Username can only contain letters, numbers, underscores and hyphens'
      });
    }

    const clientIp = getRealIP(req);

    // Username collisions are reported honestly: usernames are already public
    // on the scoreboard, nothing is leaked, and the form has to be able to say
    // "that one is taken".
    const usernameTaken = await User.findOne({ username: validatedUsername }).select('_id').lean();
    if (usernameTaken) {
      return res.status(409).json({
        success: false,
        field: 'username',
        message: 'That username is already taken'
      });
    }

    // The 202 envelope every caller sees, whether or not the address was new.
    const acceptedResponse = (emailSent) => ({
      success: true,
      requiresVerification: true,
      emailSent,
      email: validatedEmail,
      message: 'Check your email for a 6-digit verification code.'
    });

    // Email collisions get the SAME envelope as a fresh signup -- otherwise
    // this endpoint is a free account-existence oracle. The existing owner is
    // emailed instead. If their account is still unverified, re-issue its OTP
    // so "I never got the email" self-heals.
    const existing = await User.findOne({ email: validatedEmail });
    if (existing) {
      let emailSent = false;
      try {
        if (!existing.isEmailVerified) {
          const otp = existing.generateOTP();
          await existing.save({ validateBeforeSave: false });
          const result = await sendOTPEmail(existing.email, otp);
          emailSent = result?.sent !== false;
        } else {
          const result = await sendAccountExistsEmail(
            existing.email,
            `${config.app.frontendUrl}/login`
          );
          emailSent = result?.sent !== false;
        }
      } catch (emailError) {
        console.error('[Auth] Duplicate-email notice failed:', emailError.message);
      }

      logActivity('REGISTER_DUPLICATE_EMAIL', { email: validatedEmail, ip: clientIp });
      return res.status(202).json(acceptedResponse(emailSent));
    }

    // Field-by-field construction. NEVER spread req.body -- mass assignment on
    // role / points / isBlocked / canSubmitFlags is how self-service signup
    // turns into privilege escalation.
    const autoVerify = config.email.required === false;

    let user;
    try {
      user = await User.create({
        username: validatedUsername,
        email: validatedEmail,
        password: validatedPassword,
        role: 'user',
        isEmailVerified: autoVerify,
        verified: autoVerify,
        registrationSource: 'self',
        registrationIp: clientIp
      });
    } catch (createError) {
      // Lost a race against a concurrent signup on the same username/email.
      if (createError.code === 11000) {
        const field = Object.keys(createError.keyPattern || {})[0];
        if (field === 'username') {
          return res.status(409).json({
            success: false,
            field: 'username',
            message: 'That username is already taken'
          });
        }
        return res.status(202).json(acceptedResponse(false));
      }
      throw createError;
    }

    logActivity('REGISTER_SUCCESS', {
      userId: user._id,
      username: user.username,
      ip: clientIp,
      autoVerify
    });

    if (autoVerify) {
      return res.status(201).json({
        success: true,
        requiresVerification: false,
        emailSent: false,
        email: user.email,
        message: 'Account created. You can sign in now.'
      });
    }

    // Registration must NEVER fail because email failed -- the account exists
    // either way and the user can use "Resend code".
    let emailSent = false;
    try {
      const otp = user.generateOTP();
      await user.save({ validateBeforeSave: false });
      const result = await sendOTPEmail(user.email, otp);
      emailSent = result?.sent !== false;
    } catch (emailError) {
      console.error('[Auth] Failed to send verification email:', emailError.message);
    }

    return res.status(202).json(acceptedResponse(emailSent));
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and activate user account
// @access  Public
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body || {};

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP'
      });
    }

    // Shape-check before anything hashes it. Without this, {"otp": 123456} or
    // {"otp": {"$ne": null}} is a 500 on a public endpoint.
    if (typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    let validatedEmail;
    try {
      validatedEmail = validateInput.email(email);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message
      });
    }

    // Find user
    const user = await User.findOne({ email: validatedEmail }).select('+otp');

    // "User not found" and "already verified" are both account-existence
    // oracles on a public endpoint, so they collapse into the same answer as
    // a genuinely wrong code.
    if (!user || user.isEmailVerified || !user.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Mark email as verified and clear OTP. `verified` is kept in lockstep
    // with `isEmailVerified` -- PATCH /users/:id does the same, and admin list
    // views filter on `verified`.
    user.isEmailVerified = true;
    user.verified = true;
    user.clearOTP();
    await user.save({ validateBeforeSave: false });

    // Issue a REAL session (access + refresh + RefreshToken row), not the
    // legacy standalone token this used to mint.
    await issueSession(res, user, req);
    await createLoginLog(user, req, 'success');
    logActivity('EMAIL_VERIFIED', { userId: user._id, username: user.username });

    res.json({
      success: true,
      message: 'Email verified successfully',
      // Token NOT sent in response body (httpOnly cookie only)
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        points: user.points,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    sendServerError(res, error, 'OTP verification error', 'Error verifying OTP. Please try again later.');
  }
});

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP to email
// @access  Public
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email'
      });
    }

    let validatedEmail;
    try {
      validatedEmail = validateInput.email(email);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message
      });
    }

    const user = await User.findOne({ email: validatedEmail });

    // Same uniform answer whether the account is missing or already verified,
    // for the same enumeration reason as /verify-otp.
    if (!user || user.isEmailVerified) {
      return res.json({
        success: true,
        message: 'If that address needs verifying, a new code is on its way.'
      });
    }

    // Generate new OTP
    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });

    // The user explicitly asked us to send, so a send failure IS reportable
    // here -- unlike registration, where it must never be fatal.
    try {
      await sendOTPEmail(user.email, otp);
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'If that address needs verifying, a new code is on its way.'
    });
  } catch (error) {
    sendServerError(res, error, 'Resend OTP error', 'Error resending OTP. Please try again later.');
  }
});

// --- Password reset -------------------------------------------------------

// A reset token is 32 random bytes rendered as hex.
const RESET_TOKEN_SHAPE = /^[a-f0-9]{64}$/;

/**
 * FAILSAFE: refuse to issue reset tokens while the legacy TTL index on
 * `resetPasswordExpire` still exists.
 *
 * A MongoDB TTL index deletes the ENTIRE document, not the field. With that
 * index live, setting resetPasswordExpire = now + 10min means the reaper
 * DELETES THE USER'S WHOLE ACCOUNT about ten minutes later -- points, solves,
 * team membership, everything.
 *
 * scripts/migrateAuthIndexes.js drops it. This check exists so that forgetting
 * to run the migration degrades into "password reset is unavailable" instead
 * of silently destroying accounts. Checked once and cached; a failed check
 * fails closed.
 */
let ttlGuardState = null;
const resetIsSafe = async () => {
  if (ttlGuardState !== null) return ttlGuardState;

  try {
    const indexes = await User.collection.indexes();
    const dangerous = indexes.find(
      (i) => i.name === 'resetPasswordExpire_1' || i.key?.resetPasswordExpire !== undefined
    );

    ttlGuardState = !(dangerous && dangerous.expireAfterSeconds !== undefined);

    if (!ttlGuardState) {
      console.error(
        '[Auth] PASSWORD RESET DISABLED: the account-deleting TTL index ' +
        '`resetPasswordExpire_1` is still present on the users collection. ' +
        'Run: node scripts/migrateAuthIndexes.js'
      );
    }
  } catch (error) {
    console.error('[Auth] Could not verify reset-index safety:', error.message);
    ttlGuardState = false; // fail closed
  }

  return ttlGuardState;
};

const hashResetToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// @route   POST /api/auth/forgot-password
// @desc    Email a password reset link
// @access  Public
router.post('/forgot-password', sanitizeInput, async (req, res) => {
  // ALWAYS the same answer, whatever happens below. Anything else turns this
  // into an account-existence oracle.
  const uniformResponse = () => res.json({
    success: true,
    message: 'If an account exists for that address, a reset link is on its way.'
  });

  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
      return uniformResponse();
    }

    let validatedEmail;
    try {
      validatedEmail = enhancedValidation.email(email);
    } catch {
      return uniformResponse();
    }

    if (!(await resetIsSafe())) {
      return res.status(503).json({
        success: false,
        message: 'Password reset is temporarily unavailable. Please contact an administrator.'
      });
    }

    const user = await User.findOne({ email: validatedEmail });

    // Deliberately NOT gated on isLocked(): locking somebody out of their own
    // recovery flow is exactly what an attacker would want.
    if (!user || user.isBlocked) {
      logActivity('PASSWORD_RESET_REQUESTED_UNKNOWN', { email: validatedEmail, ip: getRealIP(req) });
      return uniformResponse();
    }

    const resetToken = user.createPasswordResetToken();
    // Older accounts may fail validation on unrelated fields; that must not
    // block a password reset.
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${config.app.frontendUrl}/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
      logActivity('PASSWORD_RESET_REQUESTED', { userId: user._id, ip: getRealIP(req) });
    } catch (emailError) {
      console.error('[Auth] Failed to send password reset email:', emailError.message);
      // Clear the token rather than leaving an unusable one live.
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
    }

    return uniformResponse();
  } catch (error) {
    console.error('[Auth] Forgot-password error:', error);
    return uniformResponse();
  }
});

// @route   GET /api/auth/reset-password/:token/validate
// @desc    Check a reset link before asking for a new password twice
// @access  Public
router.get('/reset-password/:token/validate', async (req, res) => {
  try {
    const { token } = req.params;

    if (typeof token !== 'string' || !RESET_TOKEN_SHAPE.test(token)) {
      return res.json({ success: true, valid: false });
    }

    const user = await User.findOne({
      resetPasswordToken: hashResetToken(token),
      resetPasswordExpire: { $gt: Date.now() }
    }).select('_id').lean();

    return res.json({ success: true, valid: Boolean(user) });
  } catch (error) {
    console.error('[Auth] Reset token validation error:', error.message);
    return res.json({ success: true, valid: false });
  }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Consume a reset token and set a new password
// @access  Public
router.post('/reset-password/:token', sanitizeInput, async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body || {};

    // Shape-check BEFORE hashing: guards both $ne operator injection and the
    // TypeError crypto.update() throws on a non-string.
    if (typeof token !== 'string' || !RESET_TOKEN_SHAPE.test(token)) {
      return res.status(400).json({
        success: false,
        message: 'This reset link is invalid or has expired.'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new password'
      });
    }

    let validatedPassword;
    try {
      validatedPassword = enhancedValidation.password(password);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message
      });
    }

    const user = await User.findOne({
      resetPasswordToken: hashResetToken(token),
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'This reset link is invalid or has expired.'
      });
    }

    // The pre-save hook re-bcrypts and bumps passwordChangedAt.
    user.password = validatedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    // Possession of the emailed token IS proof of email control, so this also
    // doubles as the self-rescue path for a user stuck behind the
    // verification gate.
    user.isEmailVerified = true;
    user.verified = true;
    await user.save({ validateBeforeSave: false });

    await user.resetLoginAttempts();

    // Reset is the recovery-after-compromise flow. Leaving the attacker's
    // token family alive would defeat the entire point.
    const refreshTokenUtils = require('../utils/refreshToken');
    const revokedCount = await refreshTokenUtils.revokeAllUserTokens(user._id, 'password_changed');
    try {
      await redisClient.del(`user:${user._id}`);
    } catch (cacheError) {
      console.error('[Auth] Redis cache clear failed after reset:', cacheError.message);
    }

    logActivity('PASSWORD_RESET_COMPLETED', {
      userId: user._id,
      username: user.username,
      sessionsRevoked: revokedCount,
      ip: getRealIP(req)
    });

    // Best effort -- the reset already succeeded.
    sendPasswordChangedEmail(user.email).catch((err) =>
      console.error('[Auth] Password-changed notice failed:', err.message)
    );

    // No auto-login: send them through the front door with the new password.
    return res.json({
      success: true,
      message: 'Your password has been reset. Please sign in with your new password.'
    });
  } catch (error) {
    console.error('[Auth] Reset-password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.'
    });
  }
});

// @route   POST /api/auth/register-admin
// @desc    Register a user (Admin only)
// @access  Private/Admin
router.post('/register-admin', protect, authorize('admin'), async (req, res) => {
  try {
    const { username, email, password, teamId, type, verified, hidden, banned } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    let validatedUsername;
    let validatedEmail;
    let validatedPassword;

    try {
      validatedUsername = validateInput.username(username);
      validatedEmail = validateInput.email(email);
      validatedPassword = validateInput.password(password);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError.message
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({
      $or: [{ email: validatedEmail }, { username: validatedUsername }]
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: userExists.email === validatedEmail ?
          'Email already registered' :
          'Username already taken'
      });
    }

    // Create user
    const user = await User.create({
      username: validatedUsername,
      email: validatedEmail,
      password: validatedPassword,
      role: type === 'admin' ? 'admin' : 'user',
      verified: !!verified,
      isEmailVerified: !!verified,
      hidden: !!hidden,
      banned: !!banned,
      isBlocked: !!banned,
      blockedReason: banned ? 'Banned by admin' : null,
      blockedAt: banned ? new Date() : null,
      team: teamId || undefined
    });

    // Populate team if exists
    if (user.team) {
      await user.populate('team', '_id name');
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        points: user.points,
        team: user.team ? {
          _id: user.team._id,
          name: user.team.name
        } : null
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error creating user: ${error.message}` :
        'Error creating user. Please try again later.'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', sanitizeInput, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Enhanced input validation
    let validatedEmail;
    try {
      validatedEmail = enhancedValidation.email(email);
      logActivity('LOGIN_ATTEMPT', { email: validatedEmail, ip: req.ip, userAgent: req.get('User-Agent') });
    } catch (validationError) {
      logActivity('LOGIN_VALIDATION_FAILED', { email, error: validationError.message, ip: req.ip });
      return res.status(400).json({
        success: false,
        message: validationError.message
      });
    }

    // Check for user
    const user = await User.findOne({ email: validatedEmail }).select('+password');

    if (!user) {
      logActivity('LOGIN_FAILED', { email: validatedEmail, reason: 'User not found', ip: req.ip });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check for account locking (Relaxed: 20 attempts, 5 min lock)
    if (user.isLocked()) {
      await createLoginLog(user, req, 'failed', 'Account locked');

      return res.status(429).json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.',
        retryAfter: Math.ceil((user.lockUntil - Date.now()) / 1000)
      });
    }

    // Check if user is blocked by admin
    if (user.isBlocked) {
      await createLoginLog(user, req, 'failed', 'Account blocked by admin');

      return res.status(403).json({
        success: false,
        message: 'You are blocked. Suspicious activity detected. Contact Admin for further information.',
        isBlocked: true,
        blockedReason: user.blockedReason
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      // Log failed login attempt and increment counter (store failed password)
      await user.incrementLoginAttempts();
      await createLoginLog(user, req, 'failed', 'Invalid password');
      logActivity('LOGIN_FAILED', { email: validatedEmail, reason: 'Invalid password', ip: req.ip });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Email verification gate.
    //
    // Deliberately placed AFTER the password check: in front of it, this
    // would be an unauthenticated oracle for whether any given address has a
    // verified account.
    //
    // Behind a Configuration flag that ships FALSE. Admins are exempt as a
    // second seatbelt so a broken SMTP setup can never lock out the platform.
    if (!user.isEmailVerified && user.role !== 'admin') {
      const authCfg = await Configuration.findOne({ key: 'global' })
        .select('emailVerificationRequired')
        .lean();

      if (authCfg?.emailVerificationRequired === true) {
        await createLoginLog(user, req, 'failed', 'Email not verified');
        logActivity('LOGIN_BLOCKED_UNVERIFIED', { email: validatedEmail, ip: req.ip });

        return res.status(403).json({
          success: false,
          code: 'EMAIL_NOT_VERIFIED',
          email: user.email,
          message: 'Please verify your email address before signing in.'
        });
      }
    }

    // Update last login time
    user.lastLoginAt = new Date();
    await user.save();

    // Log successful login and reset attempts
    console.log('[Debug] Resetting login attempts...');
    await user.resetLoginAttempts();
    console.log('[Debug] Creating login log...');
    await createLoginLog(user, req, 'success');



    // Populate team info
    console.log('[Debug] Populating team...');
    try {
      await user.populate('team');
      console.log('[Debug] Team populated:', user.team ? user.team._id : 'No team');
    } catch (popErr) {
      console.error('[Debug] Populate error:', popErr);
    }

    // Generate token pair (access + refresh) and set cookies
    console.log('[Debug] Generating token pair...');
    const { tokens, clientIp, userAgentParsed } = await issueSession(res, user, req);
    console.log('[Debug] Token pair set in httpOnly cookies.');

    logActivity('LOGIN_SUCCESS', { 
      userId: user._id, 
      username: user.username, 
      ip: clientIp, 
      userAgent: userAgentParsed,
      tokenFamily: tokens.family
    });

    console.log('[Debug] Sending response...');

    // Ensure team is properly formatted
    let teamData = null;
    if (user.team) {
      console.log('[Debug] user.team type:', typeof user.team);
      console.log('[Debug] user.team:', user.team);
      
      teamData = {
        _id: user.team._id ? user.team._id.toString() : user.team.toString(),
        name: user.team.name || 'Team'
      };
      
      console.log('[Debug] Formatted teamData:', teamData);
    }

    const responseData = {
      success: true,
      // Token NOT sent in response body (httpOnly cookie only)
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        points: user.points,
        team: teamData
      }
    };

    console.log('[Debug] Sending login response with team:', responseData.user.team);

    res.json(responseData);
  } catch (error) {
    sendServerError(res, error, '[Login Error]', 'Error logging in');
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user and clear token cookie (with refresh token revocation)
// @access  Private
router.post('/logout', protect, async (req, res) => {
  try {
    // NEW: Revoke refresh token if present
    const refreshToken = req.cookies.refresh_token;
    if (refreshToken) {
      const refreshTokenUtils = require('../utils/refreshToken');
      await refreshTokenUtils.revokeRefreshToken(refreshToken, 'user_logout');
    }
    
    // Clear both access and refresh token cookies
    clearTokenCookie(res);
    
    // Clear refresh token cookie
    res.cookie('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',  // Must match login setting
      maxAge: 0,        // Use maxAge: 0 for reliable clearing
      path: '/'
    });
    
    // Clear access_token cookie (if using new token structure)
    res.cookie('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });
    
    logActivity('LOGOUT_SUCCESS', { 
      userId: req.user._id, 
      username: req.user.username 
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out'
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token using refresh token
// @access  Public (requires refresh_token cookie)
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    const refreshTokenUtils = require('../utils/refreshToken');
    const clientIp = getRealIP(req);
    const userAgent = parseUserAgent(req.get('User-Agent'));

    // Validate refresh token and detect reuse
    let dbToken;
    try {
      dbToken = await refreshTokenUtils.validateRefreshToken(refreshToken);
    } catch (error) {
      // Clear invalid token cookie
      res.cookie('refresh_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: new Date(0),
        path: '/'
      });

      if (error.message === 'TOKEN_REUSE_DETECTED') {
        logActivity('SECURITY_ALERT_TOKEN_REUSE', {
          ip: clientIp,
          userAgent
        });

        return res.status(403).json({
          success: false,
          message: 'Security breach detected. All sessions have been revoked. Please login again.',
          code: 'TOKEN_REUSE_DETECTED'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
        code: error.message
      });
    }

    // Rotate refresh token (create new pair, mark old as replaced)
    const newTokens = await refreshTokenUtils.rotateRefreshToken(
      dbToken,
      clientIp,
      userAgent
    );

    // Set new access token cookie (short-lived, 15min)
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('access_token', newTokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/'
    });

    // Set new refresh token cookie (long-lived, 7 days)
    res.cookie('refresh_token', newTokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    logActivity('TOKEN_REFRESHED', {
      userId: dbToken.user._id,
      username: dbToken.user.username,
      oldTokenId: dbToken.tokenId,
      newTokenId: newTokens.tokenId
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      expiresAt: newTokens.expiresAt
    });

  } catch (error) {
    console.error('[Refresh Token Error]', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing token'
    });
  }
});

// @route   GET /api/auth/sessions
// @desc    Get user's active sessions
// @access  Private
router.get('/sessions', protect, async (req, res) => {
  try {
    const refreshTokenUtils = require('../utils/refreshToken');
    const sessions = await refreshTokenUtils.getUserSessions(req.user._id);

    res.json({
      success: true,
      count: sessions.length,
      data: sessions.map(session => ({
        id: session._id,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        isCurrentSession: req.cookies.refresh_token && 
          refreshTokenUtils.hashToken(req.cookies.refresh_token) === session.tokenHash
      }))
    });
  } catch (error) {
    console.error('[Sessions Error]', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sessions'
    });
  }
});

// @route   DELETE /api/auth/sessions/:sessionId
// @desc    Revoke a specific session
// @access  Private
router.delete('/sessions/:sessionId', protect, async (req, res) => {
  try {
    const RefreshToken = require('../models/RefreshToken');
    const session = await RefreshToken.findOne({
      _id: req.params.sessionId,
      user: req.user._id
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    await session.revoke('user_action');

    logActivity('SESSION_REVOKED', {
      userId: req.user._id,
      username: req.user.username,
      sessionId: session._id
    });

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('[Session Revocation Error]', error);
    res.status(500).json({
      success: false,
      message: 'Error revoking session'
    });
  }
});

// @route   POST /api/auth/logout-all
// @desc    Logout from all devices (revoke all refresh tokens)
// @access  Private
router.post('/logout-all', protect, async (req, res) => {
  try {
    const refreshTokenUtils = require('../utils/refreshToken');
    const revokedCount = await refreshTokenUtils.revokeAllUserTokens(
      req.user._id,
      'user_logout_all'
    );

    // Clear cookies
    clearTokenCookie(res);
    res.cookie('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0),
      path: '/'
    });

    logActivity('LOGOUT_ALL_DEVICES', {
      userId: req.user._id,
      username: req.user.username,
      sessionsRevoked: revokedCount
    });

    res.json({
      success: true,
      message: `Logged out from ${revokedCount} device(s) successfully`
    });
  } catch (error) {
    console.error('[Logout All Error]', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out from all devices'
    });
  }
});

// Password reset endpoints removed - use admin team management to change passwords

// @route   GET /api/auth/me
// @desc    Get current logged in user (optimized for 400+ concurrent users)
// @access  Private
router.get('/me', protect, async (req, res) => {
  // Prevent HTTP caching to avoid 304 responses
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  try {
    // Use lean() for faster queries and populate only needed fields
    const user = await User.findById(req.user._id)
      .populate('team', 'name')
      .populate('solvedChallenges', 'title category points')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        isBlocked: true,
        message: 'Your account has been blocked. Contact Admin for further information.',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isBlocked: user.isBlocked,
          blockedReason: user.blockedReason,
          blockedAt: user.blockedAt
        }
      });
    }

    // Use stored points (updated on submission) instead of recalculating
    const totalPoints = user.points || 0;

    // Get rank from Redis cache (1 minute TTL) or calculate
    let rank = null;
    const cacheKey = `user:${user._id}:rank`;
    
    try {
      const cachedRank = await redisClient.get(cacheKey);
      if (cachedRank) {
        rank = parseInt(cachedRank);
      } else {
        // Calculate rank efficiently
        rank = await User.countDocuments({ 
          points: { $gt: totalPoints }
        }) + 1;
        
        // Cache for 1 minute
        await redisClient.setex(cacheKey, 60, rank.toString());
      }
    } catch (cacheError) {
      console.error('Redis error, calculating rank directly:', cacheError);
      rank = await User.countDocuments({ 
        points: { $gt: totalPoints }
      }) + 1;
    }

    // Get unlocked hints efficiently (batch query)
    let formattedHints = [];
    if (user.unlockedHints && user.unlockedHints.length > 0) {
      const Unlock = require('../models/Unlock');
      const Challenge = require('../models/Challenge');
      
      // Get unique challenge IDs
      const challengeIds = [...new Set(user.unlockedHints.map(h => h.challenge))];
      
      // Batch fetch all challenges at once
      const challenges = await Challenge.find({ _id: { $in: challengeIds } })
        .select('_id title')
        .lean();
      
      // Create lookup map
      const challengeMap = {};
      challenges.forEach(c => {
        challengeMap[c._id.toString()] = c.title;
      });
      
      // Map hints with challenge names
      formattedHints = user.unlockedHints.map(hint => ({
        challenge: hint.challenge,
        challengeName: challengeMap[hint.challenge.toString()] || 'Unknown Challenge',
        hintIndex: hint.hintIndex,
        cost: hint.cost || 0,
        unlockedAt: hint.unlockedAt
      }));
    }

    // Format team data
    let teamData = null;
    if (user.team) {
      teamData = {
        _id: user.team._id ? user.team._id.toString() : user.team.toString(),
        name: user.team.name || 'Team'
      };
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        points: totalPoints,
        rank: rank,
        team: teamData,
        solvedChallenges: user.solvedChallenges || [],
        unlockedHints: formattedHints,
        isBlocked: user.isBlocked
      }
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error fetching user data'
    });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users with pagination (admin only)
// @access  Private/Admin
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { all, search, q, field, view } = req.query;

    // Build search query
    let query = {};
    const searchValue = (search || q || '').toString().trim();
    const searchField = (field || '').toString().trim();

    if (searchValue) {
      // Sanitize regex input to prevent ReDoS attacks
      const sanitized = searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').substring(0, 50);
      const allowedFields = ['username', 'email', 'affiliation', 'country', 'website'];
      if (searchField && allowedFields.includes(searchField)) {
        query[searchField] = { $regex: sanitized, $options: 'i' };
      } else {
        query.$or = [
          { username: { $regex: sanitized, $options: 'i' } },
          { email: { $regex: sanitized, $options: 'i' } },
          { affiliation: { $regex: sanitized, $options: 'i' } },
          { country: { $regex: sanitized, $options: 'i' } }
        ];
      }
    }

    // only include hidden/banned users for admin view
    if (view !== 'admin') {
      query.hidden = { $ne: true };
      query.banned = { $ne: true };
    }

    if (all === 'true') {
      // Return all users without pagination for team creation
      const users = await User.find(query)
        .select('-password')
        .populate('team', 'name')
        .sort({ username: 1 });

      return res.json({
        success: true,
        count: users.length,
        total: users.length,
        users
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .populate('team', 'name')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      total: totalUsers,
      page,
      pages: Math.ceil(totalUsers / limit),
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error fetching users'
    });
  }
});

// @route   GET /api/auth/users/:id
// @desc    Get single user by ID (admin only or own profile)
// @access  Private/Admin
router.get('/users/:id', protect, async (req, res) => {
  try {
    // Allow users to view their own profile or admins to view any profile
    const isOwnProfile = req.user._id.toString() === req.params.id; // Fixed: added .toString()
    const isAdmin = req.user.role === 'admin';

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own profile.'
      });
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // visibility: hidden/banned users are admin-only unless self
    if (!isAdmin && !isOwnProfile && (user.hidden || user.banned)) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

// @route   GET /api/auth/user/:id
// @desc    Get public user profile by ID
// @access  Private
router.get('/user/:id', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const user = await User.findById(req.params.id)
      .select('username unlockedHints team createdAt hidden banned')
      .populate('team', 'name');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!isAdmin && (user.hidden || user.banned)) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate user's total points dynamically from submissions (like scoreboard does)
    const Submission = require('../models/Submission');
    const Challenge = require('../models/Challenge');
    const mongoose = require('mongoose');
    
    console.log('[User Profile] Fetching submissions for user:', user._id.toString());
    
    // Get all submissions by this user with challenge details
    const userSubmissions = await Submission.aggregate([
      { $match: { user: user._id, isCorrect: true } },
      {
        $lookup: {
          from: 'challenges',
          localField: 'challenge',
          foreignField: '_id',
          as: 'challengeData'
        }
      },
      { $unwind: '$challengeData' },
      {
        $project: {
          challengeId: '$challenge',
          challengeTitle: '$challengeData.title',
          challengeCategory: '$challengeData.category',
          points: '$challengeData.points',
          solvedAt: '$submittedAt'
        }
      },
      { $sort: { solvedAt: -1 } }
    ]);

    console.log('[User Profile] Found submissions:', userSubmissions.length);
    console.log('[User Profile] Submissions:', userSubmissions);

    const calculatedPoints = userSubmissions.reduce((sum, sub) => sum + sub.points, 0);
    
    // Get unlocked hints with full details from Unlock model
    const Unlock = require('../models/Unlock');
    const unlockedHintsWithDetails = await Unlock.aggregate([
      { $match: { user: user._id, type: 'hints' } },
      {
        $lookup: {
          from: 'challenges',
          localField: 'challenge',
          foreignField: '_id',
          as: 'challengeData'
        }
      },
      { $unwind: '$challengeData' },
      {
        $project: {
          target: 1,
          challengeId: '$challenge',
          challengeName: '$challengeData.title',
          challengeCategory: '$challengeData.category',
          hintCost: { $arrayElemAt: ['$challengeData.hints.cost', '$target'] },
          createdAt: 1
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    
    console.log('[User Profile] Unlocked hints:', {
      userId: user._id.toString(),
      unlockedHintsCount: unlockedHintsWithDetails.length,
      hints: unlockedHintsWithDetails.map(h => ({
        challenge: h.challengeName,
        hintIndex: h.target,
        cost: h.hintCost
      }))
    });
    
    // Build solved challenges array with full details
    const solvedChallengesWithDetails = userSubmissions.map(sub => ({
      _id: sub.challengeId,
      title: sub.challengeTitle,
      category: sub.challengeCategory,
      points: sub.points,
      solvedAt: sub.solvedAt
    }));

    // Calculate user rank based on calculated points
    const allUsersPoints = await Submission.aggregate([
      { $match: { isCorrect: true } },
      {
        $lookup: {
          from: 'challenges',
          localField: 'challenge',
          foreignField: '_id',
          as: 'challengeData'
        }
      },
      { $unwind: '$challengeData' },
      {
        $group: {
          _id: '$user',
          score: { $sum: '$challengeData.points' }
        }
      },
      { $match: { score: { $gt: calculatedPoints } } },
      { $count: 'count' }
    ]);

    const rank = (allUsersPoints.length > 0 ? allUsersPoints[0].count : 0) + 1;

    res.json({
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        team: user.team,
        points: calculatedPoints,
        rank,
        solvedChallenges: solvedChallengesWithDetails,
        challengesSolvedCount: solvedChallengesWithDetails.length,
        unlockedHints: unlockedHintsWithDetails.map(h => ({
          challengeId: h.challengeId,
          challengeName: h.challengeName,
          challengeCategory: h.challengeCategory,
          hintIndex: h.target,
          cost: h.hintCost,
          unlockedAt: h.createdAt
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error fetching user'
    });
  }
});

// REMOVED: Old broken reset endpoints
// New enterprise-grade reset endpoints available at /api/admin/reset/*
// See backend/routes/adminReset.js for implementation

// @route   PUT /api/auth/users/:id/role
// @desc    Change user role (Admin/User)
// @access  Private/Admin
router.put('/users/:id/role', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin can change user roles'
      });
    }

    const { newRole } = req.body;

    if (!newRole || !['admin', 'user'].includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "admin" or "user"'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const oldRole = user.role;
    user.role = newRole;
    await user.save();

    res.json({
      success: true,
      message: `User role changed from ${oldRole} to ${newRole}`,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error changing user role:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error changing role: ${error.message}` :
        'Error changing user role. Please try again.'
    });
  }
});

// @route   PATCH /api/auth/users/:id
// @desc    admin user management update
// @access  Private/Admin
router.patch('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const {
      username,
      email,
      password,
      type,
      role,
      verified,
      hidden,
      banned,
      canSubmitFlags,
      showInScoreboard
    } = req.body;

    if (username !== undefined) user.username = username;
    if (email !== undefined) user.email = email;
    if (password !== undefined && password !== '') user.password = password;

    const nextRole = type !== undefined ? (type === 'admin' ? 'admin' : 'user') : role;
    if (nextRole !== undefined) {
      if (!['user', 'admin'].includes(nextRole)) {
        return res.status(400).json({ success: false, message: 'Invalid user type/role' });
      }
      user.role = nextRole;
    }

    if (verified !== undefined) {
      user.verified = !!verified;
      user.isEmailVerified = !!verified;
    }

    if (hidden !== undefined) {
      user.hidden = !!hidden;
      if (hidden) {
        user.showInScoreboard = false;
      }
    }

    if (banned !== undefined) {
      // safety: admin cannot ban themselves
      const isSelf = req.user._id.toString() === user._id.toString();
      if (isSelf && !!banned) {
        return res.status(400).json({
          success: false,
          message: 'You cannot ban yourself'
        });
      }
      user.banned = !!banned;
      user.isBlocked = !!banned;
      user.blockedReason = banned ? 'Banned by admin' : null;
      user.blockedAt = banned ? new Date() : null;
      if (banned) {
        user.showInScoreboard = false;
      }
    }

    if (canSubmitFlags !== undefined) user.canSubmitFlags = !!canSubmitFlags;
    if (showInScoreboard !== undefined) user.showInScoreboard = !!showInScoreboard;

    await user.save();

    return res.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        type: user.role === 'admin' ? 'admin' : 'user',
        verified: !!user.verified,
        hidden: !!user.hidden,
        banned: !!user.banned,
        isBlocked: !!user.isBlocked,
        canSubmitFlags: !!user.canSubmitFlags,
        showInScoreboard: !!user.showInScoreboard
      }
    });
  } catch (error) {
    console.error('Error patching user:', error);
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error updating user'
    });
  }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete a user (Admin only)
// @access  Private/Admin
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error deleting user: ${error.message}` :
        'Error deleting user. Please try again.'
    });
  }
});

// @route   PUT /api/auth/users/:id/block
// @desc    Block or unblock a user (Admin only)
// @access  Private/Admin
router.put('/users/:id/block', protect, authorize('admin'), async (req, res) => {
  try {
    const { isBlocked, reason } = req.body;

    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isBlocked must be a boolean'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isBlocked = isBlocked;
    user.banned = isBlocked;
    user.blockedReason = isBlocked ? reason || 'No reason provided' : null;
    user.blockedAt = isBlocked ? new Date() : null;
    if (isBlocked) {
      user.showInScoreboard = false;
    }
    await user.save();

    res.json({
      success: true,
      message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        isBlocked: user.isBlocked,
        blockedReason: user.blockedReason
      }
    });
  } catch (error) {
    console.error('Error blocking/unblocking user:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error updating user block status: ${error.message}` :
        'Error updating user block status. Please try again.'
    });
  }
});

// @route   PUT /api/auth/users/:id/submission-permission
// @desc    Update user submission permission (Admin only)
// @access  Private/Admin
router.put('/users/:id/submission-permission', protect, authorize('admin'), async (req, res) => {
  try {
    const { canSubmitFlags } = req.body;

    if (typeof canSubmitFlags !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'canSubmitFlags must be a boolean'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.canSubmitFlags = canSubmitFlags;
    await user.save();

    res.json({
      success: true,
      message: `User submission permission ${canSubmitFlags ? 'allowed' : 'blocked'}`,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        canSubmitFlags: user.canSubmitFlags
      }
    });
  } catch (error) {
    console.error('Error updating submission permission:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error updating submission permission: ${error.message}` :
        'Error updating submission permission. Please try again.'
    });
  }
});

// @route   PUT /api/auth/users/:id/scoreboard-visibility
// @desc    Update user scoreboard visibility (Admin only)
// @access  Private/Admin
router.put('/users/:id/scoreboard-visibility', protect, authorize('admin'), async (req, res) => {
  try {
    const { showInScoreboard } = req.body;

    if (typeof showInScoreboard !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'showInScoreboard must be a boolean'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.showInScoreboard = showInScoreboard;
    await user.save();

    res.json({
      success: true,
      message: `User ${showInScoreboard ? 'shown on' : 'hidden from'} scoreboard`,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        showInScoreboard: user.showInScoreboard
      }
    });
  } catch (error) {
    console.error('Error updating scoreboard visibility:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error updating scoreboard visibility: ${error.message}` :
        'Error updating scoreboard visibility. Please try again.'
    });
  }
});

// Platform Control routes removed - to be added back later

// @route   GET /api/auth/admin/login-logs
// @desc    Get login logs (Admin only)
// @access  Private/Admin
router.get('/admin/login-logs', protect, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { userId, status, search } = req.query;

    // Build query
    let query = {};
    if (userId) query.user = userId;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const totalLogs = await LoginLog.countDocuments(query);
    const logs = await LoginLog.find(query)
      .populate('user', 'username email role')
      .sort({ loginTime: -1, createdAt: -1, _id: -1 })
      .limit(limit)
      .skip(skip);

    res.json({
      success: true,
      count: logs.length,
      total: totalLogs,
      page,
      pages: Math.ceil(totalLogs / limit),
      logs
    });
  } catch (error) {
    console.error('Error fetching login logs:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error fetching login logs'
    });
  }
});

// @route   GET /api/auth/admin/login-logs/:userId
// @desc    Get login logs for specific user (Admin only)
// @access  Private/Admin
router.get('/admin/login-logs/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const totalLogs = await LoginLog.countDocuments({ user: userId });
    const logs = await LoginLog.find({ user: userId })
      .populate('user', 'username email role')
      .sort({ loginTime: -1 })
      .limit(limit)
      .skip(skip);

    res.json({
      success: true,
      count: logs.length,
      total: totalLogs,
      page,
      pages: Math.ceil(totalLogs / limit),
      logs
    });
  } catch (error) {
    console.error('Error fetching user login logs:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error fetching user login logs'
    });
  }
});

// @route   DELETE /api/auth/admin/login-logs
// @desc    Clear all login logs (Admin only)
// @access  Private/Admin
router.delete('/admin/login-logs', protect, authorize('admin'), async (req, res) => {
  try {
    // Delete all login logs
    const result = await LoginLog.deleteMany({});

    res.json({
      success: true,
      message: `Deleted all ${result.deletedCount} login logs`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing login logs:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error clearing login logs'
    });
  }
});

// @route   PUT /api/auth/admin/change-password
// @desc    Change admin password (Admin only - can only change own password)
// @access  Private/Admin
router.put('/admin/change-password', protect, authorize('admin'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get current user with password
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    // NEW: Revoke all refresh tokens (force re-login on all devices)
    const refreshTokenUtils = require('../utils/refreshToken');
    const revokedCount = await refreshTokenUtils.revokeAllUserTokens(
      user._id,
      'password_changed'
    );

    // Clear Redis cache for this user
    const { getRedisClient } = require('../utils/redis');
    const redisClient = getRedisClient();
    await redisClient.del(`user:${user._id}`);

    logActivity('ADMIN_PASSWORD_CHANGED', { 
      userId: user._id, 
      username: user.username,
      sessionsRevoked: revokedCount
    });

    res.json({
      success: true,
      message: `Password changed successfully. ${revokedCount} session(s) revoked. You will need to login again.`
    });
  } catch (error) {
    console.error('Error changing admin password:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ?
        `Error changing password: ${error.message}` :
        'Error changing password. Please try again.'
    });
  }
});





module.exports = router;

