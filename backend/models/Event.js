const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  challenges: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge'
  }],
  accessType: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  invitedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  maxParticipants: {
    type: Number
  },
  settings: {
    enableScoreboard: {
      type: Boolean,
      default: true
    },
    allowLateJoin: {
      type: Boolean,
      default: true
    },
    showScores: {
      type: Boolean,
      default: true
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

EventSchema.index({ startDate: 1, endDate: 1 });
EventSchema.index({ createdBy: 1 });
EventSchema.index({ accessType: 1 });

EventSchema.virtual('status').get(function() {
  const now = new Date();
  if (now < this.startDate) return 'upcoming';
  if (now > this.endDate) return 'completed';
  return 'ongoing';
});

EventSchema.set('toJSON', { virtuals: true });
EventSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Event', EventSchema);
