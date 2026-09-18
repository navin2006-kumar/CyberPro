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
            const result = await this._evaluateObjective(exerciseId, obj);
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
    async _evaluateObjective(exerciseId, objective) {
        const logic = this._parseDetectionLogic(objective.detection_logic);
        const matchingEvents = await this._queryMatchingEvents(exerciseId, logic);

        const status = matchingEvents.length > 0 ? 'pass' : 'fail';
        const score = status === 'pass' ? objective.points : 0;
        const evidenceIds = matchingEvents.map(e => e.id);

        // Upsert into objective_results
        await this._saveObjectiveResult(
            exerciseId,
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
    async _queryMatchingEvents(exerciseId, logic) {
        if (!logic || !logic.event_type) return [];

        return new Promise((resolve, reject) => {
            // Base query: match exercise + source + event_type
            const sql = `
                SELECT * FROM telemetry_events
                WHERE exercise_id = ?
                  AND source = ?
                  AND event_type = ?
                ORDER BY timestamp ASC
            `;

            this.db.db.all(sql, [exerciseId, logic.source, logic.event_type], (err, rows) => {
                if (err) return reject(err);

                // Apply field_checks (client-side filter on JSON data)
                const checks = logic.field_checks || {};
                const filtered = (rows || []).filter(row => {
                    try {
                        const data = row.data ? JSON.parse(row.data) : {};
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
        for (const [field, expected] of Object.entries(checks)) {
            // Special case: minimum text length
            if (field.endsWith('_min_length')) {
                const actualField = field.replace('_min_length', '');
                const text = data[actualField] || '';
                if (text.length < expected) return false;
                continue;
            }

            const actual = data[field] !== undefined ? data[field] : row[field];

            if (Array.isArray(expected)) {
                // Expected is a list of acceptable values
                if (!expected.includes(actual)) return false;
            } else {
                // Expected is a single value
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
            return typeof raw === 'string' ? JSON.parse(raw) : raw;
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
