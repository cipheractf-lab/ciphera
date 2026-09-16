require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const unblockUserByEmail = async (email) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`User with email "${email}" not found`);
      process.exit(1);
    }

    user.isBlocked = false;
    user.blockedReason = null;
    user.blockedAt = null;
    await user.save();

    console.log(`✓ User "${user.username}" (${user.email}) has been unblocked successfully`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

const email = process.argv[2];

if (!email) {
  console.log('Usage: node unblockUser.js <email>');
  console.log('Example: node unblockUser.js admin2@cyberctf.com');
  process.exit(1);
}

unblockUserByEmail(email);
