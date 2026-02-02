const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');

class DockerUtils {
    constructor() {
        // For Windows, connect to Docker Desktop
        this.docker = new Docker({
            socketPath: process.platform === 'win32'
                ? '//./pipe/docker_engine'
                : '/var/run/docker.sock'
        });
    }

    async isDockerRunning() {
        try {
            await this.docker.ping();
            return true;
        } catch (error) {
            console.error('Docker is not running:', error.message);
            return false;
        }
    }

    async listContainers(all = false) {
        try {
            return await this.docker.listContainers({ all });
        } catch (error) {
            console.error('Error listing containers:', error);
            return [];
        }
    }

    async getContainer(containerId) {
        return this.docker.getContainer(containerId);
    }

    async startContainer(containerId) {
        try {
            const container = this.docker.getContainer(containerId);
            await container.start();
            return { success: true, message: 'Container started' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async stopContainer(containerId, timeout = 10) {
        try {
            const container = this.docker.getContainer(containerId);
            await container.stop({ t: timeout });
            return { success: true, message: 'Container stopped' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async removeContainer(containerId, force = false) {
        try {
            const container = this.docker.getContainer(containerId);
            await container.remove({ force });
            return { success: true, message: 'Container removed' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async getContainerStats(containerId) {
        try {
            const container = this.docker.getContainer(containerId);
            const stats = await container.stats({ stream: false });
            return stats;
        } catch (error) {
            console.error('Error getting container stats:', error);
            return null;
        }
    }

    async getContainerLogs(containerId, tail = 100) {
        try {
            const container = this.docker.getContainer(containerId);
            const logs = await container.logs({
                stdout: true,
                stderr: true,
                tail: tail,
                timestamps: true
            });
            return logs.toString('utf8');
        } catch (error) {
            console.error('Error getting container logs:', error);
            return '';
        }
    }

    async inspectContainer(containerId) {
        try {
            const container = this.docker.getContainer(containerId);
            return await container.inspect();
        } catch (error) {
            console.error('Error inspecting container:', error);
            return null;
        }
    }

    async createNetwork(name, driver = 'bridge') {
        try {
            const network = await this.docker.createNetwork({
                Name: name,
                Driver: driver,
                CheckDuplicate: true
            });
            return { success: true, network };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async removeNetwork(networkId) {
        try {
            const network = this.docker.getNetwork(networkId);
            await network.remove();
            return { success: true, message: 'Network removed' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async pullImage(imageName, onProgress = null) {
        return new Promise((resolve, reject) => {
            this.docker.pull(imageName, (err, stream) => {
                if (err) {
                    reject(err);
                    return;
                }

                this.docker.modem.followProgress(stream, (err, output) => {
                    if (err) reject(err);
                    else resolve(output);
                }, (event) => {
                    if (onProgress) onProgress(event);
                });
            });
        });
    }

    async createVolume(name) {
        try {
            const volume = await this.docker.createVolume({ Name: name });
            return { success: true, volume };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async removeVolume(volumeName) {
        try {
            const volume = this.docker.getVolume(volumeName);
            await volume.remove();
            return { success: true, message: 'Volume removed' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async cleanupUnusedResources() {
        try {
            await this.docker.pruneContainers();
            await this.docker.pruneNetworks();
            await this.docker.pruneVolumes();
            return { success: true, message: 'Cleanup completed' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async getSystemInfo() {
        try {
            return await this.docker.info();
        } catch (error) {
            console.error('Error getting system info:', error);
            return null;
        }
    }
}

module.exports = DockerUtils;
