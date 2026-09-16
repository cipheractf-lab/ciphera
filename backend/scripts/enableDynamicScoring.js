#!/usr/bin/env node

/**
 * Enable Dynamic Scoring for All Challenges
 * 
 * This script updates all existing challenges to use dynamic scoring
 * where challenge values decrease as more teams solve them.
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Challenge = require('../models/Challenge');

async function enableDynamicScoring() {
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
      // Check if dynamic scoring is already enabled
      if (challenge.dynamicScoring?.enabled) {
        console.log(`⊘ Skipping "${challenge.title}" - Dynamic scoring already enabled`);
        skipped++;
        continue;
      }

      // Calculate dynamic scoring values
      const initial = challenge.points;
      const minimum = Math.floor(challenge.points * 0.25); // 25% of initial
      const decay = 50; // Reaches minimum after 50 solves

      // Update challenge with dynamic scoring
      challenge.dynamicScoring = {
        enabled: true,
        initial: initial,
        minimum: minimum,
        decay: decay
      };

      await challenge.save();

      console.log(`✓ Enabled dynamic scoring for "${challenge.title}"`);
      console.log(`  Initial: ${initial} pts | Minimum: ${minimum} pts | Decay: ${decay} solves\n`);
      updated++;
    }

    console.log('\n=== Summary ===');
    console.log(`✓ Enabled: ${updated} challenges`);
    console.log(`⊘ Skipped: ${skipped} challenges (already enabled)`);
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
enableDynamicScoring();
