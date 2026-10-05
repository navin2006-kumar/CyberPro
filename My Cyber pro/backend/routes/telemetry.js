'use strict';
/**
 * CyberPro — Telemetry API Routes
 * POST /api/telemetry/event      — receive an event (from containers or student UI)
 * GET  /api/telemetry/events/:id — list events for an exercise
 */

const express = require('express');
const crypto = require('crypto');
const net = require('net');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../middleware/auth');

const VALID_SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'];
const STUDENT_EVENT_TYPES = new Set([
    'host_identified', 'log_analysis_submitted', 'containment_action'
]);
const CONTAINER_EVENT_TYPES = new Set([
    'modbus_anomaly', 'port_scan_detected', 'connection_flood', 'unknown_protocol',
    'auth_failure', 'plc_command_rejected', 'unauthorized_access', 'suspicious_traffic'
]);
const CONTAINER_SOURCES = new Set(['ids', 'plc', 'scada', 'collector', 'ews']);
const ALLOWED_EVENT_TYPES = new Map([
    ['student', STUDENT_EVENT_TYPES],
    ...[...CONTAINER_SOURCES].map(source => [source, CONTAINER_EVENT_TYPES])
]);
const REQUEST_FIELDS = new Set([
    'exercise_id', 'scenario_id', 'source', 'event_type', 'severity', 'data'
]);

function hasValidContainerSecret(candidate) {
    const configured = process.env.CONTAINER_SECRET;
    if (typeof candidate !== 'string' || typeof configured !== 'string' || !configured) return false;
    const candidateBuffer = Buffer.from(candidate);
    const configuredBuffer = Buffer.from(configured);
    return candidateBuffer.length === configuredBuffer.length &&
        crypto.timingSafeEqual(candidateBuffer, configuredBuffer);
}

function canonicalJson(value) {
    if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map(key =>
            `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function validEventPayload(source, eventType, severity, data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

    if (eventType === 'modbus_anomaly') {
        return data.dst_port === 502 && ['medium', 'high', 'critical'].includes(severity);
    }

    if (source !== 'student') return true;
    if (eventType === 'host_identified') {
        return typeof data.identified_ip === 'string' && net.isIPv4(data.identified_ip);
    }
    if (eventType === 'log_analysis_submitted') {
        return typeof data.analysis_text === 'string' && data.analysis_text.trim().length > 0;
    }
    if (eventType === 'containment_action') {
        return ['block_ip', 'isolate_container', 'firewall_rule', 'disconnect_network']
            .includes(data.action_type);
    }
    return false;
}

/**
 * POST /api/telemetry/event
 * Accept a telemetry event from a lab container or the student UI.
 * Container-originated events can skip auth (use shared secret instead).
 * Student-originated events require session auth.
 */
router.post('/event', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const body = req.body;

        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return res.status(400).json({ success: false, message: 'A JSON object is required' });
        }

        if (Object.keys(body).some(field => !REQUEST_FIELDS.has(field))) {
            return res.status(400).json({
                success: false, message: 'Unsupported telemetry fields are not accepted'
            });
        }

        const {
            exercise_id: exerciseId,
            scenario_id: scenarioId,
            source,
            event_type: eventType,
            severity = 'info',
            data
        } = body;

        if (typeof exerciseId !== 'string' || !exerciseId.trim() ||
            typeof source !== 'string' || typeof eventType !== 'string' || !eventType.trim()) {
            return res.status(400).json({
                success: false, message: 'exercise_id, source, and event_type are required'
            });
        }

        const allowedEventTypes = ALLOWED_EVENT_TYPES.get(source);
        if (!allowedEventTypes) {
            return res.status(400).json({ success: false, message: 'Invalid telemetry source' });
        }

        if (!allowedEventTypes.has(eventType)) {
            return res.status(400).json({
                success: false, message: 'Event type is not permitted for this source'
            });
        }

        if (!VALID_SEVERITIES.includes(severity)) {
            return res.status(400).json({ success: false, message: 'Invalid telemetry severity' });
        }

        const sessionUserId = req.session && req.session.userId;
        const isStudentSession = Number.isSafeInteger(Number(sessionUserId)) && Number(sessionUserId) > 0;
        const isContainerAuth = CONTAINER_SOURCES.has(source) &&
            hasValidContainerSecret(req.headers['x-cyberpro-secret']);

        if (source === 'student' && !isStudentSession) {
            return res.status(401).json({
                success: false, message: 'Student evidence requires an authenticated session'
            });
        }

        if (source !== 'student' && !isContainerAuth) {
            return res.status(401).json({
                success: false, message: 'Container telemetry requires the configured secret'
            });
        }

        if (scenarioId !== undefined &&
            (typeof scenarioId !== 'string' || !scenarioId.trim())) {
            return res.status(400).json({ success: false, message: 'Invalid scenario_id' });
        }

        const exercise = await new Promise((resolve, reject) => {
            db.db.get('SELECT id, scenario_id, user_id, status FROM exercise_sessions WHERE id = ?',
                [exerciseId], (error, row) => error ? reject(error) : resolve(row));
        });

        if (!exercise) {
            return res.status(404).json({ success: false, message: 'Exercise not found' });
        }

        if (exercise.status !== 'active') {
            return res.status(409).json({ success: false, message: 'Exercise is not active' });
        }

        if (scenarioId !== undefined && scenarioId !== exercise.scenario_id) {
            return res.status(400).json({
                success: false, message: 'scenario_id does not match the exercise'
            });
        }

        if (source === 'student' && Number(exercise.user_id) !== Number(sessionUserId)) {
            return res.status(403).json({
                success: false, message: 'Evidence can only be submitted for your own exercise'
            });
        }

        if (!validEventPayload(source, eventType, severity, data)) {
            return res.status(400).json({
                success: false, message: 'Telemetry payload is invalid for this event type'
            });
        }

        const eventId = uuidv4();
        const eventUserId = source === 'student' ? exercise.user_id : null;
        const serializedData = canonicalJson(data);
        const inserted = await new Promise((resolve, reject) => {
            db.db.run(
                `INSERT INTO telemetry_events
                    (id, exercise_id, scenario_id, user_id, source, event_type, severity, data)
                 SELECT ?, ?, ?, ?, ?, ?, ?, ?
                 WHERE NOT EXISTS (
                    SELECT 1 FROM telemetry_events
                    WHERE exercise_id = ? AND source = ? AND event_type = ?
                      AND severity = ? AND data = ?
                 )`,
                [eventId, exercise.id, exercise.scenario_id, eventUserId,
                 source, eventType, severity, serializedData,
                 exercise.id, source, eventType, severity, serializedData],
                function (error) {
                    if (error) return reject(error);
                    resolve(this.changes === 1);
                }
            );
        });

        if (!inserted) {
            return res.status(409).json({
                success: false, message: 'Duplicate or replayed telemetry evidence'
            });
        }

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
            events: events.map(event => {
                if (!event.data) return { ...event, data: {} };
                try {
                    return { ...event, data: JSON.parse(event.data) };
                } catch {
                    return { ...event, data: { raw: event.data, parse_error: true } };
                }
            })
        });

    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
