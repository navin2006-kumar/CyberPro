'use strict';
/**
 * CyberPro — Objective Engine
 * Evaluates whether a student has completed the objectives defined in a scenario.
 *
 * HOW IT WORKS:
 *   1. Load objectives for the scenario from the DB.
 *   2. For each objective, query telemetry_events matching the detection_logic.
 *   3. Write PASS/FAIL to objective_results, linking the evidence event IDs.
 *   4. Raw events are NEVER modified — only objective_results records are written.
 *
 * Every score is traceable: score ← objective_result ← telemetry_event IDs.
 */

const { v4: uuidv4 } = require('uuid');

class ObjectiveEngine {
    /**
     * @param {object} db - Database instance (db.js)
     */
    constructor(db) {
        this.db = db;
    }

    /**
     * Evaluate all objectives for an exercise session.
     * @param {string} exerciseId - UUID of the exercise_session
     * @returns {Promise<Array>} Array of objective result objects
     */
    async evaluateAll(exerciseId, options = {}) {
        const exercise = await this._getExercise(exerciseId);
        if (!exercise) throw new Error(`Exercise not found: ${exerciseId}`);

        const objectives = await this._getObjectives(exercise.scenario_id);
        if (!objectives.length) return [];

        const results = [];

        for (const obj of objectives) {
            const result = await this._evaluateObjective(exercise, obj, options);
            results.push(result);
        }

        return results;
    }

    /**
     * Evaluate a single objective.
     * @param {string} exerciseId
     * @param {object} objective - scenario_objectives row
     * @returns {Promise<object>} { objective_id, status, score, evidence_event_ids }
     */
    async _evaluateObjective(exercise, objective, options = {}) {
        const logic = this._parseDetectionLogic(objective.detection_logic);
        const { matchingEvents, validationDetails } = await this._queryMatchingEvents(exercise, logic);

        const validPoints = Number.isSafeInteger(objective.points) && objective.points >= 0
            ? objective.points
            : 0;
        const status = matchingEvents.length > 0 ? 'pass' : 'fail';
        const score = status === 'pass' ? validPoints : 0;
        const evidenceIds = matchingEvents.map(event => event.id).sort();
        const evaluationTimestamp = new Date().toISOString();

        if (options.persist !== false) {
            await this._saveObjectiveResult(
                exercise.id,
                objective.id,
                status,
                score,
                evidenceIds,
                validationDetails
            );
        }

        return {
            objective_id: objective.id,
            name: objective.name,
            required: !!objective.required,
            points: validPoints,
            status,
            score,
            evidence_event_ids: evidenceIds,
            evidence_count: matchingEvents.length,
            validation_details: validationDetails,
            evaluation_timestamp: evaluationTimestamp
        };
    }

    /**
     * Query telemetry_events that match the detection logic for an objective.
     */
    async _queryMatchingEvents(exercise, logic) {
        if (!logic) {
            return {
                matchingEvents: [],
                validationDetails: {
                    rule_valid: false,
                    candidate_event_count: 0,
                    accepted_event_ids: [],
                    rejected_events: []
                }
            };
        }

        return new Promise((resolve, reject) => {
                        const sql = `
                SELECT * FROM telemetry_events
                WHERE exercise_id = ?
                  AND scenario_id = ?
                   AND ((source = 'student' AND user_id = ?) OR
                       (source != 'student' AND user_id IS NULL))
                                ORDER BY id ASC
            `;

            this.db.db.all(sql, [
                exercise.id,
                exercise.scenario_id,
                                exercise.user_id
            ], (err, rows) => {
                if (err) return reject(err);

                const matchingEvents = [];
                const rejectedEvents = [];
                for (const row of rows || []) {
                    const reasons = [];
                    if (typeof row.id !== 'string' || !row.id) reasons.push('invalid_event_id');
                    if (row.source !== logic.source) reasons.push('source_mismatch');
                    if (row.event_type !== logic.event_type) reasons.push('event_type_mismatch');
                    if (reasons.length > 0) {
                        rejectedEvents.push({
                            event_id: row.id || null,
                            reasons: [...new Set(reasons)].sort()
                        });
                        continue;
                    }
                    if (typeof row.data !== 'string') {
                        reasons.push('payload_not_string');
                        rejectedEvents.push({ event_id: row.id || null, reasons });
                        continue;
                    }

                    let data;
                    try {
                        data = JSON.parse(row.data);
                    } catch {
                        reasons.push('malformed_json');
                        rejectedEvents.push({ event_id: row.id || null, reasons });
                        continue;
                    }

                    if (!data || typeof data !== 'object' || Array.isArray(data)) {
                        reasons.push('payload_not_object');
                    } else {
                        reasons.push(...this._validateFields(data, logic.field_checks || {}, row));
                    }

                    if (reasons.length > 0) {
                        rejectedEvents.push({ event_id: row.id || null, reasons: [...new Set(reasons)].sort() });
                    } else {
                        matchingEvents.push(row);
                    }
                }

                const acceptedEventIds = matchingEvents.map(event => event.id).sort();
                rejectedEvents.sort((left, right) =>
                    String(left.event_id).localeCompare(String(right.event_id)));
                resolve({
                    matchingEvents,
                    validationDetails: {
                        rule_valid: true,
                        rule: logic,
                        candidate_event_count: (rows || []).length,
                        accepted_event_ids: acceptedEventIds,
                        rejected_events: rejectedEvents
                    }
                });
            });
        });
    }

