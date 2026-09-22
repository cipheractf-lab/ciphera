/**
 * Auth migration — run ONCE before enabling self-service registration.
 *
 * 1. Drops the `resetPasswordExpire_1` TTL index on `users`.
 *    A MongoDB TTL index deletes the ENTIRE document, not the field. Because
 *    createPasswordResetToken() sets resetPasswordExpire = now + 10min, the
 *    first password reset request would delete the user's whole account ~10
 *    minutes later. Removing the line from the schema is NOT sufficient:
 *    Mongoose autoIndex creates indexes but never drops them.
 *
 * 2. Backfills isEmailVerified/verified = true on every account that existed
 *    before this cutover, so turning on `emailVerificationRequired` later does
 *    not lock out the entire admin-created user base.
 *
 * Idempotent: safe to re-run.
 *
 * Usage:  node scripts/migrateAuthIndexes.js [--dry-run]
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

  // Show which database is about to be touched before doing anything.
  const redacted = uri.replace(/\/\/[^@]*@/, '//<credentials>@');
  console.log(`[migrate] target: ${redacted}`);
  console.log(`[migrate] mode:   ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY'}`);

  await mongoose.connect(uri);
  const users = mongoose.connection.db.collection('users');
  console.log(`[migrate] database: ${mongoose.connection.db.databaseName}`);

  // --- 1. Drop the account-deleting TTL index -----------------------------
  const indexes = await users.indexes();
  const ttl = indexes.find((i) => i.name === 'resetPasswordExpire_1');

  if (!ttl) {
    console.log('[migrate] resetPasswordExpire_1: not present (already dropped)');
  } else if (DRY_RUN) {
    console.log('[migrate] resetPasswordExpire_1: WOULD DROP', JSON.stringify(ttl));
  } else {
    try {
      await users.dropIndex('resetPasswordExpire_1');
      console.log('[migrate] resetPasswordExpire_1: dropped');
    } catch (err) {
      // 27 / IndexNotFound — a concurrent run got there first.
      if (err.code === 27 || /index not found/i.test(err.message)) {
        console.log('[migrate] resetPasswordExpire_1: already gone');
      } else {
        throw err;
      }
    }
  }

  // Replacement index: the field actually queried on during a reset.
  const hasTokenIndex = indexes.some((i) => i.name === 'resetPasswordToken_1');
  if (hasTokenIndex) {
    console.log('[migrate] resetPasswordToken_1: already present');
  } else if (DRY_RUN) {
    console.log('[migrate] resetPasswordToken_1: WOULD CREATE');
  } else {
    await users.createIndex({ resetPasswordToken: 1 }, { sparse: true, name: 'resetPasswordToken_1' });
    console.log('[migrate] resetPasswordToken_1: created');
  }

  // --- 2. Grandfather every pre-cutover account ---------------------------
  const filter = { $or: [{ isEmailVerified: { $ne: true } }, { verified: { $ne: true } }] };
  const pending = await users.countDocuments(filter);

  if (pending === 0) {
    console.log('[migrate] backfill: nothing to do');
  } else if (DRY_RUN) {
    console.log(`[migrate] backfill: WOULD SET isEmailVerified/verified=true on ${pending} account(s)`);
  } else {
    const res = await users.updateMany(filter, {
      $set: { isEmailVerified: true, verified: true }
    });
    console.log(`[migrate] backfill: updated ${res.modifiedCount}/${pending} account(s)`);
  }

  await mongoose.disconnect();
  console.log('[migrate] done');
};

run().catch(async (err) => {
  console.error('[migrate] FAILED:', err.message);
  try { await mongoose.disconnect(); } catch { /* already down */ }
  process.exit(1);
});
