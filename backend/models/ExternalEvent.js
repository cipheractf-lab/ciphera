const mongoose = require('mongoose');

/**
 * A community/external CTF event posted by an admin for users to discover --
 * e.g. "ByteMe CTF 26", hosted elsewhere, with a link out to its own site.
 *
 * Deliberately named ExternalEvent, not Event: a future single-event console
 * (scheduled internal competitions with their own time windows) will need its
 * own model, and reusing "Event" here would collide with that concept.
 */
const externalEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: 2000
  },
  // Holds both the date and time of the event in one instant.
  eventDate: {
    type: Date,
    required: [true, 'Event date and time are required']
  },
  eventUrl: {
    type: String,
    required: [true, 'Event URL is required'],
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

externalEventSchema.index({ eventDate: 1 });
externalEventSchema.index({ isActive: 1 });
externalEventSchema.index({ createdBy: 1 });

module.exports = mongoose.model('ExternalEvent', externalEventSchema);
