const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
  // User reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Unique token identifier (included in JWT payload)
  tokenId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // SHA-256 hash of the actual refresh token
  // Stored hashed so DB compromise doesn't expose tokens
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Token family for rotation tracking
  // All tokens in a rotation chain share the same family
  family: {
    type: String,
    required: true,
    index: true
  },

  // Token expiration
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },

  // Creation timestamp
  createdAt: {
    type: Date,
    default: Date.now,
    required: true
  },

  // Last time this token was used to refresh
  lastUsedAt: {
    type: Date,
    default: Date.now
  },

  // Client information at token creation
  ipAddress: {
    type: String,
    required: true
  },

  userAgent: {
    type: String,
    required: true
  },

  // Revocation tracking
  isRevoked: {
    type: Boolean,
    default: false,
    index: true
  },

  revokedAt: {
    type: Date
  },

  revokedReason: {
    type: String,
    enum: [
      'user_logout',
      'password_changed',
      'team_changed',
      'admin_action',
      'token_reuse_detected',
      'security_breach',
      'expired',
      'other'
    ]
  },

  // Token rotation tracking
  // When this token is used, it's replaced by a new one
  replacedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RefreshToken'
  },

  // Optional: track which token this replaced
  replacedToken: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RefreshToken'
  }
});

// Compound indexes for common queries
RefreshTokenSchema.index({ user: 1, isRevoked: 1, expiresAt: 1 });
RefreshTokenSchema.index({ family: 1, isRevoked: 1 });
RefreshTokenSchema.index({ tokenHash: 1, isRevoked: 1 });

// TTL index to auto-remove expired tokens after 30 days
// This keeps replaced/revoked tokens for audit trail
RefreshTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days
);

// Instance method: Check if token is valid
RefreshTokenSchema.methods.isValid = function() {
  return (
    !this.isRevoked &&
    this.expiresAt > new Date() &&
    !this.replacedBy
  );
};

// Instance method: Mark as replaced
RefreshTokenSchema.methods.markAsReplaced = async function(newTokenId) {
  this.replacedBy = newTokenId;
  this.lastUsedAt = new Date();
  await this.save();
};

// Instance method: Revoke this token
RefreshTokenSchema.methods.revoke = async function(reason = 'other') {
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  await this.save();
};

// Static method: Revoke all tokens for a user
RefreshTokenSchema.statics.revokeAllUserTokens = async function(userId, reason = 'other') {
  const result = await this.updateMany(
    { user: userId, isRevoked: false },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason
      }
    }
  );
  return result.modifiedCount;
};

// Static method: Revoke all tokens in a family (for reuse detection)
RefreshTokenSchema.statics.revokeTokenFamily = async function(family, reason = 'token_reuse_detected') {
  const result = await this.updateMany(
    { family, isRevoked: false },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason
      }
    }
  );
  
  console.log(`[Security] Revoked ${result.modifiedCount} tokens in family ${family}`);
  return result.modifiedCount;
};

// Static method: Get active tokens for a user
RefreshTokenSchema.statics.getActiveTokens = async function(userId) {
  return this.find({
    user: userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  })
    .select('tokenId createdAt lastUsedAt ipAddress userAgent expiresAt')
    .sort({ createdAt: -1 });
};

// Static method: Count active sessions for a user
RefreshTokenSchema.statics.countActiveSessions = async function(userId) {
  return this.countDocuments({
    user: userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() }
  });
};

// Static method: Cleanup expired tokens (backup to TTL index)
RefreshTokenSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 days old
  });
  
  if (result.deletedCount > 0) {
    console.log(`[Cleanup] Removed ${result.deletedCount} expired refresh tokens`);
  }
  
  return result.deletedCount;
};

// Virtual for token age in days
RefreshTokenSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for days until expiry
RefreshTokenSchema.virtual('daysUntilExpiry').get(function() {
  return Math.floor((this.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
});

// Include virtuals when converting to JSON
RefreshTokenSchema.set('toJSON', { virtuals: true });
RefreshTokenSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);
