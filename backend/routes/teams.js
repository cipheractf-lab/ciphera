const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Team = require('../models/Team');
const User = require('../models/User');
const Award = require('../models/Award');
const { protect, authorize } = require('../middleware/auth');
const { TEAM_MIN_SIZE, TEAM_MAX_SIZE } = require('../utils/teamConstants');
const { setActiveTeamIfNone } = require('../utils/teamHelpers');

// Avatar upload -- own directory and serving route, deliberately not
// the generic /uploads static mount (that mount has no auth or
// visibility checks at all; see the CSP/access-control writeup from
// the security pass). Mirrors configuration.js's logo upload pattern.
const teamAvatarUploadsDir = path.join(__dirname, '../uploads/team-avatars');
if (!fs.existsSync(teamAvatarUploadsDir)) {
  fs.mkdirSync(teamAvatarUploadsDir, { recursive: true });
}

const allowedAvatarExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const allowedAvatarMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, teamAvatarUploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
      cb(null, `team-${req.params.id}-${Date.now()}${ext}`);
    }
  }),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();

    if (!allowedAvatarMimeTypes.includes(mime) && !allowedAvatarExtensions.includes(ext)) {
      return cb(new Error('Only image files are allowed for team avatars'));
    }
    return cb(null, true);
  },
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1
  }
});


// @route   POST /api/teams
// @desc    Create a new team (Admin only)
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  
  try {
    const { name, description, members, captain, maxMembers, hidden, banned, verified } = req.body;
    const MAX_TEAM_MEMBERS = maxMembers || parseInt(process.env.MAX_TEAM_MEMBERS) || TEAM_MAX_SIZE;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }

    if (members && members.length > MAX_TEAM_MEMBERS) {
      return res.status(400).json({
        success: false,
        message: `A team can have maximum ${MAX_TEAM_MEMBERS} members`
      });
    }

    let team;
    await session.withTransaction(async () => {
      // Validate member IDs exist and are valid users (inside transaction)
      if (members && members.length > 0) {
        const validMembers = await User.find({
          _id: { $in: members },
          role: 'user',
          team: { $exists: false }
        }).session(session);

        if (validMembers.length !== members.length) {
          throw new Error('One or more selected users are invalid or already in a team');
        }

        // Validate captain is in members list
        if (captain && !members.includes(captain)) {
          throw new Error('Captain must be a selected team member');
        }
      }

      // Create team within transaction
      const teamDoc = await Team.create([{
        name,
        description,
        members: members || [],
        captain: captain || null,
        hidden: !!hidden,
        banned: !!banned,
        verified: !!verified,
        createdBy: req.user._id || req.user.id
      }], { session });
      
      team = teamDoc[0];

      // Update users within transaction
      if (members && members.length > 0) {
        await User.updateMany(
          { _id: { $in: members } },
          { team: team._id },
          { session }
        );
      }
    });

    await session.endSession();

    const populatedTeam = await team.populate('members createdBy captain');

    res.status(201).json({
      success: true,
      data: populatedTeam
    });
  } catch (error) {
    await session.endSession();
    console.error('Team creation error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error creating team'
    });
  }
});

// @route   GET /api/teams/my/team
// @desc    Get current user's team
// @access  Private
router.get('/my/team', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('team');

    if (!user || !user.team) {
      return res.status(404).json({
        success: false,
        message: 'You are not part of any team'
      });
    }

    const team = await Team.findById(user.team)
      .populate('members', 'username email points solvedChallenges')
      .populate('captain', 'username email points solvedChallenges')
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
    console.error('Error fetching user team:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team'
    });
  }
});

// @route   GET /api/teams/mine
// @desc    List every team the current user is a member of (self-service,
//          many-to-many -- a user can belong to several teams at once)
// @access  Private
router.get('/mine', protect, async (req, res) => {
  try {
    const teams = await Team.find({ members: req.user._id })
      .select('name description avatarUrl members captain createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const data = teams.map((team) => ({
      _id: team._id,
      name: team.name,
      description: team.description,
      avatarUrl: team.avatarUrl ? `/api/teams/avatar/${team.avatarUrl}` : '',
      memberCount: team.members.length,
      createdAt: team.createdAt,
      isCaptain: !!(team.captain && team.captain.toString() === req.user._id.toString())
    }));

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching my teams:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching your teams'
    });
  }
});

