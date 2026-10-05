'use strict';
/**
 * CyberPro — Reset Engine
 * Implements a verified environment reset workflow:
 *
 *   Stop exercise
 *   ↓ Stop containers (docker-compose down)
 *   ↓ Remove temporary state (volumes, networks)
 *   ↓ Recreate clean environment (docker-compose up -d)
 *   ↓ Wait for containers to be ready
 *   ↓ Run health checks against each service
 *   ↓ Compare expected vs actual clean state
 *   ↓ Record result in reset_records (success / failed / partial)
 *
 * IMPORTANT: Does NOT claim reset success until health checks pass.
 */

const { spawn, execFile } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const HEALTH_CHECK_TIMEOUT_MS = 5000;
const HEALTH_CHECK_RETRIES = 10;
const HEALTH_CHECK_INTERVAL_MS = 3000;

class ResetEngine {
    /**
     * @param {object} db - Database instance
     * @param {object} labManager - LabManager instance
     */
    constructor(db, labManager, options = {}) {
        this.db = db;
        this.labManager = labManager;
        this.reportPath = options.reportPath ||
            path.resolve(__dirname, '../../results/reset-verification.json');
        this.executionMode = options.executionMode || 'REAL DOCKER RESET';
        this.snapshotProvider = options.snapshotProvider || null;
        this.healthCheckRetries = options.healthCheckRetries || HEALTH_CHECK_RETRIES;
    }

    async captureBaseline(labId, verificationConfig = {}) {
        const lab = await this._getLab(labId);
        if (!lab) throw new Error(`Lab ${labId} not found`);

        const composePath = path.resolve(__dirname, '../../', lab.docker_compose_path);
        if (!fs.existsSync(composePath)) {
            throw new Error(`docker-compose file not found: ${composePath}`);
        }

        const snapshot = await this._captureSnapshot(lab, verificationConfig);
        snapshot.expected_health_endpoints = verificationConfig.health_check_endpoints || [];
        snapshot.baseline_issues = this._snapshotIssues(snapshot);
        if (snapshot.expected_health_endpoints.length === 0) {
            snapshot.baseline_issues.push({ kind: 'no_expected_health_endpoints' });
        }
        snapshot.clean_state_verified = snapshot.baseline_issues.length === 0;
        return snapshot;
    }

