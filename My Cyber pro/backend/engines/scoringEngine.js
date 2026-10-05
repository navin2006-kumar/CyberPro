'use strict';
/**
 * CyberPro — Scoring Engine
 * Calculates a transparent, evidence-traceable score for an exercise.
 *
 * SCORING MODEL (PLC-001):
 *   - Each objective has a defined point value (from scenario_objectives.points)
 *   - Score = sum of points for PASSED objectives
 *   - Max score = sum of all objective points
 *   - Pass threshold: defined in scenario success_conditions.min_score
 *   - Penalty: currently none (future: time penalty for exceeding limit)
 *
 * WHY THIS SCORE?
 *   The system can always answer this question by querying:
 *   objective_results → evidence_event_ids → telemetry_events
 */

const fs = require('fs');
const path = require('path');

class ScoringEngine {
    /**
     * @param {object} db - Database instance (db.js)
     * @param {ObjectiveEngine} objectiveEngine
     */
    constructor(db, objectiveEngine) {
        this.db = db;
        this.objectiveEngine = objectiveEngine;
    }

    /**
     * Calculate and persist the score for an exercise.
     * Runs objective evaluation first, then aggregates.
     * @param {string} exerciseId
     * @returns {Promise<object>} Score summary with full rationale
     */
    async score(exerciseId) {
        // 1. Evaluate all objectives (idempotent)
        const objectiveResults = await this.objectiveEngine.evaluateAll(exerciseId);

        // 2. Get scenario success conditions
        const exercise = await this._getExercise(exerciseId);
        const scenario = await this._getScenario(exercise.scenario_id);
        if (!scenario) throw new Error(`Scenario not found: ${exercise.scenario_id}`);
        const successConditions = this._getSuccessConditions(scenario);

        // 3. Calculate totals
        let totalScore = 0;
        let maxScore = 0;
        let passed = 0;
        let failed = 0;
        let requiredPassed = 0;
        const failedRequired = [];
        const evaluatedObjectives = objectiveResults.map(result => {
            if (!Number.isSafeInteger(result.points) || result.points < 0) {
                throw new Error(`Invalid points for objective ${result.objective_id}`);
            }

            const evidenceIds = Array.isArray(result.evidence_event_ids)
                ? [...new Set(result.evidence_event_ids.filter(id => typeof id === 'string' && id.trim()))]
                : [];
            const hasEvidence = result.status === 'pass' && evidenceIds.length > 0;
            const status = hasEvidence ? 'pass' : 'fail';

            return {
                ...result,
                required: Boolean(result.required),
                status,
                score: hasEvidence ? result.points : 0,
                evidence_count: evidenceIds.length,
                evidence_event_ids: evidenceIds
            };
        });

        for (const result of evaluatedObjectives) {
            maxScore += result.points;
            if (result.status === 'pass') {
                totalScore += result.score;
                passed++;
                if (result.required) requiredPassed++;
            } else {
                failed++;
                if (result.required) {
                    failedRequired.push(result.objective_id);
                }
            }
        }

        // 4. Determine pass/fail for the exercise overall
    const minScore = successConditions.min_score;
    const minRequired = successConditions.min_objectives_required_passed;
    const exercisePassed = totalScore >= minScore && requiredPassed >= minRequired;

        // 5. Calculate completion time (minutes)
        let completionMinutes = null;
        if (exercise.start_time) {
            const start = new Date(exercise.start_time);
            const end = exercise.end_time ? new Date(exercise.end_time) : new Date();
            completionMinutes = Math.round((end - start) / 60000);
        }

        // 6. Persist the score
        await this._saveScore(
            exerciseId,
            exercise.user_id,
            totalScore,
            maxScore,
            completionMinutes,
            passed,
            failed,
            exercisePassed
        );

        // 7. Return full summary with rationale
        return {
            exercise_id: exerciseId,
            scenario_id: exercise.scenario_id,
            user_id: exercise.user_id,
            total_score: totalScore,
            max_score: maxScore,
            percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
            passed: exercisePassed,
            pass_threshold: minScore,
            minimum_required_objectives: minRequired,
            required_objectives_passed: requiredPassed,
            completion_time_minutes: completionMinutes,
            objectives_passed: passed,
            objectives_failed: failed,
            failed_required_objectives: failedRequired,
            objective_breakdown: evaluatedObjectives.map(r => ({
                id: r.objective_id,
                objective_id: r.objective_id,
                name: r.name,
                required: r.required,
                status: r.status,
                points_earned: r.score,
                points_possible: r.points,
                evidence_count: r.evidence_count,
                evidence_event_ids: r.evidence_event_ids
            })),
            scoring_rationale: `Score = sum of points for evidence-backed passed objectives. ` +
                `${passed}/${evaluatedObjectives.length} objectives passed; ` +
                `${requiredPassed}/${minRequired} required objectives needed. ` +
                `Minimum passing score: ${minScore}. ` +
                `Every point is traceable to a telemetry event in evidence_event_ids.`,
            scored_at: new Date().toISOString()
        };
    }

