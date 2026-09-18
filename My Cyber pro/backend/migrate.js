'use strict';
/**
 * CyberPro — Database Migration: v1 → v2
 * Adds 8 new tables required for the cyber range research features:
 * scenarios, scenario_objectives, exercise_sessions, telemetry_events,
 * objective_results, exercise_scores, debrief_responses, reset_records
 *
 * SAFE: All statements use CREATE TABLE IF NOT EXISTS — idempotent.
 * Run: node backend/migrate.js
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/labs.db';
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Cannot open database:', err.message);
        process.exit(1);
    }
    console.log('✓ Connected to database:', DB_PATH);
});

const MIGRATIONS = [
    // ─── Table 1: scenarios ──────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS scenarios (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT,
        difficulty  TEXT CHECK(difficulty IN ('easy','medium','hard','expert')),
        time_limit_minutes INTEGER DEFAULT 30,
        lab_id      INTEGER REFERENCES labs(id),
        version     TEXT DEFAULT '1.0',
        is_active   BOOLEAN DEFAULT 1,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // ─── Table 2: scenario_objectives ────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS scenario_objectives (
        id              TEXT PRIMARY KEY,
        scenario_id     TEXT NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
        name            TEXT NOT NULL,
        description     TEXT,
        points          INTEGER NOT NULL DEFAULT 0,
        required        BOOLEAN DEFAULT 1,
        detection_logic TEXT,       -- JSON: {source, event_type, field_checks}
        order_index     INTEGER DEFAULT 0,
        created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // ─── Table 3: exercise_sessions ──────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS exercise_sessions (
        id                  TEXT PRIMARY KEY,   -- UUID
        scenario_id         TEXT NOT NULL REFERENCES scenarios(id),
        lab_session_id      INTEGER REFERENCES lab_sessions(id),
        user_id             INTEGER NOT NULL REFERENCES users(id),
        start_time          DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time            DATETIME,
        status              TEXT DEFAULT 'active'
                                CHECK(status IN ('active','completed','abandoned','reset')),
        environment_version TEXT,
        config_version      TEXT
    )`,

    // ─── Table 4: telemetry_events ───────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS telemetry_events (
        id          TEXT PRIMARY KEY,       -- UUID
        exercise_id TEXT REFERENCES exercise_sessions(id),
        scenario_id TEXT,
        user_id     INTEGER REFERENCES users(id),
        timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP,
        source      TEXT NOT NULL,          -- 'ids','plc','scada','student','system'
        event_type  TEXT NOT NULL,
        severity    TEXT DEFAULT 'info'
                        CHECK(severity IN ('info','low','medium','high','critical')),
        data        TEXT,                   -- JSON payload (raw, never overwritten)
        raw_preserved BOOLEAN DEFAULT 1
    )`,

    `CREATE INDEX IF NOT EXISTS idx_telemetry_exercise ON telemetry_events(exercise_id)`,
    `CREATE INDEX IF NOT EXISTS idx_telemetry_source ON telemetry_events(source, event_type)`,

    // ─── Table 5: objective_results ──────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS objective_results (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_id      TEXT NOT NULL REFERENCES exercise_sessions(id),
        objective_id     TEXT NOT NULL REFERENCES scenario_objectives(id),
        status           TEXT DEFAULT 'pending'
                             CHECK(status IN ('pending','pass','fail')),
        evidence_event_ids TEXT,            -- JSON array of telemetry_event IDs
        evaluated_at     DATETIME,
        score            INTEGER DEFAULT 0,
        UNIQUE(exercise_id, objective_id)
    )`,

    // ─── Table 6: exercise_scores ────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS exercise_scores (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_id         TEXT NOT NULL UNIQUE REFERENCES exercise_sessions(id),
        user_id             INTEGER NOT NULL REFERENCES users(id),
        total_score         INTEGER DEFAULT 0,
        max_score           INTEGER DEFAULT 0,
        completion_time_minutes INTEGER,
        objectives_passed   INTEGER DEFAULT 0,
        objectives_failed   INTEGER DEFAULT 0,
        passed              BOOLEAN DEFAULT 0,
        scored_at           DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // ─── Table 7: debrief_responses ──────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS debrief_responses (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_id   TEXT NOT NULL REFERENCES exercise_sessions(id),
        user_id       INTEGER NOT NULL REFERENCES users(id),
        q_detected    TEXT,     -- "What did you detect?"
        q_evidence    TEXT,     -- "What evidence did you use?"
        q_action      TEXT,     -- "What action did you take?"
        q_difficult   TEXT,     -- "What was difficult?"
        q_differently TEXT,     -- "What would you do differently?"
        q_learned     TEXT,     -- "What did you learn?"
        submitted_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(exercise_id, user_id)
    )`,

    // ─── Table 8: reset_records ──────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS reset_records (
        id                      INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_id             TEXT REFERENCES exercise_sessions(id),
        lab_id                  INTEGER REFERENCES labs(id),
        initiated_by            INTEGER REFERENCES users(id),
        start_time              DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_time                DATETIME,
        status                  TEXT CHECK(status IN ('success','failed','partial')),
        health_check_result     TEXT,       -- JSON: { container: status }
        clean_state_verified    BOOLEAN DEFAULT 0,
        failure_reason          TEXT
    )`
];

function runMigration() {
    db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON');

        let completed = 0;
        const total = MIGRATIONS.length;

        MIGRATIONS.forEach((sql, i) => {
            db.run(sql, (err) => {
                if (err) {
                    // Column/index already exists — skip gracefully
                    if (!err.message.includes('already exists')) {
                        console.error(`❌ Migration ${i + 1} failed:`, err.message);
                        console.error('   SQL:', sql.substring(0, 80));
                    }
                } else {
                    const tableName = (sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/) ||
                                       sql.match(/CREATE INDEX IF NOT EXISTS (\w+)/) || [])[1];
                    if (tableName) console.log(`  ✓ ${tableName}`);
                }

                completed++;
                if (completed === total) {
                    console.log('\n✅ Migration complete. All cyber range tables are ready.');
                    db.close();
                }
            });
        });
    });
}

console.log('\n🔧 Running CyberPro Database Migration v2...\n');
runMigration();
