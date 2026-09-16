const express = require('express');
const router = express.Router();
const RegistrationStatus = require('../models/RegistrationStatus');
const { protect, authorize } = require('../middleware/auth');

// Get registration status
router.get('/', async (req, res) => {
  console.log('GET /api/registration-status - Request received');
  try {
    let status = await RegistrationStatus.findOne();
    if (!status) {
      console.log('No status found, creating new one');
      status = new RegistrationStatus();
      await status.save();
    }
    console.log('Sending status:', status);
    res.json(status);
  } catch (error) {
    console.error('Error getting registration status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update registration status (admin only)
router.put('/', protect, authorize('admin'), async (req, res) => {
  console.log('PUT /api/registration-status - Request received');
  console.log('Request body:', req.body);
  console.log('User:', req.user);
  
  try {
    let status = await RegistrationStatus.findOne();
    if (!status) {
      console.log('No status found, creating new one');
      status = new RegistrationStatus();
    }
    
    status.isEnabled = req.body.isEnabled;
    status.updatedAt = new Date();
    await status.save();
    
    console.log('Updated status:', status);
    res.json(status);
  } catch (error) {
    console.error('Error updating registration status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 