    /**
     * Check that a telemetry event's data fields match the required conditions.
     */
    _validateFields(data, checks, row) {
        if (!checks || typeof checks !== 'object' || Array.isArray(checks)) {
            return ['invalid_field_checks'];
        }

        const reasons = [];

        for (const [field, expected] of Object.entries(checks)) {
            if (field.endsWith('_min_length')) {
                const actualField = field.replace('_min_length', '');
                const text = data[actualField];
                if (typeof expected !== 'number' || !Number.isFinite(expected) || expected < 0) {
                    reasons.push(`invalid_min_length_rule:${actualField}`);
                } else if (typeof text !== 'string') {
                    reasons.push(`field_type_mismatch:${actualField}`);
                } else if (text.trim().length < expected) {
                    reasons.push(`field_min_length_not_met:${actualField}`);
                }
                continue;
            }

            const actual = field === 'severity' ? row.severity : data[field];
            if (actual === undefined || actual === null) {
                reasons.push(`field_missing:${field}`);
                continue;
            }

            if (Array.isArray(expected)) {
                if (!expected.includes(actual)) reasons.push(`field_mismatch:${field}`);
            } else {
                if (typeof actual === 'string' && typeof expected === 'string') {
                    if (actual.trim() !== expected.trim()) reasons.push(`field_mismatch:${field}`);
                } else if (actual !== expected) {
                    reasons.push(`field_mismatch:${field}`);
                }
            }
        }
        return reasons;
    }

    /**
     * Save (upsert) an objective result to the DB.
     */
    _saveObjectiveResult(exerciseId, objectiveId, status, score, evidenceIds, validationDetails) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO objective_results
                    (exercise_id, objective_id, status, score, evidence_event_ids, validation_details, evaluated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(exercise_id, objective_id) DO UPDATE SET
                    status             = excluded.status,
                    score              = excluded.score,
                    evidence_event_ids = excluded.evidence_event_ids,
                    validation_details = excluded.validation_details,
                    evaluated_at       = excluded.evaluated_at
            `;
            this.db.db.run(
                sql,
                [exerciseId, objectiveId, status, score, JSON.stringify(evidenceIds),
                    JSON.stringify(validationDetails)],
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    _parseDetectionLogic(raw) {
        if (!raw) return null;
        try {
            const logic = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (!logic || typeof logic !== 'object' || Array.isArray(logic) ||
                typeof logic.source !== 'string' || !logic.source ||
                typeof logic.event_type !== 'string' || !logic.event_type ||
                (logic.field_checks !== undefined &&
                    (!logic.field_checks || typeof logic.field_checks !== 'object' ||
                        Array.isArray(logic.field_checks)))) {
                return null;
            }
            return logic;
        } catch {
            return null;
        }
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

    _getObjectives(scenarioId) {
        return new Promise((resolve, reject) => {
            this.db.db.all(
                'SELECT * FROM scenario_objectives WHERE scenario_id = ? ORDER BY order_index ASC',
                [scenarioId],
                (err, rows) => err ? reject(err) : resolve(rows || [])
            );
        });
    }
}

module.exports = ObjectiveEngine;
