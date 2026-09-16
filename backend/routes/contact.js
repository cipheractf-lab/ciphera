const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { check, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/contact
// @desc    Submit a contact form message
// @access  Private
router.post(
  '/',
  protect,
  [
    check('name', 'Name is required').not().isEmpty().trim(),
    check('email', 'Please include a valid email').isEmail().normalizeEmail(),
    check('subject', 'Subject is required').not().isEmpty().trim(),
    check('message', 'Message is required').not().isEmpty().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, email, subject, message } = req.body;

      const contact = new Contact({
        name,
        email,
        subject,
        message
      });

      await contact.save();

      res.status(201).json({ message: 'Message sent successfully' });
    } catch (err) {
      console.error('Error in contact submission:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   GET /api/contact
// @desc    Get all contact messages (admin only)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    console.error('Error fetching contact messages:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/contact/:id/status
// @desc    Update message status (admin only)
// @access  Private/Admin
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['unread', 'read', 'replied'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const message = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json(message);
  } catch (err) {
    console.error('Error updating message status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/contact/:id
// @desc    Delete a contact message (admin only)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const message = await Contact.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 