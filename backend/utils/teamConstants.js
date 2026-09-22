// Platform-wide team size limits, shared by routes/teams.js and
// routes/teamInvitations.js so both enforce the same rule.
const TEAM_MIN_SIZE = 1;
const TEAM_MAX_SIZE = 4;

module.exports = { TEAM_MIN_SIZE, TEAM_MAX_SIZE };
