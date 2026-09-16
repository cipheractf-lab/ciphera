const mongoose = require('mongoose');

/**
 * Unlocks Model
 * Tracks hints and other unlockable content
 * Supports both user and team modes
 */
const UnlockSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  target: {
    type: Number, // Hint index or other unlockable ID
    required: true
  },
  challenge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  type: {
    type: String,
    enum: ['hints', 'solutions'],
    default: 'hints'
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate unlocks
// User can't unlock the same hint twice for the same challenge
UnlockSchema.index({ user: 1, challenge: 1, target: 1, type: 1 }, { unique: true });

// Index for querying unlocks by team
UnlockSchema.index({ team: 1, challenge: 1, target: 1, type: 1 });

// Virtual for account_id (returns user or team based on mode)
UnlockSchema.virtual('account_id').get(function() {
  // In team mode, return team_id; otherwise return user_id
  return this.team || this.user;
});

// Static method to check if hint is unlocked
UnlockSchema.statics.isUnlocked = async function(userId, teamId, challengeId, hintIndex) {
  const query = {
    challenge: challengeId,
    target: hintIndex,
    type: 'hints'
  };

  // Check both user and team unlocks
  if (teamId) {
    query.$or = [
      { user: userId },
      { team: teamId }
    ];
  } else {
    query.user = userId;
  }

  const unlock = await this.findOne(query);
  return !!unlock;
};

// Static method to get all unlocked hints for a user/team
UnlockSchema.statics.getUnlockedHints = async function(userId, teamId) {
  const query = {
    type: 'hints'
  };

  if (teamId) {
    query.$or = [
      { user: userId },
      { team: teamId }
    ];
  } else {
    query.user = userId;
  }

  const unlocks = await this.find(query).select('challenge target');
  return unlocks;
};

module.exports = mongoose.model('Unlock', UnlockSchema);
