'use strict';
/**
 * CyberPro — Unit Tests: Timeline Engine
 * Tests event parsing, human-readable description synthesis,
 * relative time calculations, severity mapping, and audit trail integrity.
 *
 * Run: node tests/unit/timelineEngine.test.js
 */

const assert = require('assert');
const TimelineEngine = require('../../backend/engines/timelineEngine');

// ── Mock DB ───────────────────────────────────────────────────────────────────
function makeMockDb(events = [], exercise = null) {
    return {
        db: {
            all: (sql, params, callback) => {
                if (sql.includes('telemetry_events')) {
                    callback(null, events);
                } else {
                    callback(null, []);
                }
            },
            get: (sql, params, callback) => {
                if (sql.includes('exercise_sessions')) {
                    callback(null, exercise);
                } else {
                    callback(null, null);
                }
            }
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

async function run() {
    console.log('\n🧪 Running Timeline Engine Unit Tests...\n');

    await test('Empty events array returns valid empty timeline', async () => {
        const engine = new TimelineEngine(makeMockDb([]));
        const res = await engine.generate('ex-empty');

        assert.strictEqual(res.exercise_id, 'ex-empty');
        assert.strictEqual(res.entry_count, 0);
        assert.deepStrictEqual(res.entries, []);
        assert.ok(res.generated_at);
    });

    await test('Formats IDS modbus_anomaly event into human-readable description', async () => {
        const events = [{
            id: 'ev-1',
            exercise_id: 'ex-1',
            source: 'ids',
            event_type: 'modbus_anomaly',
            severity: 'high',
            data: JSON.stringify({ src_ip: '10.10.5.50', dst_ip: '10.10.2.10', dst_port: 502 }),
            timestamp: '2026-09-17T12:05:00Z'
        }];
        const engine = new TimelineEngine(makeMockDb(events));
        const res = await engine.generate('ex-1');

        assert.strictEqual(res.entry_count, 1);
        const entry = res.entries[0];
        assert.strictEqual(entry.severity_label, '🔴');
        assert.ok(entry.description.includes('Anomalous Modbus/TCP traffic detected'));
        assert.ok(entry.description.includes('10.10.5.50'));
        assert.ok(entry.description.includes('10.10.2.10:502'));
    });

    await test('Formats student action events (host_identified, log_analysis_submitted, containment_action)', async () => {
        const events = [
            {
                id: 'ev-2',
                exercise_id: 'ex-1',
                source: 'student',
                event_type: 'host_identified',
                severity: 'info',
                data: JSON.stringify({ identified_ip: '10.10.2.10' }),
                timestamp: '2026-09-17T12:10:00Z'
            },
            {
                id: 'ev-3',
                exercise_id: 'ex-1',
                source: 'student',
                event_type: 'log_analysis_submitted',
                severity: 'info',
                data: JSON.stringify({ analysis_text: 'Confirmed Modbus reconnaissance scanning port 502' }),
                timestamp: '2026-09-17T12:15:00Z'
            },
            {
                id: 'ev-4',
                exercise_id: 'ex-1',
                source: 'student',
                event_type: 'containment_action',
                severity: 'medium',
                data: JSON.stringify({ action_type: 'isolate_container' }),
                timestamp: '2026-09-17T12:20:00Z'
            }
        ];
        const engine = new TimelineEngine(makeMockDb(events));
        const res = await engine.generate('ex-1');

        assert.strictEqual(res.entry_count, 3);
        assert.ok(res.entries[0].description.includes('10.10.2.10'));
        assert.ok(res.entries[1].description.includes('chars'));
        assert.ok(res.entries[2].description.includes('isolate_container'));
    });

    await test('Calculates relative time in seconds and mm:ss from exercise start', async () => {
        const startTime = '2026-09-17T12:00:00.000Z';
        const exercise = {
            id: 'ex-1',
            scenario_id: 'PLC-001',
            start_time: startTime,
            end_time: '2026-09-17T12:30:00.000Z'
        };
        const events = [
            {
                id: 'ev-1',
                timestamp: '2026-09-17T12:02:30.000Z',
                event_type: 'exercise_started',
                source: 'system',
                severity: 'info',
                data: '{}'
            },
            {
                id: 'ev-2',
                timestamp: '2026-09-17T12:15:00.000Z',
                event_type: 'modbus_anomaly',
                source: 'ids',
                severity: 'high',
                data: '{}'
            }
        ];
        const engine = new TimelineEngine(makeMockDb(events, exercise));
        const res = await engine.generate('ex-1');

        assert.strictEqual(res.entries[0].relative_time_seconds, 150); // 2m 30s
        assert.strictEqual(res.entries[0].relative_time_display, '+2m30s');
        assert.strictEqual(res.entries[1].relative_time_seconds, 900); // 15m 00s
        assert.strictEqual(res.entries[1].relative_time_display, '+15m');
    });

    await test('Handles non-JSON string data gracefully without throwing', async () => {
        const events = [{
            id: 'ev-str',
            exercise_id: 'ex-1',
            source: 'ids',
            event_type: 'unknown_protocol',
            severity: 'low',
            data: 'plain text data payload',
            timestamp: '2026-09-17T12:05:00Z'
        }];
        const engine = new TimelineEngine(makeMockDb(events));
        const res = await engine.generate('ex-1');

        assert.strictEqual(res.entry_count, 1);
        assert.strictEqual(res.entries[0].data.raw, 'plain text data payload');
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

run().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
