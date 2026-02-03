#!/usr/bin/env python3
"""
OilSprings Log Collector
Collects and aggregates logs from all OT services
"""

from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from datetime import datetime
from collections import deque
import json
import os

app = Flask(__name__)
CORS(app)

# Store logs in memory
logs_buffer = deque(maxlen=5000)
log_stats = {
    'total': 0,
    'info': 0,
    'warning': 0,
    'error': 0,
    'critical': 0
}

@app.route('/')
def index():
    """Main dashboard"""
    return render_template('collector.html')

@app.route('/api/logs', methods=['GET', 'POST'])
def handle_logs():
    """Handle log collection and retrieval"""
    if request.method == 'POST':
        # Receive log from service
        log_entry = request.json
        log_entry['timestamp'] = datetime.now().isoformat()
        logs_buffer.append(log_entry)
        
        # Update stats
        log_stats['total'] += 1
        level = log_entry.get('level', 'info').lower()
        if level in log_stats:
            log_stats[level] += 1
        
        return jsonify({'status': 'received'}), 200
    else:
        # Return recent logs
        limit = int(request.args.get('limit', 100))
        return jsonify(list(logs_buffer)[-limit:])

@app.route('/api/stats')
def get_stats():
    """Get log statistics"""
    return jsonify(log_stats)

@app.route('/api/export')
def export_logs():
    """Export logs as JSON"""
    return jsonify(list(logs_buffer))

@app.route('/api/health')
def health():
    """Health check"""
    return jsonify({
        'status': 'running',
        'logs_collected': len(logs_buffer),
        'services_reporting': len(set(log.get('service', 'unknown') for log in logs_buffer))
    })

if __name__ == '__main__':
    print("Starting Log Collector on port 5000...")
    
    # Add sample logs for demonstration
    sample_logs = [
        {'service': 'PLC', 'level': 'info', 'message': 'PLC Runtime started', 'timestamp': datetime.now().isoformat()},
        {'service': 'SCADA', 'level': 'info', 'message': 'Connected to PLC at 192.168.2.10', 'timestamp': datetime.now().isoformat()},
        {'service': 'IDS', 'level': 'info', 'message': 'Network monitoring active', 'timestamp': datetime.now().isoformat()},
    ]
    
    for log in sample_logs:
        logs_buffer.append(log)
        log_stats['total'] += 1
        log_stats['info'] += 1
    
    app.run(host='0.0.0.0', port=5000, debug=False)
