#!/usr/bin/env python3
"""
CyberPro — OilSprings Log Collector (Enhanced)
Collects logs from all OT services, persists to file, and forwards
security-relevant events to the CyberPro backend telemetry API.
"""

import os
import json
import uuid
import threading
import requests
from datetime import datetime
from collections import deque
from pathlib import Path
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ── Configuration ──────────────────────────────────────────────────────────────
EXERCISE_ID       = os.getenv('EXERCISE_ID', 'unset')
BACKEND_TELEMETRY = os.getenv('BACKEND_TELEMETRY_URL',
                               'http://host.docker.internal:3000/api/telemetry/event')
CONTAINER_SECRET  = os.getenv('CONTAINER_SECRET', '')
LOG_DIR           = Path(os.getenv('LOG_DIR', '/app/logs'))
LOG_FILE          = LOG_DIR / 'events.jsonl'

# ── Ensure log directory exists ────────────────────────────────────────────────
LOG_DIR.mkdir(parents=True, exist_ok=True)

# ── In-memory buffer for fast API access ──────────────────────────────────────
logs_buffer = deque(maxlen=5000)
log_stats   = {'total': 0, 'info': 0, 'warning': 0, 'error': 0,
               'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
file_lock   = threading.Lock()

# Security-relevant event types that warrant forwarding to backend
SECURITY_EVENT_TYPES = {
    'modbus_anomaly', 'port_scan_detected', 'connection_flood',
    'unknown_protocol', 'auth_failure', 'plc_command_rejected',
    'unauthorized_access', 'suspicious_traffic'
}

# ── Persistence ────────────────────────────────────────────────────────────────
def persist_log(entry):
    """Write log entry to JSONL file. Thread-safe."""
    with file_lock:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry) + '\n')

def forward_to_backend(entry):
    """Forward security-relevant events to CyberPro telemetry API."""
    event_type = entry.get('event_type') or entry.get('level', 'info')
    if event_type not in SECURITY_EVENT_TYPES:
        return
    if EXERCISE_ID == 'unset':
        return

    payload = {
        'exercise_id': EXERCISE_ID,
        'source':      entry.get('service', 'collector').lower(),
        'event_type':  event_type,
        'severity':    entry.get('level', 'info'),
        'data':        entry
    }
    headers = {'Content-Type': 'application/json'}
    if CONTAINER_SECRET:
        headers['X-CyberPro-Secret'] = CONTAINER_SECRET

    try:
        requests.post(BACKEND_TELEMETRY, json=payload, headers=headers, timeout=3)
    except Exception:
        pass

def process_log_entry(entry):
    """Process, buffer, persist, and optionally forward a log entry."""
    entry.setdefault('id', str(uuid.uuid4()))
    entry.setdefault('timestamp', datetime.utcnow().isoformat() + 'Z')
    entry.setdefault('level', 'info')

    logs_buffer.append(entry)

    # Update stats
    log_stats['total'] += 1
    level = entry.get('level', 'info').lower()
    if level in log_stats:
        log_stats[level] += 1

    # Persist to file (raw evidence preserved)
    persist_log(entry)

    # Forward security events to backend
    threading.Thread(target=forward_to_backend, args=(entry,), daemon=True).start()

    return entry

# ── Seed sample startup logs ───────────────────────────────────────────────────
_startup_logs = [
    {'service': 'PLC', 'level': 'info', 'message': 'OpenPLC Runtime started',
     'event_type': 'service_started'},
    {'service': 'SCADA', 'level': 'info', 'message': 'Node-RED connected to PLC at 10.10.2.10',
     'event_type': 'connection_established'},
    {'service': 'IDS', 'level': 'info', 'message': 'Network monitoring active',
     'event_type': 'service_started'},
    {'service': 'Collector', 'level': 'info',
     'message': f'Log collector ready. Exercise: {EXERCISE_ID}',
     'event_type': 'service_started'}
]
for _log in _startup_logs:
    process_log_entry(_log)

# ── Flask Routes ───────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('collector.html')

@app.route('/api/logs', methods=['GET', 'POST'])
def handle_logs():
    if request.method == 'POST':
        entry = request.get_json(force=True, silent=True) or {}
        if not entry:
            return jsonify({'error': 'Invalid JSON'}), 400
        processed = process_log_entry(entry)
        return jsonify({'status': 'received', 'id': processed['id']}), 200
    else:
        limit = min(int(request.args.get('limit', 100)), 1000)
        level  = request.args.get('level')
        source = request.args.get('service')

        results = list(logs_buffer)
        if level:
            results = [e for e in results if e.get('level', '').lower() == level.lower()]
        if source:
            results = [e for e in results if e.get('service', '').lower() == source.lower()]

        return jsonify(results[-limit:])

@app.route('/api/stats')
def get_stats():
    return jsonify({**log_stats, 'exercise_id': EXERCISE_ID})

@app.route('/api/export')
def export_logs():
    """Export complete log buffer as JSON array."""
    return jsonify(list(logs_buffer))

@app.route('/api/export/file')
def export_file_logs():
    """Return raw JSONL content from the persisted log file."""
    try:
        with open(LOG_FILE, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        entries = [json.loads(line) for line in lines if line.strip()]
        return jsonify({'count': len(entries), 'entries': entries})
    except FileNotFoundError:
        return jsonify({'count': 0, 'entries': []})

@app.route('/api/health')
def health():
    return jsonify({
        'status':            'running',
        'logs_collected':    len(logs_buffer),
        'logs_persisted':    sum(1 for _ in open(LOG_FILE) if _.strip()) if LOG_FILE.exists() else 0,
        'services_reporting': len(set(e.get('service', 'unknown') for e in logs_buffer)),
        'exercise_id':       EXERCISE_ID
    })

# ── Main ───────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print(f"📋 CyberPro Log Collector starting on port 5000")
    print(f"   Exercise ID: {EXERCISE_ID}")
    print(f"   Log file: {LOG_FILE}")
    app.run(host='0.0.0.0', port=5000, debug=False)
