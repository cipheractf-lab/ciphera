const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config');

// Allowed file extensions (security whitelist)
const ALLOWED_EXTENSIONS = [
  '.zip', '.tar', '.gz', '.7z', '.rar', '.bz2', '.xz', '.tgz',  // Archives
  '.txt', '.pdf', '.md', '.doc', '.docx', '.csv', '.log',       // Documents
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp',     // Images
  '.pcap', '.pcapng', '.cap',                                   // Network captures
  '.exe', '.elf', '.bin', '.so', '.dll', '.apk', '.deb',        // Binaries (for RE challenges)
  '.py', '.js', '.c', '.cpp', '.java', '.rb', '.go', '.rs',     // Source code
  '.php', '.sh', '.bash', '.ps1', '.bat',                       // Scripts
  '.html', '.htm', '.css', '.xml', '.json', '.yaml', '.yml',    // Web / config files
  '.sql', '.db', '.sqlite', '.sqlite3',                         // Database files
  '.iso', '.ova', '.vmdk', '.img',                              // VM / disk images
  '.pem', '.crt', '.key', '.pub', '.asc', '.gpg',               // Crypto / key files
  '.wav', '.mp3', '.mp4', '.ogg', '.flac',                      // Media (stego challenges)
  '.raw', '.dmp', '.mem', '.vmem',                              // Memory / forensics
  '.eml', '.pst', '.ics',                                       // Email / calendar
  '.jar', '.class', '.pyc', '.wasm',                            // Compiled code
  '.dockerfile', '.conf', '.ini', '.toml', '.env',              // Config files
  '.hex', '.rom', '.fw'                                         // Firmware / hardware
];

// File size limit: 20MB
const MAX_FILE_SIZE = config.fileUpload?.maxSize || 20 * 1024 * 1024; // 20MB
const MAX_FILES_PER_CHALLENGE = config.fileUpload?.maxFiles || 10;

// Sanitize filename to prevent path traversal
const sanitizeFilename = (filename) => {
  // Remove any path separators and dangerous characters
  return filename
    .replace(/[/\\?%*:|"<>#]/g, '-')
    .replace(/\.\./g, '')
    .replace(/^\.+/, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 255); // Limit filename length
};

// Calculate SHA-1 hash of file
const calculateSHA1 = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const challengeId = req.params.challengeId || req.body.challengeId;
    
    if (!challengeId) {
      return cb(new Error('Challenge ID is required'));
    }

    // Validate challengeId is a valid MongoDB ObjectId to prevent path traversal
    if (!/^[0-9a-fA-F]{24}$/.test(challengeId)) {
      return cb(new Error('Invalid challenge ID format'));
    }
    
    const uploadDir = path.join(__dirname, '../uploads/challenges', challengeId);
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadDir, { recursive: true });
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const sanitized = sanitizeFilename(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${sanitized}`;
    cb(null, uniqueName);
  }
});

// File filter for security
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Check if extension is allowed
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`File type ${ext} is not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`), false);
  }
  
  // Check mimetype (basic validation)
  // Note: This can be spoofed, so it's just an additional check
  if (!file.mimetype) {
    return cb(new Error('Invalid file mimetype'), false);
  }
  
  cb(null, true);
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_CHALLENGE
  },
  fileFilter: fileFilter
});

// Middleware to handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_FILES_PER_CHALLENGE} files allowed per challenge`
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field'
      });
    }
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed'
    });
  }
  
  next();
};

// Delete file from filesystem
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') { // Ignore if file doesn't exist
        return reject(err);
      }
      resolve();
    });
  });
};

// Delete all files in a challenge directory
const deleteAllChallengeFiles = async (challengeId) => {
  const uploadDir = path.join(__dirname, '../uploads/challenges', challengeId);
  
  try {
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      
      for (const file of files) {
        await deleteFile(path.join(uploadDir, file));
      }
      
      // Remove directory
      fs.rmdirSync(uploadDir);
    }
  } catch (error) {
    console.error(`Error deleting challenge files for ${challengeId}:`, error);
    throw error;
  }
};

module.exports = {
  upload,
  handleMulterError,
  calculateSHA1,
  deleteFile,
  deleteAllChallengeFiles,
  sanitizeFilename,
  MAX_FILE_SIZE,
  MAX_FILES_PER_CHALLENGE,
  ALLOWED_EXTENSIONS
};
