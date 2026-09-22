const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const { getRedisClient } = require('../utils/redis');
const User = require('../models/User');
const Team = require('../models/Team');
const Submission = require('../models/Submission');
const Award = require('../models/Award');
const Challenge = require('../models/Challenge');

const redisClient = getRedisClient();

// Cache TTL in seconds
const CACHE_TTL = 60;
const GRAPH_CACHE_TTL = 300; // 5 minutes for graph

/**
 * @route   GET /api/v1/scoreboard
 * @desc    Get full scoreboard (summary)
 * @access  Public (or Private based on settings)
 */
router.get('/', async (req, res) => {
  try {
    const type = req.query.type === 'users' ? 'users' : 'teams';
    const isAdmin = req.user && req.user.role === 'admin';

    // Cache Key
    const cacheKey = `scoreboard:${type}:${isAdmin ? 'admin' : 'public'}`;

    // Try Cache
    const cached = await redisClient.get(cacheKey);
    if (cached && !isAdmin) { // Admins always get fresh data or short cache? keeping consistent
      return res.json(JSON.parse(cached));
    }


    // Aggregation Pipeline
    let standings = [];
    if (type === 'teams') {
      standings = await aggregateTeamStandings(isAdmin);
    } else {
      standings = await aggregateUserStandings(isAdmin);
    }

    const response = {
      success: true,
      data: standings
    };

    // Cache result
    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(response));

    res.json(response);
  } catch (error) {
    console.error('Scoreboard Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * @route   GET /api/v1/scoreboard/top/:count
 * @desc    Get detailed scoreboard for top N teams/users (includes detailed solve history)
 */
router.get('/top/:count', async (req, res) => {
  try {
    const rawCount = parseInt(req.params.count, 10);
    const count = Math.max(1, Math.min(Number.isNaN(rawCount) ? 10 : rawCount, 50));
    const type = req.query.type === 'users' ? 'users' : 'teams';
    const isAdmin = req.user && req.user.role === 'admin';

    // Use a different cache key for detailed view if needed, or just partial?
    // Returns a dict: { "1": { id, name, score, solves: [...] }, "2": ... }

    const cacheKey = `scoreboard:top:${count}:${type}:${isAdmin ? 'admin' : 'public'}`;
    const cached = await redisClient.get(cacheKey);
    if (cached && !isAdmin) {
      return res.json(JSON.parse(cached));
    }


    // 1. Get Top N Standings First
    let topStandings = [];
    if (type === 'teams') {
      topStandings = await aggregateTeamStandings(isAdmin, count);
    } else {
      topStandings = await aggregateUserStandings(isAdmin, count);
    }

    // 2. For each top entry, fetch detailed solve history
    // This is N+1 but N is small (10-50). aggregated lookup is complex.
    const responseData = {};

    for (let i = 0; i < topStandings.length; i++) {
      const entry = topStandings[i];
      const rank = i + 1;

      // Fetch Solves
      const history = await getSolveHistory(entry.account_id, type);

      responseData[rank] = {
        id: entry.account_id,
        account_url: entry.account_url,
        name: entry.name,
        score: entry.score,
        bracket_id: entry.bracket_id || null,
        bracket_name: entry.bracket_name || null,
        solves: history
      };
    }

    const response = {
      success: true,
      data: responseData
    };

    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(response));
    res.json(response);

  } catch (error) {
    console.error('Scoreboard Top Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * @route   GET /api/v1/scoreboard/graph
 * @desc    Get score graph data
 */
router.get('/graph', async (req, res) => {
  try {
    const type = req.query.type === 'users' ? 'users' : 'teams';
    const isAdmin = req.user && req.user.role === 'admin';

    const cacheKey = `scoreboard:graph:${type}:${isAdmin ? 'admin' : 'public'}`;
    const cached = await redisClient.get(cacheKey);
    if (cached && !isAdmin) {
      return res.json(JSON.parse(cached));
    }


    // 1. Get Top 10 Standings
    let topStandings = [];
    if (type === 'teams') {
      topStandings = await aggregateTeamStandings(isAdmin, 10);
    } else {
      topStandings = await aggregateUserStandings(isAdmin, 10);
    }

    // 2. Return detail payload so frontend can compute cumulative lines
    const graphData = {};

    for (let i = 0; i < topStandings.length; i++) {
      const entry = topStandings[i];
      const rank = i + 1;

      const history = await getSolveHistory(entry.account_id, type);

      graphData[rank] = {
        id: entry.account_id,
        name: entry.name,
        score: entry.score,
        solves: history
      };
    }

    const response = {
      success: true,
      data: graphData
    };

    await redisClient.setex(cacheKey, GRAPH_CACHE_TTL, JSON.stringify(response));
    res.json(response);

  } catch (error) {
    console.error('Scoreboard Graph Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * Helper: Aggregate User Standings (with dynamic scoring)
 * Returns: [{ account_id, name, score, date, rank }, ...]
 */
async function aggregateUserStandings(isAdmin, limit = null) {
  const matchStage = {
    isCorrect: true
  };

  // JOIN Submissions with Challenges to get current values
  // This automatically handles dynamic scoring retroactively
  const submissionAgg = await Submission.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'challenges',
        localField: 'challenge',
        foreignField: '_id',
        as: 'challengeData'
      }
    },
    { $unwind: '$challengeData' },
    { $match: { 'challengeData.points': { $ne: 0 } } },
    {
      $group: {
        _id: "$user",
        score: { $sum: "$challengeData.points" }, // Sum current challenge values
        lastSolve: { $max: "$submittedAt" }
      }
    }
  ]);

  // 2. Build User Map (Challenge points only - no awards)
  // user ranking includes solves + user awards
  const userMap = new Map();

  // Process Submissions
  for (const sub of submissionAgg) {
    userMap.set(sub._id.toString(), {
      score: sub.score,
      lastDate: new Date(sub.lastSolve)
    });
  }

  // Merge user awards into user map
  const userAwardMatch = {
    value: { $ne: 0 },
    user: { $exists: true, $ne: null }
  };

  const userAwardsAgg = await Award.aggregate([
    { $match: userAwardMatch },
    {
      $group: {
        _id: '$user',
        score: { $sum: '$value' },
        lastAward: { $max: '$date' }
      }
    }
  ]);

  for (const award of userAwardsAgg) {
    const uid = award._id.toString();
    const existing = userMap.get(uid) || { score: 0, lastDate: new Date(0) };
    existing.score += award.score;
    if (award.lastAward && new Date(award.lastAward) > existing.lastDate) {
      existing.lastDate = new Date(award.lastAward);
    }
    userMap.set(uid, existing);
  }

  // Filter Users (Hidden/Banned/Admin)
  const userQuery = { role: 'user' }; // Standard users only usually
  if (!isAdmin) {
    userQuery.hidden = { $ne: true };
    userQuery.banned = { $ne: true };
  }

  const users = await User.find(userQuery).select('_id username hidden banned').lean();

  const results = [];
  for (const user of users) {
    const uid = user._id.toString();
    const data = userMap.get(uid);

    if (data && data.score > 0) {
      results.push({
        account_id: uid,
        name: user.username,
        score: data.score,
        date: data.lastDate,
        account_url: `/users/${uid}`
      });
    }
  }

  // 4. Sort
  results.sort((a, b) => {
    // Score DESC
    if (b.score !== a.score) return b.score - a.score;
    // Date ASC (Earlier is better)
    if (a.date.getTime() !== b.date.getTime()) return a.date - b.date;
    // ID ASC (Tie breaker)
    return a.account_id.localeCompare(b.account_id);
  });

  if (limit) {
    return results.slice(0, limit);
  }

  // Add Rank
  return results.map((r, i) => ({ ...r, pos: i + 1 }));
}

/**
 * Helper: Aggregate Team Standings (with dynamic scoring)
 */
async function aggregateTeamStandings(isAdmin, limit = null) {
  const matchStage = {
    isCorrect: true
  };
  // JOIN Submissions with Challenges to get current values
  const teamSolves = await Submission.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: 'challenges',
        localField: 'challenge',
        foreignField: '_id',
        as: 'challengeData'
      }
    },
    { $unwind: '$challengeData' },
    { $match: { 'challengeData.points': { $ne: 0 } } },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    { $unwind: '$userInfo' },
    {
      $match: {
        'userInfo.team': { $exists: true, $ne: null },
        // Filter banned/hidden users if strict, but usually team status matters
      }
    },
    {
      $group: {
        _id: '$userInfo.team',
        score: { $sum: '$challengeData.points' }, // Sum current challenge values
        lastSolve: { $max: '$submittedAt' }
      }
    }
  ]);

  // Aggregate Awards (Team Awards + User Awards in Team?)
  // Awards given to USER count for TEAM? Yes usually.
  // Awards given to TEAM count for TEAM.

  // Team Specific Awards
  const teamAwardMatch = { value: { $ne: 0 }, team: { $exists: true, $ne: null } };

  const teamDirectAwards = await Award.aggregate([
    { $match: teamAwardMatch },
    {
      $group: {
        _id: '$team',
        score: { $sum: '$value' },
        lastAward: { $max: '$date' }
      }
    }
  ]);

  // User Awards (mapped to team)
  // NOTE: This might double count if logic isn't careful, but Award model enforces either user OR team.
  // So we just need awards where user -> team.
  const userAwardMatch = { value: { $ne: 0 }, user: { $exists: true, $ne: null } };

  const userAwardsInTeams = await Award.aggregate([
    { $match: userAwardMatch },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    { $unwind: '$userInfo' },
    { $match: { 'userInfo.team': { $exists: true, $ne: null } } },
    {
      $group: {
        _id: '$userInfo.team',
        score: { $sum: '$value' },
        lastAward: { $max: '$date' }
      }
    }
  ]);

  // Merge Everything
  const teamMap = new Map();

  const merge = (id, score, date) => {
    const sid = id.toString();
    const current = teamMap.get(sid) || { score: 0, lastDate: new Date(0) };
    current.score += score;
    if (new Date(date) > current.lastDate) {
      current.lastDate = new Date(date);
    }
    teamMap.set(sid, current);
  };

  teamSolves.forEach(t => merge(t._id, t.score, t.lastSolve));
  teamDirectAwards.forEach(t => merge(t._id, t.score, t.lastAward));
  userAwardsInTeams.forEach(t => merge(t._id, t.score, t.lastAward));

  // Fetch Team Metadata & Filter
  const teamQuery = { banned: false }; // Base filter
  if (!isAdmin) {
    teamQuery.hidden = { $ne: true };
  }

  const teams = await Team.find(teamQuery).select('_id name hidden banned').lean();

  const results = [];
  for (const team of teams) {
    const tid = team._id.toString();
    const data = teamMap.get(tid);

    if (data && data.score > 0) {
      results.push({
        account_id: tid,
        name: team.name, // Fixed: teamName -> name
        score: data.score,
        date: data.lastDate,
        account_url: `/teams/${tid}`
      });
    }
  }

  // Sort
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.date.getTime() !== b.date.getTime()) return a.date - b.date;
    return a.account_id.localeCompare(b.account_id);
  });

  if (limit) return results.slice(0, limit);
  return results.map((r, i) => ({ ...r, pos: i + 1 }));
}

