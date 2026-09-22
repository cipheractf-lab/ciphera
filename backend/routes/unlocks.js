const express = require('express');
const router = express.Router();
const Unlock = require('../models/Unlock');
const User = require('../models/User');
const Team = require('../models/Team');
const Challenge = require('../models/Challenge');
const { protect } = require('../middleware/auth');

/**
 * Unlocks API
 * POST /api/unlocks - Create an unlock (unlock a hint)
 * GET /api/unlocks - Get user's unlocks (admin only)
 */

// @route   POST /api/unlocks
// @desc    Unlock a hint by spending points
// @access  Private
router.post('/', protect, async (req, res) => {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  
  try {
    const { target, type, challenge: challengeId } = req.body;
    const userId = req.user._id || req.user.id;

    console.log('[Unlock] Request:', { userId, challengeId, target, type });

    // Validate required fields
    if (type !== 'hints') {
      await session.endSession();
      return res.status(400).json({
        success: false,
        errors: { type: 'Only hints are supported for unlocking' }
      });
    }

    if (target === undefined || target < 0) {
      await session.endSession();
      return res.status(400).json({
        success: false,
        errors: { target: 'Invalid target (hint index)' }
      });
    }

    if (!challengeId) {
      await session.endSession();
      return res.status(400).json({
        success: false,
        errors: { challenge: 'Challenge ID is required' }
      });
    }

    // Get challenge
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      await session.endSession();
      return res.status(404).json({
        success: false,
        errors: { challenge: 'Challenge not found' }
      });
    }

    // Check if hint exists
    if (!challenge.hints || !challenge.hints[target]) {
      await session.endSession();
      return res.status(404).json({
        success: false,
        errors: { target: 'Hint not found' }
      });
    }

    const hint = challenge.hints[target];

    // Get user with team info
    const user = await User.findById(userId).populate('team');
    if (!user) {
      await session.endSession();
      return res.status(404).json({
        success: false,
        errors: { user: 'User not found' }
      });
    }

    let unlock;
    let teamData = null;

    await session.withTransaction(async () => {
      // Check for existing unlock (prevent double unlock) - inside transaction
      const query = {
        challenge: challengeId,
        target: target,
        type: 'hints'
      };

      if (user.team) {
        // In team mode, check if either user or team has unlocked
        query.$or = [
          { user: userId },
          { team: user.team._id }
        ];
      } else {
        query.user = userId;
      }

      const existingUnlock = await Unlock.findOne(query).session(session);
      if (existingUnlock) {
        throw new Error("You've already unlocked this target");
      }

      // Calculate available points (team or individual)
      let availablePoints = user.points;

      if (user.team) {
        const team = await Team.findById(user.team._id).populate('members', '_id').session(session);
        if (team) {
          teamData = team;
          
          // Calculate member points dynamically from submissions
          const Submission = require('../models/Submission');
          const memberIds = team.members.map(m => m._id);
          
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
          ]).session(session);
          
          // Sum all member points
          const memberPoints = memberPointsAgg.reduce((sum, item) => sum + item.totalPoints, 0);
          
          // Get team awards (includes hint unlock deductions as negative awards)
          const Award = require('../models/Award');
          const awards = await Award.find({ team: team._id }).select('value').session(session);
          const awardPoints = awards.reduce((sum, award) => sum + (award.value || 0), 0);
          
          availablePoints = Math.max(0, memberPoints + awardPoints);
          
          console.log('[Unlock] Team points calculation:', {
            memberCount: memberIds.length,
            memberPoints,
            awardPoints,
            totalAvailable: availablePoints
          });
        }
      }

      console.log('[Unlock] Points check:', { 
        required: hint.cost, 
        available: availablePoints, 
        isTeam: !!teamData 
      });

      // Check if enough points
      if (availablePoints < hint.cost) {
        throw new Error('You do not have enough points to unlock this hint');
      }

      // Create unlock record within transaction
      const unlockDoc = await Unlock.create([{
        user: userId,
        team: user.team ? user.team._id : null,
        challenge: challengeId,
        target: target,
        type: 'hints'
      }], { session });
      
      unlock = unlockDoc[0];

      // Deduct cost from TEAM score (not individual user) - within transaction
      if (hint.cost > 0 && teamData) {
        const Award = require('../models/Award');
        
        await Award.create([{
          team: teamData._id,
          user: null, // Team award, not user award
          name: `Hint Unlock: ${challenge.title}`,
          description: `Hint #${target + 1} unlocked by ${user.username}`,
          value: -hint.cost, // NEGATIVE value to deduct points
          category: 'hints',
          icon: 'hint'
        }], { session });

        console.log('[Unlock] Team award created:', { 
          team: teamData.name,
          cost: hint.cost,
          unlockedBy: user.username
        });
      }
    });

    await session.endSession();
    
    // Invalidate team points cache after successful transaction
    if (teamData) {
      const { invalidateTeamPoints } = require('../utils/teamPointsCache');
      await invalidateTeamPoints(teamData._id);
    }

    console.log('[Unlock] Success:', { 
      hintIndex: target, 
      cost: hint.cost,
      teamMode: !!teamData,
      unlockedBy: user.username
    });

    // Return response
    res.json({
      success: true,
      data: {
        id: unlock._id,
        user_id: unlock.user,
        team_id: unlock.team,
        target: unlock.target,
        type: unlock.type,
        date: unlock.date
      }
    });
  } catch (error) {
    await session.endSession();
    console.error('[Unlock] Error:', error);
    
    // Handle duplicate key error (race condition)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        errors: { target: "You've already unlocked this target" }
      });
    }

    // Handle custom error messages from transaction
    if (error.message.includes('already unlocked') || error.message.includes('not have enough points')) {
      return res.status(400).json({
        success: false,
        errors: { target: error.message }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/unlocks
// @desc    Get all unlocks for current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).populate('team');

    const query = { type: 'hints' };

    if (user.team) {
      query.$or = [
        { user: userId },
        { team: user.team._id }
      ];
    } else {
      query.user = userId;
    }

    const unlocks = await Unlock.find(query)
      .populate('challenge', 'title category')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: unlocks.map(unlock => ({
        id: unlock._id,
        target: unlock.target,
        type: unlock.type,
        date: unlock.date,
        challenge: unlock.challenge
      }))
    });
  } catch (error) {
    console.error('[Unlock] Get error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
