const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/notices
// @desc    Get all active notices
// @access  Public
router.get('/', async (req, res) => {
  try {
    const notices = await Notice.find({ isActive: true })
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: notices
    });
  } catch (err) {
    console.error('Error fetching notices:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// @route   GET /api/notices/unread-count
// @desc    Get unread notice count for logged in user
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const unreadCount = await Notice.countDocuments({ 
      isActive: true,
      readBy: { $ne: userId }
    });
    
    res.json({
      success: true,
      count: unreadCount
    });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// @route   POST /api/notices/mark-all-read
// @desc    Mark all notices as read by logged in user
// @access  Private
router.post('/mark-all-read', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    // Get all active notices that user hasn't read
    const unreadNotices = await Notice.find({ 
      isActive: true,
      readBy: { $ne: userId }
    });
    
    // Mark all as read
    await Notice.updateMany(
      { 
        isActive: true,
        readBy: { $ne: userId }
      },
      { 
        $addToSet: { readBy: userId }
      }
    );
    
    res.json({
      success: true,
      message: `Marked ${unreadNotices.length} notices as read`
    });
  } catch (err) {
    console.error('Error marking all notices as read:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// @route   POST /api/notices/:id/mark-read
// @desc    Mark notice as read by logged in user
// @access  Private
router.post('/:id/mark-read', protect, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const notice = await Notice.findById(req.params.id);
    
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    if (!notice.readBy.includes(userId)) {
      notice.readBy.push(userId);
      await notice.save();
    }
    
    res.json({
      success: true,
      message: 'Notice marked as read'
    });
  } catch (err) {
    console.error('Error marking notice as read:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// @route   GET /api/notices/:id
// @desc    Get single notice
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id)
      .populate('createdBy', 'username email');
    
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }
    
    res.json({
      success: true,
      data: notice
    });
  } catch (err) {
    console.error('Error fetching notice:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// @route   POST /api/notices
// @desc    Create a new notice
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and description',
        missingFields: {
          title: !title,
          description: !description
        }
      });
    }

    const newNotice = new Notice({
      title,
      description,
      createdBy: req.user._id || req.user.id,
      readBy: [req.user._id || req.user.id] // Auto-mark as read for creator
    });

    const notice = await newNotice.save();
    await notice.populate('createdBy', 'username email');

    res.status(201).json({
      success: true,
      message: 'Notice created successfully',
      data: notice
    });
  } catch (err) {
    console.error('Error creating notice:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// @route   PUT /api/notices/:id
// @desc    Update a notice
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, description, isActive } = req.body;

    let notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    notice.title = title || notice.title;
    notice.description = description || notice.description;
    notice.isActive = isActive !== undefined ? isActive : notice.isActive;
    notice.updatedAt = Date.now();

    notice = await notice.save();
    await notice.populate('createdBy', 'username email');

    res.json({
      success: true,
      message: 'Notice updated successfully',
      data: notice
    });
  } catch (err) {
    console.error('Error updating notice:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

// @route   DELETE /api/notices/:id
// @desc    Delete a notice
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    
    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found'
      });
    }

    res.json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting notice:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
});

module.exports = router;
