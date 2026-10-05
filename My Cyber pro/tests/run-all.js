'use strict';
/**
 * CyberPro — Master Automated Test Suite Runner
 * Executes:
 *   - Unit: Objective Engine
 *   - Unit: Scoring Engine
 *   - Unit: Timeline Engine
 *   - Unit: Authentication
 *   - Unit: RBAC Middleware
 *   - Integration: Full Scenario Lifecycle
 *   - Security: RBAC Enforcement Matrix
 *
 * Run: node tests/run-all.js
 */

const { spawnSync } = require('child_process');
const path = require('path');

const SUITES = [
    { name: 'Unit: Objective Engine', script: 'tests/unit/objectiveEngine.test.js' },
    { name: 'Unit: Scoring Engine', script: 'tests/unit/scoringEngine.test.js' },
    { name: 'Unit: Score Replay', script: 'tests/unit/replayEngine.test.js' },
    { name: 'Unit: Timeline Engine', script: 'tests/unit/timelineEngine.test.js' },
    { name: 'Unit: Authentication', script: 'tests/unit/auth.test.js' },
    { name: 'Unit: RBAC Middleware', script: 'tests/unit/rbac.test.js' },
    { name: 'Unit: Reset Engine', script: 'tests/unit/resetEngine.test.js' },
    { name: 'Integration: Scenario Lifecycle', script: 'tests/integration/scenario-flow.test.js' },
    { name: 'Security: RBAC Enforcement', script: 'tests/security/rbac-enforcement.test.js' },
    { name: 'Security: Evidence Admission', script: 'tests/security/evidence-admission.test.js' }
];

console.log('╔═════════════════════════════════════════════════════════════════╗');
console.log('║       🔬 CyberPro Automated Test Suite — Master Runner         ║');
console.log('╚═════════════════════════════════════════════════════════════════╝\n');

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const suite of SUITES) {
    process.stdout.write(`⏳ Running ${suite.name}... `);
    const start = Date.now();
    const res = spawnSync(process.execPath, [path.join(__dirname, '..', suite.script)], {
        encoding: 'utf8',
        cwd: path.join(__dirname, '..')
    });
    const duration = Date.now() - start;

    if (res.status === 0) {
        console.log(`✅ PASSED (${duration}ms)`);
        totalPassed++;
        results.push({ name: suite.name, status: 'PASSED', duration: `${duration}ms` });
    } else {
        console.log(`❌ FAILED (${duration}ms)`);
        console.error(res.stdout);
        console.error(res.stderr);
        totalFailed++;
        results.push({ name: suite.name, status: 'FAILED', duration: `${duration}ms` });
    }
}

console.log('\n═════════════════════════════════════════════════════════════════');
console.log('                       TEST SUMMARY TABLE                        ');
console.log('═════════════════════════════════════════════════════════════════');
console.table(results);
console.log(`Total Suites: ${SUITES.length} | Passed: ${totalPassed} | Failed: ${totalFailed}\n`);

if (totalFailed > 0) {
    process.exit(1);
} else {
    console.log('🎉 ALL AUTOMATED TEST SUITES PASSED CLEANLY!\n');
}