/**
 * Helper: Get detailed solve history for graph/top view (with current values)
 */
async function getSolveHistory(accountId, mode) {
  const history = [];
  const isTeam = mode === 'teams';

  if (isTeam) {
    // Team solves are represented by member solves mapped to team account_id
    const members = await User.find({ team: accountId }).select('_id team').lean();
    const memberIds = members.map((m) => m._id);

    const solveQuery = {
      user: { $in: memberIds },
      isCorrect: true
    };

    const solves = await Submission.find(solveQuery)
      .populate('challenge', 'points')
      .select('submittedAt challenge user')
      .lean();

    for (const s of solves) {
      if (!s.challenge || s.challenge.points === 0) continue;
      history.push({
        date: s.submittedAt,
        challenge_id: s.challenge._id,
        account_id: accountId,
        user_id: s.user,
        team_id: accountId,
        value: s.challenge.points
      });
    }
  } else {
    const solveQuery = {
      user: accountId,
      isCorrect: true
    };

    const userDoc = await User.findById(accountId).select('_id team').lean();

    const solves = await Submission.find(solveQuery)
      .populate('challenge', 'points')
      .select('submittedAt challenge user')
      .lean();

    for (const s of solves) {
      if (!s.challenge || s.challenge.points === 0) continue;
      history.push({
        date: s.submittedAt,
        challenge_id: s.challenge._id,
        account_id: accountId,
        user_id: s.user,
        team_id: userDoc?.team || null,
        value: s.challenge.points
      });
    }
  }

  // Awards
  const awardQuery = { value: { $ne: 0 } };
  if (isTeam) {
    const members = await User.find({ team: accountId }).select('_id team').lean();
    const memberIds = members.map((m) => m._id);
    const memberMap = new Map(members.map((m) => [m._id.toString(), m]));

    // Awards for team directly OR users in team
    awardQuery.$or = [
      { team: accountId },
      { user: { $in: memberIds } }
    ];


    const awards = await Award.find(awardQuery).select('value date user team').lean();
    for (const a of awards) {
      const mappedTeam = a.team || memberMap.get(String(a.user))?.team || null;
      if (!mappedTeam) continue;

      history.push({
        date: a.date,
        challenge_id: null,
        account_id: accountId,
        user_id: a.user || null,
        team_id: mappedTeam,
        value: a.value
      });
    }
  } else {
    awardQuery.user = accountId;

    const userDoc = await User.findById(accountId).select('_id team').lean();
    const awards = await Award.find(awardQuery).select('value date user').lean();

    for (const a of awards) {
      history.push({
        date: a.date,
        challenge_id: null,
        account_id: accountId,
        user_id: a.user || accountId,
        team_id: userDoc?.team || null,
        value: a.value
      });
    }
  }

  // sort by date ascending
  history.sort((a, b) => new Date(a.date) - new Date(b.date));

  return history;
}

module.exports = router;
