const mongoose = require('mongoose');

const EventParticipationSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  points: {
    type: Number,
    default: 0
  },
  submissions: [{
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Challenge'
    },
    flag: String,
    submittedAt: Date,
    isCorrect: Boolean,
    points: Number
  }],
  rank: {
    type: Number
  },
  completedChallenges: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

EventParticipationSchema.index({ event: 1, user: 1 }, { unique: true });
EventParticipationSchema.index({ event: 1, points: -1 });
EventParticipationSchema.index({ user: 1 });

module.exports = mongoose.model('EventParticipation', EventParticipationSchema);
