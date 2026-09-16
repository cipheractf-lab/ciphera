const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Team name must be less than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description must be less than 500 characters']
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  captain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  points: {
    type: Number,
    default: 0
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
  solvedChallenges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge'
  }],
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

TeamSchema.index({ points: -1 });
TeamSchema.index({ createdBy: 1 });
TeamSchema.index({ members: 1 });
TeamSchema.index({ hidden: 1 });
TeamSchema.index({ banned: 1 });

module.exports = mongoose.model('Team', TeamSchema);
