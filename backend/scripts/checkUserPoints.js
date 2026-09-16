const mongoose = require('mongoose');
const User = require('../models/User');
const Team = require('../models/Team');
require('dotenv').config();

const checkUserPoints = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Find user3 and user4
    const users = await User.find({ username: { $in: ['user3', 'user4'] } })
      .populate('team', 'name points');

    for (const user of users) {
      console.log('\n=================================');
      console.log(`User: ${user.username}`);
      console.log(`User ID: ${user._id}`);
      console.log(`User Points: ${user.points}`);
      console.log(`Team: ${user.team?.name || 'No team'}`);
      console.log(`Team Points: ${user.team?.points || 'N/A'}`);
      console.log(`Solved Challenges: ${user.solvedChallenges?.length || 0}`);
      console.log(`Personally Solved: ${user.personallySolvedChallenges?.length || 0}`);
      console.log(`Unlocked Hints: ${user.unlockedHints?.length || 0}`);
      console.log('=================================');
    }

    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
};

checkUserPoints();
