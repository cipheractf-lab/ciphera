const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const Submission = require('../models/Submission');
const { protect, authorize } = require('../middleware/auth');
const { sanitizeInput, validateInput } = require('../middleware/security');


const requestIp = require('request-ip');
const UAParser = require('ua-parser-js');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const { getRedisClient } = require('../utils/redis');
const { clearScoreboardCache } = require('../utils/redis');
const monitoring = require('../utils/monitoring');
const scoringService = require('../services/scoringService');
const { 
  upload, 
  handleMulterError, 
  calculateSHA1, 
  deleteFile,
  deleteAllChallengeFiles 
} = require('../utils/fileUpload');
// Use centralized Redis for Challenge Rate Limiting
const redisClient = getRedisClient();

// Real-time logging function
const logActivity = (action, details = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] CHALLENGE: ${action}`, details);
};

const config = require('../config');

// Helper function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return id && /^[0-9a-fA-F]{24}$/.test(id);
};

// @route   GET /api/challenges
// @desc    Get all challenges with pagination (filtered by visibility for non-admin users)
// @access  Private (Authentication required - Security fix for Penligent HIGH vulnerability)
router.get('/', protect, sanitizeInput, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // User is guaranteed to exist due to protect middleware
    const user = req.user;

    const query = {};
    // Show all challenges to admins, only visible challenges to others
    const isAdmin = user && user.role === 'admin';

    if (!isAdmin) {
      query.isVisible = true;
    }

    // Get user's solved challenges for stats calculation
    const fullUser = await User.findById(user._id).select('solvedChallenges').lean();
    const userSolvedIds = fullUser?.solvedChallenges || [];

    const total = await Challenge.countDocuments(query);
    const challenges = await Challenge.find(query)
      .select('-flag -createdAt -updatedAt')
      .limit(limit)
      .skip(skip)
      .sort({ _id: -1 })
      .lean(); // Use lean for better performance

    // Add current dynamic value and solved status to each challenge
    const enrichedChallenges = challenges.map(challenge => {
      // current value calculation (single source of truth)
      const solveCount = challenge.solvedBy?.length || 0;
      const currentValue = scoringService.calculateChallengeValue(challenge, solveCount);

      challenge.currentValue = currentValue;
      challenge.isSolved = userSolvedIds.some(id => id.toString() === challenge._id.toString());
      return challenge;
    });

    // Calculate stats
    const solvedCount = enrichedChallenges.filter(c => c.isSolved).length;
    const remainingCount = enrichedChallenges.length - solvedCount;

    const response = {
      success: true,
      count: enrichedChallenges.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: enrichedChallenges,
      stats: {
        solved: solvedCount,
        remaining: remainingCount,
        total: enrichedChallenges.length
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching challenges:', error);
    // Only return error message in development or generic in production
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error fetching challenges'
    });
  }
});

// @route   GET /api/challenges/:id/solves
// @desc    Get users/teams who solved a challenge with timestamps
// @access  Private
router.get('/:id/solves', protect, async (req, res) => {
  try {
    // Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Get submissions for this challenge
    const submissions = await Submission.find({
      challenge: req.params.id,
      isCorrect: true
    })
      .populate('user', 'username team')
      .populate({
        path: 'user',
        populate: {
          path: 'team',
          select: 'name'
        }
      })
      .sort({ submittedAt: 1 })
      .select('user submittedAt')
      .lean();

    // Format the response
    const solves = submissions.map(sub => ({
      username: sub.user?.username || 'Unknown',
      team: sub.user?.team?.name || 'No Team',
      solvedAt: sub.submittedAt
    }));

    res.json({
      success: true,
      data: solves
    });
  } catch (error) {
    console.error('Error fetching solves:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching challenge solves'
    });
  }
});

// NOTE: Hint unlocking has been moved to /api/unlocks endpoint
// The old POST /api/challenges/:id/unlock-hint endpoint has been removed to prevent
// incorrect individual user.points deduction. Hint costs should be deducted from
// team scores via negative awards, NOT from individual user scores.
// Use POST /api/unlocks instead for hint unlocking.

// @route   GET /api/challenges/:id
// @desc    Get single challenge (with hint views)
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    // Validate ObjectId format
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const challenge = await Challenge.findById(req.params.id).select('-flag -createdAt -updatedAt').lean();

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Check visibility and get user context - only admins can access hidden challenges
    const token = req.cookies.token || req.cookies.access_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    let isAdmin = false;
    let userId = null;
    let teamId = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('role').populate('team');
        isAdmin = user && user.role === 'admin';
        
        if (user) {
          userId = user._id;
          teamId = user.team ? user.team._id : null;
        }
      } catch (e) {
        // Invalid token, treat as non-admin
      }
    }
    
    // If challenge is not visible and user is not admin, return 404
    const challengeVisible = challenge.state ? challenge.state === 'visible' : challenge.isVisible;
    if (!challengeVisible && !isAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Get user's unlocked hints from Unlocks table
    let unlockedHints = [];

    if (token && userId) {
      try {
        const Unlock = require('../models/Unlock');

        // Get all unlocks for this challenge
        const query = {
          challenge: req.params.id,
          type: 'hints'
        };

        if (teamId) {
          query.$or = [
            { user: userId },
            { team: teamId }
          ];
        } else {
          query.user = userId;
        }

        console.log('[Challenge GET] Query for unlocks:', JSON.stringify(query, null, 2));

        const unlocks = await Unlock.find(query).select('target user team challenge');
        unlockedHints = unlocks.map(u => u.target);
          
        console.log('[Challenge GET] Unlocked hints check:', {
          userId: userId.toString(),
          teamId: teamId ? teamId.toString() : null,
          challengeId: req.params.id,
          foundUnlocks: unlocks.length,
          unlockDetails: unlocks.map(u => ({
            target: u.target,
            user: u.user.toString(),
            team: u.team ? u.team.toString() : null,
            challenge: u.challenge.toString()
          })),
          unlockedHintIndexes: unlockedHints
        });
      } catch (err) {
        console.error('[Challenge GET] Auth error:', err.message);
        // Token invalid or user not found, continue without unlocked hints
      }
    }

    // Transform hints based on unlock status
    if (challenge.hints && challenge.hints.length > 0) {
      challenge.hints = challenge.hints.map((hint, index) => {
        const isUnlocked = unlockedHints.includes(index);
        const isFree = hint.cost === 0;

        // Return "unlocked" view (with content) or "locked" view (without content)
        if (isUnlocked || isFree) {
          return {
            id: index,
            content: hint.content,
            cost: hint.cost,
            unlocked: true
          };
        } else {
          return {
            id: index,
            cost: hint.cost,
            unlocked: false
            // content intentionally omitted for locked hints
          };
        }
      });
    }

    res.json({
      success: true,
      data: challenge,
      unlockedHints // Still include this for backward compatibility
    });
  } catch (error) {
    console.error('Error fetching challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching challenge'
    });
  }
});

// @route   POST /api/challenges
// @desc    Create a challenge
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('Creating challenge with data:', req.body);

    const payload = { ...req.body };

    // validation for dynamic challenge parameters
    if (payload.function === 'linear' || payload.function === 'logarithmic') {
      for (const attr of ['initial', 'minimum', 'decay']) {
        if (payload[attr] === undefined || payload[attr] === null || payload[attr] === '') {
          return res.status(400).json({
            success: false,
            message: `Missing '${attr}' but function is ${payload.function}`
          });
        }
      }

      // dynamic challenge current value starts at initial
      payload.points = Number(payload.initial);
    }

    const challenge = await Challenge.create(payload);

    // Ensure dynamic challenge value is recalculated through the scoring formula pipeline
    if (challenge.function === 'linear' || challenge.function === 'logarithmic') {
      await scoringService.updateChallengeValue(challenge._id);
    }

    // Invalidate public challenges cache
    try {
      await redisClient.del('challenges:list:public');
    } catch (err) {
      console.error('Cache invalidation error:', err);
    }

    res.status(201).json({
      success: true,
      data: challenge
    });
  } catch (error) {
    console.error('Challenge creation error:', error);
    
    // Handle duplicate key error (MongoDB E11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `A challenge with this ${field} already exists. Please use a different ${field}.`
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating challenge'
    });
  }
});

// @route   POST /api/challenges/:id/submit
// @desc    Submit a flag for a challenge
// @access  Private
router.post('/:id/submit', protect, sanitizeInput, async (req, res) => {
  try {
    const { flag } = req.body;

    // Validate and sanitize flag input
    let submittedFlag;
    try {
      submittedFlag = validateInput.flag(flag);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    // Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Get challenge with flag
    const challenge = await Challenge.findById(req.params.id).select('+flag');
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Get user with team
    const user = await User.findById(req.user._id).populate('team');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: `Your account is blocked. Reason: ${user.blockedReason || 'No reason provided'}`
      });
    }

    if (!user.canSubmitFlags) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to submit flags'
      });
    }

    if (!challenge.submissionsAllowed) {
      return res.status(403).json({
        success: false,
        message: 'Submissions for this challenge are currently blocked'
      });
    }

    // Check if already solved by user OR their team
    let alreadySolved = user.solvedChallenges.some(
      id => id.toString() === challenge._id.toString()
    );

    // If user has a team, check if team has already solved it
    if (!alreadySolved && user.team) {
      const Team = require('../models/Team');
      const team = await Team.findById(user.team._id);
      if (team && team.solvedChallenges.some(id => id.toString() === challenge._id.toString())) {
        alreadySolved = true;
      }
    }

    if (alreadySolved) {
      return res.status(400).json({
        success: false,
        message: 'This challenge has already been solved by you or your team'
      });
    }

    // Get IP and User Agent for tracking
    const clientIp = requestIp.getClientIp(req);
    const userAgent = req.get('User-Agent') || 'Unknown';

    // Check flag using constant-time comparison to prevent timing attacks
    const expectedFlag = challenge.flag.trim();
    const submittedBuffer = Buffer.from(submittedFlag, 'utf8');
    const expectedBuffer = Buffer.from(expectedFlag, 'utf8');

    // Ensure buffers are same length to prevent timing attacks
    const maxLength = Math.max(submittedBuffer.length, expectedBuffer.length);
    const paddedSubmitted = Buffer.alloc(maxLength);
    const paddedExpected = Buffer.alloc(maxLength);

    submittedBuffer.copy(paddedSubmitted);
    expectedBuffer.copy(paddedExpected);

    const isCorrect = crypto.timingSafeEqual(paddedSubmitted, paddedExpected) &&
      submittedFlag.length === expectedFlag.length;

    // Create submission record (both success and failure) - unique index prevents duplicates
    // NO points field, calculated dynamically via JOIN
    try {
      await Submission.create({
        user: req.user._id,
        challenge: challenge._id,
        submittedFlag: submittedFlag,
        isCorrect: isCorrect,
        ipAddress: clientIp,
        userAgent: userAgent
      });
    } catch (err) {
      // If duplicate key error (11000), user already submitted this exact flag
      if (err.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'You have already solved this challenge'
        });
      }
      throw err; // Re-throw other errors
    }

    if (!isCorrect) {
      // Rate limiting is handled by middleware
      // Optionally publish failed attempts for admin monitoring
      try {
        const failedEvent = {
          type: 'failed_attempt',
          user: req.user.username || 'Unknown',
          email: req.user.email,
          challenge: challenge.title,
          challengeId: challenge._id.toString(),
          points: challenge.points,
          submittedAt: new Date().toISOString(),
          ip: clientIp,
          status: 'incorrect',
          submittedFlag: submittedFlag
        };

        console.log('[Real-time] Publishing failed attempt:', failedEvent.user, '->', failedEvent.challenge);

        redisClient.publish('ctf:submissions:live', JSON.stringify(failedEvent))
          .then(subs => console.log(`[Real-time] Failed attempt sent to ${subs} subscriber(s)`))
          .catch(err => console.error('[Non-critical] Redis publish error:', err.message));
      } catch (e) {
        console.error('[Non-critical] Error preparing failed attempt event:', e.message);
      }

      return res.status(400).json({
        success: false,
        message: 'Incorrect flag'
      });
    }

    // Use transaction for atomic operations to prevent race conditions
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // Update solvedBy arrays + user.points for display
        // Scoreboard calculations use dynamic JOIN queries for accurate ranking
        
        // Update user with solve time, track personal solve, and update points
        const userUpdate = await User.findByIdAndUpdate(
          req.user._id,
          {
            $addToSet: {
              solvedChallenges: challenge._id,
              personallySolvedChallenges: {
                challengeId: challenge._id,
                challengeTitle: challenge.title,
                solvedAt: new Date()
              }
            },
            $set: { lastSolveTime: new Date() }
          },
          { session, new: true }
        );

        // Calculate user's total points from all solved challenges (solve component)
        //
        // req.user._id is a plain STRING (middleware/auth.js casts it that way
        // for API-response consistency). Mongoose auto-casts string ids for
        // query-builder methods like findByIdAndUpdate(), but a raw $match in
        // an aggregation pipeline does no such casting -- it would never match
        // the ObjectId-typed `user` field on Submission, so this always
        // returned 0 and every solve silently zeroed the user's points.
        const userIdObj = new mongoose.Types.ObjectId(req.user._id);
        const userSubmissions = await Submission.aggregate([
          { $match: { user: userIdObj, isCorrect: true } },
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
              _id: null,
              totalPoints: { $sum: '$challengeData.points' }
            }
          }
        ]);

        const solvePoints = userSubmissions.length > 0 ? userSubmissions[0].totalPoints : 0;

        // Add user awards (award component)
        const Award = require('../models/Award');
        const userAwards = await Award.aggregate([
          { $match: { user: userIdObj, value: { $ne: 0 } } }, // see userIdObj cast above
          {
            $group: {
              _id: null,
              totalAwardPoints: { $sum: '$value' }
            }
          }
        ]);

        const awardPoints = userAwards.length > 0 ? userAwards[0].totalAwardPoints : 0;
        const totalPoints = solvePoints + awardPoints;
        
        // Update user.points field for display in profile pages
        await User.findByIdAndUpdate(
          req.user._id,
          { $set: { points: totalPoints } },
          { session }
        );

        // Update challenge solvedBy array
        await Challenge.findByIdAndUpdate(
          req.params.id,
          { $addToSet: { solvedBy: req.user._id } },
          { session }
        );

        // For dynamic challenges: Update challenge.points value
        // This automatically updates ALL users' scores (calculated via JOIN)
        if (challenge.function === 'linear' || challenge.function === 'logarithmic') {
          await scoringService.updateChallengeValue(challenge._id);
        }

        // Clear scoreboard cache (the clear_standings() pattern)
        await clearScoreboardCache();

        // If user has a team, update team solvedBy array
        if (user.team) {
          const Team = require('../models/Team');

          // Update the team solvedBy
          await Team.findByIdAndUpdate(
            user.team._id,
            {
              $addToSet: { solvedChallenges: challenge._id }
            },
            { session }
          );

          // Update ALL team members to mark this challenge as solved
          // This prevents other team members from solving it again
          await User.updateMany(
            {
              team: user.team._id,
              _id: { $ne: req.user._id } // Exclude current user (already updated above)
            },
            {
              $addToSet: { solvedChallenges: challenge._id }
            },
            { session }
          );
        }

        // Redis ZSET updates removed - scores calculated dynamically
        // Scoreboard will aggregate from Submissions + Challenges JOINs
      });
      
      // Invalidate team points cache after successful transaction
      if (user.team) {
        const { invalidateTeamPoints } = require('../utils/teamPointsCache');
        await invalidateTeamPoints(user.team._id);
      }
    } finally {
      await session.endSession();
    }

    // Get current challenge value for response
    const updatedChallenge = await Challenge.findById(challenge._id);
    const currentValue = updatedChallenge.getCurrentValue();

    logActivity('FLAG_SUBMITTED_SUCCESS', {
      userId: req.user._id,
      challengeId: challenge._id,
      challengeTitle: challenge.title,
      points: currentValue
    });

    // Publish real-time submission event to admin monitoring
    // CRITICAL: This must NEVER block player submissions
    try {
      const submissionEvent = {
        type: 'submission',
        user: req.user.username || 'Unknown',
        email: req.user.email,
        challenge: challenge.title,
        challengeId: challenge._id.toString(),
        points: currentValue,
        submittedAt: new Date().toISOString(),
        ip: clientIp,
        submittedFlag: submittedFlag
      };

      console.log('[Real-time] Publishing submission event:', submissionEvent.user, '->', submissionEvent.challenge);

      // Fire and forget - don't await, catch errors to prevent blocking
      redisClient.publish('ctf:submissions:live', JSON.stringify(submissionEvent))
        .then(subscribers => {
          console.log(`[Real-time] Event published to ${subscribers} subscriber(s)`);
        })
        .catch(err => {
          // Log error but don't affect player submission
          console.error('[Non-critical] Redis publish error:', err.message);
        });
    } catch (e) {
      // Catch any errors - monitoring failure must not affect players
      console.error('[Non-critical] Error preparing submission event:', e.message);
    }

    res.json({
      success: true,
      message: 'correct',
      points: currentValue,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Challenge submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   DELETE /api/challenges/:id
// @desc    Delete a challenge
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    // Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    await challenge.deleteOne();

    // Invalidate public challenges cache
    try {
      await redisClient.del('challenges:list:public');
    } catch (err) {
      console.error('Cache invalidation error:', err);
    }

    res.json({
      success: true,
      message: 'Challenge deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting challenge'
    });
  }
});

// @route   PUT /api/challenges/:id
// @desc    Update a challenge
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('Update challenge request:', {
      id: req.params.id,
      body: req.body
    });

    // Validate ObjectId format
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // If isVisible is being updated, log the change
    if (req.body.hasOwnProperty('isVisible')) {
      console.log('Updating visibility:', {
        challengeId: challenge._id,
        oldVisibility: challenge.isVisible,
        newVisibility: req.body.isVisible
      });
    }

    const updateData = { ...req.body };

    const incomingFunction = updateData.function !== undefined ? updateData.function : challenge.function;
    const isDynamicFunction = incomingFunction === 'linear' || incomingFunction === 'logarithmic';

    // moving to dynamic requires all dynamic parameters
    if (isDynamicFunction) {
      const nextInitial = updateData.initial !== undefined ? updateData.initial : challenge.initial;
      const nextMinimum = updateData.minimum !== undefined ? updateData.minimum : challenge.minimum;
      const nextDecay = updateData.decay !== undefined ? updateData.decay : challenge.decay;

      if (nextInitial === undefined || nextInitial === null || nextInitial === '') {
        return res.status(400).json({ success: false, message: `Missing 'initial' but function is ${incomingFunction}` });
      }
      if (nextMinimum === undefined || nextMinimum === null || nextMinimum === '') {
        return res.status(400).json({ success: false, message: `Missing 'minimum' but function is ${incomingFunction}` });
      }
      if (nextDecay === undefined || nextDecay === null || nextDecay === '') {
        return res.status(400).json({ success: false, message: `Missing 'decay' but function is ${incomingFunction}` });
      }

      // manual value/points override should be ignored for dynamic updates
      delete updateData.points;
    }

    const updatedChallenge = await Challenge.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    // Recalculate dynamic value from formula after update
    if (updatedChallenge.function === 'linear' || updatedChallenge.function === 'logarithmic') {
      await scoringService.updateChallengeValue(updatedChallenge._id);
    }

    console.log('Challenge updated successfully:', {
      challengeId: updatedChallenge._id,
      isVisible: updatedChallenge.isVisible
    });

    // Invalidate public challenges cache
    try {
      await redisClient.del('challenges:list:public');
    } catch (err) {
      console.error('Cache invalidation error:', err);
    }

    res.json({
      success: true,
      data: updatedChallenge
    });
  } catch (error) {
    console.error('Error updating challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating challenge'
    });
  }
});

// ==================== FILE UPLOAD ROUTES ====================

// Upload files to a challenge (Admin only)
router.post(
  '/:challengeId/files',
  protect,
  authorize('admin'),
  upload.array('files', 10), // Max 10 files
  handleMulterError,
  async (req, res) => {
    try {
      const { challengeId } = req.params;

      if (!isValidObjectId(challengeId)) {
        // Clean up uploaded files for invalid challenge ID
        if (req.files) {
          for (const file of req.files) {
            await deleteFile(file.path).catch(console.error);
          }
        }
        return res.status(400).json({
          success: false,
          message: 'Invalid challenge ID'
        });
      }

      const challenge = await Challenge.findById(challengeId);

      if (!challenge) {
        // Clean up uploaded files if challenge not found
        if (req.files) {
          for (const file of req.files) {
            await deleteFile(file.path).catch(console.error);
          }
        }
        return res.status(404).json({
          success: false,
          message: 'Challenge not found'
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      // Process uploaded files
      const fileMetadata = [];
      
      for (const file of req.files) {
        try {
          // Calculate SHA-1 hash
          const sha1sum = await calculateSHA1(file.path);

          fileMetadata.push({
            filename: file.filename,
            originalName: file.originalname,
            path: `/uploads/challenges/${challengeId}/${file.filename}`,
            size: file.size,
            mimetype: file.mimetype,
            sha1sum: sha1sum,
            uploadedAt: new Date()
          });

          logActivity('FILE_UPLOADED', {
            challengeId,
            filename: file.originalname,
            size: file.size,
            admin: req.user.username
          });
        } catch (error) {
          console.error('Error processing file:', error);
          // Clean up file if processing failed
          await deleteFile(file.path).catch(console.error);
        }
      }

      // Add files to challenge
      challenge.files = challenge.files || [];
      challenge.files.push(...fileMetadata);
      await challenge.save();

      res.status(200).json({
        success: true,
        message: `${fileMetadata.length} file(s) uploaded successfully`,
        data: {
          files: fileMetadata
        }
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      
      // Clean up uploaded files on error
      if (req.files) {
        for (const file of req.files) {
          await deleteFile(file.path).catch(console.error);
        }
      }
      
      res.status(500).json({
        success: false,
        message: 'Error uploading files'
      });
    }
  }
);

// Get files for a challenge (Admin only)
router.get(
  '/:challengeId/files',
  protect,
  authorize('admin'),
  async (req, res) => {
    try {
      const { challengeId } = req.params;

      if (!isValidObjectId(challengeId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid challenge ID'
        });
      }

      const challenge = await Challenge.findById(challengeId);

      if (!challenge) {
        return res.status(404).json({
          success: false,
          message: 'Challenge not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          files: challenge.files || []
        }
      });
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching files'
      });
    }
  }
);

// Delete a specific file from a challenge (Admin only)
router.delete(
  '/:challengeId/files/:filename',
  protect,
  authorize('admin'),
  async (req, res) => {
    try {
      const { challengeId } = req.params;
      const filename = decodeURIComponent(req.params.filename || '');

      if (!isValidObjectId(challengeId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid challenge ID'
        });
      }

      const challenge = await Challenge.findById(challengeId);

      if (!challenge) {
        return res.status(404).json({
          success: false,
          message: 'Challenge not found'
        });
      }

      // Find file in challenge
      const fileIndex = challenge.files.findIndex(f => f.filename === filename);

      if (fileIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      const file = challenge.files[fileIndex];
      const normalizedPath = (file.path || '').replace(/^\/+/, '');
      const filePath = path.join(__dirname, '..', normalizedPath);

      // Delete physical file
      await deleteFile(filePath);

      // Remove from database
      challenge.files.splice(fileIndex, 1);
      await challenge.save();

      logActivity('FILE_DELETED', {
        challengeId,
        filename: file.originalName,
        admin: req.user.username
      });

      res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting file'
      });
    }
  }
);

// Download challenge file (Authenticated users only)
router.get(
  '/:challengeId/download/:filename',
  protect,
  async (req, res) => {
    try {
      const { challengeId } = req.params;
      const filename = decodeURIComponent(req.params.filename || '');

      if (!isValidObjectId(challengeId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid challenge ID'
        });
      }

      const challenge = await Challenge.findById(challengeId);

      if (!challenge) {
        return res.status(404).json({
          success: false,
          message: 'Challenge not found'
        });
      }

      // Check if challenge is visible (unless admin)
      if (challenge.state !== 'visible' && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Challenge is not accessible'
        });
      }

      // Find file
      const file = challenge.files.find(f => f.filename === filename);

      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      const normalizedPath = (file.path || '').replace(/^\/+/, '');
      const filePath = path.join(__dirname, '..', normalizedPath);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found on server'
        });
      }

      // Log download
      logActivity('FILE_DOWNLOADED', {
        challengeId,
        filename: file.originalName,
        user: req.user.username,
        ip: requestIp.getClientIp(req)
      });

      // Set headers to force download and prevent execution
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Length', file.size);

      // Stream file to response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error downloading file'
          });
        }
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Error downloading file'
        });
      }
    }
  }
);

module.exports = router;
