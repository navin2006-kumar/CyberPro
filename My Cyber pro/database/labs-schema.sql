-- Labs Platform Database Schema

-- Labs table
CREATE TABLE IF NOT EXISTS labs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    description TEXT,
    docker_compose_path TEXT NOT NULL,
    services TEXT, -- JSON array of services
    learning_objectives TEXT, -- JSON array
    estimated_time INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lab sessions table
CREATE TABLE IF NOT EXISTS lab_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lab_id INTEGER NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    stopped_at DATETIME,
    status TEXT DEFAULT 'running',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (lab_id) REFERENCES labs(id)
);

-- User progress table
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
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lab_id INTEGER,
    activity_type TEXT NOT NULL,
    title TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (lab_id) REFERENCES labs(id)
);

-- Insert sample labs
INSERT OR IGNORE INTO labs (name, slug, category, difficulty, description, docker_compose_path, services, learning_objectives, estimated_time) VALUES
('OilSprings - Complete OT Lab', 'oilsprings', 'ics', 'advanced', 'Complete industrial cybersecurity lab with SCADA, PLC, IDS, Collector, Pentest, EWS, and Router. Learn OT/ICS security in a realistic environment.', './labs/oilsprings/docker-compose.yml', '[{"name":"PLC","port":8080,"url":"http://localhost:8080"},{"name":"SCADA","port":1881,"url":"http://localhost:1881"},{"name":"EWS","port":5911,"url":"http://localhost:5911"},{"name":"IDS","port":1443,"url":"http://localhost:1443"},{"name":"Collector","port":2443,"url":"http://localhost:2443"},{"name":"Pentest","port":2222,"url":"http://localhost:2222"},{"name":"Router","port":1444,"url":"http://localhost:1444"}]', '["Understand SCADA/PLC communication","Monitor OT network traffic","Detect security threats in ICS","Practice safe penetration testing","Learn industrial protocols"]', 120),

('SCADA Fundamentals', 'scada-basics', 'scada', 'beginner', 'Learn SCADA systems with Modbus/TCP protocol simulation. Understand how SCADA systems monitor and control industrial processes.', './labs/scada/docker-compose.yml', '[{"name":"SCADA Dashboard","port":1881,"url":"http://localhost:1881"}]', '["Understand SCADA architecture","Learn Modbus protocol basics","Monitor industrial processes","Configure SCADA systems"]', 60),

('PLC Programming', 'plc-programming', 'ics', 'intermediate', 'Hands-on PLC programming with OpenPLC. Learn ladder logic, structured text, and function block diagrams.', './labs/plc/docker-compose.yml', '[{"name":"PLC Interface","port":8080,"url":"http://localhost:8080"}]', '["Learn PLC programming languages","Understand ladder logic","Write control programs","Test PLC logic"]', 90),

('Network Security Lab', 'network-security', 'network', 'intermediate', 'Practice network security concepts including packet analysis, firewall rules, and intrusion detection.', './labs/network/docker-compose.yml', '[{"name":"Network Monitor","port":8080,"url":"http://localhost:8080"}]', '["Analyze network traffic","Configure firewall rules","Detect network intrusions","Monitor network activity"]', 75),

('Penetration Testing', 'pentest-lab', 'pentest', 'advanced', 'Practice penetration testing techniques in a safe, isolated environment. Learn reconnaissance, exploitation, and post-exploitation.', './labs/pentest/docker-compose.yml', '[{"name":"Pentest Terminal","port":2222,"url":"http://localhost:2222"}]', '["Perform reconnaissance","Identify vulnerabilities","Practice exploitation","Learn post-exploitation techniques"]', 120);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lab_sessions_user ON lab_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_sessions_lab ON lab_sessions(lab_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
