const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error('Usage: node scripts/resetUserPasswordByEmail.js <email> <newPassword>');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      console.error(`User not found: ${normalizedEmail}`);
      process.exit(1);
    }

    user.password = newPassword;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.isBlocked = false;
    await user.save();

    console.log(`Password reset successful for ${normalizedEmail}`);
  } catch (error) {
    console.error('Password reset failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
