const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const resetAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cyberctf');
    console.log('Connected to MongoDB');

    // Delete existing admin
    await User.deleteOne({ email: 'admin@cyberctf.com' });
    console.log('Deleted existing admin');

    // Create new admin with known password (let the pre-save hook hash it)
    const admin = new User({
      username: 'admin',
      email: 'admin@cyberctf.com',
      password: 'admin123', // This will be hashed by the pre-save hook
      role: 'admin',
      points: 0,
      solvedChallenges: []
    });

    await admin.save();
    console.log('✅ New admin created successfully!');
    console.log('Email: admin@cyberctf.com');
    console.log('Password: admin123');

    // Test the password using the model method
    const isMatch = await admin.matchPassword('admin123');
    console.log('Password verification test:', isMatch ? '✅ PASS' : '❌ FAIL');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

resetAdmin();
