const express = require('express');
const router = express.Router();
const Newsletter = require('../models/Newsletter');
const { protect, authorize } = require('../middleware/auth');

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email already exists
    const existingSubscriber = await Newsletter.findOne({ email });
    if (existingSubscriber) {
      return res.status(400).json({ message: 'Email already subscribed' });
    }

    const subscriber = new Newsletter({
      email,
      subscribedAt: new Date()
    });

    await subscriber.save();
    res.status(201).json({ message: 'Successfully subscribed to newsletter' });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all subscribers (admin only)
router.get('/subscribers', protect, authorize('admin'), async (req, res) => {
  try {
    const subscribers = await Newsletter.find().sort({ subscribedAt: -1 });
    res.json(subscribers);
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete subscriber (admin only)
router.delete('/subscribers/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const subscriber = await Newsletter.findById(req.params.id);
    if (!subscriber) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }

    await subscriber.deleteOne();
    res.json({ message: 'Subscriber removed successfully' });
  } catch (error) {
    console.error('Delete subscriber error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 