const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ],
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
    // Removed strict password validation regex to allow easier testing
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  hidden: {
    type: Boolean,
    default: false
  },
  banned: {
    type: Boolean,
    default: false
  },
  verified: {
    type: Boolean,
    default: false
  },
  website: {
    type: String,
    default: '',
    trim: true
  },
  affiliation: {
    type: String,
    default: '',
    trim: true
  },
  country: {
    type: String,
    default: '',
    trim: true
  },
  points: {
    type: Number,
    default: 0
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  solvedChallenges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge'
  }],
  personallySolvedChallenges: [{
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge'
    },
    challengeTitle: String,
    solvedAt: {
      type: Date,
      default: Date.now
    }
  }],
  unlockedHints: [{
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge'
    },
    challengeTitle: String,
    hintIndex: Number,
    hintCost: Number,
    unlockedAt: {
      type: Date,
      default: Date.now
    }
  }],
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedReason: {
    type: String,
    default: null
  },
  blockedAt: {
    type: Date,
    default: null
  },
  canSubmitFlags: {
    type: Boolean,
    default: true
  },
  showInScoreboard: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    type: String,
    default: null,
    select: false
  },
  otpExpire: {
    type: Date,
    default: null
  },
  passwordChangedAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date
  },
  lastLoginIP: {
    type: String
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLockExpires: {
    type: Date
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  securityQuestions: [{
    question: String,
    answer: String
  }],
  lastSolveTime: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt with relaxed security for CTF UX
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  // Use configurable bcrypt rounds (minimum 10 for speed)
  const rounds = Math.max(parseInt(process.env.BCRYPT_ROUNDS) || 10, 10);
  const salt = await bcrypt.genSalt(rounds);
  this.password = await bcrypt.hash(this.password, salt);

  // Set password changed timestamp
  this.passwordChangedAt = new Date();

  next();
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if account is locked
UserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Increment login attempts and lock the account after too many failures.
// This is currently the ONLY brute-force defense on the login endpoint --
// there is no request-level rate limiting in front of it -- so the
// threshold matters more than the "relaxed for CTF" comment it replaced
// suggested.
UserSchema.methods.incrementLoginAttempts = async function () {
  // If lock has expired, reset attempts
  if (this.lockUntil && this.lockUntil < Date.now()) {
    await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
    return;
  }

  // Otherwise increment attempts
  const attempts = this.loginAttempts + 1;
  const updates = { $set: { loginAttempts: attempts } };

  if (attempts >= parseInt(process.env.MAX_LOGIN_ATTEMPTS || 10, 10)) {
    const loginTimeout = parseInt(process.env.LOGIN_TIMEOUT || 5, 10);
    updates.$set.lockUntil = Date.now() + loginTimeout * 60 * 1000;
  }

  await this.updateOne(updates);
};

// Reset login attempts
UserSchema.methods.resetLoginAttempts = async function () {
  await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Generate password reset token
UserSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Generate OTP for email verification
UserSchema.methods.generateOTP = function () {
  // Secure OTP generation
  const otp = crypto.randomInt(100000, 999999).toString();

  this.otp = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  this.otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return otp;
};

// Verify OTP
UserSchema.methods.verifyOTP = function (enteredOtp) {
  const hashedOtp = crypto
    .createHash('sha256')
    .update(enteredOtp)
    .digest('hex');

  if (this.otp !== hashedOtp) {
    return false;
  }

  if (this.otpExpire < Date.now()) {
    return false;
  }

  return true;
};

// Clear OTP after verification
UserSchema.methods.clearOTP = function () {
  this.otp = null;
  this.otpExpire = null;
};

// Create indexes for better performance with multiple users
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ points: -1 }); // For scoreboard queries
UserSchema.index({ solvedChallenges: 1 }); // For challenge lookup
UserSchema.index({ role: 1 }); // For role-based queries
UserSchema.index({ createdAt: 1 }); // For sorting by registration date
UserSchema.index({ lockUntil: 1 }, { sparse: true }); // For account locking
UserSchema.index({ resetPasswordExpire: 1 }, { sparse: true, expireAfterSeconds: 0 }); // TTL index for password reset

// Compound indexes for complex queries
UserSchema.index({ role: 1, points: -1 }); // For admin scoreboard queries
UserSchema.index({ email: 1, lockUntil: 1 }, { sparse: true }); // For login attempt tracking
UserSchema.index({ isBlocked: 1 }); // For blocked users queries
UserSchema.index({ canSubmitFlags: 1 }); // For submission control queries
UserSchema.index({ showInScoreboard: 1 }); // For scoreboard visibility queries
UserSchema.index({ hidden: 1 }); // hidden users
UserSchema.index({ banned: 1 }); // banned users
UserSchema.index({ verified: 1 }); // verified users

module.exports = mongoose.model('User', UserSchema);
