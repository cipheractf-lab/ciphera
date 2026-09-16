const mongoose = require('mongoose');
const User = require('../models/User');

const checkDatabase = async () => {
  try {
    // Use the same connection string as the server
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/cyberctf';
    console.log('Connecting to:', mongoUri);
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    console.log('Database name:', mongoose.connection.db.databaseName);

    // Check all users
    const users = await User.find({}, 'username email role');
    console.log('Users in database:', users.length);
    
    users.forEach(user => {
      console.log(`- ${user.username} (${user.email}) - ${user.role}`);
    });

    // Specifically look for admin user
    const admin = await User.findOne({ email: 'admin@cyberctf.com' });
    console.log('Admin user found:', !!admin);

    if (admin) {
      console.log('Admin details:', {
        username: admin.username,
        email: admin.email,
        role: admin.role,
        id: admin._id
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkDatabase();
