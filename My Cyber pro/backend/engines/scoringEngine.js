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
const crypto = require('crypto');

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
        const objectiveResults = await this.objectiveEngine.evaluateAll(exerciseId);
        const calculated = await this._calculateScore(exerciseId, objectiveResults);
        const scoreTrace = this._createScoreTrace(calculated);

        await this._saveScore(
            exerciseId,
            calculated.user_id,
            calculated.total_score,
            calculated.max_score,
            calculated.completion_time_minutes,
            calculated.objectives_passed,
            calculated.objectives_failed,
            calculated.passed,
            calculated.rule_version,
            calculated.rule_hash,
            scoreTrace
        );

        return { ...calculated, score_trace: scoreTrace };
    }

    async _calculateScore(exerciseId, objectiveResults) {
        const exercise = await this._getExercise(exerciseId);
        if (!exercise) throw new Error(`Exercise not found: ${exerciseId}`);
        const scenario = await this._getScenario(exercise.scenario_id);
        if (!scenario) throw new Error(`Scenario not found: ${exercise.scenario_id}`);
        const successConditions = this._getSuccessConditions(scenario);
        const ruleVersion = scenario.version || 'unspecified';

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
                evidence_event_ids: evidenceIds,
                validation_details: result.validation_details || null,
                evaluation_timestamp: result.evaluation_timestamp || null
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

        const minScore = successConditions.min_score;
        const minRequired = successConditions.min_objectives_required_passed;
    const exercisePassed = totalScore >= minScore && requiredPassed >= minRequired;

        let completionMinutes = null;
        if (exercise.start_time) {
            const start = new Date(exercise.start_time);
            const end = exercise.end_time ? new Date(exercise.end_time) : new Date();
            const startMs = start.getTime();
            const endMs = end.getTime();
            if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
                completionMinutes = Math.round((endMs - startMs) / 60000);
            }
        }

        const ruleDefinition = {
            scenario_id: scenario.id,
            rule_version: ruleVersion,
            success_conditions: successConditions,
            objectives: evaluatedObjectives.map(result => ({
                objective_id: result.objective_id,
                points: result.points,
                required: result.required,
                detection_logic: result.validation_details?.rule || null
            }))
        };
        const ruleHash = crypto.createHash('sha256')
            .update(this._canonicalJson(ruleDefinition)).digest('hex');

        return {
            exercise_id: exerciseId,
            scenario_id: exercise.scenario_id,
            user_id: exercise.user_id,
            objective_results: evaluatedObjectives.map(result => ({
                objective_id: result.objective_id,
                status: result.status,
                score: result.score,
                evidence_event_ids: result.evidence_event_ids,
                validation_details: result.validation_details,
                evaluation_timestamp: result.evaluation_timestamp
            })),
            total_score: totalScore,
            max_score: maxScore,
            percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
            passed: exercisePassed,
            final_decision: exercisePassed ? 'PASS' : 'FAIL',
            pass_threshold: minScore,
            minimum_required_objectives: minRequired,
            rule_version: ruleVersion,
            rule_hash: ruleHash,
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

    _createScoreTrace(score) {
        return {
            trace_version: 1,
            exercise_id: score.exercise_id,
            scenario_id: score.scenario_id,
            objective_results: score.objective_results,
            total_score: score.total_score,
            maximum_score: score.max_score,
            pass_threshold: score.pass_threshold,
            minimum_required_objectives: score.minimum_required_objectives,
            required_objectives_passed: score.required_objectives_passed,
            final_decision: score.final_decision,
            rule_version: score.rule_version,
            rule_hash: score.rule_hash,
            scored_at: score.scored_at
        };
    }

    async replay(exerciseId) {
        const originalScoreRow = await this._getStoredScore(exerciseId);
        if (!originalScoreRow) throw new Error(`Original score not found: ${exerciseId}`);

        const originalTrace = this._parseJson(originalScoreRow.score_trace);
        if (!originalTrace || originalScoreRow.rule_hash === null || originalScoreRow.rule_hash === undefined) {
            return {
                replayable: false,
                consistent: false,
                exercise_id: exerciseId,
                discrepancies: ['original_score_trace_unavailable']
            };
        }

        const originalRows = await this._getStoredObjectiveResults(exerciseId);
        const replayedResults = await this.objectiveEngine.evaluateAll(exerciseId, { persist: false });
        const replayedScore = await this._calculateScore(exerciseId, replayedResults);
        const storedObjectiveResults = originalRows.map(row => ({
            objective_id: row.objective_id,
            status: row.status,
            score: row.score,
            evidence_event_ids: this._parseJson(row.evidence_event_ids) || [],
            validation_details: this._parseJson(row.validation_details),
            evaluation_timestamp: row.evaluated_at
        }));

        const originalComparable = this._normalizeObjectiveResults(storedObjectiveResults);
        const replayedComparable = this._normalizeObjectiveResults(replayedScore.objective_results);
        const objectiveResultsMatch = this._canonicalJson(originalComparable) ===
            this._canonicalJson(replayedComparable);
        const ruleVersionMatches = originalScoreRow.rule_version === replayedScore.rule_version &&
            originalScoreRow.rule_hash === replayedScore.rule_hash;
        const originalScore = {
            total_score: originalScoreRow.total_score,
            max_score: originalScoreRow.max_score,
            pass_threshold: originalTrace.pass_threshold,
            minimum_required_objectives: originalTrace.minimum_required_objectives,
            final_decision: Number(originalScoreRow.passed) ? 'PASS' : 'FAIL'
        };
        const currentScore = {
            total_score: replayedScore.total_score,
            max_score: replayedScore.max_score,
            pass_threshold: replayedScore.pass_threshold,
            minimum_required_objectives: replayedScore.minimum_required_objectives,
            final_decision: replayedScore.final_decision
        };
        const scoreMatches = this._canonicalJson(originalScore) === this._canonicalJson(currentScore);
        const discrepancies = [];
        if (!ruleVersionMatches) discrepancies.push('rule_version_or_hash_changed');
        if (!objectiveResultsMatch) discrepancies.push('objective_results_changed');
        if (!scoreMatches) discrepancies.push('final_score_changed');

        return {
            replayable: true,
            exercise_id: exerciseId,
            scenario_id: replayedScore.scenario_id,
            rule_version_matches: ruleVersionMatches,
            original_rule_version: originalScoreRow.rule_version,
            replayed_rule_version: replayedScore.rule_version,
            original_rule_hash: originalScoreRow.rule_hash,
            replayed_rule_hash: replayedScore.rule_hash,
            objective_results_match: objectiveResultsMatch,
            original_objective_results: storedObjectiveResults,
            replayed_objective_results: replayedScore.objective_results,
            score_matches: scoreMatches,
            original_score: originalScore,
            replayed_score: currentScore,
            consistent: discrepancies.length === 0,
            discrepancies,
            replayed_at: new Date().toISOString(),
            assurance_scope: 'software/control-plane verification only; not learner performance'
        };
    }

    _normalizeObjectiveResults(results) {
        return results.map(result => ({
            objective_id: result.objective_id,
            status: result.status,
            score: result.score,
            evidence_event_ids: [...(result.evidence_event_ids || [])].sort(),
            validation_details: result.validation_details || null
        })).sort((left, right) => left.objective_id.localeCompare(right.objective_id));
    }

    _canonicalJson(value) {
        if (Array.isArray(value)) return `[${value.map(item => this._canonicalJson(item)).join(',')}]`;
        if (value && typeof value === 'object') {
            return `{${Object.keys(value).sort().map(key =>
                `${JSON.stringify(key)}:${this._canonicalJson(value[key])}`).join(',')}}`;
        }
        return JSON.stringify(value);
    }

    _parseJson(value) {
        if (value === null || value === undefined) return null;
        if (typeof value !== 'string') return value;
        try { return JSON.parse(value); } catch { return null; }
    }

    _getStoredScore(exerciseId) {
        return new Promise((resolve, reject) => {
            this.db.db.get(
                'SELECT * FROM exercise_scores WHERE exercise_id = ?',
                [exerciseId],
                (err, row) => err ? reject(err) : resolve(row || null)
            );
        });
    }

    _getStoredObjectiveResults(exerciseId) {
        return new Promise((resolve, reject) => {
            this.db.db.all(
                `SELECT objective_id, status, score, evidence_event_ids, validation_details, evaluated_at
                 FROM objective_results WHERE exercise_id = ? ORDER BY objective_id`,
                [exerciseId],
                (err, rows) => err ? reject(err) : resolve(rows || [])
            );
        });
    }

    _saveScore(exerciseId, userId, total, max, minutes, passed, failed, exercisePassed,
        ruleVersion, ruleHash, scoreTrace) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO exercise_scores
                    (exercise_id, user_id, total_score, max_score,
                     completion_time_minutes, objectives_passed, objectives_failed,
                     passed, rule_version, rule_hash, score_trace, scored_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(exercise_id) DO UPDATE SET
                    total_score             = excluded.total_score,
                    max_score               = excluded.max_score,
                    completion_time_minutes = excluded.completion_time_minutes,
                    objectives_passed       = excluded.objectives_passed,
                    objectives_failed       = excluded.objectives_failed,
                    passed                  = excluded.passed,
                    rule_version            = excluded.rule_version,
                    rule_hash               = excluded.rule_hash,
                    score_trace             = excluded.score_trace,
                    scored_at               = excluded.scored_at
            `;
            this.db.db.run(
                sql,
                [exerciseId, userId, total, max, minutes, passed, failed, exercisePassed ? 1 : 0,
                    ruleVersion, ruleHash, JSON.stringify(scoreTrace)],
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
