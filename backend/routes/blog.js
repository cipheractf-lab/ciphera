const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/blog-images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Use path.basename() to prevent path traversal attacks
    const safeFilename = path.basename(file.originalname);
    const ext = path.extname(safeFilename);
    cb(null, Date.now() + '-' + Date.now() + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// @route   GET /api/blog
// @desc    Get all blog posts
// @access  Public
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all blog posts...');
    const posts = await Blog.find().sort({ createdAt: -1 });
    console.log('Found posts:', posts);
    res.json(posts);
  } catch (err) {
    console.error('Error fetching blog posts:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      message: 'Server error',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// @route   GET /api/blog/:id
// @desc    Get single blog post
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const post = await Blog.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  } catch (err) {
    console.error('Error fetching blog post:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   POST /api/blog
// @desc    Create a new blog post
// @access  Private/Admin
router.post('/', protect, authorize('admin'), upload.single('image'), async (req, res) => {
  try {
    console.log('Creating new blog post...');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    console.log('Request headers:', req.headers);

    const { title, content, category, author, externalLink } = req.body;

    if (!title || !content || !category || !author) {
      console.log('Missing required fields:', { title, content, category, author });
      return res.status(400).json({
        message: 'Please provide all required fields',
        missingFields: {
          title: !title,
          content: !content,
          category: !category,
          author: !author
        }
      });
    }

    const image = req.file ? req.file.path : '';

    const newPost = new Blog({
      title,
      content,
      category,
      author,
      image,
      externalLink: externalLink || ''
    });

    console.log('New post to be saved:', newPost);

    const post = await newPost.save();
    console.log('Post saved successfully:', post);
    res.status(201).json(post);
  } catch (err) {
    console.error('Error creating blog post:', err);
    console.error('Error stack:', err.stack);
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      code: err.code
    });

    // If there was a file uploaded but the save failed, delete the file
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
      });
    }

    res.status(500).json({
      message: 'Server error',
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// @route   PUT /api/blog/:id
// @desc    Update a blog post
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), upload.single('image'), async (req, res) => {
  try {
    const { title, content, category, author, externalLink } = req.body;
    const image = req.file ? req.file.path : req.body.image;

    const post = await Blog.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // If there's a new image and the post had an old image, delete the old image
    if (req.file && post.image) {
      fs.unlink(post.image, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting old image:', unlinkErr);
      });
    }

    post.title = title || post.title;
    post.content = content || post.content;
    post.category = category || post.category;
    post.author = author || post.author;
    post.image = image || post.image;
    post.externalLink = externalLink !== undefined ? externalLink : post.externalLink;
    post.updatedAt = Date.now();

    const updatedPost = await post.save();
    res.json(updatedPost);
  } catch (err) {
    console.error('Error updating blog post:', err);
    // If there was a file uploaded but the save failed, delete the file
    if (req.file) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting uploaded file:', unlinkErr);
      });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route   DELETE /api/blog/:id
// @desc    Delete a blog post
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const post = await Blog.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Delete the associated image if it exists
    if (post.image) {
      fs.unlink(post.image, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting image:', unlinkErr);
      });
    }

    await Blog.deleteOne({ _id: req.params.id });
    res.json({ message: 'Post removed' });
  } catch (err) {
    console.error('Error deleting blog post:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;