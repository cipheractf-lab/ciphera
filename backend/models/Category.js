const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Category', CategorySchema);
