const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

class Database {
    constructor(dbPath = './data/labs.db') {
        // Ensure data directory exists
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.ready = false;
        this.readyPromise = new Promise((resolve) => {
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    resolve();
                } else {
                    console.log('✓ Database connected');
                    this.initialize().then(resolve);
                }
            });
        });
    }

    async waitForReady() {
        await this.readyPromise;
    }

    initialize() {
        return new Promise((resolve) => {
            this.db.serialize(() => {
                // Users table
                this.db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    role TEXT DEFAULT 'user',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

                // Labs table
                this.db.run(`
                CREATE TABLE IF NOT EXISTS labs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    type TEXT NOT NULL,
                    description TEXT,
                    difficulty TEXT,
                    docker_compose_path TEXT,
                    ports TEXT,
                    status TEXT DEFAULT 'stopped',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

                // Lab sessions table
                this.db.run(`
                CREATE TABLE IF NOT EXISTS lab_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    lab_id INTEGER,
                    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    stopped_at DATETIME,
                    status TEXT DEFAULT 'running',
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (lab_id) REFERENCES labs(id)
                )
            `);

                // User progress table
                this.db.run(`
                CREATE TABLE IF NOT EXISTS user_progress (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    lab_id INTEGER,
                    completed BOOLEAN DEFAULT 0,
                    completion_time INTEGER,
                    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (lab_id) REFERENCES labs(id)
                )
            `);

                // Activity logs table
                this.db.run(`
                CREATE TABLE IF NOT EXISTS activity_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    action TEXT,
                    details TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `);

                console.log('✓ Database tables initialized');
                this.seedDefaultData();

                // Mark database as ready after a short delay to ensure seeding completes
                setTimeout(() => {
                    this.ready = true;
                    resolve();
                }, 500);
            });
        });
    }

    async seedDefaultData() {
        // Create default admin user if not exists
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

        this.db.get('SELECT * FROM users WHERE username = ?', [adminUsername], async (err, row) => {
            if (!row) {
                const hashedPassword = await bcrypt.hash(adminPassword, 10);
                this.db.run(
                    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                    [adminUsername, hashedPassword, 'admin'],
                    (err) => {
                        if (!err) console.log('✓ Default admin user created');
                    }
                );
            }
        });

        // Seed default labs
        const defaultLabs = [
            {
                name: 'SCADA Fundamentals',
                type: 'scada',
                description: 'Learn SCADA systems with Modbus/TCP protocol simulation',
                difficulty: 'beginner',
                docker_compose_path: './labs/scada/docker-compose.yml',
                ports: JSON.stringify([8080, 502])
            },
            {
                name: 'PLC Programming',
                type: 'plc',
                description: 'Program and interact with OpenPLC runtime',
                difficulty: 'intermediate',
                docker_compose_path: './labs/plc/docker-compose.yml',
                ports: JSON.stringify([8081, 502])
            },
            {
                name: 'Network Monitoring',
                type: 'network',
                description: 'Monitor and analyze OT network traffic',
                difficulty: 'intermediate',
                docker_compose_path: './labs/network/docker-compose.yml',
                ports: JSON.stringify([8082])
            },
            {
                name: 'ICS Penetration Testing',
                type: 'pentest',
                description: 'Practice offensive security techniques in isolated environment',
                difficulty: 'advanced',
                docker_compose_path: './labs/pentest/docker-compose.yml',
                ports: JSON.stringify([8083, 4444])
            }
        ];

        defaultLabs.forEach(lab => {
            this.db.run(
                `INSERT OR IGNORE INTO labs (name, type, description, difficulty, docker_compose_path, ports) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [lab.name, lab.type, lab.description, lab.difficulty, lab.docker_compose_path, lab.ports]
            );
        });
    }

    // User methods
    createUser(username, password, role = 'user') {
        return new Promise(async (resolve, reject) => {
            const hashedPassword = await bcrypt.hash(password, 10);
            this.db.run(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                [username, hashedPassword, role],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // Lab methods
    async getAllLabs() {
        await this.waitForReady();
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM labs ORDER BY difficulty, name', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getLabById(id) {
        await this.waitForReady();
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM labs WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async updateLabStatus(id, status) {
        await this.waitForReady();
        return new Promise((resolve, reject) => {
            this.db.run('UPDATE labs SET status = ? WHERE id = ?', [status, id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // Session methods
    async createSession(userId, labId) {
        await this.waitForReady();
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO lab_sessions (user_id, lab_id) VALUES (?, ?)',
                [userId, labId],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    async endSession(sessionId) {
        await this.waitForReady();
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE lab_sessions SET stopped_at = CURRENT_TIMESTAMP, status = ? WHERE id = ?',
                ['stopped', sessionId],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    // Activity logging
    async logActivity(userId, action, details = '') {
        await this.waitForReady();
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
                [userId, action, details],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;
