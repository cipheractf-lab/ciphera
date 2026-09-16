const mongoose = require('mongoose');

/**
 * Award Model - manual point adjustments
 * Awards can be positive or negative
 * They contribute directly to user/team total score
 */
const AwardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  name: {
    type: String,
    required: [true, 'Award name is required'],
    maxlength: 80,
    trim: true
  },
  value: {
    type: Number,
    required: [true, 'Award value is required']
    // Can be positive or negative
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  category: {
    type: String,
    default: '',
    maxlength: 80,
    trim: true
  },
  icon: {
    type: String,
    default: '',
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Validation: Must have either user OR team (not both, not neither)
AwardSchema.pre('validate', function(next) {
  if (!this.user && !this.team) {
    return next(new Error('Award must have either user or team'));
  }
  if (this.user && this.team) {
    return next(new Error('Award cannot have both user and team'));
  }
  next();
});

// Indexes for performance
AwardSchema.index({ user: 1, date: -1 });
AwardSchema.index({ team: 1, date: -1 });
AwardSchema.index({ date: -1 });

// Virtual to get recipient (either user or team)
AwardSchema.virtual('recipient').get(function() {
  return this.user || this.team;
});

// Virtual to get recipient type
AwardSchema.virtual('recipientType').get(function() {
  return this.user ? 'user' : 'team';
});

module.exports = mongoose.model('Award', AwardSchema);