// @route   POST /api/teams/self
// @desc    Self-service team creation. Caller becomes captain and sole
//          member. Avatar is uploaded separately via POST /:id/avatar.
// @access  Private
router.post('/self', protect, async (req, res) => {
  try {
    const name = (req.body?.name || '').trim();
    const description = (req.body?.description || '').trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Team name is required'
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Team name must be 100 characters or fewer'
      });
    }

    if (description.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Description must be 2000 characters or fewer'
      });
    }

    const team = await Team.create({
      name,
      description,
      members: [req.user._id],
      captain: req.user._id,
      createdBy: req.user._id
    });

    await setActiveTeamIfNone(req.user._id, team._id);

    res.status(201).json({
      success: true,
      data: {
        _id: team._id,
        name: team.name,
        description: team.description,
        avatarUrl: ''
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A team with that name already exists'
      });
    }
    console.error('Error creating team:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating team'
    });
  }
});

// @route   GET /api/teams/avatar/:filename
// @desc    Serve a team avatar file
// @access  Public (avatars are shown in team lists other players see)
router.get('/avatar/:filename', async (req, res) => {
  try {
    const filename = path.basename(String(req.params.filename || ''));
    if (!filename || filename.includes('..')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid avatar filename'
      });
    }

    const fullPath = path.join(teamAvatarUploadsDir, filename);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found'
      });
    }

    return res.sendFile(fullPath);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to serve avatar file'
    });
  }
});

// @route   GET /api/teams
// @desc    Get all teams with pagination
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.q || '';

    const query = search ? { name: { $regex: search, $options: 'i' } } : {};

    const total = await Team.countDocuments(query);
    
    // Check if user is admin
    const isAdmin = req.user.role === 'admin';
    const view = (req.query.view || '').toString().trim();

    // hidden/banned are available only in admin view
    if (!(isAdmin && view === 'admin')) {
      query.hidden = { $ne: true };
      query.banned = { $ne: true };
    }
    
    // Hide emails only, keep solvedChallenges visible for transparency
    const memberFields = isAdmin ? 'username email points' : 'username points';
    const captainFields = isAdmin ? 'username email points' : 'username points';
    
    const teams = await Team.find(query)
      .populate('members', memberFields)
      .populate('captain', captainFields)
      .populate('createdBy', 'username')
      .sort({ points: -1 })
      .limit(limit)
      .skip(skip);

    res.json({
      success: true,
      count: teams.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: teams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching teams'
    });
  }
});

