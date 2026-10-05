'use strict';
/**
 * CyberPro — Unit Tests: Evidence and Score Replay
 * Uses retained synthetic telemetry in in-memory SQLite; no learner or lab behavior is tested.
 * Run: node tests/unit/replayEngine.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const ObjectiveEngine = require('../../backend/engines/objectiveEngine');
const ScoringEngine = require('../../backend/engines/scoringEngine');

const ROOT = path.resolve(__dirname, '../..');
const ARTIFACT_PATH = path.join(ROOT, 'results', 'replay-verification.json');
const replayCases = [];

function execute(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (error) {
            if (error) return reject(error);
            resolve(this);
        });
    });
}

function query(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (error, row) => error ? reject(error) : resolve(row));
    });
}

async function createHarness() {
    const db = await new Promise((resolve, reject) => {
        const database = new sqlite3.Database(':memory:', error => error ? reject(error) : resolve(database));
    });

    await execute(db, `CREATE TABLE scenarios (
        id TEXT PRIMARY KEY,
        name TEXT,
        version TEXT,
        success_conditions TEXT
    )`);
    await execute(db, `CREATE TABLE scenario_objectives (
        id TEXT PRIMARY KEY,
        scenario_id TEXT NOT NULL,
        name TEXT,
        points INTEGER NOT NULL,
        required INTEGER NOT NULL,
        detection_logic TEXT,
        order_index INTEGER
    )`);
    await execute(db, `CREATE TABLE exercise_sessions (
        id TEXT PRIMARY KEY,
        scenario_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'completed',
        start_time TEXT,
        end_time TEXT
    )`);
    await execute(db, `CREATE TABLE telemetry_events (
        id TEXT PRIMARY KEY,
        exercise_id TEXT NOT NULL,
        scenario_id TEXT,
        user_id INTEGER,
        timestamp TEXT,
        source TEXT NOT NULL,
        event_type TEXT NOT NULL,
        severity TEXT DEFAULT 'info',
        data TEXT
    )`);
    await execute(db, `CREATE TABLE objective_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_id TEXT NOT NULL,
        objective_id TEXT NOT NULL,
        status TEXT NOT NULL,
        score INTEGER NOT NULL,
        evidence_event_ids TEXT,
        validation_details TEXT,
        evaluated_at TEXT,
        UNIQUE(exercise_id, objective_id)
    )`);
    await execute(db, `CREATE TABLE exercise_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_id TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        total_score INTEGER NOT NULL,
        max_score INTEGER NOT NULL,
        completion_time_minutes INTEGER,
        objectives_passed INTEGER,
        objectives_failed INTEGER,
        passed INTEGER,
        rule_version TEXT,
        rule_hash TEXT,
        score_trace TEXT,
        scored_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await execute(db, `INSERT INTO scenarios (id, name, version, success_conditions)
        VALUES ('REPLAY-001', 'Replay fixture', '1.0', ?)` ,
        [JSON.stringify({ min_score: 10, min_objectives_required_passed: 1 })]);
    await execute(db, `INSERT INTO scenario_objectives
        (id, scenario_id, name, points, required, detection_logic, order_index)
        VALUES ('REPLAY-OBJ-1', 'REPLAY-001', 'Synthetic event evidence', 10, 1, ?, 1)`,
        [JSON.stringify({
            source: 'ids',
            event_type: 'synthetic_signal',
            field_checks: { marker: 'authorized-test-fixture' }
        })]);
    await execute(db, `INSERT INTO exercise_sessions (id, scenario_id, user_id, start_time, end_time)
        VALUES ('exercise-replay-A', 'REPLAY-001', 7, '2026-10-05T10:00:00.000Z', '2026-10-05T10:10:00.000Z')`);
    for (const [id, timestamp] of [
        ['event-001', '2026-10-05T10:01:00.000Z'],
        ['event-002', '2026-10-05T10:02:00.000Z']
    ]) {
        await execute(db, `INSERT INTO telemetry_events
            (id, exercise_id, scenario_id, user_id, timestamp, source, event_type, severity, data)
            VALUES (?, 'exercise-replay-A', 'REPLAY-001', NULL, ?, 'ids', 'synthetic_signal', 'high', ?)` ,
            [id, timestamp, JSON.stringify({ marker: 'authorized-test-fixture' })]);
    }

    const dbWrapper = { db };
    const objectiveEngine = new ObjectiveEngine(dbWrapper);
    const scoringEngine = new ScoringEngine(dbWrapper, objectiveEngine);
    return { db, objectiveEngine, scoringEngine };
}

async function withCase(name, mutation, expectedConsistent) {
    const harness = await createHarness();
    try {
        const original = await harness.scoringEngine.score('exercise-replay-A');
        const persistedBefore = await query(harness.db,
            'SELECT scored_at, score_trace FROM exercise_scores WHERE exercise_id = ?',
            ['exercise-replay-A']);
        const objectiveBefore = await query(harness.db,
            `SELECT status, score, evidence_event_ids, validation_details, evaluated_at
             FROM objective_results WHERE exercise_id = 'exercise-replay-A' AND objective_id = 'REPLAY-OBJ-1'`);
        assert.strictEqual(original.exercise_id, 'exercise-replay-A');
        assert.strictEqual(original.scenario_id, 'REPLAY-001');
        assert.strictEqual(original.final_decision, 'PASS');
        assert.strictEqual(original.score_trace.objective_results[0].objective_id, 'REPLAY-OBJ-1');
        assert.ok(original.score_trace.objective_results[0].validation_details);
        assert.ok(original.score_trace.objective_results[0].evaluation_timestamp);
        if (mutation) await mutation(harness.db);
        const replay = await harness.scoringEngine.replay('exercise-replay-A');

        assert.strictEqual(replay.consistent, expectedConsistent, name);
        const persistedAfter = await query(harness.db,
            'SELECT scored_at, score_trace FROM exercise_scores WHERE exercise_id = ?',
            ['exercise-replay-A']);
        const objectiveAfter = await query(harness.db,
            `SELECT status, score, evidence_event_ids, validation_details, evaluated_at
             FROM objective_results WHERE exercise_id = 'exercise-replay-A' AND objective_id = 'REPLAY-OBJ-1'`);
        assert.strictEqual(persistedAfter.scored_at, persistedBefore.scored_at,
            'read-only replay must not rewrite the original score timestamp');
        assert.strictEqual(persistedAfter.score_trace, persistedBefore.score_trace,
            'read-only replay must not rewrite the original score trace');
        assert.deepStrictEqual(objectiveAfter, objectiveBefore,
            'read-only replay must not rewrite original objective results');

        replayCases.push({
            id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            expected_consistent: expectedConsistent,
            replay_consistent: replay.consistent,
            objective_results_match: replay.objective_results_match,
            score_matches: replay.score_matches,
            discrepancies: replay.discrepancies,
            original_score: replay.original_score,
            replayed_score: replay.replayed_score,
            status: 'PASS'
        });
        console.log(`  ✓ ${name}`);
    } finally {
        await new Promise((resolve, reject) => harness.db.close(error => error ? reject(error) : resolve()));
    }
}

async function run() {
    let passed = 0;
    let failed = 0;
    const cases = [
        ['Exact replay is consistent', null, true],
        ['Missing retained event changes objective trace', db =>
            execute(db, "DELETE FROM telemetry_events WHERE id = 'event-001'"), false],
        ['Changed retained event changes objective trace', db =>
            execute(db, "UPDATE telemetry_events SET data = ? WHERE id = 'event-001'",
                [JSON.stringify({ marker: 'modified-fixture' })]), false],
        ['Duplicate retained event changes evidence IDs', db =>
            execute(db, `INSERT INTO telemetry_events
                (id, exercise_id, scenario_id, user_id, timestamp, source, event_type, severity, data)
                VALUES ('event-003', 'exercise-replay-A', 'REPLAY-001', NULL,
                    '2026-10-05T10:03:00.000Z', 'ids', 'synthetic_signal', 'high', ?)` ,
                [JSON.stringify({ marker: 'authorized-test-fixture' })]), false],
        ['Reordered event timestamps preserve deterministic replay', db =>
            execute(db, `UPDATE telemetry_events SET timestamp = CASE id
                WHEN 'event-001' THEN '2026-10-05T10:02:00.000Z'
                WHEN 'event-002' THEN '2026-10-05T10:01:00.000Z' END`), true],
        ['New malformed retained event changes validation trace', db =>
            execute(db, `INSERT INTO telemetry_events
                (id, exercise_id, scenario_id, user_id, timestamp, source, event_type, severity, data)
                VALUES ('event-invalid', 'exercise-replay-A', 'REPLAY-001', NULL,
                    '2026-10-05T10:03:00.000Z', 'ids', 'synthetic_signal', 'high', '{malformed')`), false],
        ['Changed scenario rule version is reported as inconsistent', db =>
            execute(db, "UPDATE scenarios SET version = '2.0' WHERE id = 'REPLAY-001'"), false]
    ];

    console.log('\n🧪 Score Replay Unit Tests (software/control-plane verification only)\n');
    for (const [name, mutation, expected] of cases) {
        try {
            await withCase(name, mutation, expected);
            passed++;
        } catch (error) {
            console.error(`  ✗ ${name}`);
            console.error(`    ${error.stack || error.message}`);
            replayCases.push({ name, status: 'FAIL', error: error.message });
            failed++;
        }
    }

    const report = {
        recorded_at: new Date().toISOString(),
        execution_mode: 'SOFTWARE_CONTROL_PLANE_REPLAY_TEST',
        assurance_scope: 'software/control-plane verification only; not learner performance',
        source: 'synthetic retained telemetry in in-memory SQLite',
        test_count: cases.length,
        passed,
        failed,
        results: replayCases
    };
    await fs.promises.mkdir(path.dirname(ARTIFACT_PATH), { recursive: true });
    await fs.promises.writeFile(ARTIFACT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log(`\nResults: ${passed} passed, ${failed} failed`);
    console.log(`Replay report: ${path.relative(ROOT, ARTIFACT_PATH)}\n`);
    if (failed > 0) process.exitCode = 1;
}

run().catch(error => {
    console.error('Replay test suite failed:', error);
    process.exitCode = 1;
});