const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');
const Team = require('../models/Team');
const Challenge = require('../models/Challenge');
const Submission = require('../models/Submission');
const Hint = require('../models/Challenge'); // Hints are part of Challenge schema
const Notice = require('../models/Notice');
const LoginLog = require('../models/LoginLog');
const Newsletter = require('../models/Newsletter');
const Blog = require('../models/Blog');
const Tutorial = require('../models/Tutorial');
const Contact = require('../models/Contact');
const RegistrationStatus = require('../models/RegistrationStatus');

// Secret code for reset operations - must be set explicitly, no default.
// A hardcoded fallback here would let anyone who reads the source code
// trigger a full platform data wipe.
const RESET_SECRET_CODE = process.env.RESET_SECRET_CODE || null;

/**
 * Validates the security code for reset operations.
 * Fails closed if RESET_SECRET_CODE is not configured, and uses a
 * constant-time comparison so response timing can't leak the secret.
 */
const validateSecurityCode = (providedCode) => {
  if (!RESET_SECRET_CODE) {
    throw new Error('RESET_SECRET_CODE not configured in environment');
  }
  if (typeof providedCode !== 'string' || !providedCode) {
    return false;
  }

  const expected = Buffer.from(RESET_SECRET_CODE, 'utf8');
  const provided = Buffer.from(providedCode, 'utf8');

  if (expected.length !== provided.length) {
    // timingSafeEqual requires equal-length buffers; a length mismatch
    // is itself a safe, immediate "no match".
    return false;
  }

  return crypto.timingSafeEqual(expected, provided);
};

/**
 * Full Platform Reset - Deletes ALL data except admin accounts
 * This resets the platform to a fresh install state
 * 
 * Preserves:
 * - Admin accounts
 * 
 * Deletes:
 * - All regular users
 * - All teams
 * - All challenges
 * - All submissions
 * - All notices
 * - All blogs
 * - All tutorials
 * - All contacts
 * - All newsletters
 * - All login logs
 * - All competitions
 * - All events
 * - All registration status records
 */
const fullPlatformReset = async (adminId, securityCode) => {
  // Validate security code
  if (!validateSecurityCode(securityCode)) {
    throw new Error('Invalid security code');
  }

  const session = await mongoose.startSession();
  
  try {
    await session.startTransaction();

    // Delete all regular users (preserve admins)
    const userDeleteResult = await User.deleteMany(
      { role: { $nin: ['admin'] } },
      { session }
    );

    // Delete all teams
    const teamDeleteResult = await Team.deleteMany({}, { session });

    // Delete all challenges
    const challengeDeleteResult = await Challenge.deleteMany({}, { session });

    // Delete all submissions
    const submissionDeleteResult = await Submission.deleteMany({}, { session });

    // Delete all notices
    const noticeDeleteResult = await Notice.deleteMany({}, { session });

    // Delete all blogs
    const blogDeleteResult = await Blog.deleteMany({}, { session });

    // Delete all tutorials
    const tutorialDeleteResult = await Tutorial.deleteMany({}, { session });

    // Delete all contacts
    const contactDeleteResult = await Contact.deleteMany({}, { session });

    // Delete all newsletter subscriptions
    const newsletterDeleteResult = await Newsletter.deleteMany({}, { session });

    // Delete all login logs
    const loginLogDeleteResult = await LoginLog.deleteMany({}, { session });

    // Delete all registration status records
    const registrationDeleteResult = await RegistrationStatus.deleteMany({}, { session });

    // Reset admin accounts' solved challenges and points (keep the accounts)
    await User.updateMany(
      { role: { $in: ['admin'] } },
      {
        $set: {
          points: 0,
          solvedChallenges: [],
          lastSolveTime: null
        }
      },
      { session }
    );

    await session.commitTransaction();

    const stats = {
      usersDeleted: userDeleteResult.deletedCount,
      teamsDeleted: teamDeleteResult.deletedCount,
      challengesDeleted: challengeDeleteResult.deletedCount,
      submissionsDeleted: submissionDeleteResult.deletedCount,
      noticesDeleted: noticeDeleteResult.deletedCount,
      blogsDeleted: blogDeleteResult.deletedCount,
      tutorialsDeleted: tutorialDeleteResult.deletedCount,
      contactsDeleted: contactDeleteResult.deletedCount,
      newslettersDeleted: newsletterDeleteResult.deletedCount,
      loginLogsDeleted: loginLogDeleteResult.deletedCount,
      registrationsDeleted: registrationDeleteResult.deletedCount,
      adminId: adminId,
      timestamp: new Date()
    };

    console.log('Full platform reset completed:', stats);
    return stats;

  } catch (error) {
    await session.abortTransaction();
    console.error('Full platform reset failed:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Competition Progress Reset - Resets competition progress only
 * 
 * Preserves:
 * - All users (including regular users and admins)
 * - All teams (but resets their scores)
 * - All challenges (but clears solved status)
 * - All notices, blogs, tutorials, etc.
 * 
 * Resets/Deletes:
 * - User points and solved challenges
 * - Team points and solved challenges
 * - All submissions
 * - Challenge solved status
 * - Unlocked hints (challenges reset to locked state)
 */
const competitionProgressReset = async (adminId, securityCode) => {
  // Validate security code
  if (!validateSecurityCode(securityCode)) {
    throw new Error('Invalid security code');
  }

  const session = await mongoose.startSession();
  
  try {
    await session.startTransaction();

    // Reset all user points and solved challenges
    const userUpdateResult = await User.updateMany(
      {},
      {
        $set: {
          points: 0,
          solvedChallenges: [],
          personallySolvedChallenges: [],
          unlockedHints: [],
          lastSolveTime: null
        }
      },
      { session }
    );

    // Reset all team points and solved challenges
    const teamUpdateResult = await Team.updateMany(
      {},
      {
        $set: {
          points: 0,
          solvedChallenges: []
        }
      },
      { session }
    );

    // Clear solvedBy arrays from all challenges and reset hints to locked
    const challengeUpdateResult = await Challenge.updateMany(
      {},
      {
        $set: {
          solvedBy: [],
          'hints.$[].unlockedBy': [] // Reset all hints to locked state
        }
      },
      { session }
    );

    // Delete all submissions
    const submissionDeleteResult = await Submission.deleteMany({}, { session });

    await session.commitTransaction();

    const stats = {
      usersReset: userUpdateResult.modifiedCount,
      teamsReset: teamUpdateResult.modifiedCount,
      challengesReset: challengeUpdateResult.modifiedCount,
      submissionsDeleted: submissionDeleteResult.deletedCount,
      adminId: adminId,
      timestamp: new Date()
    };

    console.log('Competition progress reset completed:', stats);
    return stats;

  } catch (error) {
    await session.abortTransaction();
    console.error('Competition progress reset failed:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  fullPlatformReset,
  competitionProgressReset,
  validateSecurityCode,
  RESET_SECRET_CODE
};