    _saveScore(exerciseId, userId, total, max, minutes, passed, failed, exercisePassed) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO exercise_scores
                    (exercise_id, user_id, total_score, max_score,
                     completion_time_minutes, objectives_passed, objectives_failed,
                     passed, scored_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(exercise_id) DO UPDATE SET
                    total_score             = excluded.total_score,
                    max_score               = excluded.max_score,
                    completion_time_minutes = excluded.completion_time_minutes,
                    objectives_passed       = excluded.objectives_passed,
                    objectives_failed       = excluded.objectives_failed,
                    passed                  = excluded.passed,
                    scored_at               = excluded.scored_at
            `;
            this.db.db.run(
                sql,
                [exerciseId, userId, total, max, minutes, passed, failed, exercisePassed ? 1 : 0],
                (err) => err ? reject(err) : resolve()
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

    _getScenario(scenarioId) {
        return new Promise((resolve, reject) => {
            this.db.db.get(
                'SELECT * FROM scenarios WHERE id = ?',
                [scenarioId],
                (err, row) => err ? reject(err) : resolve(row || null)
            );
        });
    }

    _getSuccessConditions(scenario) {
        let conditions = scenario.success_conditions;

        if (conditions === undefined || conditions === null) {
            if (typeof scenario.id !== 'string' || !scenario.id) {
                throw new Error('Scenario success_conditions are missing');
            }

            const scenariosRoot = path.resolve(__dirname, '../../scenarios');
            const manifestPath = path.resolve(scenariosRoot, scenario.id, 'scenario.json');
            const relativePath = path.relative(scenariosRoot, manifestPath);
            if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
                throw new Error(`Invalid scenario ID: ${scenario.id}`);
            }

            try {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                if (manifest.scenario_id !== scenario.id) {
                    throw new Error(`Scenario manifest ID mismatch: ${scenario.id}`);
                }
                conditions = manifest.success_conditions;
            } catch (error) {
                throw new Error(`Unable to load success_conditions for ${scenario.id}: ${error.message}`);
            }
        }

        if (typeof conditions === 'string') {
            try {
                conditions = JSON.parse(conditions);
            } catch (error) {
                throw new Error(`Invalid success_conditions for ${scenario.id}: ${error.message}`);
            }
        }

        if (!conditions || typeof conditions !== 'object' || Array.isArray(conditions) ||
            !Number.isFinite(conditions.min_score) || conditions.min_score < 0 ||
            !Number.isSafeInteger(conditions.min_objectives_required_passed) ||
            conditions.min_objectives_required_passed < 0) {
            throw new Error(`Invalid success_conditions for ${scenario.id}`);
        }

        return conditions;
    }
}

module.exports = ScoringEngine;
