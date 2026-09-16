const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

// Test configuration
const TEST_CONFIG = {
  concurrentUsers: 10,
  requestsPerUser: 5,
  testDuration: 30000, // 30 seconds
  challengeId: null // Will be set during test
};

// Create test users
async function createTestUsers(count) {
  const users = [];
  console.log(`Creating ${count} test users...`);

  for (let i = 0; i < count; i++) {
    try {
      const userData = {
        username: `testuser${i}_${Date.now()}`,
        email: `testuser${i}_${Date.now()}@test.com`,
        password: 'testpass123'
      };

      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
      
      if (response.data.success) {
        users.push({
          id: i,
          token: response.data.token,
          username: userData.username,
          email: userData.email
        });
        console.log(`✅ Created user: ${userData.username}`);
      }
    } catch (error) {
      console.error(`❌ Failed to create user ${i}:`, error.response?.data?.message || error.message);
    }
  }

  console.log(`Successfully created ${users.length} test users\n`);
  return users;
}

// Get a test challenge
async function getTestChallenge() {
  try {
    const response = await axios.get(`${API_BASE_URL}/challenges`);
    if (response.data.success && response.data.data.length > 0) {
      return response.data.data[0];
    }
  } catch (error) {
    console.error('Failed to get test challenge:', error.response?.data?.message || error.message);
  }
  return null;
}

// Simulate user activity
async function simulateUserActivity(user, challenge) {
  const results = {
    userId: user.id,
    username: user.username,
    requests: 0,
    successes: 0,
    errors: 0,
    rateLimited: 0
  };

  const headers = {
    'Authorization': `Bearer ${user.token}`,
    'Content-Type': 'application/json'
  };

  console.log(`🚀 Starting activity simulation for ${user.username}`);

  const startTime = Date.now();
  
  while (Date.now() - startTime < TEST_CONFIG.testDuration) {
    try {
      results.requests++;

      // Simulate different types of requests
      const requestType = Math.floor(Math.random() * 4);
      
      switch (requestType) {
        case 0:
          // Get user profile
          await axios.get(`${API_BASE_URL}/auth/me`, { headers });
          break;
        
        case 1:
          // Get challenges
          await axios.get(`${API_BASE_URL}/challenges`, { headers });
          break;
        
        case 2:
          // Submit a flag (will be incorrect)
          if (challenge) {
            await axios.post(
              `${API_BASE_URL}/challenges/${challenge._id}/submit`,
              { flag: 'CTF{fake_flag}' },
              { headers }
            );
          }
          break;
        
        case 3:
          // Get specific challenge
          if (challenge) {
            await axios.get(`${API_BASE_URL}/challenges/${challenge._id}`, { headers });
          }
          break;
      }

      results.successes++;
      
      // Random delay between requests (100-500ms)
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
      
    } catch (error) {
      results.errors++;
      
      if (error.response?.status === 429) {
        results.rateLimited++;
        // Wait longer if rate limited
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  console.log(`✅ Completed activity simulation for ${user.username}`);
  return results;
}

// Run concurrency test
async function runConcurrencyTest() {
  console.log('=== CTF Platform Concurrency Test ===\n');
  console.log(`Test Configuration:`);
  console.log(`- Concurrent Users: ${TEST_CONFIG.concurrentUsers}`);
  console.log(`- Test Duration: ${TEST_CONFIG.testDuration / 1000} seconds`);
  console.log(`- API Base URL: ${API_BASE_URL}\n`);

  try {
    // Check server health
    console.log('Checking server health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Server is healthy\n');

    // Create test users
    const users = await createTestUsers(TEST_CONFIG.concurrentUsers);
    
    if (users.length === 0) {
      console.error('❌ No test users created. Exiting test.');
      return;
    }

    // Get a test challenge
    const challenge = await getTestChallenge();
    if (challenge) {
      console.log(`Using test challenge: ${challenge.title}\n`);
    } else {
      console.log('⚠️  No challenges available for testing\n');
    }

    // Start concurrent user simulations
    console.log('Starting concurrent user activity simulations...\n');
    const startTime = Date.now();
    
    const promises = users.map(user => simulateUserActivity(user, challenge));
    const results = await Promise.all(promises);
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;

    // Analyze results
    console.log('\n=== Test Results ===');
    console.log(`Total Test Time: ${totalTime.toFixed(2)} seconds\n`);

    let totalRequests = 0;
    let totalSuccesses = 0;
    let totalErrors = 0;
    let totalRateLimited = 0;

    results.forEach(result => {
      console.log(`User ${result.username}:`);
      console.log(`  Requests: ${result.requests}`);
      console.log(`  Successes: ${result.successes}`);
      console.log(`  Errors: ${result.errors}`);
      console.log(`  Rate Limited: ${result.rateLimited}`);
      console.log(`  Success Rate: ${((result.successes / result.requests) * 100).toFixed(2)}%\n`);

      totalRequests += result.requests;
      totalSuccesses += result.successes;
      totalErrors += result.errors;
      totalRateLimited += result.rateLimited;
    });

    console.log('=== Summary ===');
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Total Successes: ${totalSuccesses}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Rate Limited: ${totalRateLimited}`);
    console.log(`Overall Success Rate: ${((totalSuccesses / totalRequests) * 100).toFixed(2)}%`);
    console.log(`Requests per Second: ${(totalRequests / totalTime).toFixed(2)}`);
    console.log(`Rate Limit Percentage: ${((totalRateLimited / totalRequests) * 100).toFixed(2)}%`);

    // Check final server health
    console.log('\nChecking final server health...');
    const finalHealthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Server is still healthy after test');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  runConcurrencyTest();
}

module.exports = { runConcurrencyTest, createTestUsers, simulateUserActivity };
