'use strict';
/**
 * CyberPro — Unit Tests: Reset Engine
 * Run: node tests/unit/resetEngine.test.js
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const ResetEngine = require('../../backend/engines/resetEngine');

function createDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(':memory:', error => {
            if (error) return reject(error);
            db.serialize(() => {
                db.run(`CREATE TABLE labs (id INTEGER PRIMARY KEY, docker_compose_path TEXT)`);
                db.run(`CREATE TABLE exercise_sessions (
                    id TEXT PRIMARY KEY, status TEXT, end_time DATETIME
                )`);
                db.run(`CREATE TABLE telemetry_events (
                    id TEXT PRIMARY KEY, exercise_id TEXT, source TEXT, event_type TEXT,
                    severity TEXT, data TEXT
                )`);
                db.run(`CREATE TABLE reset_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    exercise_id TEXT, lab_id INTEGER, initiated_by INTEGER,
                    start_time TEXT, end_time TEXT, status TEXT,
                    health_check_result TEXT, clean_state_verified INTEGER,
                    failure_reason TEXT
                )`);
                db.run(`INSERT INTO labs (id, docker_compose_path)
                    VALUES (1, 'labs/oilsprings/docker-compose.yml')`, err => {
                    if (err) return reject(err);
                    resolve({ db });
                });
            });
        });
    });
}

function digest(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function makeHarness(options = {}) {
    const database = await createDatabase();
    const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cyberpro-reset-'));
    const configPath = path.join(fixtureDir, 'monitor.conf');
    const testFilePath = path.join(fixtureDir, 'reset-probe.txt');
    const testConfigPath = path.join(fixtureDir, 'reset-probe.ini');
    fs.writeFileSync(configPath, 'baseline-mode=passive\n');

    const verificationConfig = {
        expected_services: ['collector'],
        expected_containers: ['oilsprings_collector'],
        expected_networks: ['l3_security_network'],
        expected_volumes: ['collector_logs'],
        configuration_files: ['controlled/monitor.conf'],
        temporary_files: [
            { service: 'collector', path: '/app/logs/reset-verification-probe.txt', fixture_path: testFilePath },
            { service: 'collector', path: '/app/logs/reset-verification-config.ini', fixture_path: testConfigPath }
        ],
        health_check_endpoints: [{ container: 'collector', url: 'http://localhost:8085/api/health', expected_status: 200 }]
    };
    let snapshotCount = 0;

    const snapshotProvider = async (lab, config) => {
        snapshotCount++;
        const containers = [{
            id: `container-id-${snapshotCount}`,
            names: ['oilsprings_collector'],
            service: 'collector',
            image_id: 'sha256:image-id',
            image_digests: ['registry.example/collector@sha256:image-digest'],
            state: 'running'
        }];
        const networks = [{
            id: `network-id-${snapshotCount}`,
            name: 'oilsprings_l3_security_network',
            logical_name: 'l3_security_network',
            driver: 'bridge',
            internal: true,
            ipam: [{ subnet: '10.10.4.0/24' }],
            options: {}
        }];
        const volumes = [{
            name: 'oilsprings_collector_logs',
            logical_name: 'collector_logs',
            driver: 'local',
            options: {}
        }];
        const temporaryArtifacts = config.temporary_files.map(artifact => {
            const exists = fs.existsSync(artifact.fixture_path);
            return {
                service: artifact.service,
                path: artifact.path,
                exists,
                sha256: exists ? digest(artifact.fixture_path) : null
            };
        });
        if (options.unexpectedResources && snapshotCount >= 3) {
            containers.push({
                id: 'unexpected-container', names: ['unexpected-container'],
                service: 'unexpected', image_id: 'sha256:unexpected', image_digests: []
            });
            networks.push({
                id: 'unexpected-network', name: 'oilsprings_unexpected',
                logical_name: 'unexpected_network', driver: 'bridge', internal: false,
                ipam: [], options: {}
            });
            volumes.push({
                name: 'oilsprings_unexpected_volume', logical_name: 'unexpected_volume',
                driver: 'local', options: {}
            });
        }
        return {
            captured_at: new Date().toISOString(),
            project_name: 'oilsprings',
            expected_services: config.expected_services,
            expected_containers: config.expected_containers,
            expected_networks: config.expected_networks,
            expected_network_configurations: config.expected_network_configurations,
            expected_volumes: config.expected_volumes,
            expected_volume_configurations: config.expected_volume_configurations,
            containers,
            networks,
            volumes,
            configuration_hashes: { 'controlled/monitor.conf': digest(configPath) },
            temporary_artifacts: temporaryArtifacts,
            fixture: { configPath, testFilePath, testConfigPath }
        };
    };

    const engine = new ResetEngine(database, {}, {
        reportPath: path.join(fixtureDir, 'reset-verification.json'),
        executionMode: 'MOCKED RESET TEST',
        snapshotProvider,
        healthCheckRetries: 1
    });
    engine._runCompose = async (cwd, args) => {
        if (args[0] === 'down' && options.restoreOnDown !== false) {
            for (const file of [testFilePath, testConfigPath]) {
                if (fs.existsSync(file)) fs.unlinkSync(file);
            }
            if (options.restoreConfig !== false) {
                fs.writeFileSync(configPath, 'baseline-mode=passive\n');
            }
        }
    };
    engine._runHealthChecks = async endpoints => {
        if (options.healthFailure) {
            return { [endpoints[0].container]: {
                status: 'unhealthy', expected_status: 200, actual_status: 503, attempts: 1
            } };
        }
        return Object.fromEntries(endpoints.map(endpoint => [endpoint.container, {
            status: 'healthy', expected_status: endpoint.expected_status, actual_status: 200, attempts: 1
        }]));
    };

    return { database, engine, fixtureDir, verificationConfig, configPath, testFilePath, testConfigPath };
}

async function closeHarness(harness) {
    await new Promise((resolve, reject) =>
        harness.database.db.close(error => error ? reject(error) : resolve()));
    fs.rmSync(harness.fixtureDir, { recursive: true, force: true });
}

async function run() {
    const tests = [
        ['MOCKED RESET TEST: Docker adapter captures IDs, images, networks, volumes, and config hashes', async harness => {
            const verification = require('../../scenarios/PLC-001/scenario.json').reset_verification;
            const serviceContainers = verification.expected_services.map((service, index) => ({
                Id: `container-${index}`,
                Names: [`/${verification.expected_containers[index]}`],
                Image: `image-${index}`,
                Labels: { 'com.docker.compose.service': service },
                State: 'running',
                Status: 'Up'
            }));
            const fakeDocker = {
                listContainers: async () => serviceContainers,
                listNetworks: async () => verification.expected_networks.map((name, index) => ({
                    Id: `network-${index}`,
                    Name: `oilsprings_${name}`,
                    Labels: { 'com.docker.compose.network': name },
                    Driver: 'bridge',
                    Internal: verification.expected_network_configurations[name].internal,
                    IPAM: { Config: [{ Subnet: verification.expected_network_configurations[name].subnets[0] }] },
                    Options: {}
                })),
                listVolumes: async () => ({ Volumes: [{
                    Name: 'oilsprings_collector_logs',
                    Labels: { 'com.docker.compose.volume': 'collector_logs' },
                    Driver: 'local',
                    Options: {}
                }] }),
                getImage: imageId => ({ inspect: async () => ({ RepoDigests: [`test/repo@${imageId}`] }) })
            };
            harness.engine.snapshotProvider = null;
            harness.engine.labManager = { docker: { docker: fakeDocker } };
            harness.engine._containerPathExists = async () => false;
            harness.engine._containerFileHash = async (containerId, filePath) =>
                crypto.createHash('sha256').update(`${containerId}:${filePath}`).digest('hex');

            const baseline = await harness.engine.captureBaseline(1, verification);
            assert.strictEqual(baseline.clean_state_verified, true);
            assert.strictEqual(baseline.containers.length, verification.expected_services.length);
            assert.strictEqual(baseline.containers[0].id, 'container-0');
            assert.deepStrictEqual(baseline.containers[0].image_digests, ['test/repo@image-0']);
            assert.strictEqual(baseline.networks.length, 4);
            assert.strictEqual(baseline.volumes[0].logical_name, 'collector_logs');
            assert.strictEqual(Object.keys(baseline.configuration_hashes).length, 4);
            assert.strictEqual(baseline.expected_file_hashes.length, 4);
            assert.ok(baseline.expected_file_hashes.every(file => /^[a-f0-9]{64}$/.test(file.sha256)));
            assert.deepStrictEqual(baseline.temporary_artifacts.map(item => item.exists), [false, false]);
        }],
        ['MOCKED RESET TEST: baseline inventory and file/config changes are restored', async harness => {
            const baseline = await harness.engine.captureBaseline(1, harness.verificationConfig);
            assert.strictEqual(baseline.clean_state_verified, true);
            assert.strictEqual(baseline.containers[0].image_id, 'sha256:image-id');
            assert.strictEqual(baseline.networks[0].id, 'network-id-1');
            assert.ok(baseline.configuration_hashes['controlled/monitor.conf']);

            fs.writeFileSync(harness.testFilePath, 'controlled exercise marker\n');
            fs.writeFileSync(harness.testConfigPath, 'controlled-mode=modified\n');
            fs.writeFileSync(harness.configPath, 'baseline-mode=modified\n');

            const result = await harness.engine.reset(null, 1, 7, baseline, harness.verificationConfig);
            assert.strictEqual(result.status, 'success');
            assert.strictEqual(result.clean_state_verified, true);
            assert.strictEqual(result.pre_reset.temporary_artifacts.every(item => item.exists), true);
            assert.deepStrictEqual(result.residual_artifacts, []);
            assert.deepStrictEqual(result.differences, []);
            assert.strictEqual(result.post_reset.configuration_hashes['controlled/monitor.conf'],
                baseline.configuration_hashes['controlled/monitor.conf']);
            assert.deepStrictEqual(result.post_reset.temporary_artifacts.map(item => item.exists), [false, false]);
            const report = JSON.parse(fs.readFileSync(result.report_path, 'utf8'));
            assert.strictEqual(report.execution_mode, 'MOCKED RESET TEST');
            assert.strictEqual(report.clean_state_verified, true);
        }],
        ['MOCKED RESET TEST: empty health endpoint list cannot certify clean state', async harness => {
            const baseline = await harness.engine.captureBaseline(1, harness.verificationConfig);
            const result = await harness.engine.reset(null, 1, 7, baseline, {
                ...harness.verificationConfig,
                health_check_endpoints: []
            });
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.clean_state_verified, false);
        }],
        ['MOCKED RESET TEST: failed health check cannot produce success', async harness => {
            harness.engine._runHealthChecks = async () => ({
                collector: { status: 'unhealthy', expected_status: 200, actual_status: 503, attempts: 1 }
            });
            const baseline = await harness.engine.captureBaseline(1, harness.verificationConfig);
            const result = await harness.engine.reset(null, 1, 7, baseline, harness.verificationConfig);
            assert.strictEqual(result.status, 'partial');
            assert.strictEqual(result.clean_state_verified, false);
            const row = await new Promise((resolve, reject) => harness.database.db.get(
                'SELECT status, clean_state_verified FROM reset_records WHERE id = ?',
                [result.reset_record_id], (error, record) => error ? reject(error) : resolve(record)));
            assert.strictEqual(row.status, 'partial');
            assert.strictEqual(row.clean_state_verified, 0);
        }],
        ['MOCKED RESET TEST: residual test file or changed config prevents clean verification', async harness => {
            const baseline = await harness.engine.captureBaseline(1, harness.verificationConfig);
            fs.writeFileSync(harness.testFilePath, 'controlled exercise marker\n');
            fs.writeFileSync(harness.testConfigPath, 'controlled-mode=modified\n');
            fs.writeFileSync(harness.configPath, 'baseline-mode=modified\n');
            harness.engine._runCompose = async () => {};
            const result = await harness.engine.reset(null, 1, 7, baseline, harness.verificationConfig);
            assert.strictEqual(result.status, 'partial');
            assert.strictEqual(result.clean_state_verified, false);
            assert.strictEqual(result.residual_artifacts.length, 2);
            assert.ok(result.differences.some(item => item.kind === 'configuration_hash_mismatch'));
        }],
        ['MOCKED RESET TEST: unexpected resources are reported as differences', async harness => {
            const baseline = await harness.engine.captureBaseline(1, harness.verificationConfig);
            const result = await harness.engine.reset(null, 1, 7, baseline, harness.verificationConfig);
            const kinds = new Set(result.differences.map(item => item.kind));
            assert.strictEqual(result.clean_state_verified, false);
            assert.ok(kinds.has('unexpected_service'));
            assert.ok(kinds.has('unexpected_container'));
            assert.ok(kinds.has('unexpected_network'));
            assert.ok(kinds.has('unexpected_volume'));
        }, { unexpectedResources: true }]
    ];

    let passed = 0;
    let failed = 0;
    console.log('\n🧪 Reset Engine Unit Tests\n');
    for (const [name, fn, options = {}] of tests) {
        let harness;
        try {
            harness = await makeHarness(options);
            await fn(harness);
            console.log(`  ✓ ${name}`);
            passed++;
        } catch (error) {
            console.error(`  ✗ ${name}`);
            console.error(`    ${error.message}`);
            failed++;
        } finally {
            if (harness) await closeHarness(harness);
        }
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) process.exitCode = 1;
}

run().catch(error => {
    console.error('Reset Engine unit test failed:', error);
    process.exitCode = 1;
});