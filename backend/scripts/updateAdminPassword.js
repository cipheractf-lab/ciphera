const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const updateAdminPassword = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@ciphera.com' });
    
    if (!admin) {
      console.log('Admin user not found');
      process.exit(1);
    }

    // Update password
    admin.password = 'Ctf#Quest@Admin$123';
    await admin.save();

    console.log('Admin password updated successfully');
    console.log('New admin credentials:');
    console.log('Email: admin@ciphera.com');
    console.log('Password: Ctf#Quest@Admin$123');

    process.exit(0);
  } catch (error) {
    console.error('Error updating admin password:', error);
    process.exit(1);
  }
};

updateAdminPassword();