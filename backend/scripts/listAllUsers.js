const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cyberctf')
  .then(async () => {
    const users = await User.find({}).select('username email role');
    console.log('Total users:', users.length);
    users.forEach(u => {
      console.log(`${u.username} (${u.email}) - ${u.role}`);
    });
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
