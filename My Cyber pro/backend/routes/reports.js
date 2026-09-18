'use strict';
/**
 * CyberPro — Reports API Routes
 *
 * GET  /api/reports/:exerciseId/aar       — After-Action Report
 * GET  /api/reports/:exerciseId/timeline  — Exercise timeline
 * GET  /api/reports/:exerciseId/score     — Score with evidence
 * POST /api/reports/:exerciseId/debrief   — Submit reflective debrief
 * POST /api/reports/:exerciseId/submit    — Trigger final scoring
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const ObjectiveEngine = require('../engines/objectiveEngine');
const ScoringEngine = require('../engines/scoringEngine');
const TimelineEngine = require('../engines/timelineEngine');

// ─── Ownership helper ────────────────────────────────────────────────────────
async function getExerciseOrFail(db, exerciseId, userId, role) {
    return new Promise((resolve, reject) => {
        db.db.get('SELECT * FROM exercise_sessions WHERE id = ?', [exerciseId],
            (err, row) => {
                if (err) return reject(err);
                if (!row) return reject(Object.assign(new Error('Exercise not found'), { status: 404 }));
                if (role === 'student' && row.user_id !== userId) {
                    return reject(Object.assign(
                        new Error('Access denied: not your exercise'), { status: 403 }));
                }
                resolve(row);
            });
    });
}

// ─── GET /api/reports/:exerciseId/score ──────────────────────────────────────
router.get('/:exerciseId/score', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { exerciseId } = req.params;
        await getExerciseOrFail(db, exerciseId, req.session.userId, req.session.role);

        const objEngine = new ObjectiveEngine(db);
        const scoreEngine = new ScoringEngine(db, objEngine);
        const scoreResult = await scoreEngine.score(exerciseId);

        res.json({ success: true, ...scoreResult });
    } catch (err) {
        res.status(err.status || 500).json({ success: false, message: err.message });
    }
});

// ─── GET /api/reports/:exerciseId/timeline ───────────────────────────────────
router.get('/:exerciseId/timeline', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { exerciseId } = req.params;
        await getExerciseOrFail(db, exerciseId, req.session.userId, req.session.role);

        const timeline = await new TimelineEngine(db).generate(exerciseId);
        res.json({ success: true, ...timeline });
    } catch (err) {
        res.status(err.status || 500).json({ success: false, message: err.message });
    }
});

// ─── GET /api/reports/:exerciseId/aar ────────────────────────────────────────
router.get('/:exerciseId/aar', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { exerciseId } = req.params;
        const exercise = await getExerciseOrFail(
            db, exerciseId, req.session.userId, req.session.role);

        // Gather all report components
        const [timeline, score, debrief, scenario, user] = await Promise.all([
            new TimelineEngine(db).generate(exerciseId),
            (async () => {
                const objEngine = new ObjectiveEngine(db);
                return new ScoringEngine(db, objEngine).score(exerciseId);
            })(),
            new Promise((resolve, reject) => {
                db.db.get(
                    'SELECT * FROM debrief_responses WHERE exercise_id = ? AND user_id = ?',
                    [exerciseId, exercise.user_id],
                    (err, row) => err ? reject(err) : resolve(row || null)
                );
            }),
            new Promise((resolve, reject) => {
                db.db.get('SELECT * FROM scenarios WHERE id = ?',
                    [exercise.scenario_id],
                    (err, row) => err ? reject(err) : resolve(row));
            }),
            new Promise((resolve, reject) => {
                db.db.get('SELECT id, username, role FROM users WHERE id = ?',
                    [exercise.user_id],
                    (err, row) => err ? reject(err) : resolve(row));
            })
        ]);

        // Compute duration
        let durationMinutes = null;
        if (exercise.start_time && exercise.end_time) {
            durationMinutes = Math.round(
                (new Date(exercise.end_time) - new Date(exercise.start_time)) / 60000
            );
        }

        const aar = {
            report_type: 'After-Action Report',
            report_generated_at: new Date().toISOString(),
            exercise_id: exerciseId,

            // ── Participant ──
            participant: {
                user_id: exercise.user_id,
                username: user ? user.username : 'Unknown',
                role: user ? user.role : 'Unknown'
            },

            // ── Scenario ──
            scenario: {
                id: exercise.scenario_id,
                name: scenario ? scenario.name : 'Unknown',
                difficulty: scenario ? scenario.difficulty : 'Unknown',
                description: scenario ? scenario.description : ''
            },

            // ── Exercise Metadata ──
            exercise: {
                id: exerciseId,
                start_time: exercise.start_time,
                end_time: exercise.end_time,
                status: exercise.status,
                duration_minutes: durationMinutes
            },

            // ── Scoring ──
            scoring: {
                total_score: score.total_score,
                max_score: score.max_score,
                percentage: score.percentage,
                passed: score.passed,
                pass_threshold: score.pass_threshold,
                rationale: score.scoring_rationale,
                objective_breakdown: score.objective_breakdown
            },

            // ── Objectives ──
            objectives_passed: score.objective_breakdown.filter(o => o.status === 'pass'),
            objectives_failed: score.objective_breakdown.filter(o => o.status === 'fail'),

            // ── Timeline ──
            timeline: timeline.entries,
            timeline_entry_count: timeline.entry_count,

            // ── Debrief ──
            reflective_debrief: debrief ? {
                submitted: true,
                submitted_at: debrief.submitted_at,
                responses: {
                    detected: debrief.q_detected,
                    evidence_used: debrief.q_evidence,
                    action_taken: debrief.q_action,
                    difficulties: debrief.q_difficult,
                    would_do_differently: debrief.q_differently,
                    learned: debrief.q_learned
                }
            } : { submitted: false },

            // ── Recommendations ──
            recommendations: _generateRecommendations(score),

            // ── Evidence Note ──
            evidence_note: 'Every score and timeline entry is traceable to a ' +
                'persisted telemetry_events record in the CyberPro database. ' +
                `Exercise ID: ${exerciseId}`
        };

        res.json({ success: true, report: aar });
    } catch (err) {
        res.status(err.status || 500).json({ success: false, message: err.message });
    }
});

// ─── POST /api/reports/:exerciseId/debrief ───────────────────────────────────
router.post('/:exerciseId/debrief', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { exerciseId } = req.params;
        await getExerciseOrFail(db, exerciseId, req.session.userId, req.session.role);

        const {
            q_detected, q_evidence, q_action,
            q_difficult, q_differently, q_learned
        } = req.body;

        // At least one field required
        if (!q_detected && !q_evidence && !q_action && !q_learned) {
            return res.status(400).json({
                success: false,
                message: 'At least one debrief response is required'
            });
        }

        await new Promise((resolve, reject) => {
            db.db.run(
                `INSERT INTO debrief_responses
                    (exercise_id, user_id, q_detected, q_evidence, q_action,
                     q_difficult, q_differently, q_learned)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(exercise_id, user_id) DO UPDATE SET
                    q_detected    = excluded.q_detected,
                    q_evidence    = excluded.q_evidence,
                    q_action      = excluded.q_action,
                    q_difficult   = excluded.q_difficult,
                    q_differently = excluded.q_differently,
                    q_learned     = excluded.q_learned,
                    submitted_at  = CURRENT_TIMESTAMP`,
                [exerciseId, req.session.userId,
                 q_detected, q_evidence, q_action,
                 q_difficult, q_differently, q_learned],
                (err) => err ? reject(err) : resolve()
            );
        });

        // Emit debrief telemetry event
        const { v4: uuidv4 } = require('uuid');
        await new Promise((resolve, reject) => {
            db.db.run(
                `INSERT INTO telemetry_events
                    (id, exercise_id, user_id, source, event_type, severity, data)
                 VALUES (?, ?, ?, 'student', 'debrief_submitted', 'info', ?)`,
                [uuidv4(), exerciseId, req.session.userId,
                 JSON.stringify({ fields_completed: Object.keys(req.body).length })],
                (err) => err ? reject(err) : resolve()
            );
        });

        res.json({ success: true, message: 'Debrief submitted successfully' });
    } catch (err) {
        res.status(err.status || 500).json({ success: false, message: err.message });
    }
});

// ─── POST /api/reports/:exerciseId/submit ────────────────────────────────────
// Student explicitly submits their exercise for final scoring
router.post('/:exerciseId/submit', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { exerciseId } = req.params;
        const exercise = await getExerciseOrFail(
            db, exerciseId, req.session.userId, req.session.role);

        // Mark exercise as completed
        await new Promise((resolve, reject) => {
            db.db.run(
                `UPDATE exercise_sessions SET status = 'completed', end_time = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [exerciseId],
                (err) => err ? reject(err) : resolve()
            );
        });

        // Run final scoring
        const objEngine = new ObjectiveEngine(db);
        const scoreEngine = new ScoringEngine(db, objEngine);
        const scoreResult = await scoreEngine.score(exerciseId);

        // Emit objectives_evaluated event
        const { v4: uuidv4 } = require('uuid');
        await new Promise((resolve, reject) => {
            db.db.run(
                `INSERT INTO telemetry_events
                    (id, exercise_id, user_id, source, event_type, severity, data)
                 VALUES (?, ?, ?, 'system', 'objectives_evaluated', 'info', ?)`,
                [uuidv4(), exerciseId, req.session.userId,
                 JSON.stringify({
                     total_score: scoreResult.total_score,
                     max_score: scoreResult.max_score,
                     passed: scoreResult.passed
                 })],
                (err) => err ? reject(err) : resolve()
            );
        });

        res.json({
            success: true,
            message: 'Exercise submitted and scored',
            score: {
                total: scoreResult.total_score,
                max: scoreResult.max_score,
                percentage: scoreResult.percentage,
                passed: scoreResult.passed
            }
        });
    } catch (err) {
        res.status(err.status || 500).json({ success: false, message: err.message });
    }
});

// ─── Helper: generate recommendations based on score ────────────────────────
function _generateRecommendations(score) {
    const recs = [];

    const failed = score.objective_breakdown.filter(o => o.status === 'fail');
    for (const obj of failed) {
        if (obj.id.includes('OBJ-1')) {
            recs.push('Review IDS alert monitoring. Ensure you check the IDS dashboard regularly during exercises.');
        }
        if (obj.id.includes('OBJ-2')) {
            recs.push('Practice host identification. Use network tools (ping, nmap) to identify affected devices.');
        }
        if (obj.id.includes('OBJ-3')) {
            recs.push('Improve log analysis skills. Review collector logs systematically for attack patterns.');
        }
        if (obj.id.includes('OBJ-4')) {
            recs.push('Learn containment techniques: IP blocking, network isolation, firewall rules.');
        }
    }

    if (recs.length === 0) {
        recs.push('Excellent performance! Consider trying harder scenario variants.');
    }

    return recs;
}

module.exports = router;
