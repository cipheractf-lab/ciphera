const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Configuration = require('../models/Configuration');
const User = require('../models/User');
const Team = require('../models/Team');
const Category = require('../models/Category');
const Challenge = require('../models/Challenge');
const Submission = require('../models/Submission');
const Award = require('../models/Award');
const Notice = require('../models/Notice');
const { protect, authorize } = require('../middleware/auth');

const CONFIG_KEY = 'global';

/**
 * Team.points is never written anywhere in this codebase (see the identical
 * note in routes/analytics.js) -- every team's stored `points` field is
 * always 0. This computes the real score for every team the same way
 * routes/scoreboard.js does, for the CSV backup export.
 */
const computeTeamScores = async () => {
  const solveTotals = await Submission.aggregate([
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
    { $group: { _id: '$userInfo.team', score: { $sum: '$challengeData.points' } } }
  ]);

  const teamAwards = await Award.aggregate([
    { $match: { value: { $ne: 0 }, team: { $exists: true, $ne: null } } },
    { $group: { _id: '$team', score: { $sum: '$value' } } }
  ]);

  const userAwardsInTeams = await Award.aggregate([
    { $match: { value: { $ne: 0 }, user: { $exists: true, $ne: null } } },
    {
      $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userInfo' }
    },
    { $unwind: '$userInfo' },
    { $match: { 'userInfo.team': { $exists: true, $ne: null } } },
    { $group: { _id: '$userInfo.team', score: { $sum: '$value' } } }
  ]);

  const scores = new Map();
  const add = (id, score) => {
    const key = String(id);
    scores.set(key, (scores.get(key) || 0) + score);
  };
  solveTotals.forEach((row) => add(row._id, row.score));
  teamAwards.forEach((row) => add(row._id, row.score));
  userAwardsInTeams.forEach((row) => add(row._id, row.score));

  return scores;
};

const sanitizeEventName = (value) => {
  const cleaned = String(value || '').trim().replace(/\s+/g, ' ');
  return cleaned;
};

const configUploadsDir = path.join(__dirname, '../uploads/config');
if (!fs.existsSync(configUploadsDir)) {
  fs.mkdirSync(configUploadsDir, { recursive: true });
}

const allowedImageExtensions = [
  '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico',
  '.gif', '.bmp', '.avif', '.tif', '.tiff'
];

const allowedMimeTypes = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/gif',
  'image/bmp',
  'image/avif',
  'image/tiff'
];

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, configUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      cb(null, `site-logo-${Date.now()}${ext}`);
    }
  }),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();

    const validByMime = allowedMimeTypes.includes(mime);
    const validByExt = allowedImageExtensions.includes(ext);

    if (!validByMime && !validByExt) {
      return cb(new Error('Only image files are allowed for logo upload'));
    }
    return cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1
  }
});

const backupUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1
  }
});

const BACKUP_COLLECTIONS = [
  { key: 'configuration', model: Configuration },
  { key: 'users', model: User },
  { key: 'teams', model: Team },
  { key: 'categories', model: Category },
  { key: 'challenges', model: Challenge },
  { key: 'submissions', model: Submission },
  { key: 'awards', model: Award },
  { key: 'notices', model: Notice }
];

const toCsv = (rows = []) => {
  if (!rows.length) return '';

  const headers = Object.keys(rows[0]);
  const escape = (value) => {
    const raw = value === null || value === undefined ? '' : String(value);
    if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  };

  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  });

  return lines.join('\n');
};

const parseCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
};

const getOrCreateConfiguration = async () => {
  return Configuration.findOneAndUpdate(
    { key: CONFIG_KEY },
    {
      $setOnInsert: {
        key: CONFIG_KEY,
        eventName: process.env.EVENT_NAME || 'Ciphera',
        eventDescription: 'Capture The Flag platform',
        logoUrl: '',
        visibility: {
          challenge: 'private',
          account: 'private',
          score: 'private',
          registration: 'private'
        }
      }
    },
    { new: true, upsert: true }
  );
};

