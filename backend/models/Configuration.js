const mongoose = require('mongoose');

const ConfigurationSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'global',
    unique: true,
    index: true
  },
  eventName: {
    type: String,
    trim: true,
    maxlength: 100,
    default: process.env.EVENT_NAME || 'Ciphera'
  },
  eventDescription: {
    type: String,
    trim: true,
    maxlength: 300,
    default: 'Capture The Flag platform'
  },
  logoUrl: {
    type: String,
    trim: true,
    default: ''
  },
  visibility: {
    challenge: {
      type: String,
      enum: ['public', 'private'],
      default: 'private'
    },
    account: {
      type: String,
      enum: ['public', 'private', 'admins'],
      default: 'private'
    },
    score: {
      type: String,
      enum: ['public', 'private', 'admins'],
      default: 'private'
    },
    registration: {
      type: String,
      enum: ['public', 'private'],
      default: 'private'
    }
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Configuration', ConfigurationSchema);
