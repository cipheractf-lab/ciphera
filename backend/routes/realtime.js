const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../config');
const { getRedisSubscriber } = require('../utils/redis');
const User = require('../models/User');

// Use centralized Redis subscriber for pub/sub (singleton pattern)
const subscriber = getRedisSubscriber();

// Track active connections to avoid duplicate subscriptions
let activeConnections = 0;
let isSubscribed = false;
const configuredCorsOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const defaultCorsOrigin = configuredCorsOrigins.find((origin) => origin !== '*') || 'http://localhost:5173';

function resolveSseOrigin(requestOrigin) {
    if (!requestOrigin) {
        return defaultCorsOrigin;
    }

    if (requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1')) {
        return requestOrigin;
    }

    if (configuredCorsOrigins.includes(requestOrigin)) {
        return requestOrigin;
    }

    return defaultCorsOrigin;
}

// Subscribe to channel once when first admin connects
function ensureSubscribed() {
    if (!isSubscribed) {
        subscriber.subscribe('ctf:submissions:live', (err) => {
            if (err) {
                console.error('[Redis] Failed to subscribe to submissions channel:', err);
            } else {
                console.log('[Redis] Subscribed to ctf:submissions:live');
                isSubscribed = true;
            }
        });
    }
}

/**
 * Admin Real-Time Submission Monitoring Endpoint
 * Uses Server-Sent Events (SSE) for real-time updates
 * 
 * @route GET /r-submission
 * @access Admin only
 * @auth Cookie (access_token or token) or Query param (?token=<jwt>)
 */
router.get('/', async (req, res) => {
    // 1. Authentication - check cookies (access_token priority, then token), then query param
    const token = req.cookies.access_token || req.cookies.token || req.query.token;

    if (!token) {
        return res.status(401).json({ 
            success: false,
            message: 'No token provided. Login required.' 
        });
    }

    try {
        // Verify JWT and check admin role
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                message: 'Access denied. Admin role required.' 
            });
        }

        console.log(`[SSE] Admin ${user.username} connected to live submission feed`);
    } catch (err) {
        return res.status(401).json({ 
            success: false,
            message: 'Invalid or expired token' 
        });
    }

    // 2. Setup SSE Headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Important for Nginx
        'Access-Control-Allow-Origin': resolveSseOrigin(req.headers.origin),
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin',
    });

    // 3. Send initial connection message
    res.write(`data: ${JSON.stringify({ 
        type: 'connected', 
        message: 'Connected to live CTF submission stream',
        timestamp: new Date().toISOString()
    })}\n\n`);

    // Keep connection alive with periodic heartbeat
    const heartbeatInterval = setInterval(() => {
        res.write(`:heartbeat ${Date.now()}\n\n`);
    }, config.realtime.heartbeatIntervalMs);

    // 4. Message Handler for this specific connection
    const messageHandler = (channel, message) => {
        if (channel === 'ctf:submissions:live') {
            try {
                console.log('[Real-time] Received message on channel:', channel);
                console.log('[Real-time] Message content:', message);
                // Forward message to admin (already formatted as JSON by publisher)
                res.write(`data: ${message}\n\n`);
            } catch (err) {
                console.error('Error writing SSE message:', err);
            }
        }
    };

    // 5. Subscribe to Redis channel (only once globally)
    ensureSubscribed();
    
    // Attach listener for this connection
    subscriber.on('message', messageHandler);
    activeConnections++;
    console.log(`Active admin connections: ${activeConnections}`);

    // 6. Cleanup on client disconnect
    req.on('close', () => {
        clearInterval(heartbeatInterval);
        subscriber.removeListener('message', messageHandler);
        activeConnections--;
        console.log(`Admin disconnected. Active connections: ${activeConnections}`);
        
        // If no more admins are listening, we could optionally unsubscribe
        // but keeping subscription active is fine (low overhead)
    });
});

module.exports = router;
