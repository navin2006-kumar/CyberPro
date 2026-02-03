#!/usr/bin/env python3
"""
OilSprings Router - Network Segmentation Control
"""

from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import subprocess
import os

app = Flask(__name__)
CORS(app)

# Firewall rules
firewall_rules = [
    {'id': 1, 'source': '192.168.2.0/24', 'destination': '192.168.3.0/24', 'action': 'ALLOW', 'enabled': True},
    {'id': 2, 'source': '192.168.5.0/24', 'destination': '192.168.2.0/24', 'action': 'DENY', 'enabled': True},
    {'id': 3, 'source': '192.168.4.0/24', 'destination': 'any', 'action': 'ALLOW', 'enabled': True},
]

@app.route('/')
def index():
    """Router dashboard"""
    return render_template('router.html')

@app.route('/api/rules')
def get_rules():
    """Get firewall rules"""
    return jsonify(firewall_rules)

@app.route('/api/rules/<int:rule_id>/toggle', methods=['POST'])
def toggle_rule(rule_id):
    """Toggle firewall rule"""
    for rule in firewall_rules:
        if rule['id'] == rule_id:
            rule['enabled'] = not rule['enabled']
            return jsonify({'status': 'success', 'rule': rule})
    return jsonify({'status': 'error', 'message': 'Rule not found'}), 404

@app.route('/api/stats')
def get_stats():
    """Get routing statistics"""
    return jsonify({
        'total_rules': len(firewall_rules),
        'active_rules': sum(1 for r in firewall_rules if r['enabled']),
        'networks': 4,
        'status': 'running'
    })

@app.route('/api/health')
def health():
    """Health check"""
    return jsonify({'status': 'running'})

if __name__ == '__main__':
    print("Starting Router on port 8080...")
    
    # Enable IP forwarding
    try:
        subprocess.run(['sysctl', '-w', 'net.ipv4.ip_forward=1'], check=False)
    except:
        pass
    
    app.run(host='0.0.0.0', port=8080, debug=False)
