const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  fullPlatformReset,
  competitionProgressReset
} = require('../services/resetService');
const { clearRedisCache } = require('../utils/redis');

/**
 * @route   POST /api/admin/reset/full-platform
 * @desc    Perform full platform reset - deletes all data except admin accounts
 * @access  Private/Admin
 * @body    { securityCode: string }
 */
router.post('/full-platform', protect, authorize('admin'), async (req, res) => {
  try {
    const { securityCode } = req.body;

    if (!securityCode) {
      return res.status(400).json({
        success: false,
        message: 'Security code is required'
      });
    }

    // Perform full platform reset
    const stats = await fullPlatformReset(req.user._id, securityCode);

    // Clear Redis cache (PM2-safe, worker 0 only)
    await clearRedisCache();

    res.json({
      success: true,
      message: 'Full platform reset completed successfully',
      stats: {
        usersDeleted: stats.usersDeleted,
        teamsDeleted: stats.teamsDeleted,
        challengesDeleted: stats.challengesDeleted,
        submissionsDeleted: stats.submissionsDeleted,
        totalRecordsDeleted: stats.usersDeleted + stats.teamsDeleted + 
                            stats.challengesDeleted + stats.submissionsDeleted +
                            stats.noticesDeleted + stats.blogsDeleted +
                            stats.tutorialsDeleted + stats.contactsDeleted +
                            stats.newslettersDeleted + stats.loginLogsDeleted +
                            stats.competitionsDeleted + stats.timersDeleted +
                            stats.eventsDeleted + stats.eventParticipationsDeleted +
                            stats.eventStatesDeleted + stats.registrationsDeleted
      }
    });

  } catch (error) {
    console.error('Full platform reset error:', error);
    
    if (error.message === 'Invalid security code') {
      return res.status(403).json({
        success: false,
        message: 'Invalid security code'
      });
    }

    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? `Reset failed: ${error.message}`
        : 'Platform reset failed. Please try again.'
    });
  }
});

/**
 * @route   POST /api/admin/reset/competition-progress
 * @desc    Reset competition progress - clears scores and submissions but keeps users/challenges
 * @access  Private/Admin
 * @body    { securityCode: string }
 */
router.post('/competition-progress', protect, authorize('admin'), async (req, res) => {
  try {
    const { securityCode } = req.body;

    if (!securityCode) {
      return res.status(400).json({
        success: false,
        message: 'Security code is required'
      });
    }

    // Perform competition progress reset
    const stats = await competitionProgressReset(req.user._id, securityCode);

    // Clear Redis cache (PM2-safe, worker 0 only)
    await clearRedisCache();

    res.json({
      success: true,
      message: 'Competition progress reset completed successfully',
      stats: {
        usersReset: stats.usersReset,
        teamsReset: stats.teamsReset,
        challengesReset: stats.challengesReset,
        submissionsDeleted: stats.submissionsDeleted,
        timersReset: stats.timersReset
      }
    });

  } catch (error) {
    console.error('Competition progress reset error:', error);
    
    if (error.message === 'Invalid security code') {
      return res.status(403).json({
        success: false,
        message: 'Invalid security code'
      });
    }

    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development'
        ? `Reset failed: ${error.message}`
        : 'Competition reset failed. Please try again.'
    });
  }
});

module.exports = router;
