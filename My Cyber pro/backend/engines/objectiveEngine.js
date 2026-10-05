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
    async evaluateAll(exerciseId) {
        const exercise = await this._getExercise(exerciseId);
        if (!exercise) throw new Error(`Exercise not found: ${exerciseId}`);

        const objectives = await this._getObjectives(exercise.scenario_id);
        if (!objectives.length) return [];

        const results = [];

        for (const obj of objectives) {
            const result = await this._evaluateObjective(exercise, obj);
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
    async _evaluateObjective(exercise, objective) {
        const logic = this._parseDetectionLogic(objective.detection_logic);
        const matchingEvents = await this._queryMatchingEvents(exercise, logic);

        const status = matchingEvents.length > 0 ? 'pass' : 'fail';
        const score = status === 'pass' ? objective.points : 0;
        const evidenceIds = matchingEvents.map(e => e.id);

        // Upsert into objective_results
        await this._saveObjectiveResult(
            exercise.id,
            objective.id,
            status,
            score,
            evidenceIds
        );

        return {
            objective_id: objective.id,
            name: objective.name,
            required: !!objective.required,
            points: objective.points,
            status,
            score,
            evidence_event_ids: evidenceIds,
            evidence_count: matchingEvents.length
        };
    }

    /**
     * Query telemetry_events that match the detection logic for an objective.
     */
    async _queryMatchingEvents(exercise, logic) {
        if (!logic) return [];

        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM telemetry_events
                WHERE exercise_id = ?
                  AND scenario_id = ?
                   AND ((source = 'student' AND user_id = ?) OR
                       (source != 'student' AND user_id IS NULL))
                  AND source = ?
                  AND event_type = ?
                ORDER BY timestamp ASC
            `;

            this.db.db.all(sql, [
                exercise.id,
                exercise.scenario_id,
                exercise.user_id,
                logic.source,
                logic.event_type
            ], (err, rows) => {
                if (err) return reject(err);

                const checks = logic.field_checks || {};
                const filtered = (rows || []).filter(row => {
                    if (typeof row.id !== 'string' || !row.id) return false;
                    if (typeof row.data !== 'string') return false;
                    try {
                        const data = JSON.parse(row.data);
                        if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
                        return this._checkFields(data, checks, row);
                    } catch {
                        return false;
                    }
                });

                resolve(filtered);
            });
        });
    }

    /**
     * Check that a telemetry event's data fields match the required conditions.
     */
    _checkFields(data, checks, row) {
        if (!checks || typeof checks !== 'object' || Array.isArray(checks)) return false;

        for (const [field, expected] of Object.entries(checks)) {
            if (field.endsWith('_min_length')) {
                const actualField = field.replace('_min_length', '');
                const text = data[actualField];
                if (typeof expected !== 'number' || !Number.isFinite(expected) || expected < 0 ||
                    typeof text !== 'string' || text.trim().length < expected) return false;
                continue;
            }

            const actual = field === 'severity' ? row.severity : data[field];
            if (actual === undefined || actual === null) return false;

            if (Array.isArray(expected)) {
                if (!expected.includes(actual)) return false;
            } else {
                if (actual !== expected) return false;
            }
        }
        return true;
    }

    /**
     * Save (upsert) an objective result to the DB.
     */
    _saveObjectiveResult(exerciseId, objectiveId, status, score, evidenceIds) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO objective_results
                    (exercise_id, objective_id, status, score, evidence_event_ids, evaluated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(exercise_id, objective_id) DO UPDATE SET
                    status             = excluded.status,
                    score              = excluded.score,
                    evidence_event_ids = excluded.evidence_event_ids,
                    evaluated_at       = excluded.evaluated_at
            `;
            this.db.db.run(
                sql,
                [exerciseId, objectiveId, status, score, JSON.stringify(evidenceIds)],
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
