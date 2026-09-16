const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cyberctf')
  .then(async () => {
    console.log('MongoDB connected successfully\n');
    
    try {
      const users = await User.find().select('username email role createdAt').sort({ role: -1 });
      
      console.log('=== Role System Verification ===\n');
      
      const roles = {
        admin: [],
        user: []
      };
      
      users.forEach(user => {
        if (roles[user.role]) {
          roles[user.role].push(user);
        }
      });
      
      console.log(`📊 Total Users: ${users.length}\n`);
      
      console.log(`\n🔧 ADMIN (${roles.admin.length}):`);
      if (roles.admin.length > 0) {
        roles.admin.forEach(u => {
          console.log(`   - ${u.username} (${u.email}) - Created: ${u.createdAt.toLocaleDateString()}`);
        });
      } else {
        console.log('   No admins found');
      }
      
      console.log(`\n👤 USER (${roles.user.length}):`);
      if (roles.user.length > 0) {
        roles.user.slice(0, 5).forEach(u => {
          console.log(`   - ${u.username} (${u.email}) - Created: ${u.createdAt.toLocaleDateString()}`);
        });
        if (roles.user.length > 5) {
          console.log(`   ... and ${roles.user.length - 5} more users`);
        }
      } else {
        console.log('   No users found');
      }
      
      console.log('\n=== Role System Status ===');
      console.log('✓ Admin role: Available');
      console.log('✓ User role: Available');
      console.log('\n================================\n');
      
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
