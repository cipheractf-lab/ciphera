#!/usr/bin/env node

/**
 * Disable Dynamic Scoring for All Challenges
 * 
 * This script disables dynamic scoring and reverts to static point values
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Challenge = require('../models/Challenge');

async function disableDynamicScoring() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB\n');

    // Get all challenges
    const challenges = await Challenge.find({});
    console.log(`Found ${challenges.length} challenges\n`);

    let updated = 0;
    let skipped = 0;

    for (const challenge of challenges) {
      // Check if dynamic scoring is enabled
      if (!challenge.dynamicScoring?.enabled) {
        console.log(`⊘ Skipping "${challenge.title}" - Dynamic scoring already disabled`);
        skipped++;
        continue;
      }

      // Disable dynamic scoring
      challenge.dynamicScoring.enabled = false;
      await challenge.save();

      console.log(`✓ Disabled dynamic scoring for "${challenge.title}"`);
      updated++;
    }

    console.log('\n=== Summary ===');
    console.log(`✓ Disabled: ${updated} challenges`);
    console.log(`⊘ Skipped: ${skipped} challenges (already disabled)`);
    console.log(`Total: ${challenges.length} challenges`);

    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
disableDynamicScoring();
