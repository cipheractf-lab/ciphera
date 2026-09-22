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
    // Markdown source, rendered client-side (e.g. via react-markdown)
    type: String,
    trim: true,
    maxlength: [2000, 'Description must be less than 2000 characters']
  },
  avatarUrl: {
    // Filename only (not a full path/URL) -- served through
    // GET /api/teams/avatar/:filename, never through the generic
    // /uploads static mount.
    type: String,
    default: ''
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