const toLogoApiUrl = (logoUrl = '') => {
  if (!logoUrl) return '';
  if (logoUrl.startsWith('/api/configuration/logo/')) return logoUrl;

  if (logoUrl.startsWith('/uploads/config/')) {
    const filename = logoUrl.split('/').pop();
    return filename ? `/api/configuration/logo/${filename}` : '';
  }

  return logoUrl;
};

const extractLogoFilename = (logoUrl = '') => {
  if (!logoUrl) return null;
  const normalized = toLogoApiUrl(logoUrl);
  const filename = normalized.split('/').pop();
  return filename || null;
};

const normalizeVisibility = (input = {}) => {
  const value = {
    challenge: String(input.challenge || 'private').toLowerCase(),
    account: String(input.account || 'private').toLowerCase(),
    score: String(input.score || 'private').toLowerCase(),
    registration: String(input.registration || 'private').toLowerCase()
  };

  const validChallenge = ['public', 'private'];
  const validAccount = ['public', 'private', 'admins'];
  const validScore = ['public', 'private', 'admins'];
  const validRegistration = ['public', 'private'];

  if (!validChallenge.includes(value.challenge)) throw new Error('Invalid challenge visibility');
  if (!validAccount.includes(value.account)) throw new Error('Invalid account visibility');
  if (!validScore.includes(value.score)) throw new Error('Invalid score visibility');
  if (!validRegistration.includes(value.registration)) throw new Error('Invalid registration visibility');

  return value;
};

// Public endpoint for frontend branding/config bootstrap
router.get('/', async (req, res) => {
  try {
    const config = await getOrCreateConfiguration();

    return res.json({
      success: true,
      data: {
        eventName: config.eventName,
        eventDescription: config.eventDescription,
        logoUrl: toLogoApiUrl(config.logoUrl || ''),
        visibility: {
          challenge: config.visibility?.challenge || 'private',
          account: config.visibility?.account || 'private',
          score: config.visibility?.score || 'private',
          registration: config.visibility?.registration || 'private'
        }
      }
    });
  } catch (error) {
    console.error('[Configuration] Fetch failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch configuration'
    });
  }
});

// Admin endpoint to fetch full configuration metadata
router.get('/admin', protect, authorize('admin'), async (req, res) => {
  try {
    const config = await getOrCreateConfiguration();

    return res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('[Configuration] Admin fetch failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch admin configuration'
    });
  }
});

// Admin endpoint to update event name
router.put('/event-name', protect, authorize('admin'), async (req, res) => {
  try {
    const eventName = sanitizeEventName(req.body?.eventName);

    if (!eventName || eventName.length < 2 || eventName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'eventName must be between 2 and 100 characters'
      });
    }

    const updated = await Configuration.findOneAndUpdate(
      { key: CONFIG_KEY },
      {
        $set: {
          eventName,
          updatedBy: req.user._id
        },
        $setOnInsert: {
          key: CONFIG_KEY,
          eventDescription: 'Capture The Flag platform',
          logoUrl: '',
          visibility: {
            challenge: 'private',
            account: 'private',
            score: 'private',
            registration: 'private'
          }
        }
      },
      { new: true, upsert: true }
    );

    return res.json({
      success: true,
      message: 'Event name updated successfully',
      data: {
        eventName: updated.eventName,
        eventDescription: updated.eventDescription,
        logoUrl: updated.logoUrl || '',
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    console.error('[Configuration] Event name update failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update event name'
    });
  }
});

router.put('/logo', protect, authorize('admin'), logoUpload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No logo file uploaded'
      });
    }

    const current = await getOrCreateConfiguration();
    const nextLogoUrl = `/api/configuration/logo/${req.file.filename}`;

    // Remove previous logo file from disk when replacing
    const previousFilename = extractLogoFilename(current.logoUrl || '');
    if (previousFilename) {
      const previousPath = path.join(configUploadsDir, previousFilename);
      if (fs.existsSync(previousPath)) {
        fs.unlinkSync(previousPath);
      }
    }

    const updated = await Configuration.findOneAndUpdate(
      { key: CONFIG_KEY },
      {
        $set: {
          logoUrl: nextLogoUrl,
          updatedBy: req.user._id
        }
      },
      { new: true }
    );

    return res.json({
      success: true,
      message: 'Logo updated successfully',
      data: {
        logoUrl: updated.logoUrl,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    console.error('[Configuration] Logo upload failed:', error);
    if (error instanceof multer.MulterError || /Only image files/.test(error.message || '')) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid logo upload'
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload logo'
    });
  }
});

