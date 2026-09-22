const User = require('../models/User');

// If the user has no active team yet (the team whose solves/points
// count toward scoring), make this their active team. Self-service
// team membership is many-to-many (a user can belong to several
// teams), but scoring itself is untouched by this feature -- it still
// keys off the single User.team pointer exactly as before. This just
// opportunistically sets that pointer on a user's first team.
const setActiveTeamIfNone = async (userId, teamId) => {
  await User.updateOne(
    { _id: userId, team: { $exists: false } },
    { $set: { team: teamId } }
  );
};

module.exports = { setActiveTeamIfNone };
