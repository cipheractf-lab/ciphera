const express = require('express');
const router = express.Router();
const validator = require('validator');
const ExternalEvent = require('../models/ExternalEvent');
const { protect, authorize } = require('../middleware/auth');

const isValidEventUrl = (url) =>
  typeof url === 'string' &&
  validator.isURL(url, { protocols: ['http', 'https'], require_protocol: true });

// @route   GET /api/events
// @desc    List active events, soonest first (logged-in users)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const events = await ExternalEvent.find({ isActive: true })
      .populate('createdBy', 'username')
      .sort({ eventDate: 1 });

    res.json({
      success: true,
      data: events
    });
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/events/admin/all
// @desc    List every event (including inactive) for the admin management page
// @access  Private/Admin
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
  try {
    const events = await ExternalEvent.find({})
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: events
    });
  } catch (err) {
    console.error('Error fetching all events:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/events/:id
// @desc    Get a single event
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const event = await ExternalEvent.findById(req.params.id).populate('createdBy', 'username');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (err) {
    console.error('Error fetching event:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/events
// @desc    Create an event
// @access  Private/Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, description, eventDate, eventUrl } = req.body || {};

    if (!title || !description || !eventDate || !eventUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, event date and event URL'
      });
    }

    const parsedDate = new Date(eventDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        field: 'eventDate',
        message: 'Invalid event date'
      });
    }

    if (!isValidEventUrl(eventUrl)) {
      return res.status(400).json({
        success: false,
        field: 'eventUrl',
        message: 'Please provide a valid http(s) URL'
      });
    }

    const event = new ExternalEvent({
      title: String(title).trim(),
      description: String(description).trim(),
      eventDate: parsedDate,
      eventUrl: String(eventUrl).trim(),
      createdBy: req.user._id || req.user.id
    });

    await event.save();
    await event.populate('createdBy', 'username');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/events/:id
// @desc    Update an event
// @access  Private/Admin
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const event = await ExternalEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const { title, description, eventDate, eventUrl, isActive } = req.body || {};

    if (title !== undefined) event.title = String(title).trim();
    if (description !== undefined) event.description = String(description).trim();

    if (eventDate !== undefined) {
      const parsedDate = new Date(eventDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          field: 'eventDate',
          message: 'Invalid event date'
        });
      }
      event.eventDate = parsedDate;
    }

    if (eventUrl !== undefined) {
      if (!isValidEventUrl(eventUrl)) {
        return res.status(400).json({
          success: false,
          field: 'eventUrl',
          message: 'Please provide a valid http(s) URL'
        });
      }
      event.eventUrl = String(eventUrl).trim();
    }

    if (isActive !== undefined) event.isActive = Boolean(isActive);

    await event.save();
    await event.populate('createdBy', 'username');

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });
  } catch (err) {
    console.error('Error updating event:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/events/:id
// @desc    Delete an event
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const event = await ExternalEvent.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
