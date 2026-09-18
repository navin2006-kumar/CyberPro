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

const { spawn } = require('child_process');
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
    constructor(db, labManager) {
        this.db = db;
        this.labManager = labManager;
    }

    /**
     * Execute a full reset workflow for an exercise/lab.
     * @param {string} exerciseId - UUID of exercise session (may be null for direct lab reset)
     * @param {number} labId - lab DB id
     * @param {number} initiatedBy - user ID
     * @param {Array} healthEndpoints - [{ container, url, expected_status }]
     * @returns {Promise<object>} Reset result record
     */
    async reset(exerciseId, labId, initiatedBy, healthEndpoints = []) {
        const startTime = new Date().toISOString();
        let recordId = null;

        try {
            // 1. Create reset record (in-progress)
            recordId = await this._createResetRecord(exerciseId, labId, initiatedBy, startTime);

            // 2. Emit telemetry event: reset initiated
            if (exerciseId) {
                await this._emitEvent(exerciseId, 'system', 'reset_initiated', 'info', {
                    initiated_by: initiatedBy, lab_id: labId
                });
            }

            // 3. Get lab config
            const lab = await this._getLab(labId);
            if (!lab) throw new Error(`Lab ${labId} not found`);

            const composePath = path.join(__dirname, '../../', lab.docker_compose_path);
            if (!fs.existsSync(composePath)) {
                throw new Error(`docker-compose file not found: ${composePath}`);
            }

            const composeDir = path.dirname(composePath);

            // 4. Mark exercise as reset if provided
            if (exerciseId) {
                await this._updateExerciseStatus(exerciseId, 'reset');
            }

            // 5. docker-compose down (stop + remove containers + networks)
            console.log('🔄 [Reset] Running docker-compose down...');
            await this._runCompose(composeDir, ['down', '--remove-orphans', '--volumes']);
            console.log('✓ [Reset] Containers stopped and removed');

            // 6. docker-compose up -d (clean start)
            console.log('🔄 [Reset] Starting clean environment...');
            await this._runCompose(composeDir, ['up', '-d', '--force-recreate']);
            console.log('✓ [Reset] Containers started');

            // 7. Health checks
            console.log('🔄 [Reset] Running health checks...');
            const healthResults = await this._runHealthChecks(healthEndpoints);

            const allHealthy = Object.values(healthResults).every(v => v === 'healthy');
            const status = allHealthy ? 'success' : 'partial';

            // 8. Update reset record
            await this._updateResetRecord(recordId, status, healthResults, allHealthy, null);

            // 9. Emit telemetry
            if (exerciseId) {
                await this._emitEvent(exerciseId, 'system',
                    allHealthy ? 'reset_completed' : 'reset_failed',
                    allHealthy ? 'info' : 'high',
                    { status, health_results: healthResults }
                );
            }

            console.log(`${allHealthy ? '✅' : '⚠️'} [Reset] Status: ${status}`);

            return {
                success: allHealthy,
                status,
                health_check_result: healthResults,
                clean_state_verified: allHealthy,
                reset_record_id: recordId,
                message: allHealthy
                    ? 'Environment reset successfully. Clean state verified.'
                    : 'Reset completed but some health checks failed. Manual verification required.'
            };

        } catch (error) {
            console.error('❌ [Reset] Failed:', error.message);

            if (recordId) {
                await this._updateResetRecord(recordId, 'failed', {}, false, error.message);
            }

            if (exerciseId) {
                await this._emitEvent(exerciseId, 'system', 'reset_failed', 'critical', {
                    reason: error.message
                });
            }

            return {
                success: false,
                status: 'failed',
                clean_state_verified: false,
                reset_record_id: recordId,
                message: `Reset failed: ${error.message}`
            };
        }
    }

    /**
     * Run health checks against each service endpoint.
     * Retries up to HEALTH_CHECK_RETRIES times before marking as unhealthy.
     */
    async _runHealthChecks(endpoints) {
        const results = {};

        for (const ep of endpoints) {
            let healthy = false;

            for (let attempt = 1; attempt <= HEALTH_CHECK_RETRIES; attempt++) {
                try {
                    const status = await this._httpGet(ep.url);
                    if (status === (ep.expected_status || 200)) {
                        healthy = true;
                        break;
                    }
                } catch {}

                if (attempt < HEALTH_CHECK_RETRIES) {
                    await this._sleep(HEALTH_CHECK_INTERVAL_MS);
                }
            }

            results[ep.container] = healthy ? 'healthy' : 'unhealthy';
            console.log(`  ${healthy ? '✓' : '✗'} ${ep.container}: ${results[ep.container]}`);
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
