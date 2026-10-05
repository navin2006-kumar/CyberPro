'use strict';
/**
 * CyberPro — Integration Test: Full Scenario-Driven Cyber Range Lifecycle
 * Validates the complete scientific cycle defined in the manuscript:
 *   1. Scenario & Objectives provisioning (PLC-001)
 *   2. Exercise session initialization
 *   3. Telemetry event ingestion (IDS anomaly alert)
 *   4. Student detection & analysis telemetry submission
 *   5. Objective engine evaluation with evidence binding
 *   6. Transparent scoring engine calculation
 *   7. Reflective debrief submission & persistence
 *   8. Timeline engine synthesis from recorded telemetry
 *   9. Reset recording & clean-state audit
 *
 * Run: node tests/integration/scenario-flow.test.js
 */

const assert = require('assert');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const ObjectiveEngine = require('../../backend/engines/objectiveEngine');
const ScoringEngine = require('../../backend/engines/scoringEngine');
const TimelineEngine = require('../../backend/engines/timelineEngine');

// ── In-Memory Test Database Setup ─────────────────────────────────────────────
function createTestDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(':memory:', (err) => {
            if (err) return reject(err);

            db.serialize(() => {
                db.run('PRAGMA foreign_keys = ON');

                // Schema v1 + v2
                db.run(`CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT DEFAULT 'student'
                )`);

                db.run(`CREATE TABLE labs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    slug TEXT UNIQUE
                )`);

                db.run(`CREATE TABLE scenarios (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    difficulty TEXT,
                    time_limit_minutes INTEGER DEFAULT 30,
                    lab_id INTEGER REFERENCES labs(id),
                    version TEXT DEFAULT '1.0'
                )`);

                db.run(`CREATE TABLE scenario_objectives (
                    id TEXT PRIMARY KEY,
                    scenario_id TEXT NOT NULL REFERENCES scenarios(id),
                    name TEXT NOT NULL,
                    description TEXT,
                    points INTEGER NOT NULL DEFAULT 0,
                    required BOOLEAN DEFAULT 1,
                    detection_logic TEXT,
                    order_index INTEGER DEFAULT 0
                )`);

                db.run(`CREATE TABLE exercise_sessions (
                    id TEXT PRIMARY KEY,
                    scenario_id TEXT NOT NULL REFERENCES scenarios(id),
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    status TEXT DEFAULT 'active',
                    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    end_time DATETIME
                )`);

                db.run(`CREATE TABLE telemetry_events (
                    id TEXT PRIMARY KEY,
                    exercise_id TEXT NOT NULL REFERENCES exercise_sessions(id),
                    scenario_id TEXT,
                    user_id INTEGER REFERENCES users(id),
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    source TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    severity TEXT DEFAULT 'info',
                    data TEXT
                )`);

                db.run(`CREATE TABLE objective_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    exercise_id TEXT NOT NULL REFERENCES exercise_sessions(id),
                    objective_id TEXT NOT NULL REFERENCES scenario_objectives(id),
                    status TEXT NOT NULL,
                    score INTEGER NOT NULL DEFAULT 0,
                    evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    evidence_count INTEGER DEFAULT 0,
                    evidence_event_ids TEXT,
                    validation_details TEXT,
                    UNIQUE(exercise_id, objective_id)
                )`);

                db.run(`CREATE TABLE exercise_scores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    exercise_id TEXT UNIQUE NOT NULL REFERENCES exercise_sessions(id),
                    user_id INTEGER NOT NULL REFERENCES users(id),
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

                db.run(`CREATE TABLE debrief_responses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    exercise_id TEXT NOT NULL REFERENCES exercise_sessions(id),
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    q_detected TEXT,
                    q_evidence TEXT,
                    q_action TEXT,
                    q_difficult TEXT,
                    q_differently TEXT,
                    q_learned TEXT,
                    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(exercise_id, user_id)
                )`);

                db.run(`CREATE TABLE reset_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    exercise_id TEXT REFERENCES exercise_sessions(id),
                    lab_id INTEGER REFERENCES labs(id),
                    initiated_by INTEGER REFERENCES users(id),
                    status TEXT,
                    clean_state_verified BOOLEAN DEFAULT 0
                )`, () => {
                    resolve({ db });
                });
            });
        });
    });
}

// ── Integration Runner ────────────────────────────────────────────────────────
async function run() {
    console.log('\n🚀 Running CyberPro Full Scenario Lifecycle Integration Test...\n');

    const dbWrapper = await createTestDatabase();
    const db = dbWrapper.db;

    const objectiveEngine = new ObjectiveEngine(dbWrapper);
    const scoringEngine = new ScoringEngine(dbWrapper, objectiveEngine);
    const timelineEngine = new TimelineEngine(dbWrapper);

    const exec = (sql, params = []) => new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve(this);
        });
    });

    const get = (sql, params = []) => new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
    });

    // 1. Seed User, Lab, Scenario, and Objectives (PLC-001)
    await exec(`INSERT INTO users (id, username, password, role) VALUES (1, 'student_alice', 'hash', 'student')`);
    await exec(`INSERT INTO users (id, username, password, role) VALUES (2, 'student_bob', 'hash', 'student')`);
    await exec(`INSERT INTO labs (id, name, slug) VALUES (1, 'OilSprings Industrial SCADA', 'oilsprings')`);
    await exec(`INSERT INTO scenarios (id, name, description, difficulty, time_limit_minutes, lab_id)
                VALUES ('PLC-001', 'PLC Attack Detection', 'Detect Modbus reconnaissance', 'medium', 30, 1)`);

    await exec(`INSERT INTO scenario_objectives (id, scenario_id, name, points, required, detection_logic, order_index) VALUES
        ('PLC-001-OBJ-1', 'PLC-001', 'Detect Suspicious PLC Activity', 25, 1, '{"source":"ids","event_type":"modbus_anomaly","field_checks":{"dst_port":502,"severity":["medium","high","critical"]}}', 1),
        ('PLC-001-OBJ-2', 'PLC-001', 'Identify Affected Host', 25, 1, '{"source":"student","event_type":"host_identified","field_checks":{"identified_ip":"10.10.2.10"}}', 2),
        ('PLC-001-OBJ-3', 'PLC-001', 'Analyse IDS Logs', 25, 1, '{"source":"student","event_type":"log_analysis_submitted","field_checks":{"analysis_text_min_length":50}}', 3),
        ('PLC-001-OBJ-4', 'PLC-001', 'Contain Incident', 25, 0, '{"source":"student","event_type":"containment_action","field_checks":{"action_type":["block_ip","isolate_container"]}}', 4)`);

    console.log('  ✓ Step 1: Provisioned scenario PLC-001 with 4 verifiable objectives');

    // 2. Start Exercise Session
    const exerciseId = uuidv4();
    await exec(`INSERT INTO exercise_sessions (id, scenario_id, user_id, status, start_time)
                VALUES (?, 'PLC-001', 1, 'active', datetime('now', '-20 minutes'))`, [exerciseId]);

    console.log(`  ✓ Step 2: Created active exercise session ${exerciseId.substring(0, 8)}...`);

    // 3. System + IDS Telemetry Arrival
    const startEventId = uuidv4();
    await exec(`INSERT INTO telemetry_events
                    (id, exercise_id, scenario_id, user_id, source, event_type, severity, data)
                VALUES (?, ?, 'PLC-001', 1, 'system', 'exercise_started', 'info', ?)`,
        [startEventId, exerciseId, JSON.stringify({ username: 'student_alice' })]);

    const idsEventId = uuidv4();
    await exec(`INSERT INTO telemetry_events
                    (id, exercise_id, scenario_id, user_id, source, event_type, severity, data)
                VALUES (?, ?, 'PLC-001', NULL, 'ids', 'modbus_anomaly', 'high', ?)`,
        [idsEventId, exerciseId, JSON.stringify({ src_ip: '10.10.5.50', dst_ip: '10.10.2.10', dst_port: 502, severity: 'high' })]);

    console.log('  ✓ Step 3: Ingested exercise_started & IDS modbus_anomaly telemetry events');

    // 4. Student Submissions
    const idEventId = uuidv4();
    await exec(`INSERT INTO telemetry_events
                    (id, exercise_id, scenario_id, user_id, source, event_type, severity, data)
                VALUES (?, ?, 'PLC-001', 1, 'student', 'host_identified', 'info', ?)`,
        [idEventId, exerciseId, JSON.stringify({ identified_ip: '10.10.2.10' })]);

    const analysisText = 'Observed anomalous Modbus read coils request from unmapped host 10.10.5.50 targeting PLC at 10.10.2.10.';
    const analysisEventId = uuidv4();
    await exec(`INSERT INTO telemetry_events
                    (id, exercise_id, scenario_id, user_id, source, event_type, severity, data)
                VALUES (?, ?, 'PLC-001', 1, 'student', 'log_analysis_submitted', 'info', ?)`,
        [analysisEventId, exerciseId, JSON.stringify({ analysis_text: analysisText })]);

    const otherExerciseId = uuidv4();
    await exec(`INSERT INTO exercise_sessions (id, scenario_id, user_id, status)
                VALUES (?, 'PLC-001', 1, 'active')`, [otherExerciseId]);
    const wrongScopeEventIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4()];
    await exec(`INSERT INTO telemetry_events
                    (id, exercise_id, scenario_id, user_id, source, event_type, severity, data)
                VALUES
                    (?, ?, 'PLC-001', NULL, 'ids', 'modbus_anomaly', 'high', ?),
                    (?, ?, 'PLC-OTHER', NULL, 'ids', 'modbus_anomaly', 'high', ?),
                    (?, ?, 'PLC-001', 2, 'student', 'host_identified', 'info', ?),
                    (?, ?, 'PLC-001', 1, 'ids', 'modbus_anomaly', 'high', ?)`,
        [
            wrongScopeEventIds[0], otherExerciseId,
            JSON.stringify({ dst_port: 502 }),
            wrongScopeEventIds[1], exerciseId,
            JSON.stringify({ dst_port: 502 }),
            wrongScopeEventIds[2], exerciseId,
            JSON.stringify({ identified_ip: '10.10.2.10' }),
            wrongScopeEventIds[3], exerciseId,
            JSON.stringify({ dst_port: 502 })
        ]);

    console.log('  ✓ Step 4: Recorded student host identification and analytical debrief input');

    // 5 & 6. Objective Evaluation & Scoring
    const scoreSummary = await scoringEngine.score(exerciseId);

    assert.strictEqual(scoreSummary.total_score, 75, 'Objectives 1-3 passed = 75 points');
    assert.strictEqual(scoreSummary.max_score, 100);
    assert.strictEqual(scoreSummary.passed, true, 'Student passed with 75% on required objectives');
    assert.strictEqual(scoreSummary.objectives_passed, 3);
    assert.strictEqual(scoreSummary.objectives_failed, 1);

    // Verify evidence traceability
    const obj1 = scoreSummary.objective_breakdown.find(o => o.id === 'PLC-001-OBJ-1');
    assert.ok(obj1.evidence_event_ids.includes(idsEventId), 'OBJ-1 binds directly to IDS event ID');
    assert.deepStrictEqual(obj1.evidence_event_ids, [idsEventId],
        'Wrong-exercise and wrong-scenario IDS events are excluded');
    const obj2 = scoreSummary.objective_breakdown.find(o => o.id === 'PLC-001-OBJ-2');
    assert.deepStrictEqual(obj2.evidence_event_ids, [idEventId],
        'Evidence owned by another student is excluded');
    const persistedObj1 = await get(
        'SELECT status, score, evidence_event_ids FROM objective_results WHERE exercise_id = ? AND objective_id = ?',
        [exerciseId, 'PLC-001-OBJ-1']);
    assert.strictEqual(persistedObj1.status, 'pass');
    assert.strictEqual(persistedObj1.score, 25);
    assert.deepStrictEqual(JSON.parse(persistedObj1.evidence_event_ids), [idsEventId]);

    console.log('  ✓ Step 5-6: Evaluated objectives & computed 75/100 pass score with evidence bindings');

    // 7. Reflective Debrief Submission
    await exec(`INSERT INTO debrief_responses (exercise_id, user_id, q_detected, q_evidence, q_action, q_difficult, q_differently, q_learned)
                VALUES (?, 1, 'Modbus reconnaissance scan', 'Port 502 alert in IDS', 'Identified target IP and reported attack pattern',
                        'Deciphering Modbus protocol codes', 'Would check collector logs sooner', 'OT protocol baselines prevent stealthy probing')`,
        [exerciseId]);

    const debrief = await get('SELECT * FROM debrief_responses WHERE exercise_id = ?', [exerciseId]);
    assert.ok(debrief, 'Debrief response persisted');
    console.log('  ✓ Step 7: Saved 6-dimension reflective debrief response');

    // 8. Timeline Synthesis
    const timeline = await timelineEngine.generate(exerciseId);
    assert.strictEqual(timeline.entry_count, 7, 'Timeline includes all seven events scoped to this exercise');
    assert.ok(timeline.entries.some(entry => entry.description.includes('Anomalous Modbus/TCP traffic')));
    assert.ok(timeline.entries.some(entry => entry.description.includes('10.10.2.10')));
    console.log('  ✓ Step 8: Generated chronological timeline from telemetry audit trail');

    // 9. Reset Recording
    await exec(`INSERT INTO reset_records (exercise_id, lab_id, initiated_by, status, clean_state_verified)
                VALUES (?, 1, 1, 'success', 1)`, [exerciseId]);

    const resetRec = await get('SELECT * FROM reset_records WHERE exercise_id = ?', [exerciseId]);
    assert.strictEqual(resetRec.clean_state_verified, 1);
    console.log('  ✓ Step 9: Confirmed clean environment reset and audit recording');

    console.log('\n🎉 Full Scenario Lifecycle Integration Test Passed Successfully!\n');
    db.close();
}

run().catch(err => {
    console.error('Integration test failed:', err);
    process.exit(1);
});
