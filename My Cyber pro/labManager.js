const DockerUtils = require('./docker-utils');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class LabManager {
    constructor(database) {
        this.db = database;
        this.docker = new DockerUtils();
        this.activeLabs = new Map(); // labId -> { containerId, sessionId, healthCheck }
        this.autoRecovery = process.env.AUTO_RECOVERY === 'true';

        // Start health monitoring
        this.startHealthMonitoring();
    }

    async startLab(labId, userId) {
        try {
            // Check if Docker is running
            const dockerRunning = await this.docker.isDockerRunning();
            if (!dockerRunning) {
                return {
                    success: false,
                    message: 'Docker is not running. Please start Docker Desktop.'
                };
            }

            // Get lab configuration
            const lab = await this.db.getLabById(labId);
            if (!lab) {
                return { success: false, message: 'Lab not found' };
            }

            // Check if lab is already running
            if (this.activeLabs.has(labId)) {
                return { success: false, message: 'Lab is already running' };
            }

            // Update lab status
            await this.db.updateLabStatus(labId, 'starting');

            // Create session
            const sessionId = await this.db.createSession(userId, labId);

            // Start lab using docker-compose
            const result = await this.startLabContainers(lab);

            if (result.success) {
                // Store active lab info
                this.activeLabs.set(labId, {
                    containerIds: result.containerIds,
                    sessionId: sessionId,
                    startTime: Date.now(),
                    userId: userId,
                    labName: lab.name
                });

                await this.db.updateLabStatus(labId, 'running');
                await this.db.logActivity(userId, labId, 'lab_started', `Started lab: ${lab.name}`);

                return {
                    success: true,
                    message: 'Lab started successfully',
                    sessionId: sessionId,
                    ports: JSON.parse(lab.ports || '[]')
                };
            } else {
                await this.db.updateLabStatus(labId, 'error');
                await this.db.endSession(sessionId);
                return result;
            }

        } catch (error) {
            console.error('Error starting lab:', error);
            return { success: false, message: error.message };
        }
    }

    async startLabContainers(lab) {
        try {
            const composePath = path.join(__dirname, lab.docker_compose_path);

            // Check if docker-compose file exists
            if (!fs.existsSync(composePath)) {
                return {
                    success: false,
                    message: `Docker compose file not found: ${composePath}`
                };
            }

            // Use docker-compose to start the lab
            return new Promise((resolve, reject) => {
                const composeDir = path.dirname(composePath);
                const process = spawn('docker-compose', ['up', '-d'], {
                    cwd: composeDir,
                    shell: true
                });

                let output = '';
                let errorOutput = '';

                process.stdout.on('data', (data) => {
                    output += data.toString();
                });

                process.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                process.on('close', async (code) => {
                    if (code === 0) {
                        // Get container IDs
                        const containers = await this.docker.listContainers();
                        const labContainers = containers.filter(c =>
                            c.Labels['com.docker.compose.project.working_dir'] === composeDir
                        );

                        resolve({
                            success: true,
                            containerIds: labContainers.map(c => c.Id),
                            message: 'Lab containers started'
                        });
                    } else {
                        resolve({
                            success: false,
                            message: `Failed to start lab: ${errorOutput || output}`
                        });
                    }
                });

                process.on('error', (error) => {
                    resolve({
                        success: false,
                        message: `Error executing docker-compose: ${error.message}`
                    });
                });
            });

        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async stopLab(labId, userId) {
        try {
            const lab = await this.db.getLabById(labId);
            if (!lab) {
                return { success: false, message: 'Lab not found' };
            }

            const activeLabInfo = this.activeLabs.get(labId);
            if (!activeLabInfo) {
                return { success: false, message: 'Lab is not running' };
            }

            // Update status
            await this.db.updateLabStatus(labId, 'stopping');

            // Stop containers using docker-compose
            const composePath = path.join(__dirname, lab.docker_compose_path);
            const composeDir = path.dirname(composePath);

            return new Promise((resolve, reject) => {
                const process = spawn('docker-compose', ['down'], {
                    cwd: composeDir,
                    shell: true
                });

                process.on('close', async (code) => {
                    if (code === 0) {
                        // Clean up
                        this.activeLabs.delete(labId);
                        await this.db.updateLabStatus(labId, 'stopped');
                        await this.db.endSession(activeLabInfo.sessionId);
                        await this.db.logActivity(userId, labId, 'lab_stopped', `Stopped lab: ${lab.name}`);

                        resolve({
                            success: true,
                            message: 'Lab stopped successfully'
                        });
                    } else {
                        resolve({
                            success: false,
                            message: 'Failed to stop lab'
                        });
                    }
                });
            });

        } catch (error) {
            console.error('Error stopping lab:', error);
            return { success: false, message: error.message };
        }
    }

    async restartLab(labId, userId) {
        const stopResult = await this.stopLab(labId, userId);
        if (!stopResult.success) {
            return stopResult;
        }

        // Wait a bit before restarting
        await new Promise(resolve => setTimeout(resolve, 2000));

        return await this.startLab(labId, userId);
    }

    async getLabStatus(labId) {
        const lab = await this.db.getLabById(labId);
        if (!lab) {
            return { success: false, message: 'Lab not found' };
        }

        const activeLabInfo = this.activeLabs.get(labId);

        return {
            success: true,
            status: lab.status,
            isActive: !!activeLabInfo,
            uptime: activeLabInfo ? Date.now() - activeLabInfo.startTime : 0,
            sessionId: activeLabInfo?.sessionId
        };
    }

    async getAllLabsStatus() {
        const labs = await this.db.getAllLabs();
        const statuses = await Promise.all(
            labs.map(async (lab) => {
                const status = await this.getLabStatus(lab.id);
                return {
                    ...lab,
                    ...status
                };
            })
        );
        return statuses;
    }

    startHealthMonitoring() {
        // Check health every 30 seconds
        setInterval(async () => {
            // Only check if there are active labs
            if (this.activeLabs.size === 0) {
                return;
            }

            for (const [labId, labInfo] of this.activeLabs.entries()) {
                try {
                    // Check if containers are still running
                    const allRunning = await this.checkContainersHealth(labInfo.containerIds);

                    if (!allRunning && this.autoRecovery) {
                        console.log(`⚠️ Lab ${labId} health check failed, attempting recovery...`);
                        await this.recoverLab(labId, labInfo.userId);
                    }
                } catch (error) {
                    console.error(`Error checking health for lab ${labId}:`, error);
                }
            }
        }, 30000);
    }

    async checkContainersHealth(containerIds) {
        try {
            for (const containerId of containerIds) {
                const info = await this.docker.inspectContainer(containerId);
                if (!info || info.State.Status !== 'running') {
                    return false;
                }
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    async recoverLab(labId, userId) {
        console.log(`🔄 Attempting to recover lab ${labId}...`);

        // Try to restart the lab
        const result = await this.restartLab(labId, userId);

        if (result.success) {
            console.log(`✓ Lab ${labId} recovered successfully`);
            await this.db.logActivity(userId, labId, 'lab_recovered', `Auto-recovered lab ${labId}`);
        } else {
            console.log(`✗ Failed to recover lab ${labId}`);
            await this.db.updateLabStatus(labId, 'error');
        }

        return result;
    }

    async stopAllLabs() {
        const stopPromises = [];
        for (const [labId, labInfo] of this.activeLabs.entries()) {
            stopPromises.push(this.stopLab(labId, labInfo.userId));
        }
        return await Promise.all(stopPromises);
    }

    async getLabLogs(labId, tail = 100) {
        const activeLabInfo = this.activeLabs.get(labId);
        if (!activeLabInfo) {
            return { success: false, message: 'Lab is not running' };
        }

        try {
            const logs = {};
            for (const containerId of activeLabInfo.containerIds) {
                logs[containerId] = await this.docker.getContainerLogs(containerId, tail);
            }
            return { success: true, logs };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

module.exports = LabManager;
