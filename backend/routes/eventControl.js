const express = require('express');
const router = express.Router();
const EventState = require('../models/EventState');
const { protect, authorize } = require('../middleware/auth');
const { getEventState, refreshEventStateCache } = require('../middleware/eventState');
const { getRedisClient } = require('../utils/redis');

const redisClient = getRedisClient();
const FIXED_ID = '000000000000000000000001';

const ACTION_INFO = {
  start: {
    title: 'Start CTF',
    description: 'Starts the competition immediately. Users can submit flags once started (unless paused).'
  },
  end: {
    title: 'End CTF',
    description: 'Ends the competition immediately. Submissions are blocked and event status becomes ended.'
  },
  freeze: {
    title: 'Freeze Scoreboard',
    description: 'Freezes scoreboard updates for non-admin users from now onward. Submissions still count internally.'
  },
  pause: {
    title: 'Pause CTF',
    description: 'Temporarily blocks flag submissions without ending the event. Challenge viewing remains available.'
  },
  resume: {
    title: 'Resume CTF',
    description: 'Unpauses the event and re-enables flag submissions.'
  }
};

const toCacheState = (doc) => ({
  status: doc.status,
  startedAt: doc.startedAt,
  endedAt: doc.endedAt,
  freezeAt: doc.freezeAt,
  isPaused: doc.isPaused,
  pausedAt: doc.pausedAt,
  pausedBy: doc.pausedBy,
  resumedAt: doc.resumedAt,
  resumedBy: doc.resumedBy,
  startedBy: doc.startedBy,
  endedBy: doc.endedBy,
  customMessage: doc.customMessage
});

const publishEventState = async (payload) => {
  try {
    await redisClient.publish('ctf:event:state', JSON.stringify(payload));
  } catch (err) {
    console.warn('[EventControl] Failed to publish event state change:', err.message);
  }
};

router.get('/status', async (req, res) => {
  try {
    const eventState = await getEventState();

    res.json({
      success: true,
      data: {
        status: eventState.status,
        startedAt: eventState.startedAt,
        endedAt: eventState.endedAt,
        freezeAt: eventState.freezeAt,
        isFrozen: eventState.isFrozen,
        isPaused: eventState.isPaused,
        pausedAt: eventState.pausedAt,
        isSubmissionAllowed: eventState.isSubmissionAllowed,
        customMessage: eventState.customMessage,
        actions: ACTION_INFO
      }
    });
  } catch (error) {
    console.error('Error fetching event status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event status'
    });
  }
});

router.post('/set-times', protect, authorize('admin'), async (req, res) => {
  try {
    const { startTime, endTime, freezeTime } = req.body;

    const updatedState = await EventState.setCompetitionTimes(
      {
        startTime: startTime || null,
        endTime: endTime || null,
        freezeTime: freezeTime || null
      },
      req.user._id
    );

    await refreshEventStateCache(toCacheState(updatedState));

    await publishEventState({
      type: 'event_times_updated',
      startedAt: updatedState.startedAt,
      endedAt: updatedState.endedAt,
      freezeAt: updatedState.freezeAt,
      updatedBy: req.user.username || req.user._id
    });

    res.json({
      success: true,
      message: 'Competition times updated successfully',
      data: {
        startedAt: updatedState.startedAt,
        endedAt: updatedState.endedAt,
        freezeAt: updatedState.freezeAt
      }
    });
  } catch (error) {
    console.error('Error setting competition times:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error setting competition times'
    });
  }
});

router.post('/start', protect, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();

    const updatedState = await EventState.findByIdAndUpdate(
      FIXED_ID,
      {
        status: 'started',
        startedAt: now,
        endedAt: null,
        freezeAt: null,
        isPaused: false,
        pausedAt: null,
        pausedBy: null,
        resumedAt: now,
        resumedBy: req.user._id,
        startedBy: req.user._id,
        endedBy: null,
        updatedAt: now
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await refreshEventStateCache(toCacheState(updatedState));

    await publishEventState({
      type: 'event_started',
      status: 'started',
      startedAt: updatedState.startedAt,
      startedBy: req.user.username || req.user._id
    });

    res.json({
      success: true,
      message: 'CTF started successfully',
      data: {
        status: updatedState.status,
        startedAt: updatedState.startedAt,
        freezeAt: updatedState.freezeAt,
        endedAt: updatedState.endedAt
      }
    });
  } catch (error) {
    console.error('Error starting event:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting CTF event'
    });
  }
});

