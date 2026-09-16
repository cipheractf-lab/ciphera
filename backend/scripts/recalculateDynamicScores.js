/**
 * Recalculate All Dynamic Challenge Scores Retroactively
 * 
 * This script recalculates all submissions for dynamic challenges
 * to ensure all users have correct points based on solve order.
 * 
 * Use this if:
 * - You suspect dynamic scoring points are incorrect
 * - You've just enabled dynamic scoring and want to recalculate
 * - You want to fix any scoring inconsistencies
 */

const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');
const scoringService = require('../services/scoringService');
require('dotenv').config();

async function recalculateDynamicScores() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    console.log('=========================================');
    console.log('  Dynamic Scoring Recalculation Script');
    console.log('=========================================\n');

    // Find all dynamic challenges
    const dynamicChallenges = await Challenge.find({
      function: { $in: ['linear', 'logarithmic'] }
    });

    if (dynamicChallenges.length === 0) {
      console.log('⚠️  No dynamic challenges found');
      console.log('Run: node scripts/enableDynamicScoring.js\n');
      process.exit(0);
    }

    console.log(`Found ${dynamicChallenges.length} dynamic challenge(s)\n`);

    let totalSubmissions = 0;
    let totalUsers = 0;
    let totalTeams = 0;

    for (const challenge of dynamicChallenges) {
      console.log(`\n📊 Processing: ${challenge.title}`);
      console.log(`   Type: ${challenge.function}`);
      console.log(`   Current solves: ${challenge.solvedBy?.length || 0}`);

      try {
        const result = await scoringService.recalculateAllSubmissions(challenge._id);
        
        if (result.message === 'No submissions to recalculate') {
          console.log('   ℹ️  No submissions to recalculate');
        } else {
          console.log(`   ✓ Recalculated ${result.submissionsRecalculated} submission(s)`);
          console.log(`   ✓ Updated ${result.usersAffected} user(s)`);
          console.log(`   ✓ Updated ${result.teamsAffected} team(s)`);
          
          totalSubmissions += result.submissionsRecalculated;
          totalUsers += result.usersAffected;
          totalTeams += result.teamsAffected;

          // Show adjustments
          if (result.adjustments.users.length > 0) {
            console.log('   User adjustments:');
            result.adjustments.users.forEach(({ userId, adjustment }) => {
              console.log(`     - User ${userId}: ${adjustment >= 0 ? '+' : ''}${adjustment} points`);
            });
          }
          
          if (result.adjustments.teams.length > 0) {
            console.log('   Team adjustments:');
            result.adjustments.teams.forEach(({ teamId, adjustment }) => {
              console.log(`     - Team ${teamId}: ${adjustment >= 0 ? '+' : ''}${adjustment} points`);
            });
          }
        }
      } catch (err) {
        console.error(`   ✗ Error recalculating ${challenge.title}:`, err.message);
      }
    }

    console.log('\n=========================================');
    console.log('  Recalculation Complete');
    console.log('=========================================');
    console.log(`Total submissions recalculated: ${totalSubmissions}`);
    console.log(`Total users affected: ${totalUsers}`);
    console.log(`Total teams affected: ${totalTeams}`);
    console.log('\n✓ All dynamic scores have been recalculated!');
    console.log('  All users now have correct points based on solve order.\n');

    process.exit(0);
  } catch (error) {
    console.error('✗ Fatal Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

recalculateDynamicScores();
