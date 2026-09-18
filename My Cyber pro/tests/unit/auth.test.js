'use strict';
/**
 * CyberPro — Unit Tests: Authentication & Password Verification
 * Tests bcrypt password hashing, verification, invalid credentials,
 * and user role assignment.
 *
 * Run: node tests/unit/auth.test.js
 */

const assert = require('assert');
const bcrypt = require('bcrypt');

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
    console.log('\n🧪 Running Authentication Unit Tests...\n');

    await test('Bcrypt hash creates a secure non-plaintext password string', async () => {
        const rawPassword = 'StudentSecret123!';
        const hash = await bcrypt.hash(rawPassword, 10);

        assert.notStrictEqual(hash, rawPassword);
        assert.ok(hash.startsWith('$2b$10$') || hash.startsWith('$2a$10$'));
    });

    await test('Bcrypt compare validates correct password against hash', async () => {
        const rawPassword = 'StudentSecret123!';
        const hash = await bcrypt.hash(rawPassword, 10);
        const isValid = await bcrypt.compare(rawPassword, hash);

        assert.strictEqual(isValid, true);
    });

    await test('Bcrypt compare rejects wrong password', async () => {
        const rawPassword = 'StudentSecret123!';
        const hash = await bcrypt.hash(rawPassword, 10);
        const isValid = await bcrypt.compare('WrongPassword456!', hash);

        assert.strictEqual(isValid, false);
    });

    await test('Empty password does not match valid hash', async () => {
        const hash = await bcrypt.hash('validPass', 10);
        const isValid = await bcrypt.compare('', hash);

        assert.strictEqual(isValid, false);
    });

    await test('Password salting generates distinct hashes for identical passwords', async () => {
        const pass = 'IdenticalPassword123';
        const hash1 = await bcrypt.hash(pass, 10);
        const hash2 = await bcrypt.hash(pass, 10);

        assert.notStrictEqual(hash1, hash2);
        assert.strictEqual(await bcrypt.compare(pass, hash1), true);
        assert.strictEqual(await bcrypt.compare(pass, hash2), true);
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exit(1);
}

run().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
