const mongoose = require('mongoose');
const User = require('../models/User');
const Submission = require('../models/Submission');
const Challenge = require('../models/Challenge');
require('dotenv').config();

const populatePersonalSolves = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to process`);

    for (const user of users) {
      // Get all correct submissions by this user
      const submissions = await Submission.find({
        user: user._id,
        isCorrect: true
      }).populate('challenge', 'title');

      if (submissions.length > 0) {
        // Clear existing personallySolvedChallenges
        user.personallySolvedChallenges = [];

        // Add each solved challenge
        for (const submission of submissions) {
          if (submission.challenge) {
            user.personallySolvedChallenges.push({
              challengeId: submission.challenge._id,
              challengeTitle: submission.challenge.title,
              solvedAt: submission.submittedAt
            });
            console.log(`  ✓ ${user.username}: ${submission.challenge.title}`);
          }
        }

        await user.save();
        console.log(`✓ Updated ${user.username} with ${user.personallySolvedChallenges.length} personal solves`);
      } else {
        console.log(`  - ${user.username}: No personal solves`);
      }
    }

    console.log('\n✓ Finished populating personal solves');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
};

populatePersonalSolves();
