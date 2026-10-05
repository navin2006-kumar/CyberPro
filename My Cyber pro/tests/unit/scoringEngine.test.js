'use strict';
/**
 * CyberPro — Unit Tests: Scoring Engine
 * Tests score calculation, pass/fail evaluation, threshold enforcement,
 * required-objective constraints, and evidence traceability.
 *
 * Run: node tests/unit/scoringEngine.test.js
 */

const assert = require('assert');
const ScoringEngine = require('../../backend/engines/scoringEngine');

// ── Mock DB ───────────────────────────────────────────────────────────────────
function makeMockDb(scenarioData = {}, exerciseData = {}) {
    return {
        db: {
            get: (sql, params, callback) => {
                if (sql.includes('exercise_sessions')) {
                    callback(null, {
                        id: params[0],
                        scenario_id: 'PLC-001',
                        user_id: 1,
                        start_time: new Date(Date.now() - 15 * 60000).toISOString(),
                        end_time: new Date().toISOString(),
                        ...exerciseData
                    });
                } else if (sql.includes('scenarios')) {
                    callback(null, {
                        id: 'PLC-001',
                        success_conditions: {
                            min_score: 75,
                            min_objectives_required_passed: 3
                        },
                        ...scenarioData
                    });
                } else {
                    callback(null, null);
                }
            },
            run: (sql, params, callback) => {
                // Mock insert into exercise_scores
                callback(null);
            }
        }
    };
}

// ── Test Runner ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${err.message}`);
        failed++;
    }
}

