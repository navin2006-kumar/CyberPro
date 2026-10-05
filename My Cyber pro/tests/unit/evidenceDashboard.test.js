'use strict';

const assert = require('assert');
const { buildDashboardModel, getObjectiveEvidence } = require('../../public/js/evidence-dashboard-model');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (error) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${error.message}`);
        failed++;
    }
}

function payload(overrides = {}) {
    return {
        score: {
            exercise_id: 'exercise-ui-1',
            scenario_id: 'PLC-001',
            total_score: 43,
            max_score: 68,
            pass_threshold: 41,
            minimum_required_objectives: 2,
            objectives_passed: 2,
            required_objectives_passed: 2,
            final_decision: 'PASS',
            objective_breakdown: [{
                objective_id: 'PLC-001-OBJ-1',
                name: 'Detection',
                status: 'pass',
                points_earned: 25,
                points_possible: 34,
                evidence_count: 1,
                evidence_event_ids: ['event-valid']
            }],
            objective_results: [{
                objective_id: 'PLC-001-OBJ-1',
                status: 'pass',
                score: 25,
                evidence_event_ids: ['event-valid'],
                validation_details: {
                    accepted_event_ids: ['event-valid'],
                    rejected_events: [{ event_id: 'event-invalid', reasons: ['malformed_json'] }]
                }
            }]
        },
        timeline: { entries: [{ id: 'event-valid', timestamp: '2026-10-05T10:00:00Z' }] },
        telemetry: { events: [
            { id: 'event-valid', event_type: 'host_identified', source: 'student', timestamp: '2026-10-05T10:00:00Z', data: { identified_ip: '10.10.2.10' } },
            { id: 'event-invalid', event_type: 'host_identified', source: 'student', timestamp: '2026-10-05T10:01:00Z', data: { raw: '{broken', parse_error: true } }
        ] },
        exercise: { exercise: { id: 'exercise-ui-1', scenario_id: 'PLC-001', reset_record: null } },
        scenario: { scenario: { id: 'PLC-001', name: 'PLC Attack Detection' } },
        ...overrides
    };
}

console.log('\n🧪 Evidence Dashboard Model Tests\n');

test('Passing exercise displays backend-provided score, threshold, and evidence', () => {
    const model = buildDashboardModel(payload());
    const evidence = getObjectiveEvidence(model, 'PLC-001-OBJ-1');
    assert.strictEqual(model.score.total, 43);
    assert.strictEqual(model.score.maximum, 68);
    assert.strictEqual(model.score.passThreshold, 41);
    assert.strictEqual(model.score.finalDecision, 'PASS');
    assert.strictEqual(model.score.objectivesPassed, 2);
    assert.strictEqual(model.score.minimumRequiredObjectives, 2);
    assert.strictEqual(model.scenarioId, 'PLC-001');
    assert.strictEqual(evidence.find(item => item.eventId === 'event-valid').validationResult, 'accepted');
});

test('Failing exercise displays backend failure decision without substituting a pass', () => {
    const data = payload();
    data.score.final_decision = 'FAIL';
    data.score.total_score = 12;
    const model = buildDashboardModel(data);
    assert.strictEqual(model.score.finalDecision, 'FAIL');
    assert.strictEqual(model.score.total, 12);
});

test('Missing evidence remains empty and does not invent an event', () => {
    const data = payload();
    data.score.objective_breakdown[0].status = 'fail';
    data.score.objective_breakdown[0].evidence_count = 0;
    data.score.objective_breakdown[0].evidence_event_ids = [];
    data.score.objective_results[0].status = 'fail';
    data.score.objective_results[0].evidence_event_ids = [];
    data.score.objective_results[0].validation_details = { accepted_event_ids: [], rejected_events: [] };
    const model = buildDashboardModel(data);
    assert.deepStrictEqual(getObjectiveEvidence(model, 'PLC-001-OBJ-1'), []);
});

test('Failed reset exposes backend status, health, residue, and false clean verification', () => {
    const data = payload();
    data.exercise.exercise.reset_record = {
        status: 'partial',
        clean_state_verified: 0,
        health_check_result: {
            health_checks: { collector: { status: 'unhealthy' } },
            residual_artifacts: [{ path: '/tmp/probe' }]
        }
    };
    const model = buildDashboardModel(data);
    assert.strictEqual(model.reset.status, 'partial');
    assert.strictEqual(model.reset.clean_state_verified, 0);
    assert.strictEqual(model.reset.health_check_result.health_checks.collector.status, 'unhealthy');
});

test('Invalid evidence displays rejected validation reason and raw payload fields', () => {
    const model = buildDashboardModel(payload());
    const evidence = getObjectiveEvidence(model, 'PLC-001-OBJ-1');
    const invalid = evidence.find(item => item.eventId === 'event-invalid');
    assert.strictEqual(invalid.validationResult, 'rejected: malformed_json');
    assert.strictEqual(invalid.relevantFields.parse_error, true);
    assert.strictEqual(invalid.eventType, 'host_identified');
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exitCode = 1;