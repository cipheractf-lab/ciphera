const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Team = require('../models/Team');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { getRedisClient } = require('../utils/redis');

const redisClient = getRedisClient();

/**
 * Admin Team Management Endpoints
 * Provides comprehensive team editing capabilities including:
 * - Change team member passwords
 * - Add/remove team members
 * - Block/unblock entire team
 * - Update team details
 */

// @route   PUT /api/admin/teams/:teamId/member/:userId/password
// @desc    Change password for a team member (Admin only)
// @access  Private/Admin
router.put('/:teamId/member/:userId/password', protect, authorize('admin'), async (req, res) => {
  try {
    const { teamId, userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Verify team exists
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Verify user exists and is in the team
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!team.members.some(memberId => memberId.toString() === userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is not a member of this team'
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    // Revoke all refresh tokens for security
    const refreshTokenUtils = require('../utils/refreshToken');
    await refreshTokenUtils.revokeAllUserTokens(user._id, 'password_changed_by_admin');

    // Clear Redis cache
    await redisClient.del(`user:${user._id}`);
    
    // No need to invalidate team points cache - password change doesn't affect points

    console.log(`[Admin] Password changed for user ${user.username} by admin ${req.user.username}`);

    res.json({
      success: true,
      message: `Password changed successfully for ${user.username}`
    });
  } catch (error) {
    console.error('Admin password change error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error changing password'
    });
  }
});

// @route   PUT /api/admin/teams/:teamId/members/add
// @desc    Add a new member to a team (Admin only)
// @access  Private/Admin
router.put('/:teamId/members/add', protect, authorize('admin'), async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const { teamId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    let updatedTeam;
    await session.withTransaction(async () => {
      // Get team with session
      const team = await Team.findById(teamId).session(session);
      if (!team) {
        throw new Error('Team not found');
      }

      // Check max members
      const MAX_TEAM_MEMBERS = parseInt(process.env.MAX_TEAM_MEMBERS) || 2;
      if (team.members.length >= MAX_TEAM_MEMBERS) {
        throw new Error(`Team already has maximum ${MAX_TEAM_MEMBERS} members`);
      }

      // Verify user exists and is not in a team
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.team) {
        throw new Error('User is already in a team');
      }

      // Add member to team
      team.members.push(userId);
      await team.save({ session });

      // Update user's team
      user.team = teamId;
      await user.save({ session });

      updatedTeam = team;
    });

    await session.endSession();

    // Populate and return
    await updatedTeam.populate('members captain createdBy');
    
    // Invalidate team points cache since team composition changed
    const { invalidateTeamPoints } = require('../utils/teamPointsCache');
    await invalidateTeamPoints(teamId);

    console.log(`[Admin] User ${userId} added to team ${teamId} by admin ${req.user.username}`);

    res.json({
      success: true,
      message: 'Member added successfully',
      data: updatedTeam
    });
  } catch (error) {
    await session.endSession();
    console.error('Add member error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error adding member'
    });
  }
});

// @route   PUT /api/admin/teams/:teamId/members/remove
// @desc    Remove a member from a team (Admin only)
// @access  Private/Admin
router.put('/:teamId/members/remove', protect, authorize('admin'), async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const { teamId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    let updatedTeam;
    await session.withTransaction(async () => {
      // Get team with session
      const team = await Team.findById(teamId).session(session);
      if (!team) {
        throw new Error('Team not found');
      }

      // Check if user is in team
      const memberIndex = team.members.findIndex(id => id.toString() === userId);
      if (memberIndex === -1) {
        throw new Error('User is not a member of this team');
      }

      // Remove member from team
      team.members.splice(memberIndex, 1);

      // If removed user was captain, unset captain
      if (team.captain && team.captain.toString() === userId) {
        team.captain = null;
      }

      await team.save({ session });

      // Update user's team
      const user = await User.findById(userId).session(session);
      if (user) {
        user.team = null;
        await user.save({ session });
      }

      updatedTeam = team;
    });

    await session.endSession();

    // Populate and return
    await updatedTeam.populate('members captain createdBy');
    
    // Invalidate team points cache since team composition changed
    const { invalidateTeamPoints } = require('../utils/teamPointsCache');
    await invalidateTeamPoints(teamId);

    console.log(`[Admin] User ${userId} removed from team ${teamId} by admin ${req.user.username}`);

    res.json({
      success: true,
      message: 'Member removed successfully',
      data: updatedTeam
    });
  } catch (error) {
    await session.endSession();
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error removing member'
    });
  }
});

