require('dotenv').config();
const mongoose = require('mongoose');

const checkConnection = async () => {
  try {
    console.log('Environment variables:');
    console.log('MONGODB_URI:', process.env.MONGODB_URI);
    console.log('MONGO_URI:', process.env.MONGO_URI);
    
    const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ctf-platform';
    console.log('Using URI:', MONGODB_URI);
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    console.log('Database name:', mongoose.connection.db.databaseName);
    console.log('Connection state:', mongoose.connection.readyState);
    
    // List all users in current database
    const User = require('./models/User');
    const users = await User.find({}).select('username email role');
    console.log('Users in database:', users);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkConnection();