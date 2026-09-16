require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const checkAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@ciphera.com' }).select('+password');
    
    if (!admin) {
      console.log('❌ Admin user not found');
      console.log('Creating admin user...');
      
      // Create admin user
      const newAdmin = new User({
        username: 'admin',
        email: 'admin@ciphera.com',
        password: 'admin123',
        role: 'admin',
        points: 0,
        isEmailVerified: true
      });

      await newAdmin.save();
      console.log('✅ Admin user created successfully');
    } else {
      console.log('✅ Admin user found');
      console.log('Username:', admin.username);
      console.log('Email:', admin.email);
      console.log('Role:', admin.role);
      console.log('Is Email Verified:', admin.isEmailVerified);
      console.log('Is Blocked:', admin.isBlocked);
      console.log('Login Attempts:', admin.loginAttempts);
      console.log('Lock Until:', admin.lockUntil);
      
      // Test password
      const isMatch = await admin.matchPassword('admin123');
      console.log('Password matches admin123:', isMatch);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkAdmin();