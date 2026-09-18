'use strict';
/**
 * CyberPro — Timeline Engine
 * Generates a chronological, human-readable timeline of events for an exercise.
 *
 * SOURCE: Generated from telemetry_events table only — never manually constructed.
 * Each entry maps to exactly one event in the DB, preserving the audit trail.
 */

const EVENT_DESCRIPTIONS = {
    // System events
    'exercise_started':       (d) => `Exercise started by ${d.username || 'student'}`,
    'exercise_ended':         (d) => `Exercise ended`,
    'lab_provisioned':        (d) => `Lab environment provisioned and health-checked`,
    'container_started':      (d) => `Container started: ${d.container_name || 'unknown'}`,

    // IDS events
    'modbus_anomaly':         (d) => `IDS ALERT: Anomalous Modbus/TCP traffic detected — ` +
                                     `${d.src_ip || '?'} → ${d.dst_ip || '?'}:${d.dst_port || 502}`,
    'port_scan_detected':     (d) => `IDS ALERT: Port scan detected from ${d.src_ip || '?'}`,
    'connection_flood':       (d) => `IDS ALERT: Connection flood from ${d.src_ip || '?'}`,
    'unknown_protocol':       (d) => `IDS ALERT: Unknown protocol on OT network`,

    // Student actions
    'host_identified':        (d) => `Student identified affected host: ${d.identified_ip || '?'}`,
    'log_analysis_submitted': (d) => `Student submitted log analysis (${(d.analysis_text || '').length} chars)`,
    'containment_action':     (d) => `Student applied containment: ${d.action_type || 'unspecified'}`,
    'debrief_submitted':      (d) => `Reflective debrief submitted`,

    // Reset events
    'reset_initiated':        (d) => `Environment reset initiated`,
    'reset_completed':        (d) => `Environment reset completed — clean state verified`,
    'reset_failed':           (d) => `Environment reset FAILED: ${d.reason || 'unknown reason'}`,

    // Scoring
    'objectives_evaluated':   (d) => `Objectives evaluated — score: ${d.total_score || 0}/${d.max_score || 100}`,
};

const SEVERITY_LABELS = {
    'info': 'ℹ',
    'low': '🟡',
    'medium': '🟠',
    'high': '🔴',
    'critical': '🚨'
};

class TimelineEngine {
    /**
     * @param {object} db - Database instance
     */
    constructor(db) {
        this.db = db;
    }

    /**
     * Generate the timeline for an exercise.
     * @param {string} exerciseId
     * @returns {Promise<object>} { exercise_id, entry_count, entries[] }
     */
    async generate(exerciseId) {
        const events = await this._getEvents(exerciseId);
        const exercise = await this._getExercise(exerciseId);

        const entries = events.map(event => {
            const data = this._parseData(event.data);
            const description = this._describe(event.event_type, data);
            const label = SEVERITY_LABELS[event.severity] || 'ℹ';

            return {
                id: event.id,
                timestamp: event.timestamp,
                time_display: this._formatTime(event.timestamp),
                source: event.source,
                event_type: event.event_type,
                severity: event.severity,
                severity_label: label,
                description,
                data
            };
        });

        // Calculate relative times from exercise start
        if (exercise && exercise.start_time && entries.length > 0) {
            const start = new Date(exercise.start_time).getTime();
            entries.forEach(e => {
                const ms = new Date(e.timestamp).getTime() - start;
                e.relative_time_seconds = Math.max(0, Math.round(ms / 1000));
                e.relative_time_display = this._formatRelative(e.relative_time_seconds);
            });
        }

        return {
            exercise_id: exerciseId,
            scenario_id: exercise ? exercise.scenario_id : null,
            exercise_start: exercise ? exercise.start_time : null,
            exercise_end: exercise ? exercise.end_time : null,
            entry_count: entries.length,
            entries,
            generated_at: new Date().toISOString(),
            note: 'Timeline generated from recorded telemetry events. Each entry is traceable to a persisted event record.'
        };
    }

    _describe(eventType, data) {
        const fn = EVENT_DESCRIPTIONS[eventType];
        if (fn) return fn(data);
        // Fallback: readable type + any key data fields
        const keys = Object.keys(data).slice(0, 3).map(k => `${k}=${data[k]}`).join(', ');
        return `${eventType.replace(/_/g, ' ')}${keys ? ` (${keys})` : ''}`;
    }

    _parseData(raw) {
        if (!raw) return {};
        try { return JSON.parse(raw); } catch { return { raw }; }
    }

    _formatTime(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleTimeString('en-GB', { hour12: false }) +
               '.' + String(d.getMilliseconds()).padStart(3, '0');
    }

    _formatRelative(seconds) {
        if (seconds < 60) return `+${seconds}s`;
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `+${m}m${s > 0 ? `${s}s` : ''}`;
    }

    _getEvents(exerciseId) {
        return new Promise((resolve, reject) => {
            this.db.db.all(
                `SELECT * FROM telemetry_events WHERE exercise_id = ? ORDER BY timestamp ASC`,
                [exerciseId],
                (err, rows) => err ? reject(err) : resolve(rows || [])
            );
        });
    }

    _getExercise(exerciseId) {
        return new Promise((resolve, reject) => {
            this.db.db.get(
                'SELECT * FROM exercise_sessions WHERE id = ?',
                [exerciseId],
                (err, row) => err ? reject(err) : resolve(row)
            );
        });
    }
}

module.exports = TimelineEngine;
