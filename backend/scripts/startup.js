const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

async function checkSystemHealth() {
  console.log('🔍 CTF Platform Startup Health Check\n');

  let allChecksPass = true;

  // Check 1: Environment Variables
  console.log('1. Checking Environment Variables...');
  const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log(`   ❌ Missing required environment variables: ${missingVars.join(', ')}`);
    allChecksPass = false;
  } else {
    console.log('   ✅ All required environment variables are set');
  }

  // Check 2: Database Connection
  console.log('\n2. Checking Database Connection...');
  try {
    const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/ctf-platform';
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000 // 5 second timeout
    });
    console.log('   ✅ Database connection successful');
    await mongoose.disconnect();
  } catch (error) {
    console.log(`   ❌ Database connection failed: ${error.message}`);
    allChecksPass = false;
  }

  // Check 3: Required Directories
  console.log('\n3. Checking Required Directories...');
  const requiredDirs = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/blog-images')
  ];

  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   ✅ Created directory: ${dir}`);
      } catch (error) {
        console.log(`   ❌ Failed to create directory ${dir}: ${error.message}`);
        allChecksPass = false;
      }
    } else {
      console.log(`   ✅ Directory exists: ${dir}`);
    }
  }

  // Check 4: File Permissions
  console.log('\n4. Checking File Permissions...');
  const uploadsDir = path.join(__dirname, '../uploads');
  try {
    // Test write permission
    const testFile = path.join(uploadsDir, 'test-write.tmp');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('   ✅ Upload directory is writable');
  } catch (error) {
    console.log(`   ❌ Upload directory is not writable: ${error.message}`);
    allChecksPass = false;
  }

  // Check 5: Node.js Version
  console.log('\n5. Checking Node.js Version...');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= 16) {
    console.log(`   ✅ Node.js version ${nodeVersion} is supported`);
  } else {
    console.log(`   ⚠️  Node.js version ${nodeVersion} may not be fully supported (recommended: 16+)`);
  }

  // Check 6: Memory Available
  console.log('\n6. Checking System Resources...');
  const memoryUsage = process.memoryUsage();
  const totalMemoryMB = Math.round(memoryUsage.rss / 1024 / 1024);
  
  if (totalMemoryMB < 512) {
    console.log(`   ⚠️  Low memory available: ${totalMemoryMB}MB (recommended: 512MB+)`);
  } else {
    console.log(`   ✅ Sufficient memory available: ${totalMemoryMB}MB`);
  }

  // Check 7: Configuration Validation
  console.log('\n7. Validating Configuration...');
  const poolSize = parseInt(process.env.MONGO_MAX_POOL_SIZE) || 50;
  const jwtExpire = process.env.JWT_EXPIRE || '1h';
  const nodeEnv = process.env.NODE_ENV || 'development';

  console.log(`   📊 MongoDB Pool Size: ${poolSize}`);
  console.log(`   🔐 JWT Expiration: ${jwtExpire}`);
  console.log(`   🌍 Environment: ${nodeEnv}`);

  if (nodeEnv === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      console.log('   ❌ JWT_SECRET is too short for production (minimum 32 characters)');
      allChecksPass = false;
    } else {
      console.log('   ✅ JWT_SECRET is sufficiently secure for production');
    }
  }

  // Final Result
  console.log('\n' + '='.repeat(50));
  if (allChecksPass) {
    console.log('🎉 All health checks passed! System is ready to start.');
    console.log('\nRecommended startup commands:');
    console.log('  Development: npm run dev');
    console.log('  Production:  npm start');
    console.log('\nMonitoring commands:');
    console.log('  Health:      npm run health');
    console.log('  Monitor:     npm run monitor');
    console.log('  Test Load:   npm run test:concurrency');
  } else {
    console.log('❌ Some health checks failed. Please fix the issues before starting.');
    process.exit(1);
  }
  console.log('='.repeat(50));
}

// Run health check if this script is executed directly
if (require.main === module) {
  checkSystemHealth().catch(error => {
    console.error('Health check failed:', error);
    process.exit(1);
  });
}

module.exports = checkSystemHealth;
