const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Challenge = require('../models/Challenge');
const { protect, authorize } = require('../middleware/auth');
const { getCacheStats } = require('../utils/teamPointsCache');

// @route   GET /api/analytics/cache-stats
// @desc    Get cache performance statistics
// @access  Private/Admin
router.get('/cache-stats', protect, authorize('admin'), async (req, res) => {
  try {
    const teamPointsCacheStats = getCacheStats();
    
    res.json({
      success: true,
      data: {
        teamPointsCache: teamPointsCacheStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cache statistics'
    });
  }
});

// @route   GET /api/analytics/overview
// @desc    Get platform overview metrics
// @access  Private/Admin
router.get('/overview', protect, authorize('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const blockedUsers = await User.countDocuments({ isBlocked: true });
    const totalChallenges = await Challenge.countDocuments();
    const visibleChallenges = await Challenge.countDocuments({ isVisible: true });

    const allUsers = await User.find().select('solvedChallenges points createdAt');
    const totalSubmissions = allUsers.reduce((sum, user) => sum + (user.solvedChallenges?.length || 0), 0);
    const totalPoints = allUsers.reduce((sum, user) => sum + (user.points || 0), 0);
    const avgPointsPerUser = totalUsers > 0 ? (totalPoints / totalUsers).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          admins: adminUsers,
          blocked: blockedUsers
        },
        challenges: {
          total: totalChallenges,
          visible: visibleChallenges,
          hidden: totalChallenges - visibleChallenges
        },
        submissions: {
          total: totalSubmissions,
          avgPerUser: avgPointsPerUser,
          totalPoints: totalPoints
        }
      }
    });
  } catch (err) {
    console.error('Error fetching analytics overview:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// @route   GET /api/analytics/user-engagement
// @desc    Get user engagement metrics
// @access  Private/Admin
router.get('/user-engagement', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find()
      .select('username createdAt solvedChallenges points isBlocked')
      .sort({ createdAt: -1 });

    const engagementData = users.map(user => ({
      username: user.username,
      joinedDate: user.createdAt,
      challengesSolved: user.solvedChallenges?.length || 0,
      points: user.points || 0,
      isActive: !user.isBlocked,
      daysActive: Math.floor((Date.now() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))
    }));

    const engagement = {
      highEngagement: engagementData.filter(u => u.challengesSolved >= 5 && u.isActive).length,
      mediumEngagement: engagementData.filter(u => u.challengesSolved >= 2 && u.challengesSolved < 5 && u.isActive).length,
      lowEngagement: engagementData.filter(u => u.challengesSolved < 2 && u.isActive).length,
      inactive: engagementData.filter(u => !u.isActive).length
    };

    res.json({
      success: true,
      data: {
        summary: engagement,
        users: engagementData
      }
    });
  } catch (err) {
    console.error('Error fetching user engagement:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// @route   GET /api/analytics/challenge-stats
// @desc    Get challenge statistics with solved users
// @access  Private/Admin
router.get('/challenge-stats', protect, authorize('admin'), async (req, res) => {
  try {
    const challenges = await Challenge.find()
      .select('title category difficulty points solvedBy isVisible')
      .populate('solvedBy', 'username email points')
      .lean();

    const stats = {
      byCategory: {},
      byDifficulty: {},
      topChallenges: [],
      leastSolved: [],
      solvedChallenges: []
    };

    challenges.forEach(challenge => {
      if (!stats.byCategory[challenge.category]) {
        stats.byCategory[challenge.category] = { count: 0, solved: 0 };
      }
      stats.byCategory[challenge.category].count++;
      stats.byCategory[challenge.category].solved += challenge.solvedBy?.length || 0;

      if (!stats.byDifficulty[challenge.difficulty]) {
        stats.byDifficulty[challenge.difficulty] = { count: 0, avgPoints: 0 };
      }
      stats.byDifficulty[challenge.difficulty].count++;
      stats.byDifficulty[challenge.difficulty].avgPoints += challenge.points;

      // Add solved challenges with users
      if (challenge.solvedBy && challenge.solvedBy.length > 0) {
        stats.solvedChallenges.push({
          title: challenge.title,
          category: challenge.category,
          difficulty: challenge.difficulty,
          points: challenge.points,
          solvedBy: challenge.solvedBy.map(user => ({
            username: user.username,
            email: user.email,
            points: user.points
          }))
        });
      }
    });

    stats.topChallenges = challenges
      .sort((a, b) => (b.solvedBy?.length || 0) - (a.solvedBy?.length || 0))
      .slice(0, 5)
      .map(c => ({
        title: c.title,
        solves: c.solvedBy?.length || 0,
        points: c.points
      }));

    stats.leastSolved = challenges
      .sort((a, b) => (a.solvedBy?.length || 0) - (b.solvedBy?.length || 0))
      .slice(0, 5)
      .map(c => ({
        title: c.title,
        solves: c.solvedBy?.length || 0,
        points: c.points
      }));

    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('Error fetching challenge stats:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// @route   GET /api/analytics/traffic
// @desc    Get traffic statistics
// @access  Private/Admin
router.get('/traffic', protect, authorize('admin'), async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalUsersLast30 = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const totalUsersLast7 = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const totalUsersToday = await User.countDocuments({ createdAt: { $gte: today } });

    const usersPerDay = {};
    const users = await User.find({ createdAt: { $gte: thirtyDaysAgo } }).select('createdAt').lean();
    
    users.forEach(user => {
      const day = new Date(user.createdAt).toISOString().split('T')[0];
      usersPerDay[day] = (usersPerDay[day] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        last30Days: totalUsersLast30,
        last7Days: totalUsersLast7,
        today: totalUsersToday,
        dailyBreakdown: usersPerDay
      }
    });
  } catch (err) {
    console.error('Error fetching traffic stats:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// @route   GET /api/analytics/scoreboard-stats
// @desc    Get scoreboard statistics
// @access  Private/Admin
router.get('/scoreboard-stats', protect, authorize('admin'), async (req, res) => {
  try {
    const topUsers = await User.find()
      .select('username points solvedChallenges')
      .sort({ points: -1 })
      .limit(10)
      .lean();

    const topUsersData = topUsers.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      points: user.points,
      challengesSolved: user.solvedChallenges?.length || 0
    }));

    res.json({
      success: true,
      data: topUsersData
    });
  } catch (err) {
    console.error('Error fetching scoreboard stats:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// @route   GET /api/analytics/submissions
// @desc    Get detailed submission analytics with all attempts
// @access  Private/Admin
router.get('/submissions', protect, authorize('admin'), async (req, res) => {
  try {
    const Submission = require('../models/Submission');
    
    // Get all submissions with user and challenge details
    const submissions = await Submission.find()
      .populate('user', 'username email points')
      .populate('challenge', 'title category difficulty points')
      .sort({ submittedAt: -1 })
      .lean();

    const totalSubmissions = submissions.length;
    const successfulSubmissions = submissions.filter(s => s.isCorrect).length;
    const failedSubmissions = submissions.filter(s => !s.isCorrect).length;
    const successRate = totalSubmissions > 0 ? ((successfulSubmissions / totalSubmissions) * 100).toFixed(2) : 0;
    const failureRate = (100 - successRate).toFixed(2);

    // Group by user
    const submissionsByUser = {};
    submissions.forEach(sub => {
      const userId = sub.user._id.toString();
      if (!submissionsByUser[userId]) {
        submissionsByUser[userId] = {
          username: sub.user.username,
          email: sub.user.email,
          totalAttempts: 0,
          successfulAttempts: 0,
          failedAttempts: 0,
          points: sub.user.points,
          submissions: []
        };
      }
      submissionsByUser[userId].totalAttempts++;
      if (sub.isCorrect) {
        submissionsByUser[userId].successfulAttempts++;
      } else {
        submissionsByUser[userId].failedAttempts++;
      }
      submissionsByUser[userId].submissions.push({
        challenge: sub.challenge.title,
        category: sub.challenge.category,
        difficulty: sub.challenge.difficulty,
        points: sub.challenge.points,
        submittedFlag: sub.submittedFlag,
        isCorrect: sub.isCorrect,
        submittedAt: sub.submittedAt,
        ipAddress: sub.ipAddress
      });
    });

    // Group by challenge
    const submissionsByChallenge = {};
    submissions.forEach(sub => {
      const challengeId = sub.challenge._id.toString();
      if (!submissionsByChallenge[challengeId]) {
        submissionsByChallenge[challengeId] = {
          title: sub.challenge.title,
          category: sub.challenge.category,
          difficulty: sub.challenge.difficulty,
          points: sub.challenge.points,
          totalAttempts: 0,
          successfulAttempts: 0,
          failedAttempts: 0,
          submissions: []
        };
      }
      submissionsByChallenge[challengeId].totalAttempts++;
      if (sub.isCorrect) {
        submissionsByChallenge[challengeId].successfulAttempts++;
      } else {
        submissionsByChallenge[challengeId].failedAttempts++;
      }
      submissionsByChallenge[challengeId].submissions.push({
        username: sub.user.username,
        email: sub.user.email,
        submittedFlag: sub.submittedFlag,
        isCorrect: sub.isCorrect,
        submittedAt: sub.submittedAt,
        ipAddress: sub.ipAddress
      });
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalSubmissions,
          successfulSubmissions,
          failedSubmissions,
          successRate: parseFloat(successRate),
          failureRate: parseFloat(failureRate)
        },
        submissionsByUser: Object.values(submissionsByUser).sort((a, b) => b.totalAttempts - a.totalAttempts),
        submissionsByChallenge: Object.values(submissionsByChallenge).sort((a, b) => b.totalAttempts - a.totalAttempts),
        allSubmissions: submissions.map(s => ({
          username: s.user.username,
          challenge: s.challenge.title,
          category: s.challenge.category,
          submittedFlag: s.submittedFlag,
          isCorrect: s.isCorrect,
          points: s.isCorrect ? s.challenge.points : 0,
          submittedAt: s.submittedAt,
          ipAddress: s.ipAddress
        }))
      }
    });
  } catch (err) {
    console.error('Error fetching submission analytics:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// @route   GET /api/analytics/challenge-submissions
// @desc    Get all challenges with their submission details
// @access  Private/Admin
router.get('/challenge-submissions', protect, authorize('admin'), async (req, res) => {
  try {
    const Submission = require('../models/Submission');
    
    const challenges = await Challenge.find()
      .select('title category difficulty points')
      .lean();

    const challengeSubmissions = [];

    for (const challenge of challenges) {
      const submissions = await Submission.find({ challenge: challenge._id })
        .populate('user', 'username email points')
        .sort({ submittedAt: -1 })
        .lean();

      const successfulSubmissions = submissions.filter(s => s.isCorrect);
      const failedSubmissions = submissions.filter(s => !s.isCorrect);

      challengeSubmissions.push({
        _id: challenge._id,
        title: challenge.title,
        category: challenge.category,
        difficulty: challenge.difficulty,
        points: challenge.points,
        totalSubmissions: submissions.length,
        successfulSubmissions: successfulSubmissions.length,
        failedSubmissions: failedSubmissions.length,
        successRate: submissions.length > 0 ? ((successfulSubmissions.length / submissions.length) * 100).toFixed(2) : 0
      });
    }

    res.json({
      success: true,
      data: challengeSubmissions.sort((a, b) => b.totalSubmissions - a.totalSubmissions)
    });
  } catch (err) {
    console.error('Error fetching challenge submissions:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// @route   GET /api/analytics/challenge-submissions/:id
// @desc    Get detailed submissions for a specific challenge
// @access  Private/Admin
router.get('/challenge-submissions/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const Submission = require('../models/Submission');
    
    const challenge = await Challenge.findById(req.params.id)
      .select('title category difficulty points')
      .lean();

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const submissions = await Submission.find({ challenge: req.params.id })
      .populate('user', 'username email points')
      .sort({ submittedAt: -1 })
      .lean();

    const successfulSubmissions = submissions.filter(s => s.isCorrect).map(s => ({
      username: s.user.username,
      email: s.user.email,
      userPoints: s.user.points,
      submittedFlag: s.submittedFlag,
      submittedAt: s.submittedAt,
      ipAddress: s.ipAddress,
      points: s.points
    }));

    const failedSubmissions = submissions.filter(s => !s.isCorrect).map(s => ({
      username: s.user.username,
      email: s.user.email,
      userPoints: s.user.points,
      submittedFlag: s.submittedFlag,
      submittedAt: s.submittedAt,
      ipAddress: s.ipAddress
    }));

    res.json({
      success: true,
      data: {
        challenge: {
          title: challenge.title,
          category: challenge.category,
          difficulty: challenge.difficulty,
          points: challenge.points
        },
        summary: {
          totalSubmissions: submissions.length,
          successfulSubmissions: successfulSubmissions.length,
          failedSubmissions: failedSubmissions.length,
          successRate: submissions.length > 0 ? ((successfulSubmissions.length / submissions.length) * 100).toFixed(2) : 0
        },
        successfulSubmissions,
        failedSubmissions
      }
    });
  } catch (err) {
    console.error('Error fetching challenge submission details:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// @route   GET /api/analytics/progression/matrix
// @desc    player progression matrix (Top 100)
// @access  Private/Admin
router.get('/progression/matrix', protect, authorize('admin'), async (req, res) => {
  try {
    const Submission = require('../models/Submission');
    const Team = require('../models/Team');
    const mode = (req.query.mode || 'users').toString() === 'teams' ? 'teams' : 'users';

    // Visible challenges ordered like a standard progression matrix
    const challenges = await Challenge.find({
      state: 'visible'
    })
      .select('_id title category points position')
      .lean();

    const challengeData = challenges
      .sort((a, b) => {
        const posA = typeof a.position === 'number' ? a.position : 0;
        const posB = typeof b.position === 'number' ? b.position : 0;

        // position=0 goes last
        if (posA === 0 && posB !== 0) return 1;
        if (posB === 0 && posA !== 0) return -1;

        return (
          posA - posB ||
          (a.points || 0) - (b.points || 0) ||
          (a.category || '').localeCompare(b.category || '') ||
          String(a._id).localeCompare(String(b._id))
        );
      })
      .map((challenge) => ({
        id: String(challenge._id),
        name: challenge.title,
        value: challenge.points || 0,
        position: typeof challenge.position === 'number' ? challenge.position : 0,
        category: challenge.category || 'misc'
      }));

    let scoreboard = [];

    if (mode === 'teams') {
      const topTeams = await Team.find({
        hidden: { $ne: true },
        banned: { $ne: true }
      })
        .select('_id name points')
        .sort({ points: -1, createdAt: 1, _id: 1 })
        .limit(100)
        .lean();

      const teamIds = topTeams.map((team) => team._id);
      const matrixByTeam = new Map();

      topTeams.forEach((team) => {
        matrixByTeam.set(String(team._id), {
          solves: new Set(),
          attempts: new Set()
        });
      });

      if (teamIds.length > 0) {
        const teamObjectIds = teamIds.map((id) => new mongoose.Types.ObjectId(id));

        const teamMembers = await User.find({
          role: 'user',
          hidden: { $ne: true },
          banned: { $ne: true },
          team: { $in: teamObjectIds }
        })
          .select('_id team')
          .lean();

        const memberIds = teamMembers.map((member) => member._id);
        const userToTeam = new Map(teamMembers.map((member) => [String(member._id), String(member.team)]));

        if (memberIds.length > 0) {
          const matrixRows = await Submission.aggregate([
            {
              $match: {
                user: { $in: memberIds.map((id) => new mongoose.Types.ObjectId(id)) }
              }
            },
            {
              $group: {
                _id: '$user',
                solves: {
                  $addToSet: {
                    $cond: [
                      { $eq: ['$isCorrect', true] },
                      '$challenge',
                      '$$REMOVE'
                    ]
                  }
                },
                attempts: {
                  $addToSet: {
                    $cond: [
                      { $eq: ['$isCorrect', false] },
                      '$challenge',
                      '$$REMOVE'
                    ]
                  }
                }
              }
            }
          ]);

          for (const row of matrixRows) {
            const userId = String(row._id);
            const teamId = userToTeam.get(userId);
            if (!teamId || !matrixByTeam.has(teamId)) continue;

            const teamMatrix = matrixByTeam.get(teamId);
            (row.solves || []).forEach((challengeId) => teamMatrix.solves.add(String(challengeId)));
            (row.attempts || []).forEach((challengeId) => teamMatrix.attempts.add(String(challengeId)));
          }
        }
      }

      scoreboard = topTeams.map((team, index) => {
        const matrix = matrixByTeam.get(String(team._id)) || { solves: new Set(), attempts: new Set() };
        return {
          id: String(team._id),
          name: team.name,
          score: team.points || 0,
          place: index + 1,
          solves: Array.from(matrix.solves),
          attempts: Array.from(matrix.attempts)
        };
      });
    } else {
      // Top 100 visible, non-banned users by score (scope)
      const topUsers = await User.find({
        role: 'user',
        hidden: { $ne: true },
        banned: { $ne: true }
      })
        .select('_id username points')
        .sort({ points: -1, createdAt: 1, _id: 1 })
        .limit(100)
        .lean();

      const userIds = topUsers.map((u) => u._id);

      const matrixByUser = new Map();
      userIds.forEach((id) => {
        matrixByUser.set(String(id), {
          solves: new Set(),
          attempts: new Set()
        });
      });

      if (userIds.length > 0) {
        const userObjectIds = userIds.map((id) => new mongoose.Types.ObjectId(id));

        const matrixRows = await Submission.aggregate([
          {
            $match: {
              user: { $in: userObjectIds }
            }
          },
          {
            $group: {
              _id: '$user',
              solves: {
                $addToSet: {
                  $cond: [
                    { $eq: ['$isCorrect', true] },
                    '$challenge',
                    '$$REMOVE'
                  ]
                }
              },
              attempts: {
                $addToSet: {
                  $cond: [
                    { $eq: ['$isCorrect', false] },
                    '$challenge',
                    '$$REMOVE'
                  ]
                }
              }
            }
          }
        ]);

        for (const row of matrixRows) {
          const userId = String(row._id);
          matrixByUser.set(userId, {
            solves: new Set((row.solves || []).map((challengeId) => String(challengeId))),
            attempts: new Set((row.attempts || []).map((challengeId) => String(challengeId)))
          });
        }
      }

      scoreboard = topUsers.map((user, index) => {
        const matrix = matrixByUser.get(String(user._id)) || { solves: new Set(), attempts: new Set() };

        return {
          id: String(user._id),
          name: user.username,
          score: user.points || 0,
          place: index + 1,
          solves: Array.from(matrix.solves),
          attempts: Array.from(matrix.attempts)
        };
      });
    }

    res.json({
      success: true,
      data: {
        scoreboard,
        challenges: challengeData,
        meta: {
          entries: scoreboard.length,
          challenges: challengeData.length,
          mode
        }
      }
    });
  } catch (err) {
    console.error('Error fetching progression matrix:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// @route   GET /api/analytics/statistics/challenges/solves
// @desc    challenge solve counts
// @access  Private/Admin
router.get('/statistics/challenges/solves', protect, authorize('admin'), async (req, res) => {
  try {
    const Submission = require('../models/Submission');

    const challenges = await Challenge.find({ state: { $ne: 'hidden' } })
      .select('_id title points')
      .lean();

    const solveAgg = await Submission.aggregate([
      { $match: { isCorrect: true } },
      {
        $group: {
          _id: '$challenge',
          solves: { $sum: 1 }
        }
      }
    ]);

    const solveMap = new Map(solveAgg.map((row) => [String(row._id), row.solves]));

    const data = challenges.map((challenge) => ({
      id: String(challenge._id),
      name: challenge.title,
      solves: solveMap.get(String(challenge._id)) || 0,
      value: challenge.points || 0
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching challenge solve statistics:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   GET /api/analytics/statistics/challenges/solves/percentages
// @desc    solve percentages per challenge
// @access  Private/Admin
router.get('/statistics/challenges/solves/percentages', protect, authorize('admin'), async (req, res) => {
  try {
    const Submission = require('../models/Submission');

    const challenges = await Challenge.find({ state: { $ne: 'hidden' } })
      .select('_id title points')
      .sort({ points: 1, title: 1 })
      .lean();

    const activeUsersWithPoints = await User.countDocuments({
      role: 'user',
      hidden: { $ne: true },
      banned: { $ne: true },
      points: { $gt: 0 }
    });

    const solveAgg = await Submission.aggregate([
      { $match: { isCorrect: true } },
      {
        $group: {
          _id: '$challenge',
          solves: { $sum: 1 }
        }
      }
    ]);

    const solveMap = new Map(solveAgg.map((row) => [String(row._id), row.solves]));

    const data = challenges.map((challenge) => {
      const solves = solveMap.get(String(challenge._id)) || 0;
      const percentage = activeUsersWithPoints > 0 ? (solves / activeUsersWithPoints) * 100 : 0;
      return {
        id: String(challenge._id),
        name: challenge.title,
        solves,
        percentage: Number(percentage.toFixed(2))
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching challenge solve percentages:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   GET /api/analytics/statistics/challenges/category
// @desc    challenge category breakdown (count/sum)
// @access  Private/Admin
router.get('/statistics/challenges/category', protect, authorize('admin'), async (req, res) => {
  try {
    const fn = (req.query.function || 'count').toString();
    const target = (req.query.target || 'id').toString();

    const challenges = await Challenge.find({ state: { $ne: 'hidden' } })
      .select('category points')
      .lean();

    const result = {};
    for (const challenge of challenges) {
      const category = challenge.category || 'misc';
      if (!Object.prototype.hasOwnProperty.call(result, category)) {
        result[category] = 0;
      }

      if (fn === 'sum') {
        if (target === 'points' || target === 'value') {
          result[category] += Number(challenge.points || 0);
        } else {
          result[category] += 1;
        }
      } else {
        result[category] += 1;
      }
    }

    res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error fetching category statistics:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   GET /api/analytics/statistics/submissions/type
// @desc    submission percentage base data
// @access  Private/Admin
router.get('/statistics/submissions/type', protect, authorize('admin'), async (req, res) => {
  try {
    const Submission = require('../models/Submission');

    const submissionAgg = await Submission.aggregate([
      {
        $group: {
          _id: '$isCorrect',
          count: { $sum: 1 }
        }
      }
    ]);

    const data = { correct: 0, incorrect: 0 };
    submissionAgg.forEach((row) => {
      if (row._id === true) data.correct = row.count;
      if (row._id === false) data.incorrect = row.count;
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching submission type statistics:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   GET /api/analytics/statistics/scores/distribution
// @desc    score distribution brackets
// @access  Private/Admin
router.get('/statistics/scores/distribution', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({
      role: 'user',
      hidden: { $ne: true },
      banned: { $ne: true }
    })
      .select('points')
      .lean();

    const scores = users.map((u) => Number(u.points || 0)).filter((v) => Number.isFinite(v) && v >= 0);
    const step = 100;
    const brackets = {};

    if (scores.length > 0) {
      const maxScore = Math.max(...scores);
      let upper = Math.max(step, Math.ceil(maxScore / step) * step);

      for (let bound = step; bound <= upper; bound += step) {
        brackets[bound] = 0;
      }

      for (const score of scores) {
        let placed = false;
        for (let bound = step; bound <= upper; bound += step) {
          if (score < bound) {
            brackets[bound] += 1;
            placed = true;
            break;
          }
        }

        if (!placed) {
          while (score >= upper) {
            upper += step;
            brackets[upper] = brackets[upper] || 0;
          }
          brackets[upper] += 1;
        }
      }
    }

    res.json({
      success: true,
      data: {
        brackets
      }
    });
  } catch (err) {
    console.error('Error fetching score distribution:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
