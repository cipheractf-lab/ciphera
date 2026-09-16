const { getRedisClient } = require('./redis');
const redisClient = getRedisClient();

const TEAM_POINTS_CACHE_TTL = 30; // 30 seconds - near real-time for CTF

// Metrics tracking
let cacheHits = 0;
let cacheMisses = 0;
let cacheErrors = 0;

/**
 * Calculate team points from submissions and awards
 * EXACT SAME LOGIC as in routes - DO NOT MODIFY
 */
async function calculateTeamPoints(teamId, memberIds) {
  const Submission = require('../models/Submission');
  const Award = require('../models/Award');

  try {
    // Calculate member points - EXACT same aggregation as original
    const memberPointsAgg = await Submission.aggregate([
      { $match: { user: { $in: memberIds }, isCorrect: true } },
      {
        $lookup: {
          from: 'challenges',
          localField: 'challenge',
          foreignField: '_id',
          as: 'challengeData'
        }
      },
      { $unwind: '$challengeData' },
      {
        $group: {
          _id: '$user',
          totalPoints: { $sum: '$challengeData.points' }
        }
      }
    ]);

    const memberPoints = memberPointsAgg.reduce((sum, item) => sum + item.totalPoints, 0);

    // Get team awards (includes hint unlocks as negative values) - EXACT same logic
    const awards = await Award.find({ team: teamId }).select('value');
    const awardPoints = awards.reduce((sum, award) => sum + (award.value || 0), 0);

    // Total calculation - EXACT same logic (Math.max ensures no negative)
    const totalPoints = Math.max(0, memberPoints + awardPoints);

    return {
      memberPoints,
      awardPoints,
      total: totalPoints,
      calculatedAt: Date.now()
    };
  } catch (error) {
    console.error('[TeamPointsCache] Calculation error:', error);
    throw error;
  }
}

/**
 * Get team points with caching
 * Transparent caching layer - returns same data structure as direct calculation
 */
async function getTeamPoints(teamId, memberIds) {
  const cacheKey = `team:${teamId}:points`;

  try {
    // Try to get from cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      cacheHits++;
      const data = JSON.parse(cached);
      const cacheAge = Math.round((Date.now() - data.calculatedAt) / 1000);
      console.log(`[TeamPointsCache] HIT for team ${teamId} (age: ${cacheAge}s)`);
      return data;
    }

    // Cache MISS - calculate fresh
    cacheMisses++;
    console.log(`[TeamPointsCache] MISS for team ${teamId} - calculating...`);
    const points = await calculateTeamPoints(teamId, memberIds);

    // Store in cache with TTL
    await redisClient.setex(cacheKey, TEAM_POINTS_CACHE_TTL, JSON.stringify(points));
    console.log(`[TeamPointsCache] Cached team ${teamId} points: ${points.total}`);

    return points;
  } catch (error) {
    cacheErrors++;
    console.error('[TeamPointsCache] Error, falling back to direct calculation:', error);
    
    // Critical: If Redis fails, still return correct data by calculating directly
    // This ensures the platform keeps working even if caching fails
    try {
      return await calculateTeamPoints(teamId, memberIds);
    } catch (calcError) {
      console.error('[TeamPointsCache] Calculation also failed:', calcError);
      // Return safe defaults to prevent crash
      return {
        memberPoints: 0,
        awardPoints: 0,
        total: 0,
        calculatedAt: Date.now(),
        error: true
      };
    }
  }
}

/**
 * Invalidate team points cache
 * Call this whenever team points might have changed
 */
async function invalidateTeamPoints(teamId) {
  if (!teamId) return;
  
  const cacheKey = `team:${teamId}:points`;
  
  try {
    const result = await redisClient.del(cacheKey);
    if (result > 0) {
      console.log(`[TeamPointsCache] Invalidated team ${teamId}`);
    }
  } catch (error) {
    console.error('[TeamPointsCache] Invalidation error:', error);
    // Non-critical error - cache will expire naturally in 30s
  }
}

/**
 * Invalidate multiple teams at once (bulk operation)
 */
async function invalidateMultipleTeams(teamIds) {
  if (!teamIds || teamIds.length === 0) return;

  try {
    const keys = teamIds.map(id => `team:${id}:points`);
    const result = await redisClient.del(...keys);
    console.log(`[TeamPointsCache] Invalidated ${result} team(s) from ${teamIds.length} requested`);
  } catch (error) {
    console.error('[TeamPointsCache] Bulk invalidation error:', error);
  }
}

/**
 * Get cache statistics (for monitoring)
 */
function getCacheStats() {
  const total = cacheHits + cacheMisses;
  const hitRate = total > 0 ? (cacheHits / total * 100).toFixed(2) : '0.00';
  
  return {
    hits: cacheHits,
    misses: cacheMisses,
    errors: cacheErrors,
    total,
    hitRate: `${hitRate}%`,
    ttl: TEAM_POINTS_CACHE_TTL
  };
}

/**
 * Reset cache statistics
 */
function resetCacheStats() {
  cacheHits = 0;
  cacheMisses = 0;
  cacheErrors = 0;
}

module.exports = {
  getTeamPoints,
  invalidateTeamPoints,
  invalidateMultipleTeams,
  getCacheStats,
  resetCacheStats
};
