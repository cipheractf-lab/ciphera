const express = require('express');
const router = express.Router();
const Configuration = require('../models/Configuration');
const { protect, authorize } = require('../middleware/auth');

/**
 * Compatibility shim.
 *
 * There used to be a second, independent registration toggle here backed by
 * the RegistrationStatus model -- with zero frontend callers and enforced
 * nowhere. Two toggles that can disagree is worse than either alone: an admin
 * who closed registration via this one had closed nothing.
 *
 * Configuration.visibility.registration is now the single source of truth.
 * This route reads through to it; writes are refused.
 * The model, this route and its mount should be deleted in follow-up cleanup.
 */

// Get registration status (derived, read-only)
router.get('/', async (req, res) => {
  try {
    const cfg = await Configuration.findOne({ key: 'global' }).select('visibility updatedAt').lean();
    const isEnabled = (cfg?.visibility?.registration || 'private') === 'public';

    return res.json({
      isEnabled,
      updatedAt: cfg?.updatedAt || null,
      source: 'configuration.visibility.registration'
    });
  } catch (error) {
    console.error('[RegistrationStatus] Read failed:', error.message);
    // Fail closed.
    return res.json({ isEnabled: false, updatedAt: null, source: 'configuration.visibility.registration' });
  }
});

// Writes go through PUT /api/configuration/visibility instead.
router.put('/', protect, authorize('admin'), (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'This endpoint is retired. Use PUT /api/configuration/visibility to change registration visibility.'
  });
});

module.exports = router;
