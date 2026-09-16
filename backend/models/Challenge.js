const mongoose = require('mongoose');

const ChallengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['web', 'crypto', 'forensics', 'reverse', 'osint', 'misc']
  },
  difficulty: {
    type: String,
    required: [true, 'Difficulty is required'],
    enum: ['Easy', 'Medium', 'Hard', 'Expert']
  },
  points: {
    type: Number,
    required: [true, 'Points are required']
  },
  // exact dynamic scoring fields
  initial: {
    type: Number, // Initial/maximum points (for dynamic challenges)
    default: null
  },
  minimum: {
    type: Number, // Minimum points (floor for dynamic challenges)
    default: null
  },
  decay: {
    type: Number, // Decay factor (meaning depends on function type)
    default: null
  },
  function: {
    type: String, // 'static', 'linear', 'logarithmic'
    enum: ['static', 'linear', 'logarithmic'],
    default: 'static'
  },
  state: {
    type: String, // 'visible', 'hidden', 'locked'
    enum: ['visible', 'hidden', 'locked'],
    default: 'visible'
  },
  flag: {
    type: String,
    required: [true, 'Flag is required'],
    select: false // Hide flag in query results by default
  },
  hints: [{
    content: String,
    cost: Number
  }],
  files: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    sha1sum: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  solvedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isVisible: {
    type: Boolean,
    default: true,
    // This is kept for backward compatibility but should use 'state' field
    get: function () {
      return this.state === 'visible';
    }
  },
  submissionsAllowed: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for number of solves
ChallengeSchema.virtual('solveCount').get(function () {
  return this.solvedBy ? this.solvedBy.length : 0;
});

// Method to calculate current dynamic value based on solves (exact formulas)
ChallengeSchema.methods.getCurrentValue = function () {
  // Static challenges always return their base points
  if (this.function === 'static' || !this.function) {
    return this.points;
  }

  // For dynamic challenges, we need initial, minimum, and decay
  const initial = this.initial || this.points;
  const minimum = this.minimum || this.points;
  let decay = this.decay || 0;
  const solveCount = this.solvedBy?.length || 0;

  // First solver gets maximum points (solve_count - 1 adjustment)
  // If solve_count = 0: adjustedCount = 0, value = initial
  // If solve_count = 1: adjustedCount = 0, value = initial (first solver)
  // If solve_count = 2: adjustedCount = 1, decay starts
  const adjustedSolveCount = solveCount > 0 ? solveCount - 1 : 0;

  let value;

  if (this.function === 'linear') {
    // Linear: value = initial - (decay * (solve_count - 1))
    value = initial - (decay * adjustedSolveCount);
  } else if (this.function === 'logarithmic') {
    // Logarithmic: value = (((minimum - initial) / (decay^2)) * ((solve_count-1)^2)) + initial
    if (decay === 0) {
      decay = 1; // Prevent division by zero
    }
    value = (((minimum - initial) / Math.pow(decay, 2)) * Math.pow(adjustedSolveCount, 2)) + initial;
  } else {
    value = this.points; // Fallback
  }

  // Ensure value doesn't go below minimum
  value = Math.max(minimum, value);

  return Math.ceil(value); // Rounds up (ceiling)
};

// Set toJSON option to include virtuals
ChallengeSchema.set('toJSON', { virtuals: true });
ChallengeSchema.set('toObject', { virtuals: true });

// Create indexes for better performance with multiple users
ChallengeSchema.index({ title: 1 }, { unique: true });
ChallengeSchema.index({ category: 1 }); // For filtering by category
ChallengeSchema.index({ difficulty: 1 }); // For filtering by difficulty
ChallengeSchema.index({ points: 1 }); // For sorting by points
ChallengeSchema.index({ isVisible: 1 }); // For filtering visible challenges
ChallengeSchema.index({ createdAt: 1 }); // For sorting by creation date
ChallengeSchema.index({ solvedBy: 1 }); // For user-specific queries

// Compound indexes for complex queries
ChallengeSchema.index({ category: 1, difficulty: 1 }); // For category + difficulty filtering
ChallengeSchema.index({ isVisible: 1, category: 1 }); // For visible challenges by category
ChallengeSchema.index({ isVisible: 1, points: 1 }); // For visible challenges sorted by points
ChallengeSchema.index({ category: 1, points: 1 }); // For category challenges sorted by points

module.exports = mongoose.model('Challenge', ChallengeSchema);
