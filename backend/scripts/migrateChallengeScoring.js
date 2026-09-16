/**
 * Database Migration: Add exact scoring fields to Challenge model
 * 
 * This script:
 * 1. Adds 'initial', 'minimum', 'decay', 'function', 'state' fields to existing challenges
 * 2. Migrates existing challenges to 'static' function type
 * 3. Preserves all existing data
 * 4. Can be run multiple times safely (idempotent)
 * 
 * Usage: node backend/scripts/migrateChallengeScoring.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');

async function migrateChallengeScoringFields() {
  try {
    console.log('=== Challenge Scoring Migration ===\n');
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✓ Connected to MongoDB\n');

    // Get all challenges
    const challenges = await Challenge.find({});
    console.log(`Found ${challenges.length} challenges to migrate\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const challenge of challenges) {
      try {
        let needsUpdate = false;
        const updates = {};

        // Check if 'function' field exists and set to 'static' if not
        if (!challenge.function || challenge.function === undefined) {
          updates.function = 'static';
          needsUpdate = true;
        }

        // Check if 'state' field exists and set based on isVisible if not
        if (!challenge.state || challenge.state === undefined) {
          updates.state = challenge.isVisible ? 'visible' : 'hidden';
          needsUpdate = true;
        }

        // Set initial, minimum, decay to null for static challenges (they're not used)
        // For future dynamic challenges, these will be set when creating/editing
        if (challenge.initial === undefined) {
          updates.initial = null;
          needsUpdate = true;
        }
        if (challenge.minimum === undefined) {
          updates.minimum = null;
          needsUpdate = true;
        }
        if (challenge.decay === undefined) {
          updates.decay = null;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await Challenge.updateOne(
            { _id: challenge._id },
            { $set: updates }
          );
          
          console.log(`✓ Migrated: "${challenge.title}"`);
          console.log(`  - function: ${updates.function || 'already set'}`);
          console.log(`  - state: ${updates.state || 'already set'}`);
          console.log(`  - initial: ${updates.initial}`);
          console.log(`  - minimum: ${updates.minimum}`);
          console.log(`  - decay: ${updates.decay}\n`);
          
          migratedCount++;
        } else {
          console.log(`⊘ Skipped: "${challenge.title}" (already migrated)\n`);
          skippedCount++;
        }
      } catch (error) {
        console.error(`✗ Error migrating "${challenge.title}":`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total challenges: ${challenges.length}`);
    console.log(`✓ Migrated: ${migratedCount}`);
    console.log(`⊘ Skipped: ${skippedCount}`);
    console.log(`✗ Errors: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n✓ Migration completed successfully!');
      console.log('\nAll challenges are now configured with standard scoring fields.');
      console.log('Static scoring is set by default. To enable dynamic scoring:');
      console.log('1. Edit a challenge in the admin panel');
      console.log('2. Set function to "linear" or "logarithmic"');
      console.log('3. Set initial, minimum, and decay values');
    } else {
      console.log('\n⚠ Migration completed with errors. Please review above.');
    }

  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Database connection closed');
  }
}

// Run migration
if (require.main === module) {
  migrateChallengeScoringFields()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = migrateChallengeScoringFields;
