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
                    name TEXT NOT NULL,
                    slug TEXT UNIQUE,
                    category TEXT,
                    type TEXT,
                    description TEXT,
                    difficulty TEXT,
                    docker_compose_path TEXT,
                    ports TEXT,
                    services TEXT,
                    learning_objectives TEXT,
                    estimated_time INTEGER DEFAULT 60,
                    is_active BOOLEAN DEFAULT 1,
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

                // Lab sessions table
                this.db.run(`
                CREATE TABLE IF NOT EXISTS lab_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    lab_id INTEGER NOT NULL,
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
                    user_id INTEGER NOT NULL,
                    lab_id INTEGER NOT NULL,
                    completed BOOLEAN DEFAULT 0,
                    completion_percentage INTEGER DEFAULT 0,
                    time_spent INTEGER DEFAULT 0,
                    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (lab_id) REFERENCES labs(id),
                    UNIQUE(user_id, lab_id)
                )
            `);

                // Activity log table
                this.db.run(`
                CREATE TABLE IF NOT EXISTS activity_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    lab_id INTEGER,
                    activity_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (lab_id) REFERENCES labs(id)
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
                name: 'OpenPLC Controller',
                slug: 'openplc',
                category: 'plc',
                type: 'plc',
                description: 'Learn PLC programming with OpenPLC - program real PLCs using ladder logic and Modbus protocol',
                difficulty: 'beginner',
                docker_compose_path: './labs/openplc/docker-compose.yml',
                ports: JSON.stringify([8080]),
                services: JSON.stringify([
                    { name: 'OpenPLC Web Interface', port: 8080, url: 'http://localhost:8080', description: 'PLC Programming Environment' }
                ]),
                learning_objectives: JSON.stringify([
                    'Program PLCs using ladder logic',
                    'Understand industrial control systems',
                    'Work with Modbus protocol',
                    'Monitor I/O operations'
                ]),
                estimated_time: 60
            },
            {
                name: 'SCADA Dashboard',
                slug: 'scada-dashboard',
                category: 'scada',
                type: 'scada',
                description: 'Build SCADA dashboards with Node-RED - create data flows and visualize industrial processes',
                difficulty: 'beginner',
                docker_compose_path: './labs/scada-dashboard/docker-compose.yml',
                ports: JSON.stringify([1880, 1881]),
                services: JSON.stringify([
                    { name: 'Flow Editor', port: 1880, url: 'http://localhost:1880', description: 'Node-RED Flow Editor' },
                    { name: 'Dashboard', port: 1881, url: 'http://localhost:1881/ui', description: 'SCADA Dashboard UI' }
                ]),
                learning_objectives: JSON.stringify([
                    'Build SCADA dashboards',
                    'Create data flows',
                    'Monitor industrial processes',
                    'Visualize real-time data'
                ]),
                estimated_time: 60
            },
            {
                name: 'Network Security',
                slug: 'network-security',
                category: 'network',
                type: 'network',
                description: 'Monitor and analyze network traffic - capture packets, analyze protocols, detect anomalies',
                difficulty: 'intermediate',
                docker_compose_path: './labs/network-security/docker-compose.yml',
                ports: JSON.stringify([8082]),
                services: JSON.stringify([
                    { name: 'Network Monitor', port: 8082, url: 'http://localhost:8082', description: 'Packet Capture & Analysis' }
                ]),
                learning_objectives: JSON.stringify([
                    'Capture network packets',
                    'Analyze traffic patterns',
                    'Use network diagnostic tools',
                    'Detect anomalies'
                ]),
                estimated_time: 50
            },
            {
                name: 'Penetration Testing',
                slug: 'pentest',
                category: 'pentest',
                type: 'pentest',
                description: 'Practice ethical hacking with Kali Linux tools - nmap, metasploit, sqlmap, and more',
                difficulty: 'advanced',
                docker_compose_path: './labs/pentest/docker-compose.yml',
                ports: JSON.stringify([7681]),
                services: JSON.stringify([
                    { name: 'Web Terminal', port: 7681, url: 'http://localhost:7681', description: 'Kali Linux Terminal' }
                ]),
                learning_objectives: JSON.stringify([
                    'Use penetration testing tools',
                    'Practice ethical hacking',
                    'Vulnerability assessment',
                    'Security testing techniques'
                ]),
                estimated_time: 90
            }
        ];

        defaultLabs.forEach(lab => {
            this.db.run(
                `INSERT OR IGNORE INTO labs (name, slug, category, type, description, difficulty, docker_compose_path, ports, services, learning_objectives, estimated_time) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [lab.name, lab.slug, lab.category, lab.type, lab.description, lab.difficulty, lab.docker_compose_path, lab.ports, lab.services, lab.learning_objectives, lab.estimated_time]
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

    // Activity logging (for general user actions)
    async logUserActivity(userId, action, details = '') {
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

    // ============ Lab Management Methods ============

    getAllLabs() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM labs WHERE is_active = 1', [], (err, rows) => {
                if (err) reject(err);
                else {
                    // Parse JSON fields
                    const labs = rows.map(lab => ({
                        ...lab,
                        services: lab.services ? JSON.parse(lab.services) : [],
                        learning_objectives: lab.learning_objectives ? JSON.parse(lab.learning_objectives) : []
                    }));
                    resolve(labs);
                }
            });
        });
    }

    getLabById(labId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM labs WHERE id = ?', [labId], (err, row) => {
                if (err) reject(err);
                else if (row) {
                    resolve({
                        ...row,
                        services: row.services ? JSON.parse(row.services) : [],
                        learning_objectives: row.learning_objectives ? JSON.parse(row.learning_objectives) : []
                    });
                } else {
                    resolve(null);
                }
            });
        });
    }

    createLabSession(userId, labId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO lab_sessions (user_id, lab_id, status) VALUES (?, ?, ?)',
                [userId, labId, 'running'],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    stopLabSession(sessionId) {
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

    getActiveLabSession(userId, labId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM lab_sessions WHERE user_id = ? AND lab_id = ? AND status = ? ORDER BY started_at DESC LIMIT 1',
                [userId, labId, 'running'],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
    }

    logActivity(userId, labId, activityType, title) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT INTO activity_log (user_id, lab_id, activity_type, title) VALUES (?, ?, ?, ?)',
                [userId, labId, activityType, title],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    getRecentActivity(userId, limit = 10) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT al.*, l.name as lab_name FROM activity_log al LEFT JOIN labs l ON al.lab_id = l.id WHERE al.user_id = ? ORDER BY al.timestamp DESC LIMIT ?',
                [userId, limit],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
    }

    getUserStats(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT 
                    COUNT(DISTINCT CASE WHEN completed = 1 THEN lab_id END) as labsCompleted,
                    SUM(time_spent) as timeSpent,
                    0 as currentStreak,
                    'Beginner' as skillLevel,
                    ROUND(AVG(CASE WHEN completed = 1 THEN 100 ELSE completion_percentage END), 0) as overallProgress
                FROM user_progress 
                WHERE user_id = ?`,
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row || { labsCompleted: 0, timeSpent: 0, currentStreak: 0, skillLevel: 'Beginner', overallProgress: 0 });
                }
            );
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;
