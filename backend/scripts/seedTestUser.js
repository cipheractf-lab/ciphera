const mongoose = require('mongoose');
const User = require('../models/User');

const seedUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ctf-platform');
    const user = await User.create({
      username: 'testuser',
      email: 'user@pwngrid.com',
      password: 'password123',
      role: 'user',
      isEmailVerified: true
    });
    console.log('✅ User created successfully');
    console.log(`Email: ${user.email}`);
    console.log('Password: password123');
    process.exit(0);
  } catch (err) {
    if (err.code === 11000) {
      console.log('User already exists');
    } else {
      console.error(err);
    }
    process.exit(1);
  }
};
seedUser();
