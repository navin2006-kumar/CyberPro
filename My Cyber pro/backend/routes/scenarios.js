'use strict';
/**
 * CyberPro — Scenarios & Exercises API Routes
 *
 * GET  /api/scenarios                      — list all active scenarios
 * GET  /api/scenarios/:id                  — get scenario details + objectives
 * POST /api/exercises/start                — start an exercise session
 * GET  /api/exercises/:id                  — get exercise session details
 * POST /api/exercises/:id/reset            — reset exercise environment
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { requireAuth, requireRole } = require('../middleware/auth');
const ResetEngine = require('../engines/resetEngine');

// ─── GET /api/scenarios ──────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const scenarios = await new Promise((resolve, reject) => {
            db.db.all(
                `SELECT s.*, COUNT(so.id) AS objective_count
                 FROM scenarios s
                 LEFT JOIN scenario_objectives so ON so.scenario_id = s.id
                 WHERE s.is_active = 1
                 GROUP BY s.id
                 ORDER BY s.created_at DESC`,
                (err, rows) => err ? reject(err) : resolve(rows || [])
            );
        });

        res.json({ success: true, scenarios });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GET /api/scenarios/:id ──────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;

        const [scenario, objectives] = await Promise.all([
            new Promise((resolve, reject) => {
                db.db.get('SELECT * FROM scenarios WHERE id = ?', [id],
                    (err, row) => err ? reject(err) : resolve(row));
            }),
            new Promise((resolve, reject) => {
                db.db.all(
                    'SELECT * FROM scenario_objectives WHERE scenario_id = ? ORDER BY order_index',
                    [id],
                    (err, rows) => err ? reject(err) : resolve(rows || [])
                );
            })
        ]);

        if (!scenario) {
            return res.status(404).json({ success: false, message: 'Scenario not found' });
        }

        res.json({
            success: true,
            scenario: {
                ...scenario,
                objectives: objectives.map(o => ({
                    ...o,
                    detection_logic: o.detection_logic ? JSON.parse(o.detection_logic) : null
                }))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── POST /api/exercises/start ───────────────────────────────────────────────
router.post('/exercises/start', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const labManager = req.app.locals.labManager;
        const { scenario_id } = req.body;

        if (!scenario_id) {
            return res.status(400).json({
                success: false, message: 'scenario_id is required'
            });
        }

        // 1. Validate scenario exists
        const scenario = await new Promise((resolve, reject) => {
            db.db.get('SELECT * FROM scenarios WHERE id = ? AND is_active = 1', [scenario_id],
                (err, row) => err ? reject(err) : resolve(row));
        });
        if (!scenario) {
            return res.status(404).json({ success: false, message: 'Scenario not found or inactive' });
        }

        // 2. Start the underlying lab
        const labResult = await labManager.startLab(scenario.lab_id, req.session.userId);
        if (!labResult.success) {
            return res.status(503).json({
                success: false,
                message: `Lab provisioning failed: ${labResult.message}`
            });
        }

        const scenarioPath = path.join(__dirname, '../../scenarios', scenario_id, 'scenario.json');
        let scenarioDefinition;
        let baselineSnapshot;
        try {
            scenarioDefinition = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
            baselineSnapshot = await new ResetEngine(db, labManager)
                .captureBaseline(scenario.lab_id, scenarioDefinition.reset_verification || {});
            if (!baselineSnapshot.clean_state_verified) {
                throw new Error('Initial lab state does not match the configured baseline');
            }
        } catch (baselineError) {
            await labManager.stopLab(scenario.lab_id, req.session.userId);
            return res.status(503).json({
                success: false,
                message: `Could not capture a clean exercise baseline: ${baselineError.message}`
            });
        }

        // 3. Create exercise session after baseline capture.
        const exerciseId = uuidv4();
        const envVersion = process.env.npm_package_version || '1.0.0';
        const configVersion = scenario.version || '1.0';

        await new Promise((resolve, reject) => {
            db.db.run(
                `INSERT INTO exercise_sessions
                    (id, scenario_id, lab_session_id, user_id, environment_version, config_version, baseline_snapshot)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [exerciseId, scenario_id, labResult.sessionId || null,
                 req.session.userId, envVersion, configVersion, JSON.stringify(baselineSnapshot)],
                (err) => err ? reject(err) : resolve()
            );
        });

        // 4. Emit exercise_started telemetry event
        await new Promise((resolve, reject) => {
            db.db.run(
                `INSERT INTO telemetry_events
                    (id, exercise_id, scenario_id, user_id, source, event_type, severity, data)
                 VALUES (?, ?, ?, ?, 'system', 'exercise_started', 'info', ?)`,
                [uuidv4(), exerciseId, scenario_id, req.session.userId,
                 JSON.stringify({
                     username: req.session.username,
                     scenario: scenario.name,
                     lab_id: scenario.lab_id
                 })],
                (err) => err ? reject(err) : resolve()
            );
        });

        // 5. Seed pending objective results
        const objectives = await new Promise((resolve, reject) => {
            db.db.all('SELECT * FROM scenario_objectives WHERE scenario_id = ?', [scenario_id],
                (err, rows) => err ? reject(err) : resolve(rows || []));
        });

        for (const obj of objectives) {
            await new Promise((resolve, reject) => {
                db.db.run(
                    `INSERT OR IGNORE INTO objective_results
                        (exercise_id, objective_id, status, score)
                     VALUES (?, ?, 'pending', 0)`,
                    [exerciseId, obj.id],
                    (err) => err ? reject(err) : resolve()
                );
            });
        }

        res.status(201).json({
            success: true,
            exercise_id: exerciseId,
            scenario_id,
            scenario_name: scenario.name,
            time_limit_minutes: scenario.time_limit_minutes,
            objectives_count: objectives.length,
            baseline_captured_at: baselineSnapshot.captured_at,
            services: labResult.ports || [],
            message: 'Exercise started. Good luck!'
        });

    } catch (err) {
        console.error('Start exercise error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GET /api/exercises/:id ───────────────────────────────────────────────────
router.get('/exercises/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { id } = req.params;

        const exercise = await new Promise((resolve, reject) => {
            db.db.get('SELECT * FROM exercise_sessions WHERE id = ?', [id],
                (err, row) => err ? reject(err) : resolve(row));
        });

        if (!exercise) {
            return res.status(404).json({ success: false, message: 'Exercise not found' });
        }

        // Students can only see their own exercises
        if (req.session.role === 'student' && exercise.user_id !== req.session.userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const [objectiveResults, resetRow] = await Promise.all([
            new Promise((resolve, reject) => {
                db.db.all(
                    `SELECT objective_results.*, scenario_objectives.name,
                            scenario_objectives.points, scenario_objectives.required
                     FROM objective_results
                     JOIN scenario_objectives ON scenario_objectives.id = objective_results.objective_id
                     WHERE objective_results.exercise_id = ?`,
                    [id],
                    (err, rows) => err ? reject(err) : resolve(rows || [])
                );
            }),
            new Promise((resolve, reject) => {
                db.db.get(
                    `SELECT id, exercise_id, lab_id, initiated_by, start_time, end_time,
                            status, health_check_result, clean_state_verified, failure_reason
                     FROM reset_records WHERE exercise_id = ? ORDER BY id DESC LIMIT 1`,
                    [id],
                    (err, row) => err ? reject(err) : resolve(row || null)
                );
            })
        ]);

        let resetRecord = resetRow;
        if (resetRecord?.health_check_result) {
            try {
                resetRecord = {
                    ...resetRecord,
                    health_check_result: JSON.parse(resetRecord.health_check_result)
                };
            } catch {
                resetRecord = {
                    ...resetRecord,
                    health_check_result: { raw: resetRecord.health_check_result, parse_error: true }
                };
            }
        }

        res.json({
            success: true,
            exercise: {
                ...exercise,
                objective_results: objectiveResults,
                reset_record: resetRecord
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── POST /api/exercises/:id/reset ────────────────────────────────────────────
router.post('/exercises/:id/reset', requireAuth, requireRole('instructor'), async (req, res) => {
    try {
        const db = req.app.locals.db;
        const labManager = req.app.locals.labManager;
        const { id: exerciseId } = req.params;

        const exercise = await new Promise((resolve, reject) => {
            db.db.get('SELECT * FROM exercise_sessions WHERE id = ?', [exerciseId],
                (err, row) => err ? reject(err) : resolve(row));
        });

        if (!exercise) {
            return res.status(404).json({ success: false, message: 'Exercise not found' });
        }

        // Load the scenario's reset configuration and the stored pre-exercise baseline.
        const scenarioPath = path.join(
            __dirname, '../../scenarios', exercise.scenario_id, 'scenario.json');
        const scenarioDef = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
        let baselineSnapshot = null;
        try {
            baselineSnapshot = exercise.baseline_snapshot ? JSON.parse(exercise.baseline_snapshot) : null;
        } catch {}

        // Get lab ID from scenario
        const scenario = await new Promise((resolve, reject) => {
            db.db.get('SELECT * FROM scenarios WHERE id = ?', [exercise.scenario_id],
                (err, row) => err ? reject(err) : resolve(row));
        });

        const resetEngine = new ResetEngine(db, labManager);
        const result = await resetEngine.reset(
            exerciseId, scenario?.lab_id, req.session.userId,
            baselineSnapshot, scenarioDef.reset_verification || {});

        res.json({ success: result.success, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