    /**
     * Execute a full reset workflow for an exercise/lab.
     * @param {string} exerciseId - UUID of exercise session (may be null for direct lab reset)
     * @param {number} labId - lab DB id
     * @param {number} initiatedBy - user ID
     * @param {object} baseline - snapshot captured before the exercise record was created
     * @param {object} verificationConfig - scenario reset_verification manifest section
     * @returns {Promise<object>} Reset result record
     */
    async reset(exerciseId, labId, initiatedBy, baseline, verificationConfig = {}) {
        const startTime = new Date().toISOString();
        let recordId = null;
        let preReset = null;
        let postReset = null;
        let healthChecks = {};
        let differences = [];
        let residualArtifacts = [];

        try {
            recordId = await this._createResetRecord(exerciseId, labId, initiatedBy, startTime);

            if (exerciseId) {
                await this._emitEvent(exerciseId, 'system', 'reset_initiated', 'info', {
                    initiated_by: initiatedBy, lab_id: labId
                });
            }

            const lab = await this._getLab(labId);
            if (!lab) throw new Error(`Lab ${labId} not found`);

            const composePath = path.join(__dirname, '../../', lab.docker_compose_path);
            if (!fs.existsSync(composePath)) {
                throw new Error(`docker-compose file not found: ${composePath}`);
            }
            if (!baseline || !baseline.clean_state_verified || !Array.isArray(baseline.containers)) {
                throw new Error('A verified pre-exercise baseline is required');
            }

            const composeDir = path.dirname(composePath);
            const endpoints = verificationConfig.health_check_endpoints ||
                baseline.expected_health_endpoints || [];

            preReset = await this._captureSnapshot(lab, verificationConfig);
            if (exerciseId) {
                await this._updateExerciseStatus(exerciseId, 'reset');
            }

            console.log('🔄 [Reset] Running docker-compose down...');
            await this._runCompose(composeDir, ['down', '--remove-orphans', '--volumes']);
            console.log('✓ [Reset] Containers stopped and removed');

            console.log('🔄 [Reset] Starting clean environment...');
            await this._runCompose(composeDir, ['up', '-d', '--force-recreate']);
            console.log('✓ [Reset] Containers started');

            postReset = await this._captureSnapshot(lab, verificationConfig);
            console.log('🔄 [Reset] Running health checks...');
            healthChecks = await this._runHealthChecks(endpoints);
            const comparison = this._compareSnapshots(baseline, postReset);
            differences = comparison.differences;
            residualArtifacts = comparison.residualArtifacts;

            const allHealthy = endpoints.length > 0 &&
                endpoints.every(endpoint => healthChecks[endpoint.container]?.status === 'healthy');
            const cleanStateVerified = baseline.clean_state_verified && allHealthy &&
                differences.length === 0 && residualArtifacts.length === 0;
            const status = cleanStateVerified ? 'success' : 'partial';
            const report = this._makeReport({
                exerciseId, labId, status, baseline, preReset, postReset,
                differences, residualArtifacts, healthChecks
            });

            await this._writeReport(report);
            await this._updateResetRecord(recordId, status,
                { health_checks: healthChecks, differences, residual_artifacts: residualArtifacts },
                cleanStateVerified, cleanStateVerified ? null : 'Health or residue verification failed');

            if (exerciseId) {
                await this._emitEvent(exerciseId, 'system',
                    cleanStateVerified ? 'reset_completed' : 'reset_failed',
                    cleanStateVerified ? 'info' : 'high',
                    { status, health_checks: healthChecks, differences, residual_artifacts: residualArtifacts }
                );
            }

            console.log(`${cleanStateVerified ? '✅' : '⚠️'} [Reset] Status: ${status}`);

            return {
                success: cleanStateVerified,
                status,
                health_check_result: healthChecks,
                clean_state_verified: cleanStateVerified,
                baseline,
                pre_reset: preReset,
                post_reset: postReset,
                differences,
                residual_artifacts: residualArtifacts,
                reset_record_id: recordId,
                report_path: this.reportPath,
                message: cleanStateVerified
                    ? 'Environment reset successfully. Clean state verified.'
                    : 'Reset completed but health or residue verification failed.'
            };

        } catch (error) {
            console.error('❌ [Reset] Failed:', error.message);

            if (recordId) {
                await this._updateResetRecord(recordId, 'failed',
                    { health_checks: healthChecks, differences, residual_artifacts: residualArtifacts },
                    false, error.message);
            }

            const report = this._makeReport({
                exerciseId, labId, status: 'failed', baseline, preReset, postReset,
                differences, residualArtifacts, healthChecks, error: error.message
            });
            await this._writeReport(report).catch(writeError => {
                console.error('❌ [Reset] Could not write verification report:', writeError.message);
            });

            if (exerciseId) {
                await this._emitEvent(exerciseId, 'system', 'reset_failed', 'critical', {
                    reason: error.message
                });
            }

            return {
                success: false,
                status: 'failed',
                clean_state_verified: false,
                baseline,
                pre_reset: preReset,
                post_reset: postReset,
                differences,
                residual_artifacts: residualArtifacts,
                health_check_result: healthChecks,
                reset_record_id: recordId,
                report_path: this.reportPath,
                message: `Reset failed: ${error.message}`
            };
        }
    }