// @route   PUT /api/admin/teams/:teamId/block
// @desc    Block/unblock an entire team (Admin only)
// @access  Private/Admin
router.put('/:teamId/block', protect, authorize('admin'), async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    const { teamId } = req.params;
    const { isBlocked, blockedReason } = req.body;

    if (typeof isBlocked !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isBlocked must be a boolean'
      });
    }

    let updatedTeam;
    await session.withTransaction(async () => {
      // Get team with session
      const team = await Team.findById(teamId).populate('members').session(session);
      if (!team) {
        throw new Error('Team not found');
      }

      // Update team blocked status
      team.isBlocked = isBlocked;
      team.banned = isBlocked;
      team.blockedReason = isBlocked ? (blockedReason || 'Blocked by admin') : null;
      team.blockedAt = isBlocked ? new Date() : null;
      await team.save({ session });

      // Update all team members
      const memberIds = team.members.map(m => m._id || m);
      await User.updateMany(
        { _id: { $in: memberIds } },
        {
          isBlocked: isBlocked,
          banned: isBlocked,
          blockedReason: isBlocked ? (blockedReason || 'Team blocked by admin') : null,
          blockedAt: isBlocked ? new Date() : null
        },
        { session }
      );

      // Clear Redis cache for all members
      for (const memberId of memberIds) {
        await redisClient.del(`user:${memberId.toString()}`);
      }

      updatedTeam = team;
    });

    await session.endSession();
    
    // No need to invalidate team points cache - blocking doesn't change points

    console.log(`[Admin] Team ${teamId} ${isBlocked ? 'blocked' : 'unblocked'} by admin ${req.user.username}`);

    res.json({
      success: true,
      message: `Team ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      data: {
        teamId: updatedTeam._id,
        name: updatedTeam.name,
        isBlocked: updatedTeam.isBlocked,
        blockedReason: updatedTeam.blockedReason,
        memberCount: updatedTeam.members.length
      }
    });
  } catch (error) {
    await session.endSession();
    console.error('Team block/unblock error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating team status'
    });
  }
});

// @route   PUT /api/admin/teams/:teamId
// @desc    Update team details (name, description, captain) (Admin only)
// @access  Private/Admin
router.put('/:teamId', protect, authorize('admin'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, description, captain } = req.body;

    const team = await Team.findById(teamId).populate('members');
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Update fields if provided
    if (name !== undefined) team.name = name;
    if (description !== undefined) team.description = description;
    
    // Validate captain if provided
    if (captain !== undefined) {
      if (captain === null) {
        team.captain = null;
      } else {
        const isMember = team.members.some(m => m._id.toString() === captain);
        if (!isMember) {
          return res.status(400).json({
            success: false,
            message: 'Captain must be a team member'
          });
        }
        team.captain = captain;
      }
    }

    await team.save();
    await team.populate('members captain createdBy');

    console.log(`[Admin] Team ${teamId} updated by admin ${req.user.username}`);

    res.json({
      success: true,
      message: 'Team updated successfully',
      data: team
    });
  } catch (error) {
    console.error('Team update error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error updating team'
    });
  }
});

// @route   GET /api/admin/teams/:teamId
// @desc    Get detailed team information (Admin only)
// @access  Private/Admin
router.get('/:teamId', protect, authorize('admin'), async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId)
      .populate('members', 'username email points solvedChallenges isBlocked blockedReason')
      .populate('captain', 'username email')
      .populate('createdBy', 'username');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team'
    });
  }
});

module.exports = router;
