const EventState = require('../models/EventState');
const { getRedisClient } = require('../utils/redis');

const redisClient = getRedisClient();
const CACHE_KEY = 'ctf:event:state';
const CACHE_TTL = 3600; 

const deriveState = (rawState = {}) => {
  const now = new Date();
  const startTime = rawState.startedAt ? new Date(rawState.startedAt) : null;
  const endTime = rawState.endedAt ? new Date(rawState.endedAt) : null;
  const freezeTime = rawState.freezeAt ? new Date(rawState.freezeAt) : null;

  let status = 'not_started';
  if (startTime && now >= startTime) {
    status = 'started';
  }
  if (endTime && now >= endTime) {
    status = 'ended';
  }

  const isFrozen = !!(freezeTime && now >= freezeTime);
  const isPaused = status === 'started' && !!rawState.isPaused;
  const isSubmissionAllowed = status === 'started' && !isPaused;

  return {
    status,
    startedAt: rawState.startedAt || null,
    endedAt: rawState.endedAt || null,
    freezeAt: rawState.freezeAt || null,
    isPaused,
    pausedAt: rawState.pausedAt || null,
    pausedBy: rawState.pausedBy || null,
    resumedAt: rawState.resumedAt || null,
    resumedBy: rawState.resumedBy || null,
    startedBy: rawState.startedBy || null,
    endedBy: rawState.endedBy || null,
    customMessage: rawState.customMessage || null,
    isFrozen,
    isSubmissionAllowed
  };
};

/**
 * Get event state from cache or MongoDB
 * @returns {Promise<Object>} Event state object
 */
async function getEventState() {
  try {
    // Try Redis cache first
    const cached = await redisClient.get(CACHE_KEY);
    if (cached) {
      return deriveState(JSON.parse(cached));
    }
  } catch (err) {
    console.warn('[EventState] Redis cache miss or error:', err.message);
  }

  // Fallback to MongoDB
  try {
    const eventState = await EventState.getEventState();
    const stateObj = {
      status: eventState.status,
      startedAt: eventState.startedAt,
      endedAt: eventState.endedAt,
      freezeAt: eventState.freezeAt,
      isPaused: eventState.isPaused,
      pausedAt: eventState.pausedAt,
      pausedBy: eventState.pausedBy,
      resumedAt: eventState.resumedAt,
      resumedBy: eventState.resumedBy,
      startedBy: eventState.startedBy,
      endedBy: eventState.endedBy,
      customMessage: eventState.customMessage
    };

    // Cache in Redis for future requests
    try {
      await redisClient.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(stateObj));
    } catch (err) {
      console.warn('[EventState] Failed to cache state in Redis:', err.message);
    }

    return deriveState(stateObj);
  } catch (err) {
    console.error('[EventState] Error fetching event state from MongoDB:', err);
    // Default to locked-down behavior if database error
    return {
      status: 'not_started',
      startedAt: null,
      endedAt: null,
      freezeAt: null,
      isPaused: false,
      isFrozen: false,
      isSubmissionAllowed: false
    };
  }
}

/**
 * Refresh event state cache in Redis
 * @param {Object} stateObj - Event state object to cache
 */
async function refreshEventStateCache(stateObj) {
  try {
    await redisClient.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(stateObj));
  } catch (err) {
    console.warn('[EventState] Failed to refresh cache:', err.message);
  }
}

/**
 * Middleware to check if event is started (allows submissions)
 * Returns 403 if event is not started or ended
 */
exports.checkEventStarted = async (req, res, next) => {
  try {
    const eventState = await getEventState();

    if (!eventState.isSubmissionAllowed) {
      let message = 'Submissions are currently unavailable.';
      if (eventState.status === 'not_started') {
        message = 'CTF event has not started yet.';
      } else if (eventState.status === 'ended') {
        message = 'CTF event has ended. Submissions are no longer accepted.';
      } else if (eventState.isPaused) {
        message = 'CTF is paused by admin. Submissions are temporarily disabled.';
      }

      return res.status(403).json({
        success: false,
        message,
        eventStatus: eventState.status
      });
    }

    // Attach event state to request for use in route handlers
    req.eventState = eventState;
    next();
  } catch (error) {
    console.error('[EventState] Error in checkEventStarted:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking event state'
    });
  }
};

/**
 * Middleware to check if event is NOT ended (blocks if ended)
 * Allows submissions when started or not_started
 */
exports.checkEventNotEnded = async (req, res, next) => {
  try {
    const eventState = await getEventState();

    if (!eventState.isSubmissionAllowed) {
      let message = 'Submissions are currently unavailable.';
      if (eventState.status === 'not_started') {
        message = 'CTF event has not started yet.';
      } else if (eventState.status === 'ended') {
        message = 'CTF event has ended. Submissions are no longer accepted.';
      } else if (eventState.isPaused) {
        message = 'CTF is paused by admin. Submissions are temporarily disabled.';
      }

      return res.status(403).json({
        success: false,
        message,
        eventStatus: eventState.status,
        endedAt: eventState.endedAt
      });
    }

    // Attach event state to request
    req.eventState = eventState;
    next();
  } catch (error) {
    console.error('[EventState] Error in checkEventNotEnded:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking event state'
    });
  }
};

/**
 * Helper function to check event state (for use in route handlers)
 * @returns {Promise<Object>} Event state object
 */
exports.getEventState = getEventState;

/**
 * Helper function to refresh cache
 * @param {Object} stateObj - Event state object
 */
exports.refreshEventStateCache = refreshEventStateCache;

/**
 * Check if event is ended (synchronous check for use in business logic)
 * @returns {Promise<boolean>} True if event is ended
 */
exports.isEventEnded = async () => {
  try {
    const eventState = await getEventState();
    return eventState.status === 'ended';
  } catch (error) {
    console.error('[EventState] Error checking if event ended:', error);
    // Default to false (allow operations) if check fails
    return false;
  }
};

/**
 * Check if submissions are currently allowed (started + not paused + before end)
 */
exports.isSubmissionAllowed = async () => {
  try {
    const eventState = await getEventState();
    return eventState.isSubmissionAllowed;
  } catch (error) {
    console.error('[EventState] Error checking submission availability:', error);
    return false;
  }
};
