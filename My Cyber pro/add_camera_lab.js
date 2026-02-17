// Script to add Camera Lab to database
require('dotenv').config();
const Database = require('./db');

const db = new Database(process.env.DB_PATH || './database/labs.db');

async function addCameraLab() {
    await db.waitForReady();

    const cameraLab = {
        name: 'Camera Lab',
        slug: 'camera-lab',
        category: 'pentest',
        type: 'pentest',
        description: 'Penetration testing lab for IP camera security - bypass firewalls, exploit network vulnerabilities, and access live camera feeds',
        difficulty: 'intermediate',
        docker_compose_path: './labs/camera_lab/docker-compose.yml',
        ports: JSON.stringify([7681, 8080]),
        services: JSON.stringify([
            { name: 'Attacker Terminal', port: 7681, url: 'http://localhost:7681', description: 'Web Terminal with Attack Tools' },
            { name: 'Attack Dashboard', port: 8080, url: 'http://localhost:8080', description: 'Camera Lab Dashboard' }
        ]),
        learning_objectives: JSON.stringify([
            'Bypass firewall rules',
            'Exploit packet-level vulnerabilities',
            'Network reconnaissance with nmap',
            'Access camera streams with default credentials'
        ]),
        estimated_time: 45
    };

    return new Promise((resolve, reject) => {
        db.db.run(
            `INSERT OR IGNORE INTO labs (name, slug, category, type, description, difficulty, docker_compose_path, ports, services, learning_objectives, estimated_time) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [cameraLab.name, cameraLab.slug, cameraLab.category, cameraLab.type, cameraLab.description, cameraLab.difficulty, cameraLab.docker_compose_path, cameraLab.ports, cameraLab.services, cameraLab.learning_objectives, cameraLab.estimated_time],
            (err) => {
                if (err) {
                    console.error('Error adding Camera Lab:', err);
                    reject(err);
                } else {
                    console.log('✓ Camera Lab added successfully');
                    db.close();
                    resolve();
                }
            }
        );
    });
}

addCameraLab()
    .then(() => {
        console.log('Done!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Failed:', err);
        process.exit(1);
    });
