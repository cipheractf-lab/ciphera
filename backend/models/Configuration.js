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
  // Gate login on a verified email address. Ships FALSE so real signups can
  // be watched end-to-end before anyone is locked out, and is flippable from
  // the admin UI (better than an env var on a 24/7 platform).
  // NOTE: do not enable until scripts/migrateAuthIndexes.js has backfilled
  // isEmailVerified on pre-existing, admin-created accounts.
  emailVerificationRequired: {
    type: Boolean,
    default: false
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
