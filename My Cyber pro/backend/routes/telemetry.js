'use strict';
/**
 * CyberPro — Telemetry API Routes
 * POST /api/telemetry/event      — receive an event (from containers or student UI)
 * GET  /api/telemetry/events/:id — list events for an exercise
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireRole } = require('../middleware/auth');

const VALID_SOURCES = ['ids', 'plc', 'scada', 'student', 'system', 'collector', 'ews'];
const VALID_SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'];

/**
 * POST /api/telemetry/event
 * Accept a telemetry event from a lab container or the student UI.
 * Container-originated events can skip auth (use shared secret instead).
 * Student-originated events require session auth.
 */
router.post('/event', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const {
            exercise_id,
            scenario_id,
            source,
            event_type,
            severity = 'info',
            data = {}
        } = req.body;

        // Validate required fields
        if (!source || !event_type) {
            return res.status(400).json({
                success: false,
                message: 'source and event_type are required'
            });
        }

        if (!VALID_SOURCES.includes(source)) {
            return res.status(400).json({
                success: false,
                message: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}`
            });
        }

        if (!VALID_SEVERITIES.includes(severity)) {
            return res.status(400).json({
                success: false,
                message: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}`
            });
        }

        // Container auth: check shared secret header (for IDS/collector)
        const containerSecret = req.headers['x-cyberpro-secret'];
        const isContainerAuth = containerSecret &&
            containerSecret === process.env.CONTAINER_SECRET;

        // Student auth: check session
        const isStudentAuth = req.session && req.session.userId;

        // student-sourced events require session auth
        if (source === 'student' && !isStudentAuth) {
            return res.status(401).json({
                success: false,
                message: 'Student events require authentication'
            });
        }

        // Container events require either container secret or session
        if (source !== 'student' && !isContainerAuth && !isStudentAuth) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const eventId = uuidv4();
        const userId = req.session ? req.session.userId : null;

        await new Promise((resolve, reject) => {
            db.db.run(
                `INSERT INTO telemetry_events
                    (id, exercise_id, scenario_id, user_id, source, event_type, severity, data)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [eventId, exercise_id || null, scenario_id || null, userId,
                 source, event_type, severity, JSON.stringify(data)],
                (err) => err ? reject(err) : resolve()
            );
        });

        res.status(201).json({
            success: true,
            event_id: eventId,
            message: 'Event recorded'
        });

    } catch (error) {
        console.error('Telemetry event error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * GET /api/telemetry/events/:exerciseId
 * Retrieve events for an exercise session.
 * Students can only see events for their own exercises.
 * Instructors/admins can see all.
 */
router.get('/events/:exerciseId', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { exerciseId } = req.params;
        const { source, event_type, severity, limit = 500 } = req.query;

        // Check ownership (students can only see their own exercises)
        const exercise = await new Promise((resolve, reject) => {
            db.db.get('SELECT * FROM exercise_sessions WHERE id = ?', [exerciseId],
                (err, row) => err ? reject(err) : resolve(row));
        });

        if (!exercise) {
            return res.status(404).json({ success: false, message: 'Exercise not found' });
        }

        const userRole = req.session.role;
        const userId = req.session.userId;

        if (userRole === 'student' && exercise.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only view events from your own exercises'
            });
        }

        // Build query with optional filters
        let sql = 'SELECT * FROM telemetry_events WHERE exercise_id = ?';
        const params = [exerciseId];

        if (source) { sql += ' AND source = ?'; params.push(source); }
        if (event_type) { sql += ' AND event_type = ?'; params.push(event_type); }
        if (severity) { sql += ' AND severity = ?'; params.push(severity); }

        sql += ' ORDER BY timestamp ASC LIMIT ?';
        params.push(parseInt(limit));

        const events = await new Promise((resolve, reject) => {
            db.db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
        });

        res.json({
            success: true,
            exercise_id: exerciseId,
            count: events.length,
            events: events.map(e => ({
                ...e,
                data: e.data ? JSON.parse(e.data) : {}
            }))
        });

    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
