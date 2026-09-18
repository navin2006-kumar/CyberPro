'use strict';
/**
 * CyberPro — Security Test: RBAC Enforcement & Route Protection Matrix
 * Validates that all privilege tiers (visitor, student, instructor, admin)
 * are strictly enforced and cannot escalate privileges or access restricted endpoints.
 *
 * Run: node tests/security/rbac-enforcement.test.js
 */

const assert = require('assert');
const { requireAuth, requireRole } = require('../../backend/middleware/auth');

let passed = 0;
let failed = 0;

function mockReq(session = null) {
    return { session };
}

function mockRes() {
    const res = {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };
    return res;
}

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
    console.log('\n🔒 Running CyberPro RBAC Security Enforcement Tests...\n');

    // 1. Unauthenticated Visitor Matrix
    await test('Visitor: Blocked from protected endpoints with 401 UNAUTHENTICATED', () => {
        const req = mockReq(null);
        const res = mockRes();
        let nextCalled = false;

        requireAuth(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(res.body.code, 'UNAUTHENTICATED');
    });

    // 2. Student Role Restrictions
    await test('Student: Blocked from instructor-only route with 403 INSUFFICIENT_ROLE', () => {
        const req = mockReq({ userId: 10, role: 'student' });
        const res = mockRes();
        let nextCalled = false;

        requireRole('instructor')(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.body.code, 'INSUFFICIENT_ROLE');
    });

    await test('Student: Blocked from admin-only route with 403 INSUFFICIENT_ROLE', () => {
        const req = mockReq({ userId: 10, role: 'student' });
        const res = mockRes();
        let nextCalled = false;

        requireRole('admin')(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.body.code, 'INSUFFICIENT_ROLE');
    });

    await test('Student: Allowed on student-level exercise routes', () => {
        const req = mockReq({ userId: 10, role: 'student' });
        const res = mockRes();
        let nextCalled = false;

        requireRole('student')(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, true);
        assert.strictEqual(res.statusCode, null);
    });

    // 3. Instructor Role Privileges & Boundaries
    await test('Instructor: Allowed on instructor routes', () => {
        const req = mockReq({ userId: 5, role: 'instructor' });
        const res = mockRes();
        let nextCalled = false;

        requireRole('instructor')(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, true);
    });

    await test('Instructor: Allowed on student routes (inherits student privilege)', () => {
        const req = mockReq({ userId: 5, role: 'instructor' });
        const res = mockRes();
        let nextCalled = false;

        requireRole('student')(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, true);
    });

    await test('Instructor: Blocked from admin routes', () => {
        const req = mockReq({ userId: 5, role: 'instructor' });
        const res = mockRes();
        let nextCalled = false;

        requireRole('admin')(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.statusCode, 403);
    });

    // 4. Admin Role Full Clearance
    await test('Admin: Allowed on student, instructor, and admin routes', () => {
        const req = mockReq({ userId: 1, role: 'admin' });
        const res = mockRes();

        let studentPass = false;
        let instructorPass = false;
        let adminPass = false;

        requireRole('student')(req, res, () => { studentPass = true; });
        requireRole('instructor')(req, res, () => { instructorPass = true; });
        requireRole('admin')(req, res, () => { adminPass = true; });

        assert.strictEqual(studentPass, true);
        assert.strictEqual(instructorPass, true);
        assert.strictEqual(adminPass, true);
    });

    // 5. Tampered or Invalid Role Protection
    await test('Invalid or forged role (e.g. "superadmin", "guest") defaults to 403', () => {
        const req = mockReq({ userId: 99, role: 'attacker_role' });
        const res = mockRes();
        let nextCalled = false;

        requireRole('student')(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.statusCode, 403);
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

run().catch(err => {
    console.error('Security test failed:', err);
    process.exit(1);
});
