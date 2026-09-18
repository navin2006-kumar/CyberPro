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

        // 3. Calculate totals
        let totalScore = 0;
        let maxScore = 0;
        let passed = 0;
        let failed = 0;
        const failedRequired = [];

        for (const result of objectiveResults) {
            maxScore += result.points;
            if (result.status === 'pass') {
                totalScore += result.score;
                passed++;
            } else {
                failed++;
                if (result.required) {
                    failedRequired.push(result.objective_id);
                }
            }
        }

        // 4. Determine pass/fail for the exercise overall
        const minScore = scenario ? (scenario.min_score || 75) : 75;
        const minRequired = scenario ? (scenario.min_required_passed || 3) : 3;
        const exercisePassed = totalScore >= minScore && failedRequired.length === 0;

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
            completion_time_minutes: completionMinutes,
            objectives_passed: passed,
            objectives_failed: failed,
            failed_required_objectives: failedRequired,
            objective_breakdown: objectiveResults.map(r => ({
                id: r.objective_id,
                name: r.name,
                required: r.required,
                status: r.status,
                points_earned: r.score,
                points_possible: r.points,
                evidence_count: r.evidence_count,
                evidence_event_ids: r.evidence_event_ids
            })),
            scoring_rationale: `Score = sum of points for passed objectives. ` +
                `${passed}/${objectiveResults.length} objectives passed. ` +
                `Minimum passing score: ${minScore}/100. ` +
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
            // success_conditions stored as a separate field or in scenarios table
            this.db.db.get(
                'SELECT * FROM scenarios WHERE id = ?',
                [scenarioId],
                (err, row) => err ? reject(err) : resolve(row || null)
            );
        });
    }
}

module.exports = ScoringEngine;
