const Redis = require('ioredis');
const monitoring = require('./monitoring');

// Singleton Redis client to prevent connection exhaustion
// Critical for 500+ concurrent users - only ONE connection pool
let redisClient = null;
let redisSubscriber = null;
let isRedisReady = false;
let redisReadyPromise = null;
let connectionFailureCount = 0;
let lastFailureTime = null;

function createNoopRedisClient(kind = 'client') {
  return {
    status: 'ready',
    async get() { return null; },
    async setex() { return 'OK'; },
    async del() { return 0; },
    async keys() { return []; },
    async flushdb() { return 'OK'; },
    async quit() { return 'OK'; },
    on() { return this; },
    once(event, cb) {
      if (event === 'ready' && typeof cb === 'function') {
        cb();
      }
      return this;
    },
    removeListener() { return this; },
    subscribe(_channel, cb) {
      if (typeof cb === 'function') cb(null, 1);
      return this;
    }
  };
}

/**
 * Get or create the main Redis client (for caching, rate limiting, sessions)
 * Reuses connection across all modules to prevent memory leak
 */
function getRedisClient() {
  if (!redisClient) {
    const disableRedis = process.env.DISABLE_REDIS === 'true';
    if (disableRedis) {
      redisClient = createNoopRedisClient('client');
      isRedisReady = true;
      redisReadyPromise = Promise.resolve(true);
      console.warn('[Redis] DISABLE_REDIS=true - running without Redis cache/rate-limit backend');
      return redisClient;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '500', 10),
      commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT_MS || '500', 10),
      // Connection pool settings for high load
      maxPoolSize: 50,
      minPoolSize: 10,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 500);
        return delay;
      }
    });

    // Create promise that resolves when Redis is ready.
    // Fail-open in development/partial outages: do not reject startup.
    redisReadyPromise = new Promise((resolve, reject) => {
      redisClient.once('ready', () => {
        isRedisReady = true;
        console.log('✓ Redis Client Ready');
        // Reset failure counter on successful connection
        connectionFailureCount = 0;
        lastFailureTime = null;
        resolve();
      });

      redisClient.once('error', (err) => {
        if (!isRedisReady) {
          console.error('Redis Client Connection Failed:', err);
          monitoring.redis.connectionFailed(err);
          resolve(false);
        }
      });
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
      
      // Track failure patterns
      const now = Date.now();
      if (!lastFailureTime || (now - lastFailureTime) > 300000) { // Reset after 5 minutes
        connectionFailureCount = 1;
      } else {
        connectionFailureCount++;
      }
      lastFailureTime = now;
      
      // Alert on repeated failures (circuit breaker pattern)
      if (connectionFailureCount >= 5) {
        monitoring.redis.repeatedFailures(connectionFailureCount, 5);
      } else {
        monitoring.redis.operationFailed('connection', err);
      }
    });

    redisClient.on('connect', () => {
      console.log('✓ Redis Client Connected');
    });
  }

  return redisClient;
}

/**
 * Get or create the Redis subscriber client (for pub/sub)
 * Separate client required by Redis protocol - cannot reuse main client
 */
function getRedisSubscriber() {
  if (!redisSubscriber) {
    const disableRedis = process.env.DISABLE_REDIS === 'true';
    if (disableRedis) {
      redisSubscriber = createNoopRedisClient('subscriber');
      return redisSubscriber;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisSubscriber = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      lazyConnect: true
    });

    redisSubscriber.on('error', (err) => {
      console.error('Redis Subscriber Error:', err);
      monitoring.redis.operationFailed('subscriber', err);
    });

    redisSubscriber.on('connect', () => {
      console.log('✓ Redis Subscriber Connected');
    });
  }

  return redisSubscriber;
}

/**
 * Wait for Redis to be ready before performing operations
 */
async function waitForRedis() {
  if (isRedisReady) return;
  if (!redisReadyPromise) {
    throw new Error('Redis client not initialized');
  }
  const ready = await redisReadyPromise;
  if (ready === false) {
    console.warn('[Redis] Running in degraded mode (Redis unavailable)');
  }
}

/**
 * Clear Redis cache - Only runs ONCE per cluster (PM2 worker 0)
 * Must be called AFTER Redis is ready
 */
async function clearRedisCache() {
  try {
    // Only worker 0 clears cache to avoid race conditions
    const workerId = process.env.pm_id || process.env.NODE_APP_INSTANCE || '0';
    if (workerId !== '0') {
      console.log(`[Worker ${workerId}] Skipping Redis cache clear (not primary worker)`);
      return;
    }

    await waitForRedis();
    
    // Don't clear from subscriber client
    if (!redisClient || redisClient === redisSubscriber) {
      console.warn('Redis client not available for cache clearing');
      return;
    }

    await redisClient.flushdb();
    console.log('✓ Redis cache cleared (worker 0)');
  } catch (error) {
    console.error('Redis cache clear failed (non-fatal):', error.message);
    // Don't throw - cache clear failure shouldn't crash server
  }
}

/**
 * Clear scoreboard-related caches (called after score changes)
 * Equivalent to clear_standings()
 */
async function clearScoreboardCache() {
  try {
    await waitForRedis();
    
    if (!redisClient || redisClient === redisSubscriber) {
      console.warn('Redis client not available for scoreboard cache clearing');
      return;
    }

    // Clear all scoreboard-related cache keys (including graph caches)
    const patterns = [
      'scoreboard:*'
    ];
    
    let totalCleared = 0;
    for (const pattern of patterns) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
        totalCleared += keys.length;
      }
    }
    
    if (totalCleared > 0) {
      console.log(`✓ Cleared ${totalCleared} scoreboard cache keys`);
    }
  } catch (error) {
    console.error('Scoreboard cache clear failed (non-fatal):', error.message);
  }
}


/**
 * Graceful shutdown - close all connections
 */
async function closeRedis() {
  const promises = [];
  
  if (redisClient) {
    promises.push(redisClient.quit());
    redisClient = null;
  }
  
  if (redisSubscriber) {
    promises.push(redisSubscriber.quit());
    redisSubscriber = null;
  }

  isRedisReady = false;
  redisReadyPromise = null;

  await Promise.all(promises);
  console.log('✓ Redis connections closed');
}

module.exports = {
  getRedisClient,
  getRedisSubscriber,
  waitForRedis,
  clearRedisCache,
  clearScoreboardCache,
  closeRedis
};
