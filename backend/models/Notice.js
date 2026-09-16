const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 300
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
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
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

noticeSchema.index({ createdAt: -1 });
noticeSchema.index({ isActive: 1 });
noticeSchema.index({ createdBy: 1 });
noticeSchema.index({ readBy: 1 });

module.exports = mongoose.model('Notice', noticeSchema);