// @route   GET /api/teams/:id
// @desc    Get single team
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    
    // Hide emails only, show solvedChallenges and unlockedHints for transparency
    const memberFields = isAdmin 
      ? 'username email points solvedChallenges personallySolvedChallenges unlockedHints'
      : 'username points solvedChallenges personallySolvedChallenges unlockedHints';
    const captainFields = isAdmin 
      ? 'username email points solvedChallenges personallySolvedChallenges unlockedHints'
      : 'username points solvedChallenges personallySolvedChallenges unlockedHints';
    
    const team = await Team.findById(req.params.id)
      .populate('members', memberFields)
      .populate('captain', captainFields)
      .populate('createdBy', 'username');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // visibility rule
    if (!isAdmin && (team.hidden || team.banned)) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Calculate points dynamically for each member from submissions (like scoreboard does)
    const Submission = require('../models/Submission');
    const Unlock = require('../models/Unlock');
    const mongoose = require('mongoose');
    const memberIds = team.members.map(m => m._id);
    
    const memberStatsAgg = await Submission.aggregate([
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
          totalPoints: { $sum: '$challengeData.points' },
          solvedCount: { $sum: 1 },
          solvedChallenges: { $addToSet: '$challenge' }
        }
      }
    ]);
    
    // Get unlocked hints with full details for each member
    const unlocksWithDetails = await Unlock.aggregate([
      { $match: { user: { $in: memberIds }, type: 'hints' } },
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
        $project: {
          user: 1,
          target: 1,
          challengeName: '$challengeData.title',
          challengeId: '$challenge',
          hintCost: { $arrayElemAt: ['$challengeData.hints.cost', '$target'] },
          createdAt: 1
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    
    console.log('[Team Details] Unlocks with details:', {
      memberIds: memberIds.map(id => id.toString()),
      unlocksFound: unlocksWithDetails.length,
      unlocks: unlocksWithDetails.map(u => ({ 
        userId: u.user.toString(), 
        challenge: u.challengeName,
        hintIndex: u.target,
        cost: u.hintCost
      }))
    });
    
    // Create a map of userId -> calculated stats
    const statsMap = new Map();
    memberStatsAgg.forEach(item => {
      const userId = item._id.toString();
      statsMap.set(userId, {
        points: item.totalPoints,
        solvedCount: item.solvedCount,
        personalSolvedChallenges: item.solvedChallenges,
        unlockedHints: []
      });
    });
    
    // Add unlocked hints details to stats map
    unlocksWithDetails.forEach(unlock => {
      const userId = unlock.user.toString();
      const existingStats = statsMap.get(userId) || { 
        points: 0, 
        solvedCount: 0, 
        personalSolvedChallenges: [],
        unlockedHints: []
      };
      existingStats.unlockedHints.push({
        challengeId: unlock.challengeId,
        challengeName: unlock.challengeName,
        hintIndex: unlock.target,
        cost: unlock.hintCost,
        unlockedAt: unlock.createdAt
      });
      statsMap.set(userId, existingStats);
    });
    
    // Build new members array with calculated stats
    const updatedMembers = team.members.map(member => {
      const memberId = member._id.toString();
      const stats = statsMap.get(memberId);
      
      return {
        _id: member._id,
        username: member.username,
        email: member.email,
        points: stats ? stats.points : 0,
        personallySolvedCount: stats ? stats.solvedCount : 0,
        personallySolvedChallenges: stats ? stats.personalSolvedChallenges : [],
        unlockedHints: stats ? stats.unlockedHints : []
      };
    });
    
    console.log('[Team Details] Updated member stats:', updatedMembers.map(m => ({
      username: m.username,
      points: m.points,
      solvedCount: m.personallySolvedCount,
      unlockedHintsCount: m.unlockedHints.length
    })));
    
    // Calculate team points from calculated member points
    const memberPoints = updatedMembers.reduce((sum, member) => sum + (member.points || 0), 0);
    
    // Use cached team points calculation (same logic, just cached)
    const { getTeamPoints } = require('../utils/teamPointsCache');
    const teamPointsData = await getTeamPoints(team._id, memberIds);
    
    // Use cached calculation result
    const calculatedPoints = teamPointsData.total;
    
    console.log('[Team Details] Points calculation:', {
      memberPoints: teamPointsData.memberPoints,
      awardPoints: teamPointsData.awardPoints,
      total: calculatedPoints,
      cached: true,
      cacheAge: Math.round((Date.now() - teamPointsData.calculatedAt) / 1000)
    });

    // Calculate team rank
    const teamsWithHigherPoints = await Team.countDocuments({
      _id: { $ne: team._id }
    });
    
    // Get all teams to calculate rank properly (include awards in calculations)
    const allTeams = await Team.find().populate('members', 'points').lean();
    const teamsWithPoints = await Promise.all(allTeams.map(async (t) => {
      const tMemberPoints = t.members.reduce((sum, m) => sum + (m.points || 0), 0);
      const tAwards = await Award.find({ team: t._id }).select('value').lean();
      const tAwardPoints = tAwards.reduce((sum, a) => sum + (a.value || 0), 0);
      return {
        _id: t._id,
        totalPoints: Math.max(0, tMemberPoints + tAwardPoints)
      };
    }));
    teamsWithPoints.sort((a, b) => b.totalPoints - a.totalPoints);
    
    const rank = teamsWithPoints.findIndex(t => t._id.toString() === team._id.toString()) + 1;
    
    // Calculate total solved challenges (unique challenges across team from actual submissions)
    const allSolvedChallenges = new Set();
    updatedMembers.forEach(member => {
      if (member.personallySolvedChallenges && Array.isArray(member.personallySolvedChallenges)) {
        member.personallySolvedChallenges.forEach(challenge => {
          allSolvedChallenges.add(challenge.toString());
        });
      }
    });

    // Build response with calculated values
    const isCaptainOfTeam = !!(team.captain && team.captain._id.toString() === req.user._id.toString());

    const teamData = {
      _id: team._id,
      name: team.name,
      description: team.description,
      avatarUrl: team.avatarUrl ? `/api/teams/avatar/${team.avatarUrl}` : '',
      captain: team.captain,
      members: updatedMembers,
      totalPoints: calculatedPoints,
      points: calculatedPoints,
      rank: rank,
      solvedChallenges: allSolvedChallenges.size,
      isCaptain: isCaptainOfTeam,
      canEdit: isAdmin || isCaptainOfTeam
    };

    // Debug: Log member stats
    console.log('[Team Details] Member stats:', updatedMembers.map(m => ({
      username: m.username,
      points: m.points,
      solvedCount: m.personallySolvedCount
    })));

    res.json({
      success: true,
      data: teamData
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching team'
    });
  }
});