async function run() {
    console.log('\n🧪 Running Scoring Engine Unit Tests...\n');

    await test('All 4 objectives passed → 100/100, passed = true', async () => {
        const mockObjectiveEngine = {
            evaluateAll: async () => [
                { objective_id: 'OBJ-1', name: 'Detect', required: true, status: 'pass', score: 25, points: 25, evidence_count: 1, evidence_event_ids: ['ev-1'] },
                { objective_id: 'OBJ-2', name: 'Identify', required: true, status: 'pass', score: 25, points: 25, evidence_count: 1, evidence_event_ids: ['ev-2'] },
                { objective_id: 'OBJ-3', name: 'Analyse', required: true, status: 'pass', score: 25, points: 25, evidence_count: 1, evidence_event_ids: ['ev-3'] },
                { objective_id: 'OBJ-4', name: 'Contain', required: false, status: 'pass', score: 25, points: 25, evidence_count: 1, evidence_event_ids: ['ev-4'] }
            ]
        };
        const engine = new ScoringEngine(makeMockDb(), mockObjectiveEngine);
        const result = await engine.score('test-ex-1');

        assert.strictEqual(result.total_score, 100);
        assert.strictEqual(result.max_score, 100);
        assert.strictEqual(result.percentage, 100);
        assert.strictEqual(result.passed, true);
        assert.strictEqual(result.objectives_passed, 4);
        assert.strictEqual(result.objectives_failed, 0);
        assert.strictEqual(result.failed_required_objectives.length, 0);
    });

    await test('3 required objectives passed (75/100) → passed = true (threshold 75)', async () => {
        const mockObjectiveEngine = {
            evaluateAll: async () => [
                { objective_id: 'OBJ-1', name: 'Detect', required: true, status: 'pass', score: 25, points: 25, evidence_count: 1, evidence_event_ids: ['ev-1'] },
                { objective_id: 'OBJ-2', name: 'Identify', required: true, status: 'pass', score: 25, points: 25, evidence_count: 1, evidence_event_ids: ['ev-2'] },
                { objective_id: 'OBJ-3', name: 'Analyse', required: true, status: 'pass', score: 25, points: 25, evidence_count: 1, evidence_event_ids: ['ev-3'] },
                { objective_id: 'OBJ-4', name: 'Contain', required: false, status: 'fail', score: 0, points: 25, evidence_count: 0, evidence_event_ids: [] }
            ]
        };
        const engine = new ScoringEngine(makeMockDb(), mockObjectiveEngine);
        const result = await engine.score('test-ex-2');

        assert.strictEqual(result.total_score, 75);
        assert.strictEqual(result.percentage, 75);
        assert.strictEqual(result.passed, true);
        assert.strictEqual(result.objectives_passed, 3);
        assert.strictEqual(result.objectives_failed, 1);
        assert.strictEqual(result.failed_required_objectives.length, 0);
    });

    await test('Score < 75 threshold (50/100) → passed = false', async () => {
        const mockObjectiveEngine = {
            evaluateAll: async () => [
                { objective_id: 'OBJ-1', name: 'Detect', required: true, status: 'pass', score: 25, points: 25, evidence_count: 1, evidence_event_ids: ['ev-1'] },
                { objective_id: 'OBJ-2', name: 'Identify', required: true, status: 'pass', score: 25, points: 25, evidence_count: 1, evidence_event_ids: ['ev-2'] },
                { objective_id: 'OBJ-3', name: 'Analyse', required: true, status: 'fail', score: 0, points: 25, evidence_count: 0, evidence_event_ids: [] },
                { objective_id: 'OBJ-4', name: 'Contain', required: false, status: 'fail', score: 0, points: 25, evidence_count: 0, evidence_event_ids: [] }
            ]
        };
        const engine = new ScoringEngine(makeMockDb(), mockObjectiveEngine);
        const result = await engine.score('test-ex-3');

        assert.strictEqual(result.total_score, 50);
        assert.strictEqual(result.passed, false);
        assert.strictEqual(result.failed_required_objectives.includes('OBJ-3'), true);
    });

    await test('Required objective failed blocks pass even if total score meets threshold', async () => {
        // Suppose scenario has min_score = 50, but OBJ-1 (required) failed
        const mockObjectiveEngine = {
            evaluateAll: async () => [
                { objective_id: 'OBJ-1', name: 'Detect', required: true, status: 'fail', score: 0, points: 25, evidence_count: 0, evidence_event_ids: [] },
                { objective_id: 'OBJ-2', name: 'Identify', required: false, status: 'pass', score: 25, points: 25, evidence_count: 1, evidence_event_ids: ['ev-2'] },
                { objective_id: 'OBJ-3', name: 'Analyse', required: false, status: 'pass', score: 25, points: 25, evidence_count: 1, evidence_event_ids: ['ev-3'] }
            ]
        };
        const engine = new ScoringEngine(makeMockDb({
            success_conditions: { min_score: 50, min_objectives_required_passed: 1 }
        }), mockObjectiveEngine);
        const result = await engine.score('test-ex-4');

        assert.strictEqual(result.total_score, 50);
        assert.strictEqual(result.passed, false, 'Should fail because required OBJ-1 failed');
        assert.strictEqual(result.failed_required_objectives.length, 1);
    });

    await test('Traceability: objective_breakdown preserves evidence_event_ids', async () => {
        const mockObjectiveEngine = {
            evaluateAll: async () => [
                { objective_id: 'OBJ-1', name: 'Detect', required: true, status: 'pass', score: 25, points: 25, evidence_count: 2, evidence_event_ids: ['event-101', 'event-102'] }
            ]
        };
        const engine = new ScoringEngine(makeMockDb(), mockObjectiveEngine);
        const result = await engine.score('test-ex-5');

        assert.strictEqual(result.objective_breakdown[0].evidence_event_ids.length, 2);
        assert.strictEqual(result.objective_breakdown[0].evidence_event_ids[0], 'event-101');
    });

    await test('Completion time in minutes calculated from timestamps', async () => {
        const startTime = new Date(Date.now() - 20 * 60000).toISOString();
        const endTime = new Date().toISOString();
        const mockDb = makeMockDb({}, { start_time: startTime, end_time: endTime });

        const mockObjectiveEngine = {
            evaluateAll: async () => []
        };
        const engine = new ScoringEngine(mockDb, mockObjectiveEngine);
        const result = await engine.score('test-ex-6');

        assert.strictEqual(result.completion_time_minutes, 20);
    });

    await test('Configured score and required-objective thresholds pass at exact boundaries', async () => {
        const mockObjectiveEngine = {
            evaluateAll: async () => [
                { objective_id: 'OBJ-A', name: 'A', required: true, status: 'pass', score: 30, points: 30, evidence_event_ids: ['ev-a'] },
                { objective_id: 'OBJ-B', name: 'B', required: true, status: 'pass', score: 30, points: 30, evidence_event_ids: ['ev-b'] },
                { objective_id: 'OBJ-C', name: 'C', required: true, status: 'fail', score: 0, points: 40, evidence_event_ids: [] }
            ]
        };
        const engine = new ScoringEngine(makeMockDb({
            success_conditions: { min_score: 60, min_objectives_required_passed: 2 }
        }), mockObjectiveEngine);
        const result = await engine.score('configured-boundary');

        assert.strictEqual(result.total_score, 60);
        assert.strictEqual(result.pass_threshold, 60);
        assert.strictEqual(result.minimum_required_objectives, 2);
        assert.strictEqual(result.required_objectives_passed, 2);
        assert.strictEqual(result.passed, true);
    });

    await test('Score below configured minimum fails even when required-objective count is met', async () => {
        const mockObjectiveEngine = {
            evaluateAll: async () => [
                { objective_id: 'OBJ-A', name: 'A', required: true, status: 'pass', score: 29, points: 30, evidence_event_ids: ['ev-a'] },
                { objective_id: 'OBJ-B', name: 'B', required: true, status: 'pass', score: 29, points: 30, evidence_event_ids: ['ev-b'] }
            ]
        };
        const engine = new ScoringEngine(makeMockDb({
            success_conditions: { min_score: 61, min_objectives_required_passed: 2 }
        }), mockObjectiveEngine);
        const result = await engine.score('below-score-boundary');

        assert.strictEqual(result.total_score, 60);
        assert.strictEqual(result.passed, false);
    });

    await test('A claimed pass without evidence IDs awards no points', async () => {
        const mockObjectiveEngine = {
            evaluateAll: async () => [
                { objective_id: 'OBJ-A', name: 'A', required: true, status: 'pass', score: 25, points: 25, evidence_count: 0, evidence_event_ids: [] }
            ]
        };
        const engine = new ScoringEngine(makeMockDb({
            success_conditions: { min_score: 1, min_objectives_required_passed: 1 }
        }), mockObjectiveEngine);
        const result = await engine.score('spoofed-pass');

        assert.strictEqual(result.total_score, 0);
        assert.strictEqual(result.objectives_passed, 0);
        assert.strictEqual(result.passed, false);
        assert.strictEqual(result.objective_breakdown[0].status, 'fail');
        assert.strictEqual(result.objective_breakdown[0].points_earned, 0);
    });

    await test('Evidence-backed points expose objective ID, status, points, count, and event IDs', async () => {
        const mockObjectiveEngine = {
            evaluateAll: async () => [
                { objective_id: 'OBJ-TRACE', name: 'Trace', required: true, status: 'pass', score: 25, points: 25, evidence_count: 2, evidence_event_ids: ['event-1', 'event-2'] }
            ]
        };
        const engine = new ScoringEngine(makeMockDb(), mockObjectiveEngine);
        const result = await engine.score('trace-exercise');
        const objective = result.objective_breakdown[0];

        assert.strictEqual(objective.objective_id, 'OBJ-TRACE');
        assert.strictEqual(objective.status, 'pass');
        assert.strictEqual(objective.points_earned, 25);
        assert.strictEqual(objective.points_possible, 25);
        assert.strictEqual(objective.evidence_count, 2);
        assert.deepStrictEqual(objective.evidence_event_ids, ['event-1', 'event-2']);
    });

    await test('Minimum required-objective boundary fails one below configured count', async () => {
        const mockObjectiveEngine = {
            evaluateAll: async () => [
                { objective_id: 'OBJ-A', name: 'A', required: true, status: 'pass', score: 30, points: 30, evidence_event_ids: ['ev-a'] },
                { objective_id: 'OBJ-B', name: 'B', required: true, status: 'pass', score: 30, points: 30, evidence_event_ids: ['ev-b'] },
                { objective_id: 'OBJ-C', name: 'C', required: true, status: 'fail', score: 0, points: 40, evidence_event_ids: [] }
            ]
        };
        const engine = new ScoringEngine(makeMockDb({
            success_conditions: { min_score: 50, min_objectives_required_passed: 3 }
        }), mockObjectiveEngine);
        const result = await engine.score('below-objective-boundary');

        assert.strictEqual(result.total_score, 60);
        assert.strictEqual(result.required_objectives_passed, 2);
        assert.strictEqual(result.passed, false);
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

run().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
