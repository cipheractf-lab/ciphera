#!/usr/bin/env node
/**
 * Production Preparation Script
 * Run this BEFORE starting the server with 500 concurrent users
 * 
 * Usage: node scripts/prepare-production.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import models
const Submission = require('../models/Submission');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const Team = require('../models/Team');

async function prepareProduction() {
  try {
    console.log('🚀 Preparing CTF Platform for Production (500+ concurrent users)...\n');

    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!MONGODB_URI) {
      console.error('❌ ERROR: MONGODB_URI not found in .env file');
      process.exit(1);
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10 // Only need small pool for setup
    });
    console.log('✓ Connected to MongoDB\n');

    // 1. Create/verify critical indexes
    console.log('📊 Creating database indexes for performance...');
    
    console.log('  → Submission unique index (prevents race condition)...');
    await Submission.collection.createIndex(
      { user: 1, challenge: 1, isCorrect: 1 },
      { 
        unique: true, 
        partialFilterExpression: { isCorrect: true },
        name: 'unique_correct_submission',
        background: true
      }
    );
    console.log('    ✓ Submission indexes created');

    console.log('  → User indexes (scoreboard optimization)...');
    await User.collection.createIndex({ points: -1 }, { background: true });
    await User.collection.createIndex({ lastSolveTime: 1 }, { background: true });
    await User.collection.createIndex({ role: 1, points: -1 }, { background: true });
    console.log('    ✓ User indexes created');

    console.log('  → Challenge indexes...');
    await Challenge.collection.createIndex({ isVisible: 1, createdAt: -1 }, { background: true });
    await Challenge.collection.createIndex({ category: 1, points: 1 }, { background: true });
    console.log('    ✓ Challenge indexes created');

    console.log('  → Team indexes...');
    await Team.collection.createIndex({ points: -1 }, { background: true });
    await Team.collection.createIndex({ members: 1 }, { background: true });
    console.log('    ✓ Team indexes created\n');

    // 2. Verify MongoDB pool configuration
    console.log('⚙️  Verifying MongoDB configuration...');
    const maxPool = parseInt(process.env.MONGO_MAX_POOL_SIZE) || 100;
    const minPool = parseInt(process.env.MONGO_MIN_POOL_SIZE) || 20;
    
    if (maxPool < 500) {
      console.warn('⚠️  WARNING: MONGO_MAX_POOL_SIZE is', maxPool);
      console.warn('   Recommended: 500 for 500+ concurrent users');
      console.warn('   Update .env file: MONGO_MAX_POOL_SIZE=500');
    } else {
      console.log('  ✓ MongoDB pool size:', maxPool, '(sufficient for production)');
    }

    if (minPool < 50) {
      console.warn('⚠️  WARNING: MONGO_MIN_POOL_SIZE is', minPool);
      console.warn('   Recommended: 50 for production load');
      console.warn('   Update .env file: MONGO_MIN_POOL_SIZE=50');
    } else {
      console.log('  ✓ MongoDB min pool size:', minPool);
    }

    // 3. Verify Redis configuration
    console.log('\n⚙️  Verifying Redis configuration...');
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.error('❌ ERROR: REDIS_URL not found in .env file');
      console.error('   Redis is REQUIRED for session management and caching');
      process.exit(1);
    }
    console.log('  ✓ Redis URL configured');

    // 4. Check JWT secret
    console.log('\n⚙️  Verifying security configuration...');
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      console.error('❌ ERROR: JWT_SECRET must be at least 32 characters');
      process.exit(1);
    }
    console.log('  ✓ JWT secret configured (', jwtSecret.length, 'chars)');

    // 5. Database statistics
    console.log('\n📈 Database Statistics:');
    const userCount = await User.countDocuments();
    const challengeCount = await Challenge.countDocuments();
    const submissionCount = await Submission.countDocuments();
    const teamCount = await Team.countDocuments();
    
    console.log('  → Users:', userCount);
    console.log('  → Challenges:', challengeCount);
    console.log('  → Submissions:', submissionCount);
    console.log('  → Teams:', teamCount);

    console.log('\n✅ Production preparation complete!');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Update .env with recommended settings (if warnings shown)');
    console.log('   2. Restart backend: pm2 restart all OR npm start');
    console.log('   3. Monitor logs: pm2 logs OR tail -f logs/app.log');
    console.log('   4. Test with: curl http://localhost:10000/api/health\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR during production preparation:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  prepareProduction();
}

module.exports = prepareProduction;
