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
    const savedResults = [];
    return {
        savedResults,
        db: {
            get: (sql, params, cb) => {
                if (sql.includes('exercise_sessions')) return cb(null, exerciseRow);
                cb(null, null);
            },
            all: (sql, params, cb) => {
                if (sql.includes('scenario_objectives')) return cb(null, objectives);
                if (sql.includes('telemetry_events')) {
                    const [exerciseId, scenarioId, ownerId] = params;
                    const filtered = events.filter(event =>
                        event.exercise_id === exerciseId &&
                        event.scenario_id === scenarioId &&
                        (event.source === 'student'
                            ? event.user_id === ownerId
                            : event.user_id == null)
                    );
                    return cb(null, filtered);
                }
                cb(null, []);
            },
            run: (sql, params, cb) => {
                if (sql.includes('INSERT INTO objective_results')) savedResults.push(params);
                if (cb) cb(null);
            }
        }
    };
}

function makeEvent(id, source, eventType, data, overrides = {}) {
    return {
        id,
        exercise_id: 'ex-001',
        scenario_id: 'PLC-001',
        user_id: source === 'student' ? 1 : null,
        source,
        event_type: eventType,
        severity: 'high',
        data: typeof data === 'string' ? data : JSON.stringify(data),
        ...overrides
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
        },
        {
            id: 'PLC-001-OBJ-4',
            name: 'Contain Incident',
            points: 25,
            required: 0,
            order_index: 3,
            detection_logic: JSON.stringify({
                source: 'student',
                event_type: 'containment_action',
                field_checks: {
                    action_type: ['block_ip', 'isolate_container', 'firewall_rule', 'disconnect_network']
                }
            })
        }
    ];

    const evaluate = async (objectiveId, events, exercise = exerciseRow) => {
        const db = makeDb(exercise, objectives, events);
        const engine = new ObjectiveEngine(db);
        const results = await engine.evaluateAll(exercise.id);
        return {
            result: results.find(item => item.objective_id === objectiveId),
            saved: db.savedResults
        };
    };

    const expectStatus = async (objectiveId, events, status, exercise) => {
        const { result } = await evaluate(objectiveId, events, exercise);
        assert.strictEqual(result.status, status);
        assert.strictEqual(result.score, status === 'pass' ? result.points : 0);
    };

    await test('OBJ-1 accepts matching IDS evidence with allowed port and severity', async () => {
        const { result, saved } = await evaluate('PLC-001-OBJ-1', [
            makeEvent('evt-valid-1', 'ids', 'modbus_anomaly', { dst_port: 502 }),
            makeEvent('evt-valid-2', 'ids', 'modbus_anomaly', { dst_port: 502 }, { severity: 'critical' })
        ]);
        assert.strictEqual(result.status, 'pass');
        assert.strictEqual(result.score, 25);
        assert.deepStrictEqual(result.evidence_event_ids, ['evt-valid-1', 'evt-valid-2']);
        assert.deepStrictEqual(JSON.parse(saved.find(row => row[1] === 'PLC-001-OBJ-1')[4]), result.evidence_event_ids);
    });

    await test('Objective result exposes deterministic validation details and evaluation timestamp', async () => {
        const { result } = await evaluate('PLC-001-OBJ-1', [
            makeEvent('evt-audit-valid', 'ids', 'modbus_anomaly', { dst_port: 502 }),
            makeEvent('evt-audit-invalid', 'ids', 'modbus_anomaly', '{malformed-json')
        ]);
        assert.ok(result.evaluation_timestamp);
        assert.deepStrictEqual(result.validation_details.accepted_event_ids, ['evt-audit-valid']);
        assert.deepStrictEqual(result.validation_details.rejected_events, [
            { event_id: 'evt-audit-invalid', reasons: ['malformed_json'] }
        ]);
    });

    await test('OBJ-1 rejects wrong port, wrong severity, wrong event type, and wrong source', async () => {
        const events = [
            makeEvent('evt-port', 'ids', 'modbus_anomaly', { dst_port: 80 }),
            makeEvent('evt-severity', 'ids', 'modbus_anomaly', { dst_port: 502 }, { severity: 'info' }),
            makeEvent('evt-type', 'ids', 'other_event', { dst_port: 502 }),
            makeEvent('evt-source', 'student', 'modbus_anomaly', { dst_port: 502 })
        ];
        await expectStatus('PLC-001-OBJ-1', events, 'fail');
        const { result } = await evaluate('PLC-001-OBJ-1', events);
        const rejectionReasons = result.validation_details.rejected_events.flatMap(event => event.reasons);
        assert.ok(rejectionReasons.includes('source_mismatch'));
        assert.ok(rejectionReasons.includes('event_type_mismatch'));
        assert.ok(rejectionReasons.includes('field_mismatch:dst_port'));
        assert.ok(rejectionReasons.includes('field_mismatch:severity'));
    });

    await test('Wrong exercise evidence cannot satisfy OBJ-1', async () => {
        await expectStatus('PLC-001-OBJ-1', [
            makeEvent('evt-other-exercise', 'ids', 'modbus_anomaly', { dst_port: 502 }, { exercise_id: 'ex-other' })
        ], 'fail');
    });

    await test('Wrong scenario evidence cannot satisfy OBJ-1', async () => {
        await expectStatus('PLC-001-OBJ-1', [
            makeEvent('evt-other-scenario', 'ids', 'modbus_anomaly', { dst_port: 502 }, { scenario_id: 'PLC-OTHER' })
        ], 'fail');
    });

    await test('Authenticated student cannot spoof an IDS source event', async () => {
        await expectStatus('PLC-001-OBJ-1', [
            makeEvent('evt-spoofed-ids', 'ids', 'modbus_anomaly',
                { dst_port: 502 }, { user_id: 1 })
        ], 'fail');
    });

    await test('Telemetry owned by another user cannot satisfy an exercise objective', async () => {
        await expectStatus('PLC-001-OBJ-2', [
            makeEvent('evt-other-user', 'student', 'host_identified', { identified_ip: '10.10.2.10' }, { user_id: 2 })
        ], 'fail');
    });

    await test('Student evidence without an exercise owner cannot satisfy an objective', async () => {
        await expectStatus('PLC-001-OBJ-2', [
            makeEvent('evt-unowned-student', 'student', 'host_identified',
                { identified_ip: '10.10.2.10' }, { user_id: null })
        ], 'fail');
    });

    await test('OBJ-2 accepts correct IP and rejects wrong or missing IP', async () => {
        await expectStatus('PLC-001-OBJ-2', [
            makeEvent('evt-correct-ip', 'student', 'host_identified', { identified_ip: '10.10.2.10' })
        ], 'pass');
        await expectStatus('PLC-001-OBJ-2', [
            makeEvent('evt-wrong-ip', 'student', 'host_identified', { identified_ip: '10.10.5.50' })
        ], 'fail');
        await expectStatus('PLC-001-OBJ-2', [
            makeEvent('evt-missing-ip', 'student', 'host_identified', {})
        ], 'fail');
    });

    await test('OBJ-2 rejects malformed and non-object payloads', async () => {
        await expectStatus('PLC-001-OBJ-2', [
            makeEvent('evt-malformed-ip', 'student', 'host_identified', '{invalid-json')
        ], 'fail');
        await expectStatus('PLC-001-OBJ-2', [
            makeEvent('evt-array-ip', 'student', 'host_identified', '[]')
        ], 'fail');
    });

    await test('OBJ-3 accepts analysis at its configured 50-character minimum', async () => {
        await expectStatus('PLC-001-OBJ-3', [
            makeEvent('evt-analysis-min', 'student', 'log_analysis_submitted', { analysis_text: 'A'.repeat(50) })
        ], 'pass');
    });

    await test('OBJ-3 rejects empty, short, wrong-type, and malformed analysis payloads', async () => {
        for (const [id, data] of [
            ['evt-empty-analysis', { analysis_text: '' }],
            ['evt-short-analysis', { analysis_text: 'Too short' }],
            ['evt-number-analysis', { analysis_text: 100 }],
            ['evt-object-analysis', { analysis_text: { text: 'A'.repeat(60) } }],
            ['evt-malformed-analysis', '{invalid-json']
        ]) {
            await expectStatus('PLC-001-OBJ-3', [
                makeEvent(id, 'student', 'log_analysis_submitted', data)
            ], 'fail');
        }
    });

    await test('OBJ-4 accepts only configured containment action types', async () => {
        await expectStatus('PLC-001-OBJ-4', [
            makeEvent('evt-valid-action', 'student', 'containment_action', { action_type: 'block_ip' })
        ], 'pass');
        await expectStatus('PLC-001-OBJ-4', [
            makeEvent('evt-invalid-action', 'student', 'containment_action', { action_type: 'allow_all' })
        ], 'fail');
        await expectStatus('PLC-001-OBJ-4', [
            makeEvent('evt-missing-action', 'student', 'containment_action', {})
        ], 'fail');
        await expectStatus('PLC-001-OBJ-4', [
            makeEvent('evt-wrong-type-action', 'student', 'containment_action', { action_type: 1 })
        ], 'fail');
    });

    await test('Malformed detection logic fails closed without awarding points', async () => {
        const invalidObjectives = [{
            ...objectives[0],
            detection_logic: '{invalid-json'
        }];
        const db = makeDb(exerciseRow, invalidObjectives, [
            makeEvent('evt-invalid-logic', 'ids', 'modbus_anomaly', { dst_port: 502 })
        ]);
        const result = await new ObjectiveEngine(db).evaluateAll('ex-001');
        assert.strictEqual(result[0].status, 'fail');
        assert.strictEqual(result[0].score, 0);
        assert.deepStrictEqual(result[0].evidence_event_ids, []);
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
