/**
 * Monitoring and Alerting Service
 * 
 * Centralized monitoring for critical infrastructure failures:
 * - Redis connectivity issues
 * - Database connection problems
 * - Authentication system failures
 * - Rate limiting system failures
 * 
 * Alerts are logged to console and can be extended to:
 * - Email notifications
 * - Slack/Discord webhooks
 * - PagerDuty/Opsgenie
 * - External SIEM systems
 */

const config = require('../config');

// Alert severity levels
const AlertLevel = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

// Alert counters for rate limiting alerts themselves
const alertCounters = new Map();
const ALERT_COOLDOWN_MS = 60000; // 1 minute cooldown per alert type

/**
 * Core alert function
 * @param {string} level - Alert severity
 * @param {string} component - System component (e.g., 'Redis', 'MongoDB')
 * @param {string} message - Alert message
 * @param {object} metadata - Additional context
 */
function sendAlert(level, component, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const alertKey = `${component}:${message}`;
  
  // Rate limit identical alerts (prevent spam)
  const lastAlert = alertCounters.get(alertKey);
  if (lastAlert && (Date.now() - lastAlert) < ALERT_COOLDOWN_MS) {
    return; // Skip duplicate alert within cooldown period
  }
  alertCounters.set(alertKey, Date.now());
  
  const alert = {
    timestamp,
    level,
    component,
    message,
    environment: config.server.nodeEnv,
    ...metadata
  };
  
  // Console logging with color coding
  const levelEmoji = {
    INFO: 'ℹ️',
    WARNING: '⚠️',
    ERROR: '❌',
    CRITICAL: '🚨'
  };
  
  console.error(`\n${levelEmoji[level] || '📢'} [${level}] [${component}] ${message}`);
  console.error(`   Time: ${timestamp}`);
  if (Object.keys(metadata).length > 0) {
    console.error(`   Details:`, JSON.stringify(metadata, null, 2));
  }
  console.error(''); // Empty line for readability
  
  // TODO: Extend with external alerting
  // - Send email via SMTP
  // - POST to Slack webhook
  // - Push to monitoring service (DataDog, New Relic)
  
  // Example webhook integration (commented out):
  // if (level === AlertLevel.CRITICAL && process.env.ALERT_WEBHOOK_URL) {
  //   fetch(process.env.ALERT_WEBHOOK_URL, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(alert)
  //   }).catch(err => console.error('Failed to send webhook alert:', err));
  // }
}

/**
 * Redis-specific monitoring functions
 */
const redisMonitoring = {
  /**
   * Alert on Redis connection failure
   */
  connectionFailed: (error) => {
    sendAlert(
      AlertLevel.CRITICAL,
      'Redis',
      'Redis connection failed',
      {
        error: error.message,
        stack: error.stack,
        impact: 'Rate limiting, caching, and real-time features disabled',
        action: 'Check Redis server status and connection string'
      }
    );
  },
  
  /**
   * Alert on Redis operation failure
   */
  operationFailed: (operation, error) => {
    sendAlert(
      AlertLevel.ERROR,
      'Redis',
      `Redis operation failed: ${operation}`,
      {
        operation,
        error: error.message,
        impact: 'Specific feature may be degraded (fail-open mode)',
        action: 'Check Redis logs and server health'
      }
    );
  },
  
  /**
   * Alert on repeated Redis failures (circuit breaker pattern)
   */
  repeatedFailures: (failureCount, timeWindowMinutes) => {
    sendAlert(
      AlertLevel.CRITICAL,
      'Redis',
      'Redis experiencing repeated failures',
      {
        failureCount,
        timeWindowMinutes,
        impact: 'Critical infrastructure degraded - investigate immediately',
        action: 'Check Redis memory, CPU, network connectivity'
      }
    );
  },
  
  /**
   * Warning for high memory usage
   */
  highMemoryUsage: (usedMemory, maxMemory, percentUsed) => {
    sendAlert(
      AlertLevel.WARNING,
      'Redis',
      'Redis memory usage is high',
      {
        usedMemory: `${usedMemory} bytes`,
        maxMemory: `${maxMemory} bytes`,
        percentUsed: `${percentUsed}%`,
        action: 'Consider increasing Redis memory or implementing cache eviction'
      }
    );
  }
};

/**
 * Rate limiting monitoring
 */
const rateLimitMonitoring = {
  /**
   * Alert when rate limiting system fails
   */
  systemFailure: (limiterType, error) => {
    sendAlert(
      AlertLevel.ERROR,
      'RateLimit',
      `Rate limiter failure: ${limiterType}`,
      {
        limiterType,
        error: error.message,
        impact: 'DoS protection temporarily disabled (fail-open mode)',
        action: 'Check Redis connectivity and rate limit configuration'
      }
    );
  },
  
  /**
   * Info alert for suspicious activity
   */
  suspiciousActivity: (ip, endpoint, attemptCount) => {
    sendAlert(
      AlertLevel.WARNING,
      'Security',
      'Suspicious rate limit activity detected',
      {
        ip,
        endpoint,
        attemptCount,
        action: 'Monitor for potential attack, consider temporary IP block'
      }
    );
  }
};

/**
 * Database monitoring
 */
const databaseMonitoring = {
  /**
   * Alert on MongoDB connection failure
   */
  connectionFailed: (error) => {
    sendAlert(
      AlertLevel.CRITICAL,
      'MongoDB',
      'Database connection failed',
      {
        error: error.message,
        impact: 'Application cannot function - immediate action required',
        action: 'Check MongoDB server status and connection string'
      }
    );
  },
  
  /**
   * Alert on slow queries
   */
  slowQuery: (query, durationMs) => {
    if (durationMs > 5000) { // Only alert on queries > 5 seconds
      sendAlert(
        AlertLevel.WARNING,
        'MongoDB',
        'Slow database query detected',
        {
          query: query.substring(0, 200), // Truncate for readability
          durationMs,
          action: 'Review query performance and indexes'
        }
      );
    }
  }
};

/**
 * Authentication monitoring
 */
const authMonitoring = {
  /**
   * Alert on token reuse detection
   */
  tokenReuseDetected: (userId, tokenFamily, ip, userAgent) => {
    sendAlert(
      AlertLevel.CRITICAL,
      'Security',
      'Refresh token reuse detected - possible security breach',
      {
        userId,
        tokenFamily,
        ip,
        userAgent,
        impact: 'All tokens in family revoked',
        action: 'Investigate user account for compromise'
      }
    );
  },
  
  /**
   * Alert on multiple failed logins
   */
  bruteForceAttempt: (email, ip, attemptCount) => {
    sendAlert(
      AlertLevel.WARNING,
      'Security',
      'Multiple failed login attempts detected',
      {
        email,
        ip,
        attemptCount,
        action: 'Monitor for brute force attack'
      }
    );
  }
};

/**
 * Health check monitoring
 */
const healthMonitoring = {
  /**
   * Periodic health check results
   */
  healthCheckFailed: (component, error) => {
    sendAlert(
      AlertLevel.ERROR,
      'HealthCheck',
      `Health check failed for ${component}`,
      {
        component,
        error: error.message,
        action: 'Investigate component health'
      }
    );
  }
};

module.exports = {
  AlertLevel,
  sendAlert,
  redis: redisMonitoring,
  rateLimit: rateLimitMonitoring,
  database: databaseMonitoring,
  auth: authMonitoring,
  health: healthMonitoring
};
