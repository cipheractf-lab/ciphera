const mongoose = require('mongoose');

const registrationStatusSchema = new mongoose.Schema({
  isEnabled: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('RegistrationStatus', registrationStatusSchema); 