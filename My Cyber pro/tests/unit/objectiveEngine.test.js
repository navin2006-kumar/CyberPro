'use strict';
/**
 * CyberPro — Unit Tests: Objective Engine
 * Tests objective pass/fail evaluation against mocked telemetry events.
 *
 * Run: node tests/unit/objectiveEngine.test.js
 */

const assert = require('assert');
const ObjectiveEngine = require('../../backend/engines/objectiveEngine');

// ── Mock database ──────────────────────────────────────────────────────────────
function makeDb(exerciseRow, objectives, events) {
    return {
        db: {
            get: (sql, params, cb) => {
                if (sql.includes('exercise_sessions')) return cb(null, exerciseRow);
                if (sql.includes('scenarios WHERE id')) return cb(null, {});
                cb(null, null);
            },
            all: (sql, params, cb) => {
                if (sql.includes('scenario_objectives')) return cb(null, objectives);
                if (sql.includes('telemetry_events')) {
                    // Filter events by source and event_type from params
                    const [, src, et] = params;
                    const filtered = events.filter(e => e.source === src && e.event_type === et);
                    return cb(null, filtered);
                }
                cb(null, []);
            },
            run: (sql, params, cb) => cb ? cb(null) : null
        }
    };
}

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

// ── Test cases ─────────────────────────────────────────────────────────────────
(async () => {
    console.log('\n🧪 Objective Engine — Unit Tests\n');

    const exerciseRow = {
        id: 'ex-001',
        scenario_id: 'PLC-001',
        user_id: 1,
        start_time: new Date().toISOString()
    };

    const objectives = [
        {
            id: 'PLC-001-OBJ-1',
            name: 'Detect Suspicious PLC Activity',
            points: 25,
            required: 1,
            order_index: 0,
            detection_logic: JSON.stringify({
                source: 'ids',
                event_type: 'modbus_anomaly',
                field_checks: { dst_port: 502, severity: ['medium', 'high', 'critical'] }
            })
        },
        {
            id: 'PLC-001-OBJ-2',
            name: 'Identify Affected Host',
            points: 25,
            required: 1,
            order_index: 1,
            detection_logic: JSON.stringify({
                source: 'student',
                event_type: 'host_identified',
                field_checks: { identified_ip: '10.10.2.10' }
            })
        },
        {
            id: 'PLC-001-OBJ-3',
            name: 'Analyse IDS Logs',
            points: 25,
            required: 1,
            order_index: 2,
            detection_logic: JSON.stringify({
                source: 'student',
                event_type: 'log_analysis_submitted',
                field_checks: { analysis_text_min_length: 50 }
            })
        }
    ];

    // ── Test 1: All objectives pass when matching events exist ──
    await test('OBJ-1 passes when IDS modbus_anomaly event with matching dst_port exists', async () => {
        const events = [{
            id: 'evt-001', source: 'ids', event_type: 'modbus_anomaly',
            data: JSON.stringify({ dst_port: 502, severity: 'high' })
        }];
        const db = makeDb(exerciseRow, objectives, events);
        const engine = new ObjectiveEngine(db);
        const results = await engine.evaluateAll('ex-001');
        const obj1 = results.find(r => r.objective_id === 'PLC-001-OBJ-1');
        assert.strictEqual(obj1.status, 'pass', `Expected pass, got ${obj1.status}`);
        assert.strictEqual(obj1.score, 25);
        assert.ok(obj1.evidence_event_ids.includes('evt-001'));
    });

    // ── Test 2: OBJ-1 fails when no matching events ──
    await test('OBJ-1 fails when no IDS modbus_anomaly events exist', async () => {
        const db = makeDb(exerciseRow, objectives, []);
        const engine = new ObjectiveEngine(db);
        const results = await engine.evaluateAll('ex-001');
        const obj1 = results.find(r => r.objective_id === 'PLC-001-OBJ-1');
        assert.strictEqual(obj1.status, 'fail');
        assert.strictEqual(obj1.score, 0);
        assert.deepStrictEqual(obj1.evidence_event_ids, []);
    });

    // ── Test 3: OBJ-1 fails with wrong dst_port ──
    await test('OBJ-1 fails when event has wrong dst_port (not 502)', async () => {
        const events = [{
            id: 'evt-bad', source: 'ids', event_type: 'modbus_anomaly',
            data: JSON.stringify({ dst_port: 80, severity: 'high' })
        }];
        const db = makeDb(exerciseRow, objectives, events);
        const engine = new ObjectiveEngine(db);
        const results = await engine.evaluateAll('ex-001');
        const obj1 = results.find(r => r.objective_id === 'PLC-001-OBJ-1');
        assert.strictEqual(obj1.status, 'fail',
            'Event with wrong dst_port should not satisfy objective');
    });

    // ── Test 4: OBJ-2 passes with correct IP ──
    await test('OBJ-2 passes when student submits correct identified_ip', async () => {
        const events = [{
            id: 'evt-002', source: 'student', event_type: 'host_identified',
            data: JSON.stringify({ identified_ip: '10.10.2.10' })
        }];
        const db = makeDb(exerciseRow, objectives, events);
        const engine = new ObjectiveEngine(db);
        const results = await engine.evaluateAll('ex-001');
        const obj2 = results.find(r => r.objective_id === 'PLC-001-OBJ-2');
        assert.strictEqual(obj2.status, 'pass');
    });

    // ── Test 5: OBJ-2 fails with wrong IP ──
    await test('OBJ-2 fails when student submits wrong IP', async () => {
        const events = [{
            id: 'evt-wrong-ip', source: 'student', event_type: 'host_identified',
            data: JSON.stringify({ identified_ip: '10.10.5.50' })
        }];
        const db = makeDb(exerciseRow, objectives, events);
        const engine = new ObjectiveEngine(db);
        const results = await engine.evaluateAll('ex-001');
        const obj2 = results.find(r => r.objective_id === 'PLC-001-OBJ-2');
        assert.strictEqual(obj2.status, 'fail');
    });

    // ── Test 6: OBJ-3 passes with sufficient text ──
    await test('OBJ-3 passes when analysis_text has >= 50 characters', async () => {
        const longText = 'A'.repeat(60);
        const events = [{
            id: 'evt-003', source: 'student', event_type: 'log_analysis_submitted',
            data: JSON.stringify({ analysis_text: longText })
        }];
        const db = makeDb(exerciseRow, objectives, events);
        const engine = new ObjectiveEngine(db);
        const results = await engine.evaluateAll('ex-001');
        const obj3 = results.find(r => r.objective_id === 'PLC-001-OBJ-3');
        assert.strictEqual(obj3.status, 'pass');
    });

    // ── Test 7: OBJ-3 fails with insufficient text ──
    await test('OBJ-3 fails when analysis_text has < 50 characters', async () => {
        const events = [{
            id: 'evt-short', source: 'student', event_type: 'log_analysis_submitted',
            data: JSON.stringify({ analysis_text: 'Too short' })
        }];
        const db = makeDb(exerciseRow, objectives, events);
        const engine = new ObjectiveEngine(db);
        const results = await engine.evaluateAll('ex-001');
        const obj3 = results.find(r => r.objective_id === 'PLC-001-OBJ-3');
        assert.strictEqual(obj3.status, 'fail');
    });

    // ── Test 8: Multiple evidence events all captured ──
    await test('Evidence IDs contain all matching event IDs', async () => {
        const events = [
            { id: 'evt-a', source: 'ids', event_type: 'modbus_anomaly',
              data: JSON.stringify({ dst_port: 502, severity: 'high' }) },
            { id: 'evt-b', source: 'ids', event_type: 'modbus_anomaly',
              data: JSON.stringify({ dst_port: 502, severity: 'critical' }) }
        ];
        const db = makeDb(exerciseRow, objectives, events);
        const engine = new ObjectiveEngine(db);
        const results = await engine.evaluateAll('ex-001');
        const obj1 = results.find(r => r.objective_id === 'PLC-001-OBJ-1');
        assert.ok(obj1.evidence_event_ids.includes('evt-a'));
        assert.ok(obj1.evidence_event_ids.includes('evt-b'));
        assert.strictEqual(obj1.evidence_count, 2);
    });

    // ── Summary ────────────────────────────────────────────────────────────────
    console.log(`\n─────────────────────────────────`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        console.error('❌ Some tests failed.');
        process.exit(1);
    } else {
        console.log('✅ All tests passed.');
        process.exit(0);
    }
})();
