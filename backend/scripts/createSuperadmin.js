const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const adminUser = {
  username: 'admin',
  email: 'admin@pwngrid.com',
  password: 'SuperAdmin',
  role: 'admin'
};

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cyberctf')
  .then(async () => {
    console.log('MongoDB connected successfully');
    
    try {
      const existingUser = await User.findOne({ 
        $or: [{ email: adminUser.email }, { username: adminUser.username }] 
      });
      
      if (existingUser) {
        console.log('User already exists. Updating to admin...');
        existingUser.role = 'admin';
        existingUser.password = adminUser.password;
        await existingUser.save();
        console.log('Admin updated successfully');
      } else {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminUser.password, salt);
        
        const newAdmin = new User({
          username: adminUser.username,
          email: adminUser.email,
          password: hashedPassword,
          role: adminUser.role
        });
        
        await newAdmin.save();
        console.log('Admin created successfully');
      }
      
      console.log('Email:', adminUser.email);
      console.log('Password:', adminUser.password);
      console.log('Role:', adminUser.role);
      
    } catch (error) {
      console.error('Error:', error.message);
    } finally {
      mongoose.disconnect();
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