router.post('/end', protect, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    const currentState = await getEventState();

    if (currentState.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'CTF is already ended'
      });
    }

    const updatedState = await EventState.findByIdAndUpdate(
      FIXED_ID,
      {
        status: 'ended',
        endedAt: now,
        endedBy: req.user._id,
        isPaused: false,
        pausedAt: null,
        pausedBy: null,
        updatedAt: now
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await refreshEventStateCache(toCacheState(updatedState));

    await publishEventState({
      type: 'event_ended',
      status: 'ended',
      endedAt: updatedState.endedAt,
      endedBy: req.user.username || req.user._id
    });

    res.json({
      success: true,
      message: 'CTF ended successfully',
      data: {
        status: updatedState.status,
        endedAt: updatedState.endedAt
      }
    });
  } catch (error) {
    console.error('Error ending event:', error);
    res.status(500).json({
      success: false,
      message: 'Error ending CTF event'
    });
  }
});

router.post('/freeze', protect, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    const currentState = await getEventState();

    if (currentState.status !== 'started') {
      return res.status(400).json({
        success: false,
        message: 'CTF must be started before freezing scoreboard'
      });
    }

    if (currentState.isFrozen) {
      return res.status(400).json({
        success: false,
        message: 'Scoreboard is already frozen'
      });
    }

    const updatedState = await EventState.findByIdAndUpdate(
      FIXED_ID,
      {
        freezeAt: now,
        updatedAt: now
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await refreshEventStateCache(toCacheState(updatedState));

    await publishEventState({
      type: 'scoreboard_frozen',
      freezeAt: updatedState.freezeAt,
      frozenBy: req.user.username || req.user._id
    });

    res.json({
      success: true,
      message: 'Scoreboard frozen successfully',
      data: {
        freezeAt: updatedState.freezeAt
      }
    });
  } catch (error) {
    console.error('Error freezing scoreboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error freezing scoreboard'
    });
  }
});

router.post('/pause', protect, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    const currentState = await getEventState();

    if (currentState.status !== 'started') {
      return res.status(400).json({
        success: false,
        message: 'CTF must be started before pausing'
      });
    }

    if (currentState.isPaused) {
      return res.status(400).json({
        success: false,
        message: 'CTF is already paused'
      });
    }

    const updatedState = await EventState.findByIdAndUpdate(
      FIXED_ID,
      {
        isPaused: true,
        pausedAt: now,
        pausedBy: req.user._id,
        updatedAt: now
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await refreshEventStateCache(toCacheState(updatedState));

    await publishEventState({
      type: 'event_paused',
      pausedAt: updatedState.pausedAt,
      pausedBy: req.user.username || req.user._id
    });

    res.json({
      success: true,
      message: 'CTF paused successfully. Submissions are now blocked.',
      data: {
        isPaused: updatedState.isPaused,
        pausedAt: updatedState.pausedAt
      }
    });
  } catch (error) {
    console.error('Error pausing event:', error);
    res.status(500).json({
      success: false,
      message: 'Error pausing CTF event'
    });
  }
});

router.post('/resume', protect, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    const currentState = await getEventState();

    if (!currentState.isPaused) {
      return res.status(400).json({
        success: false,
        message: 'CTF is not paused'
      });
    }

    if (currentState.status !== 'started') {
      return res.status(400).json({
        success: false,
        message: 'Cannot resume because CTF is not in started state'
      });
    }

    const updatedState = await EventState.findByIdAndUpdate(
      FIXED_ID,
      {
        isPaused: false,
        resumedAt: now,
        resumedBy: req.user._id,
        updatedAt: now
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await refreshEventStateCache(toCacheState(updatedState));

    await publishEventState({
      type: 'event_resumed',
      resumedAt: updatedState.resumedAt,
      resumedBy: req.user.username || req.user._id
    });

    res.json({
      success: true,
      message: 'CTF resumed successfully. Submissions are now enabled.',
      data: {
        isPaused: updatedState.isPaused,
        resumedAt: updatedState.resumedAt
      }
    });
  } catch (error) {
    console.error('Error resuming event:', error);
    res.status(500).json({
      success: false,
      message: 'Error resuming CTF event'
    });
  }
});

router.post('/set-message', protect, authorize('admin'), async (req, res) => {
  try {
    const { message } = req.body;

    if (message && message.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 500 characters'
      });
    }

    const updatedState = await EventState.findByIdAndUpdate(
      FIXED_ID,
      {
        customMessage: message || null,
        updatedAt: new Date()
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await refreshEventStateCache(toCacheState(updatedState));

    await publishEventState({
      type: 'message_updated',
      customMessage: updatedState.customMessage,
      updatedBy: req.user.username || req.user._id
    });

    res.json({
      success: true,
      message: message ? 'Custom message set successfully' : 'Custom message cleared',
      data: {
        customMessage: updatedState.customMessage
      }
    });
  } catch (error) {
    console.error('Error setting custom message:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting custom message'
    });
  }
});

module.exports = router;