router.get('/logo/:filename', async (req, res) => {
  try {
    const filename = path.basename(String(req.params.filename || ''));
    if (!filename || filename.includes('..')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid logo filename'
      });
    }

    const fullPath = path.join(configUploadsDir, filename);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'Logo not found'
      });
    }

    return res.sendFile(fullPath);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to serve logo file'
    });
  }
});

router.put('/visibility', protect, authorize('admin'), async (req, res) => {
  try {
    const visibility = normalizeVisibility(req.body?.visibility || req.body || {});

    const updated = await Configuration.findOneAndUpdate(
      { key: CONFIG_KEY },
      {
        $set: {
          visibility,
          updatedBy: req.user._id
        },
        $setOnInsert: {
          key: CONFIG_KEY,
          eventName: process.env.EVENT_NAME || 'Ciphera',
          eventDescription: 'Capture The Flag platform',
          logoUrl: ''
        }
      },
      { new: true, upsert: true }
    );

    return res.json({
      success: true,
      message: 'Visibility settings updated successfully',
      data: {
        visibility: updated.visibility,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    const isValidationError = /Invalid .* visibility/.test(error.message || '');
    return res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: isValidationError ? error.message : 'Failed to update visibility settings'
    });
  }
});

// Flip the email-verification login gate. Kept separate from /visibility so
// an admin can turn it off at 3am without touching anything else.
router.put('/auth-settings', protect, authorize('admin'), async (req, res) => {
  try {
    const raw = req.body?.emailVerificationRequired;
    if (typeof raw !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'emailVerificationRequired must be a boolean'
      });
    }

    const updated = await Configuration.findOneAndUpdate(
      { key: CONFIG_KEY },
      {
        $set: { emailVerificationRequired: raw, updatedBy: req.user._id },
        $setOnInsert: {
          key: CONFIG_KEY,
          eventName: process.env.EVENT_NAME || 'Ciphera',
          eventDescription: 'Capture The Flag platform',
          logoUrl: ''
        }
      },
      { new: true, upsert: true }
    );

    return res.json({
      success: true,
      message: `Email verification is now ${raw ? 'required' : 'optional'}`,
      data: {
        emailVerificationRequired: updated.emailVerificationRequired,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    console.error('[Configuration] Auth settings update failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update auth settings'
    });
  }
});

router.get('/backup/export', protect, authorize('admin'), async (req, res) => {
  try {
    const data = {};

    for (const collection of BACKUP_COLLECTIONS) {
      data[collection.key] = await collection.model.find({}).lean();
    }

    const payload = {
      meta: {
        source: 'ctf-platform',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        exportedBy: req.user?.username || req.user?._id
      },
      data
    };

    const fileName = `ctf-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to export backup'
    });
  }
});

router.post('/backup/import', protect, authorize('admin'), backupUpload.single('backupFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Backup file is required'
      });
    }

    const mode = String(req.body?.mode || 'merge').toLowerCase();
    const replaceMode = mode === 'replace';

    let parsed;
    try {
      parsed = JSON.parse(req.file.buffer.toString('utf8'));
    } catch (_e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid backup file format. Expected JSON.'
      });
    }

    if (!parsed?.data || typeof parsed.data !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Backup JSON must contain a data object'
      });
    }

    const summary = {};

    if (replaceMode) {
      for (const collection of [...BACKUP_COLLECTIONS].reverse()) {
        await collection.model.deleteMany({});
      }
    }

    for (const collection of BACKUP_COLLECTIONS) {
      const docs = Array.isArray(parsed.data[collection.key]) ? parsed.data[collection.key] : [];
      if (!docs.length) {
        summary[collection.key] = { inserted: 0, skipped: 0 };
        continue;
      }

      try {
        await collection.model.insertMany(docs, { ordered: false });
        summary[collection.key] = { inserted: docs.length, skipped: 0 };
      } catch (err) {
        const inserted = err?.result?.result?.nInserted || err?.insertedDocs?.length || 0;
        summary[collection.key] = {
          inserted,
          skipped: Math.max(0, docs.length - inserted),
          warning: 'Some documents were skipped due to duplicates/validation'
        };
      }
    }

    return res.json({
      success: true,
      message: `Backup ${replaceMode ? 'restored' : 'merged'} successfully`,
      data: {
        mode: replaceMode ? 'replace' : 'merge',
        summary
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to import backup'
    });
  }
});

router.get('/backup/csv/:type', protect, authorize('admin'), async (req, res) => {
  try {
    const type = String(req.params.type || '').toLowerCase();
    let rows = [];

    if (type === 'users') {
      const users = await User.find({}).select('_id username email role points isBlocked').lean();
      rows = users.map((u) => ({
        _id: u._id,
        username: u.username,
        email: u.email,
        role: u.role,
        points: u.points || 0,
        isBlocked: !!u.isBlocked
      }));
    } else if (type === 'teams') {
      const teams = await Team.find({}).select('_id name description hidden banned verified').lean();
      const teamScores = await computeTeamScores();
      rows = teams.map((t) => ({
        _id: t._id,
        name: t.name,
        description: t.description || '',
        points: teamScores.get(String(t._id)) || 0,
        hidden: !!t.hidden,
        banned: !!t.banned,
        verified: !!t.verified
      }));
    } else if (type === 'challenges') {
      const challenges = await Challenge.find({}).select('_id title category points difficulty isVisible').lean();
      rows = challenges.map((c) => ({
        _id: c._id,
        title: c.title,
        category: c.category,
        points: c.points,
        difficulty: c.difficulty,
        isVisible: !!c.isVisible
      }));
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported CSV type. Use users, teams, or challenges.'
      });
    }

    const csv = toCsv(rows);
    const fileName = `${type}-backup-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to export CSV backup'
    });
  }
});