// @route   PUT /api/teams/:id
// @desc    Update team. Admins can change anything (membership,
//          moderation flags, captain). A team's own captain can only
//          change name/description -- membership changes go through
//          the dedicated add/remove-member routes below instead.
// @access  Private (admin, or the team's captain)
router.put('/:id', protect, async (req, res) => {
  try {
    let team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const isAdmin = req.user.role === 'admin';
    const isCaptain = !!(team.captain && team.captain.toString() === req.user._id.toString());

    if (!isAdmin && !isCaptain) {
      return res.status(403).json({
        success: false,
        message: 'Only the team captain or an admin can edit this team'
      });
    }

    const { name, description, members, hidden, banned, verified, captain } = req.body;

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        return res.status(400).json({ success: false, message: 'Team name cannot be empty' });
      }
      if (trimmed.length > 100) {
        return res.status(400).json({ success: false, message: 'Team name must be 100 characters or fewer' });
      }
      team.name = trimmed;
    }

    if (description !== undefined) {
      const trimmed = String(description).trim();
      if (trimmed.length > 2000) {
        return res.status(400).json({ success: false, message: 'Description must be 2000 characters or fewer' });
      }
      team.description = trimmed;
    }

    // Everything below is admin-only -- a captain editing their own
    // team never touches moderation flags or bulk membership.
    if (isAdmin) {
      const MAX_TEAM_MEMBERS = parseInt(process.env.MAX_TEAM_MEMBERS) || TEAM_MAX_SIZE;
      if (members && members.length > MAX_TEAM_MEMBERS) {
        return res.status(400).json({
          success: false,
          message: `A team can have maximum ${MAX_TEAM_MEMBERS} members`
        });
      }

      if (hidden !== undefined) team.hidden = !!hidden;
      if (verified !== undefined) team.verified = !!verified;
      if (banned !== undefined) {
        team.banned = !!banned;
        team.isBlocked = !!banned;
        team.blockedReason = banned ? 'Banned by admin' : null;
        team.blockedAt = banned ? new Date() : null;
      }

      if (captain !== undefined) {
        if (captain === null) {
          team.captain = null;
        } else {
          const captainId = captain.toString();
          const captainInMembers = (members || team.members).some(m => m.toString() === captainId);
          if (!captainInMembers) {
            return res.status(400).json({
              success: false,
              message: 'Captain must be in team members'
            });
          }
          team.captain = captain;
        }
      }

      if (members) {
        const oldMembers = team.members || [];
        team.members = members;

        await User.updateMany(
          { _id: { $in: oldMembers } },
          { $unset: { team: 1 } }
        );

        await User.updateMany(
          { _id: { $in: members } },
          { team: team._id }
        );
      }
    }

    team = await team.save();
    await team.populate('members createdBy');

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A team with that name already exists'
      });
    }
    console.error('Error updating team:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating team'
    });
  }
});

