'use strict';
/**
 * CyberPro — Security Tests: Telemetry Evidence Admission
 * Exercises the telemetry and score HTTP routes against an in-memory SQLite DB.
 * Run: node tests/security/evidence-admission.test.js
 */

const assert = require('assert');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const scenarioDefinition = require('../../scenarios/PLC-001/scenario.json');

const telemetryRoutes = require('../../backend/routes/telemetry');
const reportRoutes = require('../../backend/routes/reports');

const CONTAINER_SECRET = 'security-suite-container-secret';
let passed = 0;
let failed = 0;

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

function createDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(':memory:', error => {
            if (error) return reject(error);

            db.serialize(async () => {
                try {
                    await runSql(db, `CREATE TABLE scenarios (
                        id TEXT PRIMARY KEY,
                        success_conditions TEXT
                    )`);
                    await runSql(db, `CREATE TABLE scenario_objectives (
                        id TEXT PRIMARY KEY,
                        scenario_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        description TEXT,
                        points INTEGER NOT NULL,
                        required BOOLEAN DEFAULT 1,
                        detection_logic TEXT,
                        order_index INTEGER DEFAULT 0
                    )`);
                    await runSql(db, `CREATE TABLE exercise_sessions (
                        id TEXT PRIMARY KEY,
                        scenario_id TEXT NOT NULL,
                        user_id INTEGER NOT NULL,
                        status TEXT DEFAULT 'active',
                        start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                        end_time DATETIME
                    )`);
                    await runSql(db, `CREATE TABLE telemetry_events (
                        id TEXT PRIMARY KEY,
                        exercise_id TEXT,
                        scenario_id TEXT,
                        user_id INTEGER,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        source TEXT NOT NULL,
                        event_type TEXT NOT NULL,
                        severity TEXT DEFAULT 'info',
                        data TEXT
                    )`);
                    await runSql(db, `CREATE TABLE objective_results (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        exercise_id TEXT NOT NULL,
                        objective_id TEXT NOT NULL,
                        status TEXT NOT NULL,
                        score INTEGER NOT NULL DEFAULT 0,
                        evidence_event_ids TEXT,
                        validation_details TEXT,
                        evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(exercise_id, objective_id)
                    )`);
                    await runSql(db, `CREATE TABLE exercise_scores (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        exercise_id TEXT UNIQUE NOT NULL,
                        user_id INTEGER NOT NULL,
                        total_score INTEGER NOT NULL,
                        max_score INTEGER NOT NULL,
                        completion_time_minutes INTEGER,
                        objectives_passed INTEGER DEFAULT 0,
                        objectives_failed INTEGER DEFAULT 0,
                        passed BOOLEAN DEFAULT 0,
                        rule_version TEXT,
                        rule_hash TEXT,
                        score_trace TEXT,
                        scored_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )`);

                    await runSql(db,
                        'INSERT INTO scenarios (id, success_conditions) VALUES (?, ?)',
                        [scenarioDefinition.scenario_id, JSON.stringify(scenarioDefinition.success_conditions)]);
                    for (const [index, objective] of scenarioDefinition.objectives.entries()) {
                        await runSql(db, `INSERT INTO scenario_objectives
                            (id, scenario_id, name, description, points, required, detection_logic, order_index)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                            objective.id,
                            scenarioDefinition.scenario_id,
                            objective.name,
                            objective.description,
                            objective.points,
                            objective.required ? 1 : 0,
                            JSON.stringify({
                                source: objective.detection.source,
                                event_type: objective.detection.event_type,
                                field_checks: objective.detection.field_checks
                            }),
                            index + 1
                        ]);
                    }
                    await runSql(db, `INSERT INTO scenarios (id, success_conditions)
                        VALUES ('PLC-OTHER', '{}')`);
                    await runSql(db, `INSERT INTO exercise_sessions (id, scenario_id, user_id)
                        VALUES ('exercise-alice', 'PLC-001', 1),
                               ('exercise-bob', 'PLC-001', 2),
                               ('exercise-contamination', 'PLC-001', 1)`);
                    resolve(db);
                } catch (setupError) {
                    reject(setupError);
                }
            });
        });
    });
}

async function test(name, expected, fn) {
    try {
        await fn();
        console.log(`  ✓ ${expected}: ${name}`);
        passed++;
    } catch (error) {
        console.error(`  ✗ ${expected}: ${name}`);
        console.error(`    ${error.message}`);
        failed++;
    }
}

async function run() {
    process.env.CONTAINER_SECRET = CONTAINER_SECRET;
    const db = await createDatabase();
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => {
        const userId = req.header('x-test-user-id');
        req.session = userId ? {
            userId: Number(userId),
            username: Number(userId) === 1 ? 'alice' : 'bob',
            role: req.header('x-test-role') || 'student'
        } : null;
        next();
    });
    app.locals.db = { db };
    app.use('/api/telemetry', telemetryRoutes);
    app.use('/api/reports', reportRoutes);
    app.use((error, req, res, next) => {
        res.status(error.status || 500).json({ success: false, message: error.message });
    });

    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const request = async (path, { body, rawBody, userId, role, secret } = {}) => {
        const headers = {};
        if (body !== undefined || rawBody !== undefined) headers['content-type'] = 'application/json';
        if (userId !== undefined) headers['x-test-user-id'] = String(userId);
        if (role) headers['x-test-role'] = role;
        if (secret) headers['x-cyberpro-secret'] = secret;
        const response = await fetch(`${baseUrl}${path}`, {
            method: path.includes('/score') || path.endsWith('/replay') ? 'GET' : 'POST',
            headers,
            body: rawBody !== undefined ? rawBody : body === undefined ? undefined : JSON.stringify(body)
        });
        const text = await response.text();
        let json = null;
        try { json = JSON.parse(text); } catch {}
        return { status: response.status, json, text };
    };

    const studentEvent = (eventType, data, extra = {}) => ({
        exercise_id: 'exercise-alice',
        scenario_id: 'PLC-001',
        source: 'student',
        event_type: eventType,
        data,
        ...extra
    });

    console.log('\n🔒 Evidence Admission Security Tests\n');

    await test('owner student evidence is admitted', 'ACCEPT', async () => {
        const response = await request('/api/telemetry/event', {
            userId: 1,
            body: studentEvent('host_identified', { identified_ip: '10.10.2.10' })
        });
        assert.strictEqual(response.status, 201);
        assert.ok(response.json.event_id);
    });

    await test('trusted IDS telemetry with the configured secret is admitted', 'ACCEPT', async () => {
        const response = await request('/api/telemetry/event', {
            secret: CONTAINER_SECRET,
            body: {
                exercise_id: 'exercise-alice',
                source: 'ids',
                event_type: 'modbus_anomaly',
                severity: 'high',
                data: { dst_port: 502 }
            }
        });
        assert.strictEqual(response.status, 201);
    });

    await test('student cannot spoof a trusted IDS source', 'REJECT', async () => {
        const response = await request('/api/telemetry/event', {
            userId: 1,
            body: {
                exercise_id: 'exercise-alice',
                scenario_id: 'PLC-001',
                source: 'ids',
                event_type: 'modbus_anomaly',
                severity: 'high',
                data: { dst_port: 502 }
            }
        });
        assert.strictEqual(response.status, 401);
    });

    await test('unknown exercise ID is rejected', 'REJECT', async () => {
        const response = await request('/api/telemetry/event', {
            userId: 1,
            body: studentEvent('host_identified', { identified_ip: '10.10.2.10' }, { exercise_id: 'missing' })
        });
        assert.strictEqual(response.status, 404);
    });

    await test('scenario mismatch is rejected', 'REJECT', async () => {
        const response = await request('/api/telemetry/event', {
            userId: 1,
            body: studentEvent('host_identified', { identified_ip: '10.10.2.10' }, { scenario_id: 'PLC-OTHER' })
        });
        assert.strictEqual(response.status, 400);
    });

    await test('event source and event type mismatch is rejected', 'REJECT', async () => {
        const response = await request('/api/telemetry/event', {
            userId: 1,
            body: studentEvent('modbus_anomaly', { dst_port: 502 })
        });
        assert.strictEqual(response.status, 400);
    });

    await test('unknown event type is rejected', 'REJECT', async () => {
        const response = await request('/api/telemetry/event', {
            userId: 1,
            body: studentEvent('objective_passed', { objective_id: 'PLC-001-OBJ-1' })
        });
        assert.strictEqual(response.status, 400);
    });

    await test('missing objective payload field is rejected', 'REJECT', async () => {
        const response = await request('/api/telemetry/event', {
            userId: 1,
            body: studentEvent('host_identified', {})
        });
        assert.strictEqual(response.status, 400);
    });

    await test('wrong objective payload type is rejected', 'REJECT', async () => {
        const response = await request('/api/telemetry/event', {
            userId: 1,
            body: studentEvent('host_identified', { identified_ip: 1234 })
        });
        assert.strictEqual(response.status, 400);
    });

    await test('malformed JSON request is rejected', 'REJECT', async () => {
        const response = await request('/api/telemetry/event', { rawBody: '{"source":' });
        assert.strictEqual(response.status, 400);
    });

    await test('client-supplied invalid objective ID is rejected', 'REJECT', async () => {
        const response = await request('/api/telemetry/event', {
            userId: 1,
            body: {
                ...studentEvent('host_identified', { identified_ip: '10.10.2.10' }),
                objective_id: 'PLC-001-OBJ-999'
            }
        });
        assert.strictEqual(response.status, 400);
    });

    await test('duplicate evidence payload is rejected', 'REJECT', async () => {
        const body = studentEvent('log_analysis_submitted', {
            analysis_text: 'Duplicate analysis payload with enough content for objective evidence.'
        });
        const first = await request('/api/telemetry/event', { userId: 1, body });
        const second = await request('/api/telemetry/event', { userId: 1, body });
        assert.strictEqual(first.status, 201);
        assert.strictEqual(second.status, 409);
    });

    await test('replay of a previously admitted payload is rejected', 'REJECT', async () => {
        await runSql(db, `INSERT INTO exercise_sessions (id, scenario_id, user_id)
            VALUES ('exercise-replay', 'PLC-001', 1)`);
        const body = studentEvent('containment_action', { action_type: 'block_ip' }, {
            exercise_id: 'exercise-replay'
        });
        const first = await request('/api/telemetry/event', { userId: 1, body });
        const replay = await request('/api/telemetry/event', { userId: 1, body });
        assert.strictEqual(first.status, 201);
        assert.strictEqual(replay.status, 409);
    });

    await test('non-owner cannot submit evidence for another user exercise', 'REJECT', async () => {
        const response = await request('/api/telemetry/event', {
            userId: 2,
            body: studentEvent('host_identified', { identified_ip: '10.10.2.10' })
        });
        assert.strictEqual(response.status, 403);
    });

    await test('non-owner cannot request another user score', 'REJECT', async () => {
        const response = await request('/api/reports/exercise-alice/score', { userId: 2 });
        assert.strictEqual(response.status, 403);
    });

    await test('non-owner cannot request another user replay', 'REJECT', async () => {
        const response = await request('/api/reports/exercise-alice/replay', { userId: 2 });
        assert.strictEqual(response.status, 403);
    });

    await test('cross-user evidence already present in storage does not count', 'REJECT', async () => {
        await runSql(db, `INSERT INTO telemetry_events
            (id, exercise_id, scenario_id, user_id, source, event_type, severity, data)
            VALUES ('bob-forged-event', 'exercise-contamination', 'PLC-001', 2,
                    'student', 'host_identified', 'info', ?)` ,
            [JSON.stringify({ identified_ip: '10.10.2.10' })]);
        const response = await request('/api/reports/exercise-contamination/score', { userId: 1 });
        assert.strictEqual(response.status, 200);
        const objective = response.json.objective_breakdown.find(row => row.id === 'PLC-001-OBJ-2');
        assert.strictEqual(objective.status, 'fail');
        assert.deepStrictEqual(objective.evidence_event_ids, []);
        const storedResult = await getRow(db, `SELECT score, evidence_event_ids FROM objective_results
            WHERE exercise_id = 'exercise-contamination' AND objective_id = 'PLC-001-OBJ-2'`);
        assert.strictEqual(storedResult.score, 0);
        assert.deepStrictEqual(JSON.parse(storedResult.evidence_event_ids), []);
    });

    await new Promise(resolve => server.close(resolve));
    await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exitCode = 1;
}

run().catch(error => {
    console.error('Evidence admission security test failed:', error);
    process.exitCode = 1;
});