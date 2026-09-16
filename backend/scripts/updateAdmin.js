const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cyberctf')
  .then(async () => {
    console.log('MongoDB connected successfully');
    
    try {
      // Find admin user
      const admin = await User.findOne({ username: 'admin' });
      
      if (!admin) {
        console.log('Admin user not found');
        return;
      }
      
      // Update admin user
      admin.email = 'admin@cyberctf.com';
      admin.role = 'admin';
      
      await admin.save();
      
      console.log('Admin user updated successfully:');
      console.log('Username:', admin.username);
      console.log('Email:', admin.email);
      console.log('Role:', admin.role);
      
    } catch (error) {
      console.error('Error updating admin user:', error.message);
    } finally {
      mongoose.disconnect();
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
