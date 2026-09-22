const mongoose = require('mongoose');

/**
 * Team invitation lifecycle: pending -> accepted | rejected.
 * A captain (or admin) invites a user by username; the invited user
 * must accept before they become a real member of team.members[].
 * `seenByInviter` powers the captain's "someone responded" notification
 * -- it's independent of the invitation's own status, and only tracks
 * whether the *inviter* has acknowledged the response.
 */
const TeamInvitationSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  invitedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  seenByInviter: {
    type: Boolean,
    default: false
  },
  respondedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Fast lookups for "invitations sent to me" and "invitations I sent
// that I haven't seen a response for yet"
TeamInvitationSchema.index({ invitedUser: 1, status: 1 });
TeamInvitationSchema.index({ invitedBy: 1, seenByInviter: 1, status: 1 });
TeamInvitationSchema.index({ team: 1, status: 1 });

module.exports = mongoose.model('TeamInvitation', TeamInvitationSchema);