router.post('/backup/csv/:type/import', protect, authorize('admin'), backupUpload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is required'
      });
    }

    const type = String(req.params.type || '').toLowerCase();
    const raw = req.file.buffer.toString('utf8').trim();
    if (!raw) {
      return res.status(400).json({
        success: false,
        message: 'CSV file is empty'
      });
    }

    const lines = raw.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'CSV must include header and at least one row'
      });
    }

    const headers = parseCsvLine(lines[0]);
    const rows = lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx];
      });
      return obj;
    });

    let inserted = 0;

    if (type === 'users') {
      const docs = rows.map((row) => ({
        username: row.username,
        email: row.email,
        password: row.password || 'ChangeMe123!',
        role: row.role === 'admin' ? 'admin' : 'user',
        points: Number(row.points || 0),
        isBlocked: String(row.isBlocked || '').toLowerCase() === 'true'
      }));

      for (const doc of docs) {
        try {
          // Use create() so model hooks (e.g., password hashing) execute
          await User.create(doc);
          inserted += 1;
        } catch (_err) {
          // Skip invalid/duplicate row and continue import
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'CSV import currently supports users only.'
      });
    }

    return res.json({
      success: true,
      message: 'CSV imported successfully',
      data: {
        type,
        inserted,
        skipped: Math.max(0, rows.length - inserted)
      }
    });
  } catch (error) {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CSV upload'
      });
    }

    if (error?.writeErrors) {
      const inserted = error?.result?.result?.nInserted || 0;
      return res.status(200).json({
        success: true,
        message: 'CSV partially imported',
        data: {
          inserted,
          skipped: error.writeErrors.length
        }
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to import CSV'
    });
  }
});

module.exports = router;
