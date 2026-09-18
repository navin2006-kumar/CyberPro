'use strict';
/**
 * CyberPro — Unit Tests: RBAC Middleware
 * Tests that role enforcement is correct across all role levels.
 *
 * Run: node tests/unit/rbac.test.js
 */

const assert = require('assert');
const { requireAuth, requireRole } = require('../../backend/middleware/auth');

let passed = 0;
let failed = 0;

// ── Mock Express helpers ────────────────────────────────────────────────────────
function makeReq(session = {}) {
    return { session };
}

function makeRes() {
    const res = { _status: null, _body: null };
    res.status = (code) => { res._status = code; return res; };
    res.json = (body) => { res._body = body; return res; };
    return res;
}

function callMiddleware(middleware, req) {
    return new Promise((resolve) => {
        const res = makeRes();
        middleware(req, res, () => resolve({ passed: true, res }));
        // If next() not called, resolve with the res after a tick
        setImmediate(() => resolve({ passed: false, res }));
    });
}

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${name}: ${err.message}`);
        failed++;
    }
}

// ── Tests ───────────────────────────────────────────────────────────────────────
(async () => {
    console.log('\n🧪 RBAC Middleware — Unit Tests\n');

    // requireAuth tests
    await test('requireAuth: allows request with valid session', async () => {
        const req = makeReq({ userId: 1, role: 'student' });
        const { passed: nextCalled } = await callMiddleware(requireAuth, req);
        assert.ok(nextCalled, 'next() should be called for authenticated user');
    });

    await test('requireAuth: blocks request with no session', async () => {
        const req = makeReq({});
        const result = await callMiddleware(requireAuth, req);
        // next() is not called; response is 401
        assert.ok(!result.passed || result.res._status === 401,
            'Should return 401 for unauthenticated request');
    });

    await test('requireAuth: blocks request with null session', async () => {
        const req = makeReq(null);
        const result = await callMiddleware(requireAuth, req);
        assert.ok(!result.passed, 'Should block null session');
    });

    // requireRole tests
    await test('requireRole(student): allows student role', async () => {
        const req = makeReq({ userId: 1, role: 'student' });
        const middleware = requireRole('student');
        const { passed: nextCalled } = await callMiddleware(middleware, req);
        assert.ok(nextCalled);
    });

    await test('requireRole(instructor): allows instructor role', async () => {
        const req = makeReq({ userId: 2, role: 'instructor' });
        const middleware = requireRole('instructor');
        const { passed: nextCalled } = await callMiddleware(middleware, req);
        assert.ok(nextCalled);
    });

    await test('requireRole(admin): allows admin role', async () => {
        const req = makeReq({ userId: 3, role: 'admin' });
        const middleware = requireRole('admin');
        const { passed: nextCalled } = await callMiddleware(middleware, req);
        assert.ok(nextCalled);
    });

    await test('requireRole(instructor): blocks student role', async () => {
        const req = makeReq({ userId: 1, role: 'student' });
        const middleware = requireRole('instructor');
        const result = await callMiddleware(middleware, req);
        assert.ok(!result.passed, 'Student should not access instructor route');
        assert.strictEqual(result.res._status, 403);
    });

    await test('requireRole(admin): blocks student role', async () => {
        const req = makeReq({ userId: 1, role: 'student' });
        const middleware = requireRole('admin');
        const result = await callMiddleware(middleware, req);
        assert.ok(!result.passed);
        assert.strictEqual(result.res._status, 403);
    });

    await test('requireRole(admin): blocks instructor role', async () => {
        const req = makeReq({ userId: 2, role: 'instructor' });
        const middleware = requireRole('admin');
        const result = await callMiddleware(middleware, req);
        assert.ok(!result.passed);
        assert.strictEqual(result.res._status, 403);
    });

    await test('requireRole(instructor): allows admin role (admin > instructor)', async () => {
        const req = makeReq({ userId: 3, role: 'admin' });
        const middleware = requireRole('instructor');
        const { passed: nextCalled } = await callMiddleware(middleware, req);
        assert.ok(nextCalled, 'Admin should be able to access instructor routes');
    });

    await test('requireRole: returns 401 when not authenticated', async () => {
        const req = makeReq({});
        const middleware = requireRole('student');
        const result = await callMiddleware(middleware, req);
        assert.ok(!result.passed);
        assert.strictEqual(result.res._status, 401);
    });

    await test('requireRole: returns 403 for unknown role', async () => {
        const req = makeReq({ userId: 1, role: 'unknown_role' });
        const middleware = requireRole('student');
        const result = await callMiddleware(middleware, req);
        assert.ok(!result.passed);
        assert.strictEqual(result.res._status, 403);
    });

    // Summary
    console.log(`\n─────────────────────────────────`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) { console.error('❌ Some tests failed.'); process.exit(1); }
    else { console.log('✅ All tests passed.'); process.exit(0); }
})();