    async _captureSnapshot(lab, verificationConfig) {
        if (this.snapshotProvider) {
            return this.snapshotProvider(lab, verificationConfig);
        }

        const docker = this.labManager?.docker?.docker || this.labManager?.docker;
        if (!docker || !docker.listContainers || !docker.listNetworks || !docker.listVolumes) {
            throw new Error('Docker snapshot provider is unavailable');
        }

        const projectName = verificationConfig.project_name ||
            path.basename(path.dirname(lab.docker_compose_path)).toLowerCase().replace(/[^a-z0-9_-]/g, '');
        const filters = { label: [`com.docker.compose.project=${projectName}`] };
        const [containerRows, networkRows, volumeResponse] = await Promise.all([
            docker.listContainers({ all: true, filters }),
            docker.listNetworks({ filters }),
            docker.listVolumes({ filters })
        ]);

        const containers = await Promise.all(containerRows.map(async row => {
            const image = await docker.getImage(row.Image).inspect();
            return {
                id: row.Id,
                names: (row.Names || []).map(name => name.replace(/^\//, '')).sort(),
                service: row.Labels?.['com.docker.compose.service'] || null,
                image_id: row.Image,
                image_digests: image.RepoDigests || [],
                state: row.State,
                status: row.Status
            };
        }));

        const configurationHashes = {};
        const projectRoot = path.resolve(__dirname, '../../');
        for (const relativeFile of verificationConfig.configuration_files || []) {
            const absoluteFile = path.resolve(projectRoot, relativeFile);
            const relative = path.relative(projectRoot, absoluteFile);
            if (relative.startsWith('..') || path.isAbsolute(relative)) {
                throw new Error(`Configuration file escapes project root: ${relativeFile}`);
            }
            configurationHashes[relativeFile] = crypto.createHash('sha256')
                .update(fs.readFileSync(absoluteFile)).digest('hex');
        }

        const expectedFileHashes = [];
        for (const expectedFile of verificationConfig.expected_files || []) {
            if (!expectedFile.service || !expectedFile.path || !expectedFile.path.startsWith('/') ||
                expectedFile.path.split('/').includes('..')) {
                throw new Error('Invalid expected-file verification configuration');
            }
            const container = containers.find(item => item.service === expectedFile.service);
            if (!container) {
                expectedFileHashes.push({ ...expectedFile, sha256: null, error: 'service container missing' });
                continue;
            }
            try {
                expectedFileHashes.push({
                    ...expectedFile,
                    sha256: await this._containerFileHash(container.id, expectedFile.path)
                });
            } catch (error) {
                if (error.code !== 1) throw error;
                expectedFileHashes.push({ ...expectedFile, sha256: null, error: 'file missing' });
            }
        }

        const temporaryArtifacts = [];
        for (const artifact of verificationConfig.temporary_files || []) {
            if (!artifact.service || !artifact.path || !artifact.path.startsWith('/') ||
                artifact.path.split('/').includes('..')) {
                throw new Error('Invalid temporary-file probe configuration');
            }
            const container = containers.find(item => item.service === artifact.service);
            if (!container) {
                temporaryArtifacts.push({ ...artifact, exists: null, error: 'service container missing' });
                continue;
            }
            const exists = await this._containerPathExists(container.id, artifact.path);
            const fileHash = exists ? await this._containerFileHash(container.id, artifact.path) : null;
            temporaryArtifacts.push({ ...artifact, exists, sha256: fileHash });
        }

        return {
            captured_at: new Date().toISOString(),
            project_name: projectName,
            expected_services: verificationConfig.expected_services || [],
            expected_containers: verificationConfig.expected_containers || [],
            expected_networks: verificationConfig.expected_networks || [],
            expected_network_configurations: verificationConfig.expected_network_configurations || {},
            expected_volumes: verificationConfig.expected_volumes || [],
            expected_volume_configurations: verificationConfig.expected_volume_configurations || {},
            expected_files: verificationConfig.expected_files || [],
            containers,
            networks: networkRows.map(network => ({
                id: network.Id,
                name: network.Name,
                logical_name: network.Labels?.['com.docker.compose.network'] || null,
                driver: network.Driver,
                internal: Boolean(network.Internal),
                ipam: network.IPAM?.Config || [],
                options: network.Options || {}
            })),
            volumes: (volumeResponse.Volumes || []).map(volume => ({
                name: volume.Name,
                logical_name: volume.Labels?.['com.docker.compose.volume'] || null,
                driver: volume.Driver,
                options: volume.Options || {}
            })),
            configuration_hashes: configurationHashes,
            expected_file_hashes: expectedFileHashes,
            temporary_artifacts: temporaryArtifacts
        };
    }

    _snapshotIssues(snapshot) {
        const differences = [];
        const services = new Set((snapshot.containers || []).map(item => item.service).filter(Boolean));
        const containerNames = new Set((snapshot.containers || []).flatMap(item => item.names || []));
        const networks = new Set((snapshot.networks || []).map(item => item.logical_name || item.name));
        const volumes = new Set((snapshot.volumes || []).map(item => item.logical_name || item.name));
        const networkByName = new Map((snapshot.networks || []).map(item => [item.logical_name || item.name, item]));
        const volumeByName = new Map((snapshot.volumes || []).map(item => [item.logical_name || item.name, item]));

        for (const service of snapshot.expected_services || []) {
            if (!services.has(service)) differences.push({ kind: 'missing_service', resource: service });
        }
        for (const service of services) {
            if (!(snapshot.expected_services || []).includes(service)) {
                differences.push({ kind: 'unexpected_service', resource: service });
            }
        }
        for (const name of snapshot.expected_containers || []) {
            if (!containerNames.has(name)) differences.push({ kind: 'missing_container', resource: name });
        }
        for (const name of containerNames) {
            if (!(snapshot.expected_containers || []).includes(name)) {
                differences.push({ kind: 'unexpected_container', resource: name });
            }
        }
        for (const container of snapshot.containers || []) {
            if (container.state !== 'running') {
                differences.push({ kind: 'container_not_running', resource: container.service || container.names?.[0] });
            }
        }
        for (const network of snapshot.expected_networks || []) {
            if (!networks.has(network)) differences.push({ kind: 'missing_network', resource: network });
        }
        for (const network of networks) {
            if (!(snapshot.expected_networks || []).includes(network)) {
                differences.push({ kind: 'unexpected_network', resource: network });
            }
        }
        for (const [name, expected] of Object.entries(snapshot.expected_network_configurations || {})) {
            const actual = networkByName.get(name);
            if (actual && !this._matchesExpectedNetwork(actual, expected)) {
                differences.push({ kind: 'network_configuration_mismatch', resource: name });
            }
        }
        for (const volume of snapshot.expected_volumes || []) {
            if (!volumes.has(volume)) differences.push({ kind: 'missing_volume', resource: volume });
        }
        for (const volume of volumes) {
            if (!(snapshot.expected_volumes || []).includes(volume)) {
                differences.push({ kind: 'unexpected_volume', resource: volume });
            }
        }
        for (const [name, expected] of Object.entries(snapshot.expected_volume_configurations || {})) {
            const actual = volumeByName.get(name);
            if (actual && expected.driver && actual.driver !== expected.driver) {
                differences.push({ kind: 'volume_configuration_mismatch', resource: name });
            }
        }
        for (const file of snapshot.expected_file_hashes || []) {
            if (!file.sha256) {
                differences.push({ kind: 'expected_file_missing', resource: `${file.service}:${file.path}` });
            }
        }
        for (const artifact of snapshot.temporary_artifacts || []) {
            if (artifact.exists !== false) {
                differences.push({ kind: 'baseline_artifact_not_absent', resource: artifact.path });
            }
        }
        return differences;
    }

    _compareSnapshots(baseline, postReset) {
        const differences = this._snapshotIssues(postReset);
        const residualArtifacts = (postReset.temporary_artifacts || [])
            .filter(artifact => artifact.exists !== false);

        for (const issue of baseline.baseline_issues || []) differences.push(issue);

        const baselineContainers = new Map((baseline.containers || []).map(item => [item.service, item]));
        const postContainers = new Map((postReset.containers || []).map(item => [item.service, item]));
        for (const service of baseline.expected_services || []) {
            const before = baselineContainers.get(service);
            const after = postContainers.get(service);
            if (before && after && (before.image_id !== after.image_id ||
                JSON.stringify([...(before.image_digests || [])].sort()) !==
                JSON.stringify([...(after.image_digests || [])].sort()))) {
                differences.push({ kind: 'image_mismatch', resource: service,
                    baseline: { id: before.image_id, digests: before.image_digests || [] },
                    post_reset: { id: after.image_id, digests: after.image_digests || [] } });
            }
        }

        const baselineNetworks = new Map((baseline.networks || []).map(item => [item.logical_name || item.name, item]));
        const postNetworks = new Map((postReset.networks || []).map(item => [item.logical_name || item.name, item]));
        for (const name of baseline.expected_networks || []) {
            const before = baselineNetworks.get(name);
            const after = postNetworks.get(name);
            if (before && after && JSON.stringify(this._networkConfiguration(before)) !==
                JSON.stringify(this._networkConfiguration(after))) {
                differences.push({ kind: 'network_configuration_mismatch', resource: name });
            }
        }

        const baselineVolumes = new Map((baseline.volumes || []).map(item => [item.logical_name || item.name, item]));
        const postVolumes = new Map((postReset.volumes || []).map(item => [item.logical_name || item.name, item]));
        for (const name of baseline.expected_volumes || []) {
            const before = baselineVolumes.get(name);
            const after = postVolumes.get(name);
            if (before && after && (before.driver !== after.driver ||
                JSON.stringify(before.options || {}) !== JSON.stringify(after.options || {}))) {
                differences.push({ kind: 'volume_configuration_mismatch', resource: name });
            }
        }

        for (const [file, hash] of Object.entries(baseline.configuration_hashes || {})) {
            if ((postReset.configuration_hashes || {})[file] !== hash) {
                differences.push({ kind: 'configuration_hash_mismatch', resource: file });
            }
        }
        const postFileHashes = new Map((postReset.expected_file_hashes || []).map(file =>
            [`${file.service}:${file.path}`, file.sha256]));
        for (const file of baseline.expected_file_hashes || []) {
            const key = `${file.service}:${file.path}`;
            if (!file.sha256 || postFileHashes.get(key) !== file.sha256) {
                differences.push({ kind: 'container_file_hash_mismatch', resource: key,
                    baseline_sha256: file.sha256 || null,
                    post_reset_sha256: postFileHashes.get(key) || null });
            }
        }
        for (const before of baseline.temporary_artifacts || []) {
            const after = (postReset.temporary_artifacts || []).find(item =>
                item.service === before.service && item.path === before.path);
            if (!after || after.exists !== false) {
                if (!residualArtifacts.some(item => item.path === before.path)) residualArtifacts.push(after || before);
            }
        }

        return { differences, residualArtifacts };
    }

    _networkConfiguration(network) {
        return {
            driver: network.driver,
            internal: network.internal,
            subnets: (network.ipam || []).map(entry => typeof entry === 'string' ? entry : entry.Subnet)
                .filter(Boolean).sort(),
            options: network.options || {}
        };
    }

    _matchesExpectedNetwork(actual, expected) {
        const configuration = this._networkConfiguration(actual);
        if (expected.driver && configuration.driver !== expected.driver) return false;
        if (expected.internal !== undefined && configuration.internal !== expected.internal) return false;
        if (expected.subnets && JSON.stringify(configuration.subnets) !==
            JSON.stringify([...expected.subnets].sort())) return false;
        return true;
    }

    _containerPathExists(containerId, filePath) {
        return new Promise((resolve, reject) => {
            execFile('docker', ['exec', containerId, 'test', '-e', filePath], error => {
                if (!error) return resolve(true);
                if (error.code === 1) return resolve(false);
                reject(error);
            });
        });
    }

    _containerFileHash(containerId, filePath) {
        return new Promise((resolve, reject) => {
            execFile('docker', ['exec', containerId, 'sha256sum', '--', filePath], (error, stdout) => {
                if (error) return reject(error);
                const hash = stdout.trim().split(/\s+/)[0];
                if (!/^[a-f0-9]{64}$/i.test(hash)) return reject(new Error(`Invalid file hash: ${filePath}`));
                resolve(hash);
            });
        });
    }

    _makeReport({ exerciseId, labId, status, baseline, preReset, postReset,
        differences, residualArtifacts, healthChecks, error = null }) {
        return {
            generated_at: new Date().toISOString(),
            execution_mode: this.executionMode,
            exercise_id: exerciseId,
            lab_id: labId,
            status,
            clean_state_verified: status === 'success' && differences.length === 0 &&
                residualArtifacts.length === 0 && Object.keys(healthChecks).length > 0 &&
                Object.values(healthChecks).every(result => result.status === 'healthy'),
            baseline: baseline || null,
            pre_reset: preReset,
            post_reset: postReset,
            differences,
            residual_artifacts: residualArtifacts,
            health_checks: healthChecks,
            error
        };
    }

    async _writeReport(report) {
        await fs.promises.mkdir(path.dirname(this.reportPath), { recursive: true });
        const temporaryPath = `${this.reportPath}.tmp`;
        await fs.promises.writeFile(temporaryPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
        await fs.promises.rename(temporaryPath, this.reportPath);
    }

    /**
     * Run health checks against each service endpoint.
     * Retries up to HEALTH_CHECK_RETRIES times before marking as unhealthy.
     */
    async _runHealthChecks(endpoints) {
        const results = {};

        for (const ep of endpoints) {
            let actualStatus = null;
            let attempts = 0;

            for (let attempt = 1; attempt <= this.healthCheckRetries; attempt++) {
                attempts = attempt;
                try {
                    actualStatus = await this._httpGet(ep.url);
                    if (actualStatus === (ep.expected_status || 200)) break;
                } catch {}

                if (attempt < this.healthCheckRetries) {
                    await this._sleep(HEALTH_CHECK_INTERVAL_MS);
                }
            }

            const healthy = actualStatus === (ep.expected_status || 200);
            results[ep.container] = {
                status: healthy ? 'healthy' : 'unhealthy',
                expected_status: ep.expected_status || 200,
                actual_status: actualStatus,
                attempts
            };
            console.log(`  ${healthy ? '✓' : '✗'} ${ep.container}: ${results[ep.container].status}`);
        }

        return results;
    }

    _httpGet(url) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            const req = client.get(url, { timeout: HEALTH_CHECK_TIMEOUT_MS }, (res) => {
                resolve(res.statusCode);
            });
            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        });
    }

