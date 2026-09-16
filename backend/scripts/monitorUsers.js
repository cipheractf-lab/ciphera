const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Challenge = require('../models/Challenge');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ctf-platform';

async function monitorUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get user statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ 
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
    });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const lockedUsers = await User.countDocuments({ 
      lockUntil: { $exists: true, $gt: new Date() } 
    });

    // Get challenge statistics
    const totalChallenges = await Challenge.countDocuments();
    const visibleChallenges = await Challenge.countDocuments({ isVisible: true });

    // Get top users by points
    const topUsers = await User.find({ role: 'user' })
      .sort({ points: -1 })
      .limit(10)
      .select('username points solvedChallenges');

    // Get challenge solve statistics
    const challengeStats = await Challenge.aggregate([
      {
        $project: {
          title: 1,
          category: 1,
          difficulty: 1,
          points: 1,
          solveCount: { $size: '$solvedBy' }
        }
      },
      { $sort: { solveCount: -1 } }
    ]);

    // Display statistics
    console.log('\n=== CTF Platform User Monitor ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('\n--- User Statistics ---');
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Active Users (24h): ${activeUsers}`);
    console.log(`Admin Users: ${adminUsers}`);
    console.log(`Locked Users: ${lockedUsers}`);

    console.log('\n--- Challenge Statistics ---');
    console.log(`Total Challenges: ${totalChallenges}`);
    console.log(`Visible Challenges: ${visibleChallenges}`);

    console.log('\n--- Top 10 Users ---');
    topUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} - ${user.points} points (${user.solvedChallenges.length} challenges)`);
    });

    console.log('\n--- Challenge Solve Statistics ---');
    challengeStats.slice(0, 10).forEach((challenge, index) => {
      console.log(`${index + 1}. ${challenge.title} (${challenge.category}/${challenge.difficulty}) - ${challenge.solveCount} solves`);
    });

    // Check for potential issues
    console.log('\n--- System Health Checks ---');
    
    // Check for users with too many login attempts
    const usersWithHighAttempts = await User.countDocuments({ 
      loginAttempts: { $gte: 3 } 
    });
    if (usersWithHighAttempts > 0) {
      console.log(`⚠️  ${usersWithHighAttempts} users with high login attempts`);
    }

    // Check for challenges with no solves
    const unsolvedChallenges = await Challenge.countDocuments({ 
      solvedBy: { $size: 0 },
      isVisible: true 
    });
    if (unsolvedChallenges > 0) {
      console.log(`⚠️  ${unsolvedChallenges} visible challenges with no solves`);
    }

    // Check database connection health
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? '✅ Connected' : '❌ Disconnected';
    console.log(`Database Status: ${dbStatus}`);

    console.log('\n=== Monitor Complete ===\n');

  } catch (error) {
    console.error('Error monitoring users:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the monitor
if (require.main === module) {
  monitorUsers();
}

module.exports = monitorUsers;
