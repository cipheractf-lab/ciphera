const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Team = require('../models/Team');
const User = require('../models/User');
const TeamInvitation = require('../models/TeamInvitation');
const { protect } = require('../middleware/auth');
const { TEAM_MAX_SIZE } = require('../utils/teamConstants');
const { setActiveTeamIfNone } = require('../utils/teamHelpers');

const isCaptainOrAdmin = (team, user) =>
  user.role === 'admin' || !!(team.captain && team.captain.toString() === user._id.toString());

// @route   POST /api/team-invitations/team/:teamId
// @desc    Invite a user to a team by username (captain or admin).
//          Creates a pending invitation -- the user is NOT added to
//          the team until they accept it.
// @access  Private (admin, or the team's captain)
router.post('/team/:teamId', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (!isCaptainOrAdmin(team, req.user)) {
      return res.status(403).json({ success: false, message: 'Only the team captain or an admin can invite members' });
    }

    const username = String(req.body?.username || '').trim();
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username is required' });
    }

    if (team.members.length >= TEAM_MAX_SIZE) {
      return res.status(400).json({ success: false, message: `A team can have at most ${TEAM_MAX_SIZE} members` });
    }

    const invitedUser = await User.findOne({ username });
    if (!invitedUser) {
      return res.status(404).json({ success: false, message: `No user found with username "${username}"` });
    }

    if (team.members.some((m) => m.toString() === invitedUser._id.toString())) {
      return res.status(400).json({ success: false, message: 'That user is already a member of this team' });
    }

    const existingPending = await TeamInvitation.findOne({
      team: team._id,
      invitedUser: invitedUser._id,
      status: 'pending'
    });
    if (existingPending) {
      return res.status(400).json({ success: false, message: 'That user already has a pending invitation to this team' });
    }

    const invitation = await TeamInvitation.create({
      team: team._id,
      invitedUser: invitedUser._id,
      invitedBy: req.user._id,
      status: 'pending'
    });

    await invitation.populate([
      { path: 'team', select: 'name avatarUrl' },
      { path: 'invitedUser', select: 'username' },
      { path: 'invitedBy', select: 'username' }
    ]);

    res.status(201).json({
      success: true,
      data: invitation
    });
  } catch (error) {
    console.error('Error creating team invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending invitation'
    });
  }
});

// @route   GET /api/team-invitations/team/:teamId
// @desc    List every invitation (any status) ever sent for a team --
//          powers the pending/accepted/rejected badges on the team
//          management page.
// @access  Private (admin, or the team's captain)
router.get('/team/:teamId', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found' });
    }

    if (!isCaptainOrAdmin(team, req.user)) {
      return res.status(403).json({ success: false, message: 'Only the team captain or an admin can view invitations' });
    }

    const invitations = await TeamInvitation.find({ team: team._id })
      .populate('invitedUser', 'username')
      .populate('invitedBy', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: invitations
    });
  } catch (error) {
    console.error('Error listing team invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invitations'
    });
  }
});

// @route   GET /api/team-invitations/mine
// @desc    Invitations sent TO the current user. Defaults to pending
//          only (the actionable ones); pass ?status=all for history.
// @access  Private
router.get('/mine', protect, async (req, res) => {
  try {
    const statusParam = String(req.query.status || 'pending').trim();
    const query = { invitedUser: req.user._id };
    if (statusParam !== 'all') {
      query.status = statusParam;
    }

    const invitations = await TeamInvitation.find(query)
      .populate('team', 'name avatarUrl')
      .populate('invitedBy', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: invitations
    });
  } catch (error) {
    console.error('Error fetching my invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invitations'
    });
  }
});

// @route   GET /api/team-invitations/sent/unseen
// @desc    Invitations the current user sent as captain/admin that
//          have been responded to (accepted/rejected) but not yet
//          acknowledged -- this is "the notification" for the inviter.
// @access  Private
router.get('/sent/unseen', protect, async (req, res) => {
  try {
    const invitations = await TeamInvitation.find({
      invitedBy: req.user._id,
      status: { $in: ['accepted', 'rejected'] },
      seenByInviter: false
    })
      .populate('team', 'name avatarUrl')
      .populate('invitedUser', 'username')
      .sort({ respondedAt: -1 });

    res.json({
      success: true,
      data: invitations
    });
  } catch (error) {
    console.error('Error fetching unseen invitation responses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invitation responses'
    });
  }
});

// @route   POST /api/team-invitations/sent/mark-seen
// @desc    Acknowledge all unseen responses to invitations the
//          current user sent (dismisses the notification badge).
// @access  Private
router.post('/sent/mark-seen', protect, async (req, res) => {
  try {
    await TeamInvitation.updateMany(
      { invitedBy: req.user._id, status: { $in: ['accepted', 'rejected'] }, seenByInviter: false },
      { $set: { seenByInviter: true } }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking invitations seen:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating invitations'
    });
  }
});

// @route   POST /api/team-invitations/:invId/accept
// @desc    Accept a pending invitation -- adds the current user to
//          the team's members.
// @access  Private (only the invited user)
router.post('/:invId/accept', protect, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const invitation = await TeamInvitation.findById(req.params.invId).session(session);
      if (!invitation) {
        throw Object.assign(new Error('Invitation not found'), { status: 404 });
      }
      if (invitation.invitedUser.toString() !== req.user._id.toString()) {
        throw Object.assign(new Error('This invitation is not addressed to you'), { status: 403 });
      }
      if (invitation.status !== 'pending') {
        throw Object.assign(new Error('This invitation has already been responded to'), { status: 400 });
      }

      const team = await Team.findById(invitation.team).session(session);
      if (!team) {
        throw Object.assign(new Error('Team no longer exists'), { status: 404 });
      }
      if (team.members.length >= TEAM_MAX_SIZE) {
        throw Object.assign(new Error(`Team is already at the maximum of ${TEAM_MAX_SIZE} members`), { status: 400 });
      }
      if (!team.members.some((m) => m.toString() === req.user._id.toString())) {
        team.members.push(req.user._id);
        await team.save({ session });
      }

      invitation.status = 'accepted';
      invitation.respondedAt = new Date();
      await invitation.save({ session });

      result = invitation;
    });

    await setActiveTeamIfNone(req.user._id, result.team);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Error accepting invitation'
    });
  } finally {
    await session.endSession();
  }
});

// @route   POST /api/team-invitations/:invId/reject
// @desc    Reject a pending invitation.
// @access  Private (only the invited user)
router.post('/:invId/reject', protect, async (req, res) => {
  try {
    const invitation = await TeamInvitation.findById(req.params.invId);
    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found' });
    }
    if (invitation.invitedUser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'This invitation is not addressed to you' });
    }
    if (invitation.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'This invitation has already been responded to' });
    }

    invitation.status = 'rejected';
    invitation.respondedAt = new Date();
    await invitation.save();

    res.json({ success: true, data: invitation });
  } catch (error) {
    console.error('Error rejecting invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting invitation'
    });
  }
});

module.exports = router;