    _runCompose(cwd, args) {
        return new Promise((resolve, reject) => {
            const proc = spawn('docker-compose', args, { cwd, shell: true });
            let err = '';
            proc.stderr.on('data', d => { err += d.toString(); });
            proc.on('close', code => {
                if (code === 0) resolve();
                else reject(new Error(`docker-compose ${args[0]} failed (code ${code}): ${err.slice(-300)}`));
            });
        });
    }

    _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    _createResetRecord(exerciseId, labId, initiatedBy, startTime) {
        return new Promise((resolve, reject) => {
            this.db.db.run(
                `INSERT INTO reset_records (exercise_id, lab_id, initiated_by, start_time, status)
                 VALUES (?, ?, ?, ?, 'partial')`,
                [exerciseId, labId, initiatedBy, startTime],
                function(err) { err ? reject(err) : resolve(this.lastID); }
            );
        });
    }

    _updateResetRecord(id, status, healthResults, verified, failureReason) {
        return new Promise((resolve, reject) => {
            this.db.db.run(
                `UPDATE reset_records SET
                    end_time = CURRENT_TIMESTAMP,
                    status = ?,
                    health_check_result = ?,
                    clean_state_verified = ?,
                    failure_reason = ?
                 WHERE id = ?`,
                [status, JSON.stringify(healthResults), verified ? 1 : 0, failureReason, id],
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    _updateExerciseStatus(exerciseId, status) {
        return new Promise((resolve, reject) => {
            this.db.db.run(
                `UPDATE exercise_sessions SET status = ?, end_time = CURRENT_TIMESTAMP WHERE id = ?`,
                [status, exerciseId],
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    _emitEvent(exerciseId, source, eventType, severity, data) {
        const { v4: uuidv4 } = require('uuid');
        return new Promise((resolve, reject) => {
            this.db.db.run(
                `INSERT INTO telemetry_events (id, exercise_id, source, event_type, severity, data)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [uuidv4(), exerciseId, source, eventType, severity, JSON.stringify(data)],
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    _getLab(labId) {
        return new Promise((resolve, reject) => {
            this.db.db.get('SELECT * FROM labs WHERE id = ?', [labId],
                (err, row) => err ? reject(err) : resolve(row));
        });
    }
}

module.exports = ResetEngine;
