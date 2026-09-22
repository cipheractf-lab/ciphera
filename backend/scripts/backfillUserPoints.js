/**
 * Backfill `User.points` for every account.
 *
 * routes/challenges.js computed this field with `$match: { user: req.user._id }`
 * inside a raw aggregation `$match` stage. req.user._id is a plain string
 * (middleware/auth.js casts it that way for API-response consistency), and a
 * raw aggregation $match does NOT get Mongoose's automatic string->ObjectId
 * casting the way query-builder methods do. So the match against the
 * ObjectId-typed `user` field on Submission/Award always returned zero rows,
 * and `points` was silently zeroed on every single solve, platform-wide.
 *
 * The scoreboard itself was never affected -- it aggregates fresh every call
 * with its own (correctly typed) query -- but User.points feeds profile pages
 * and the hint-affordability check, both of which were reading a stale 0.
 *
 * This script recomputes points = solvePoints + awardPoints for every user
 * using the same formula and writes it back. Idempotent: safe to re-run.
 *
 * Usage: node scripts/backfillUserPoints.js [--dry-run]
 */
require('dotenv').config();
const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry-run');

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(`[backfill] database: ${mongoose.connection.db.databaseName}`);
  console.log(`[backfill] mode:     ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY'}`);

  const db = mongoose.connection.db;

  // Solve points per user, via the exact same JOIN the submit path uses.
  const solveTotals = await db.collection('submissions').aggregate([
    { $match: { isCorrect: true } },
    {
      $lookup: {
        from: 'challenges',
        localField: 'challenge',
        foreignField: '_id',
        as: 'challengeData'
      }
    },
    { $unwind: '$challengeData' },
    { $group: { _id: '$user', totalPoints: { $sum: '$challengeData.points' } } }
  ]).toArray();

  const awardTotals = await db.collection('awards').aggregate([
    { $match: { value: { $ne: 0 }, user: { $exists: true, $ne: null } } },
    { $group: { _id: '$user', totalAwardPoints: { $sum: '$value' } } }
  ]).toArray();

  const byUser = new Map();
  for (const row of solveTotals) byUser.set(String(row._id), row.totalPoints);
  for (const row of awardTotals) {
    const key = String(row._id);
    byUser.set(key, (byUser.get(key) || 0) + row.totalAwardPoints);
  }

  const allUsers = await db.collection('users').find({}).project({ points: 1 }).toArray();

  let changed = 0;
  const writes = [];
  for (const user of allUsers) {
    const correct = byUser.get(String(user._id)) || 0;
    if ((user.points || 0) !== correct) {
      changed++;
      writes.push({
        updateOne: { filter: { _id: user._id }, update: { $set: { points: correct } } }
      });
      if (DRY_RUN) {
        console.log(`[backfill] would set ${user._id}: ${user.points || 0} -> ${correct}`);
      }
    }
  }

  console.log(`[backfill] ${changed}/${allUsers.length} account(s) need correction`);

  if (!DRY_RUN && writes.length) {
    const result = await db.collection('users').bulkWrite(writes);
    console.log(`[backfill] wrote ${result.modifiedCount} update(s)`);
  }

  await mongoose.disconnect();
  console.log('[backfill] done');
};

run().catch(async (err) => {
  console.error('[backfill] FAILED:', err.message);
  try { await mongoose.disconnect(); } catch { /* already down */ }
  process.exit(1);
});