// @route   POST /api/teams/:id/avatar
// @desc    Upload/replace a team's avatar image
// @access  Private (admin, or the team's captain)
router.post('/:id/avatar', protect, avatarUpload.single('avatar'), async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isCaptain = !!(team.captain && team.captain.toString() === req.user._id.toString());
    if (!isAdmin && !isCaptain) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(403).json({ success: false, message: 'Only the team captain or an admin can change this avatar' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No avatar file uploaded' });
    }

    // Remove the previous avatar file when replacing one
    if (team.avatarUrl) {
      const previousPath = path.join(teamAvatarUploadsDir, team.avatarUrl);
      if (fs.existsSync(previousPath)) {
        fs.unlink(previousPath, () => {});
      }
    }

    team.avatarUrl = req.file.filename;
    await team.save();

    res.json({
      success: true,
      data: { avatarUrl: `/api/teams/avatar/${team.avatarUrl}` }
    });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    console.error('Error uploading team avatar:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading avatar'
    });
  }
});

// Note: self-service "add member by username" used to live here as a
// direct add. It's now an invite/accept/reject flow instead -- see
// routes/teamInvitations.js (POST /api/team-invitations/:teamId to
// send one, accept/reject to resolve it). The older admin-panel,
// ID-based POST /:id/members/:userId below is untouched.

// @route   DELETE /api/teams/:id
// @desc    Delete team (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    await User.updateMany(
      { team: req.params.id },
      { $unset: { team: 1 } }
    );

    await Team.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting team'
    });
  }
});

// @route   POST /api/teams/:id/members/:userId
// @desc    Add member to team (Admin only)
// @access  Private/Admin
router.post('/:id/members/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    if (team.members.length >= TEAM_MAX_SIZE) {
      return res.status(400).json({
        success: false,
        message: `Team already has the maximum of ${TEAM_MAX_SIZE} members`
      });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (team.members.includes(req.params.userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this team'
      });
    }

    team.members.push(req.params.userId);
    await team.save();

    user.team = team._id;
    await user.save();

    await team.populate('members createdBy');

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding member to team'
    });
  }
});

// @route   DELETE /api/teams/:id/members/:userId
// @desc    Remove a member from a team. Also how a player leaves a team
//          themselves (userId === their own id). If the removed member
//          was captain and teammates remain, the next-longest member is
//          promoted; if the team becomes empty, it's deleted.
// @access  Private (admin, the team's captain, or the member themselves)
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const isAdmin = req.user.role === 'admin';
    const isCaptain = !!(team.captain && team.captain.toString() === req.user._id.toString());
    const isSelf = req.user._id.toString() === req.params.userId;

    if (!isAdmin && !isCaptain && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Only the team captain, an admin, or the member themselves can do this'
      });
    }

    const wasMember = team.members.some((id) => id.toString() === req.params.userId);
    if (!wasMember) {
      return res.status(400).json({
        success: false,
        message: 'That user is not a member of this team'
      });
    }

    team.members = team.members.filter((id) => id.toString() !== req.params.userId);

    const wasCaptain = team.captain && team.captain.toString() === req.params.userId;

    if (team.members.length === 0) {
      // Last member left/removed -- nothing left to manage, delete the team
      await Team.findByIdAndDelete(team._id);
    } else {
      if (wasCaptain) {
        team.captain = team.members[0];
      }
      await team.save();
    }

    // Only clear the removed user's *active* team pointer if it was
    // pointing at this team -- they may be active on a different team.
    await User.updateOne(
      { _id: req.params.userId, team: team._id },
      { $unset: { team: 1 } }
    );

    const finalTeam = team.members.length > 0
      ? await Team.findById(team._id).populate('members captain createdBy')
      : null;

    res.json({
      success: true,
      data: finalTeam,
      deleted: team.members.length === 0
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing member from team'
    });
  }
});

module.exports = router;
