require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Challenge = require('../models/Challenge');

async function checkCurrentScoring() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const challenges = await Challenge.find({})
      .select('title points function initial minimum decay')
      .limit(20);
    
    console.log('=== Current Challenge Scoring Configuration ===\n');
    console.log(`Total challenges found: ${challenges.length}\n`);
    
    if (challenges.length === 0) {
      console.log('❌ No challenges found in database.\n');
      console.log('STATUS: No scoring applied yet - database is empty or no challenges created.');
    } else {
      console.log('Challenges:\n');
      challenges.forEach((ch, i) => {
        console.log(`${i+1}. "${ch.title}"`);
        console.log(`   Points: ${ch.points}`);
        console.log(`   Function: ${ch.function || 'NOT SET (defaults to static)'}`);
        console.log(`   Initial: ${ch.initial !== null && ch.initial !== undefined ? ch.initial : 'null'}`);
        console.log(`   Minimum: ${ch.minimum !== null && ch.minimum !== undefined ? ch.minimum : 'null'}`);
        console.log(`   Decay: ${ch.decay !== null && ch.decay !== undefined ? ch.decay : 'null'}`);
        console.log('');
      });
      
      const hasFunction = challenges.filter(ch => ch.function).length;
      const noFunction = challenges.length - hasFunction;
      const staticCount = challenges.filter(ch => ch.function === 'static').length;
      const linearCount = challenges.filter(ch => ch.function === 'linear').length;
      const logCount = challenges.filter(ch => ch.function === 'logarithmic').length;
      
      console.log('=== Summary ===');
      console.log(`Total challenges: ${challenges.length}`);
      console.log(`\n📊 Scoring Type Distribution:`);
      console.log(`   - Static scoring: ${staticCount} challenges`);
      console.log(`   - Linear dynamic: ${linearCount} challenges`);
      console.log(`   - Logarithmic dynamic: ${logCount} challenges`);
      console.log(`   - Not migrated (no function field): ${noFunction} challenges`);
      
      console.log(`\n🎯 Current Status:`);
      if (noFunction > 0) {
        console.log(`   ⚠️  ${noFunction} challenge(s) need migration`);
        console.log(`   These will behave as STATIC by default but should run migration script`);
      }
      
      if (linearCount > 0 || logCount > 0) {
        console.log(`   ✅ DYNAMIC SCORING is active (${linearCount + logCount} dynamic challenges)`);
      } else {
        console.log(`   ✅ STATIC SCORING only (all challenges are static)`);
      }
      
      console.log(`\n💡 Notes:`);
      console.log(`   - Static: Fixed points, everyone gets same amount`);
      console.log(`   - Linear: Decreases by 'decay' per solve`);
      console.log(`   - Logarithmic: Slow decay at first, then rapid`);
      
      if (noFunction > 0) {
        console.log(`\n⚡ Action Required:`);
        console.log(`   Run migration: node backend/scripts/migrateChallengeScoring.js`);
      }
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkCurrentScoring();
