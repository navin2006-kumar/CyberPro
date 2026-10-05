'use strict';
/**
 * CyberPro — Integration Test: Multi-Exercise Data Integrity
 * Runs three simultaneous exercise workloads against a temporary file-backed SQLite database.
 * This verifies the tested application workload only; it is not a production capacity benchmark.
 * Run: node tests/integration/concurrency.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const ObjectiveEngine = require('../../backend/engines/objectiveEngine');
const ScoringEngine = require('../../backend/engines/scoringEngine');

const exerciseFixtures = [
    { exercise_id: 'exercise-A', user_id: 11, user_name: 'alice', marker: 'shared-valid-marker' },
    { exercise_id: 'exercise-B', user_id: 22, user_name: 'bob', marker: 'shared-valid-marker' },
    { exercise_id: 'exercise-C', user_id: 33, user_name: 'carol', marker: 'shared-valid-marker' }
];
const scenarioId = 'CONCURRENCY-001';
const reportPath = path.resolve(__dirname, '../../results/concurrency-verification.json');
const cases = [];

function openDatabase(databasePath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(databasePath, error => error ? reject(error) : resolve(db));
    });
}

function runSql(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (error) {
            if (error) return reject(error);
            resolve(this);
        });
    });
}

function getRow(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (error, row) => error ? reject(error) : resolve(row));
    });
}

function getRows(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows || []));
    });
}

function closeDatabase(db) {
    return new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
}

async function initializeSchema(db) {
    await runSql(db, 'PRAGMA foreign_keys = ON');
    await runSql(db, `CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        username TEXT UNIQUE NOT NULL
    )`);
    await runSql(db, `CREATE TABLE scenarios (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL,
        success_conditions TEXT NOT NULL
    )`);
    await runSql(db, `CREATE TABLE scenario_objectives (
        id TEXT PRIMARY KEY,
        scenario_id TEXT NOT NULL REFERENCES scenarios(id),
        name TEXT NOT NULL,
        points INTEGER NOT NULL,
        required INTEGER NOT NULL,
        detection_logic TEXT NOT NULL,
        order_index INTEGER NOT NULL
    )`);
    await runSql(db, `CREATE TABLE exercise_sessions (
        id TEXT PRIMARY KEY,
        scenario_id TEXT NOT NULL REFERENCES scenarios(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        start_time TEXT,
        end_time TEXT,
        status TEXT NOT NULL
    )`);
    await runSql(db, `CREATE TABLE telemetry_events (
        id TEXT PRIMARY KEY,
        exercise_id TEXT NOT NULL REFERENCES exercise_sessions(id),
        scenario_id TEXT NOT NULL REFERENCES scenarios(id),
        user_id INTEGER REFERENCES users(id),
        timestamp TEXT NOT NULL,
        source TEXT NOT NULL,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        data TEXT NOT NULL
    )`);
    await runSql(db, `CREATE TABLE objective_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_id TEXT NOT NULL REFERENCES exercise_sessions(id),
        objective_id TEXT NOT NULL REFERENCES scenario_objectives(id),
        status TEXT NOT NULL,
        score INTEGER NOT NULL,
        evidence_event_ids TEXT,
        validation_details TEXT,
        evaluated_at TEXT,
        UNIQUE(exercise_id, objective_id)
    )`);
    await runSql(db, `CREATE TABLE exercise_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_id TEXT UNIQUE NOT NULL REFERENCES exercise_sessions(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        total_score INTEGER NOT NULL,
        max_score INTEGER NOT NULL,
        completion_time_minutes INTEGER,
        objectives_passed INTEGER NOT NULL,
        objectives_failed INTEGER NOT NULL,
        passed INTEGER NOT NULL,
        rule_version TEXT,
        rule_hash TEXT,
        score_trace TEXT,
        scored_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    await runSql(db, `INSERT INTO scenarios (id, version, success_conditions)
        VALUES (?, '1.0', ?)`, [scenarioId, JSON.stringify({
        min_score: 10,
        min_objectives_required_passed: 1
    })]);
    await runSql(db, `INSERT INTO scenario_objectives
        (id, scenario_id, name, points, required, detection_logic, order_index)
        VALUES ('CONCURRENCY-OBJ-1', ?, 'Per-exercise marker', 10, 1, ?, 1)`, [
        scenarioId,
        JSON.stringify({
            source: 'student',
            event_type: 'exercise_marker',
            field_checks: { marker: 'shared-valid-marker' }
        })
    ]);

    for (const exercise of exerciseFixtures) {
        await runSql(db, 'INSERT INTO users (id, username) VALUES (?, ?)',
            [exercise.user_id, exercise.user_name]);
        await runSql(db, `INSERT INTO exercise_sessions
            (id, scenario_id, user_id, start_time, end_time, status)
            VALUES (?, ?, ?, '2026-10-05T10:00:00.000Z', '2026-10-05T10:05:00.000Z', 'completed')`,
            [exercise.exercise_id, scenarioId, exercise.user_id]);
    }
}

function makeEngines(db) {
    const dbWrapper = { db };
    return {
        objectiveEngine: new ObjectiveEngine(dbWrapper),
        scoringEngine: new ScoringEngine(dbWrapper, new ObjectiveEngine(dbWrapper))
    };
}

async function verifyCase(name, details, fn) {
    const startedAt = new Date().toISOString();
    try {
        const observed = await fn();
        cases.push({
            name,
            status: 'PASS',
            started_at: startedAt,
            observed_at: new Date().toISOString(),
            details,
            observed
        });
        console.log(`  ✓ ${name}`);
    } catch (error) {
        cases.push({
            name,
            status: 'FAIL',
            started_at: startedAt,
            observed_at: new Date().toISOString(),
            details,
            error: error.message
        });
        console.error(`  ✗ ${name}`);
        console.error(`    ${error.stack || error.message}`);
    }
}

async function run() {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cyberpro-concurrency-'));
    const databasePath = path.join(tempDirectory, 'concurrency.sqlite');
    let db;
    let engines;
    let telemetryEventIds = Object.fromEntries(exerciseFixtures.map(exercise => [exercise.exercise_id, []]));

    const workload = {
        exercises: exerciseFixtures.map(({ exercise_id, user_id, user_name }) => ({
            exercise_id, user_id, user_name, scenario_id: scenarioId
        })),
        simultaneous_exercises: exerciseFixtures.length,
        telemetry_rows_interleaved: exerciseFixtures.length * 2,
        concurrent_score_calls: exerciseFixtures.length,
        repeated_score_calls_per_exercise: 2,
        database: 'temporary file-backed SQLite; single Node process'
    };

    try {
        db = await openDatabase(databasePath);
        await initializeSchema(db);
        engines = makeEngines(db);

        await verifyCase('Three exercises and users have unique IDs', {
            expected: '3 unique exercise IDs and 3 unique user/session owners'
        }, async () => {
            const exerciseIds = new Set(exerciseFixtures.map(item => item.exercise_id));
            const userIds = new Set(exerciseFixtures.map(item => item.user_id));
            assert.strictEqual(exerciseIds.size, 3);
            assert.strictEqual(userIds.size, 3);
            const stored = await getRows(db,
                'SELECT id, user_id, scenario_id FROM exercise_sessions ORDER BY id');
            assert.strictEqual(stored.length, 3);
            assert.strictEqual(new Set(stored.map(item => item.id)).size, 3);
            assert.strictEqual(new Set(stored.map(item => item.user_id)).size, 3);
            return { exercises: stored };
        });

        await verifyCase('Interleaved simultaneous telemetry remains exercise-scoped', {
            expected: '6 concurrent telemetry inserts; each event retains its unique exercise and user owner'
        }, async () => {
            const interleaved = [
                { exercise: exerciseFixtures[0], suffix: '1' },
                { exercise: exerciseFixtures[1], suffix: '1' },
                { exercise: exerciseFixtures[2], suffix: '1' },
                { exercise: exerciseFixtures[0], suffix: '2' },
                { exercise: exerciseFixtures[1], suffix: '2' },
                { exercise: exerciseFixtures[2], suffix: '2' }
            ];
            const inserted = await Promise.all(interleaved.map(async ({ exercise, suffix }, index) => {
                const eventId = `event-${exercise.exercise_id}-${suffix}`;
                await runSql(db, `INSERT INTO telemetry_events
                    (id, exercise_id, scenario_id, user_id, timestamp, source, event_type, severity, data)
                    VALUES (?, ?, ?, ?, ?, 'student', 'exercise_marker', 'info', ?)`, [
                    eventId,
                    exercise.exercise_id,
                    scenarioId,
                    exercise.user_id,
                    `2026-10-05T10:0${index + 1}:00.000Z`,
                    JSON.stringify({ marker: exercise.marker })
                ]);
                telemetryEventIds[exercise.exercise_id].push(eventId);
                return eventId;
            }));
            assert.strictEqual(inserted.length, 6);
            assert.strictEqual(new Set(inserted).size, 6);
            const rowCount = await getRow(db, 'SELECT COUNT(*) AS count FROM telemetry_events');
            assert.strictEqual(rowCount.count, 6);
            return { inserted_event_ids: inserted.sort(), total_rows: rowCount.count };
        });

        await verifyCase('Concurrent objective scoring never consumes another exercise evidence', {
            expected: 'A, B, and C each score 10 with only their own two evidence IDs'
        }, async () => {
            const scores = await Promise.all(exerciseFixtures.map(async exercise => {
                const result = await engines.scoringEngine.score(exercise.exercise_id);
                const ownIds = [...telemetryEventIds[exercise.exercise_id]].sort();
                assert.strictEqual(result.exercise_id, exercise.exercise_id);
                assert.strictEqual(result.scenario_id, scenarioId);
                assert.strictEqual(result.total_score, 10);
                assert.strictEqual(result.max_score, 10);
                assert.strictEqual(result.objective_results.length, 1);
                assert.deepStrictEqual(result.objective_results[0].evidence_event_ids, ownIds);
                assert.strictEqual(result.objective_results[0].evidence_event_ids.some(id =>
                    exerciseFixtures.some(other => other.exercise_id !== exercise.exercise_id &&
                        id.startsWith(`event-${other.exercise_id}-`))), false);
                return {
                    exercise_id: result.exercise_id,
                    total_score: result.total_score,
                    evidence_event_ids: result.objective_results[0].evidence_event_ids
                };
            }));
            assert.strictEqual(new Set(scores.map(result => result.exercise_id)).size, 3);
            return { scores };
        });

        await verifyCase('Duplicate event IDs are rejected without multiplying score', {
            expected: 'primary-key duplicate rejected; per-objective points remain 10 despite two evidence rows'
        }, async () => {
            const before = await getRow(db, 'SELECT COUNT(*) AS count FROM telemetry_events');
            let duplicateRejected = false;
            try {
                await runSql(db, `INSERT INTO telemetry_events
                    (id, exercise_id, scenario_id, user_id, timestamp, source, event_type, severity, data)
                    VALUES (?, ?, ?, ?, ?, 'student', 'exercise_marker', 'info', ?)`, [
                    telemetryEventIds['exercise-A'][0], 'exercise-A', scenarioId, 11,
                    '2026-10-05T10:09:00.000Z', JSON.stringify({ marker: 'shared-valid-marker' })
                ]);
            } catch {
                duplicateRejected = true;
            }
            assert.strictEqual(duplicateRejected, true);
            const after = await getRow(db, 'SELECT COUNT(*) AS count FROM telemetry_events');
            assert.strictEqual(after.count, before.count);
            const score = await engines.scoringEngine.score('exercise-A');
            assert.strictEqual(score.total_score, 10);
            assert.strictEqual(score.objective_results[0].evidence_event_ids.length, 2);
            return { duplicate_rejected: duplicateRejected, event_rows: after.count, score: score.total_score };
        });

        await verifyCase('Repeated simultaneous scoring is idempotent per exercise', {
            expected: 'two concurrent scores per exercise still leave one score row and one objective row each'
        }, async () => {
            const repeated = await Promise.all(exerciseFixtures.flatMap(exercise => [
                engines.scoringEngine.score(exercise.exercise_id),
                engines.scoringEngine.score(exercise.exercise_id)
            ]));
            assert.strictEqual(repeated.length, 6);
            assert.ok(repeated.every(result => result.total_score === 10));
            const scoreRows = await getRows(db,
                'SELECT exercise_id, total_score FROM exercise_scores ORDER BY exercise_id');
            const objectiveRows = await getRows(db,
                'SELECT exercise_id, objective_id FROM objective_results ORDER BY exercise_id');
            assert.strictEqual(scoreRows.length, 3);
            assert.strictEqual(objectiveRows.length, 3);
            assert.ok(scoreRows.every(row => row.total_score === 10));
            return { score_rows: scoreRows, objective_rows: objectiveRows, repeated_calls: repeated.length };
        });

        await verifyCase('Database close/reopen preserves isolated scores and replay traces', {
            expected: 'reopened file DB retains 3 score/objective records; each replay remains consistent'
        }, async () => {
            await closeDatabase(db);
            db = await openDatabase(databasePath);
            await runSql(db, 'PRAGMA foreign_keys = ON');
            engines = makeEngines(db);
            const replayResults = await Promise.all(exerciseFixtures.map(exercise =>
                engines.scoringEngine.replay(exercise.exercise_id)));
            assert.strictEqual(replayResults.length, 3);
            assert.ok(replayResults.every(result => result.consistent));
            assert.deepStrictEqual(replayResults.map(result => result.exercise_id).sort(),
                exerciseFixtures.map(item => item.exercise_id).sort());
            const scoreRows = await getRows(db, 'SELECT exercise_id, total_score FROM exercise_scores');
            assert.strictEqual(scoreRows.length, 3);
            return {
                reopened: true,
                score_rows: scoreRows.sort((left, right) => left.exercise_id.localeCompare(right.exercise_id)),
                replay_consistent: replayResults.every(result => result.consistent)
            };
        });

        await verifyCase('Foreign-key transaction failure rolls back safely', {
            expected: 'invalid exercise telemetry insert fails within transaction and rollback leaves row count unchanged'
        }, async () => {
            const before = await getRow(db, 'SELECT COUNT(*) AS count FROM telemetry_events');
            await runSql(db, 'BEGIN IMMEDIATE');
            let rejected = false;
            try {
                await runSql(db, `INSERT INTO telemetry_events
                    (id, exercise_id, scenario_id, user_id, timestamp, source, event_type, severity, data)
                    VALUES ('event-invalid-fk', 'missing-exercise', ?, 11, ?, 'student', 'exercise_marker', 'info', '{}')`,
                    [scenarioId, new Date().toISOString()]);
            } catch {
                rejected = true;
            }
            assert.strictEqual(rejected, true);
            await runSql(db, 'ROLLBACK');
            const after = await getRow(db, 'SELECT COUNT(*) AS count FROM telemetry_events');
            assert.strictEqual(after.count, before.count);
            return { transaction_rejected: rejected, rows_before: before.count, rows_after: after.count };
        });
    } catch (error) {
        cases.push({ name: 'integration_setup_or_cleanup', status: 'FAIL', error: error.message });
        console.error('Concurrency integration setup failed:', error.stack || error.message);
    } finally {
        if (db) await closeDatabase(db).catch(error => {
            cases.push({ name: 'database_close', status: 'FAIL', error: error.message });
        });
        const report = {
            recorded_at: new Date().toISOString(),
            execution_mode: 'FILE_BACKED_SQLITE_INTEGRATION',
            production_scale_claim: false,
            scope: 'tested three concurrent exercises in one Node process against temporary file-backed SQLite',
            workload,
            case_count: cases.length,
            passed: cases.filter(item => item.status === 'PASS').length,
            failed: cases.filter(item => item.status === 'FAIL').length,
            cases
        };
        await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.promises.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        fs.rmSync(tempDirectory, { recursive: true, force: true });
        console.log(`\nResults: ${report.passed} passed, ${report.failed} failed`);
        console.log(`Concurrency report: ${path.relative(path.resolve(__dirname, '../..'), reportPath)}\n`);
        if (report.failed > 0) process.exitCode = 1;
    }
}

run().catch(error => {
    console.error('Concurrency integration failed:', error);
    process.exitCode = 1;
});