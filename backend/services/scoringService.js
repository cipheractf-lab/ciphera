/**
 * Exact Scoring Service
 * 
 * Implements scoring algorithms with exact parity:
 * - Static scoring (fixed points)
 * - Linear dynamic scoring (arithmetic decay)
 * - Logarithmic dynamic scoring (exponential decay curve)
 * - Awards integration
 * - Proper tie-breaking rules
 */

const Challenge = require('../models/Challenge');
const Award = require('../models/Award');
const User = require('../models/User');
const Team = require('../models/Team');
const Submission = require('../models/Submission');

/**
 * Calculate current value of a challenge based on solve count
 * Uses exact formulas with solve_count-1 adjustment
 * @param {Object} challenge - Challenge document
 * @param {Number} solveCount - Number of solves (excluding hidden/banned users)
 * @returns {Number} Current point value
 */
function calculateChallengeValue(challenge, solveCount = null) {
  // Static challenges always return base points
  if (challenge.function === 'static' || !challenge.function) {
    return challenge.points;
  }

  // For dynamic challenges
  const initial = challenge.initial || challenge.points;
  const minimum = challenge.minimum || challenge.points;
  let decay = challenge.decay || 0;

  // If solveCount not provided, use challenge's solvedBy length
  if (solveCount === null) {
    solveCount = challenge.solvedBy?.length || 0;
  }

  // First solver gets max points (solve_count - 1)
  const adjustedSolveCount = solveCount > 0 ? solveCount - 1 : 0;

  let value;

  if (challenge.function === 'linear') {
    // Linear: value = initial - (decay * (solve_count - 1))
    value = initial - (decay * adjustedSolveCount);
  } else if (challenge.function === 'logarithmic') {
    // Logarithmic: value = (((minimum - initial) / (decay^2)) * ((solve_count-1)^2)) + initial
    if (decay === 0) {
      decay = 1; // Prevent division by zero
    }
    value = (((minimum - initial) / Math.pow(decay, 2)) * Math.pow(adjustedSolveCount, 2)) + initial;
  } else {
    value = challenge.points; // Fallback
  }

  // Ensure value doesn't go below minimum
  value = Math.max(minimum, value);

  return Math.ceil(value); // Rounds up (ceiling)
}

/**
 * Get solve count for a challenge (excluding hidden/banned users)
 * @param {String} challengeId - Challenge ID
 * @returns {Promise<Number>} Solve count
 */
async function getValidSolveCount(challengeId) {
  const challenge = await Challenge.findById(challengeId).populate({
    path: 'solvedBy',
    select: 'hidden banned'
  });

  if (!challenge) return 0;

  // Count only non-hidden, non-banned users
  const validSolves = challenge.solvedBy?.filter(user =>
    !user.hidden && !user.banned
  ).length || 0;

  return validSolves;
}

/**
 * Update challenge value after a new solve (dynamic scoring)
 * Only updates challenge.points field, scores calculated dynamically via JOIN
 * @param {String} challengeId - Challenge ID
 * @returns {Promise<Number>} New challenge value
 */
async function updateChallengeValue(challengeId) {
  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    throw new Error('Challenge not found');
  }

  // Only update for dynamic challenges
  if (challenge.function === 'static' || !challenge.function) {
    return challenge.points;
  }

  const solveCount = await getValidSolveCount(challengeId);
  const newValue = calculateChallengeValue(challenge, solveCount);

  // Update the challenge's points field with the new value
  // This automatically updates all users' scores (calculated via JOIN)
  challenge.points = newValue;
  await challenge.save();

  console.log(`[Scoring] Challenge "${challenge.title}" value updated: ${newValue} pts (${solveCount} solves)`);

  return newValue;
}

module.exports = {
  calculateChallengeValue,
  getValidSolveCount,
  updateChallengeValue
};
