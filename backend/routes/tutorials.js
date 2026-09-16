const express = require('express');
const router = express.Router();
const Tutorial = require('../models/Tutorial');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/tutorials
// @desc    Get all tutorials
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    console.log('Fetching all tutorials...');
    const tutorials = await Tutorial.find()
      .populate('author', 'username')
      .sort({ createdAt: -1 });

    console.log(`Found ${tutorials.length} tutorials`);
    res.json({
      success: true,
      count: tutorials.length,
      tutorials
    });
  } catch (error) {
    console.error('Error fetching tutorials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tutorials',
      error: error.message
    });
  }
});

// @route   GET /api/tutorials/:id
// @desc    Get single tutorial
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    console.log(`Fetching tutorial with id: ${req.params.id}`);
    const tutorial = await Tutorial.findById(req.params.id)
      .populate('author', 'username');

    if (!tutorial) {
      console.log('Tutorial not found');
      return res.status(404).json({
        success: false,
        message: 'Tutorial not found'
      });
    }

    console.log('Tutorial found:', tutorial.title);
    res.json({
      success: true,
      tutorial
    });
  } catch (error) {
    console.error('Error fetching tutorial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tutorial',
      error: error.message
    });
  }
});

// @route   POST /api/tutorials
// @desc    Create a tutorial
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    console.log('Creating new tutorial:', req.body.title);
    
    // Add author to request body
    req.body.author = req.user._id || req.user.id;
    
    const tutorial = await Tutorial.create(req.body);
    console.log('Tutorial created successfully:', tutorial.title);

    res.status(201).json({
      success: true,
      tutorial
    });
  } catch (error) {
    console.error('Error creating tutorial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tutorial',
      error: error.message
    });
  }
});

// @route   PUT /api/tutorials/:id
// @desc    Update a tutorial
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    console.log(`Updating tutorial with id: ${req.params.id}`);
    let tutorial = await Tutorial.findById(req.params.id);

    if (!tutorial) {
      console.log('Tutorial not found for update');
      return res.status(404).json({
        success: false,
        message: 'Tutorial not found'
      });
    }

    // Update the updatedAt timestamp
    req.body.updatedAt = Date.now();

    tutorial = await Tutorial.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('author', 'username');

    console.log('Tutorial updated successfully:', tutorial.title);
    res.json({
      success: true,
      tutorial
    });
  } catch (error) {
    console.error('Error updating tutorial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tutorial',
      error: error.message
    });
  }
});

// @route   DELETE /api/tutorials/:id
// @desc    Delete a tutorial
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    console.log(`Deleting tutorial with id: ${req.params.id}`);
    const tutorial = await Tutorial.findById(req.params.id);

    if (!tutorial) {
      console.log('Tutorial not found for deletion');
      return res.status(404).json({
        success: false,
        message: 'Tutorial not found'
      });
    }

    await tutorial.deleteOne();
    console.log('Tutorial deleted successfully');

    res.json({
      success: true,
      message: 'Tutorial deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tutorial:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tutorial',
      error: error.message
    });
  }
});

module.exports = router; 