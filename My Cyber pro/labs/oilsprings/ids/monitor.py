#!/usr/bin/env python3
"""
CyberPro — OilSprings IDS Monitor (Enhanced)
Detects anomalous OT/ICS protocol traffic and forwards structured events
to the CyberPro telemetry API and local log collector.

SECURITY NOTE: This component has NET_RAW capability (not privileged).
It only captures on the specified interface and does not modify traffic.
"""

import os
import json
import time
import uuid
import threading
import requests
from datetime import datetime
from collections import deque
from flask import Flask, render_template, jsonify
from flask_cors import CORS

try:
    from scapy.all import sniff, IP, TCP, UDP
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False
    print("⚠️  Scapy not available — running in simulation mode")

app = Flask(__name__)
CORS(app)

# ── Configuration ──────────────────────────────────────────────────────────────
EXERCISE_ID          = os.getenv('EXERCISE_ID', 'unset')
COLLECTOR_URL        = os.getenv('COLLECTOR_URL', 'http://10.10.4.40:5000')
BACKEND_TELEMETRY    = os.getenv('BACKEND_TELEMETRY_URL',
                                  'http://host.docker.internal:3000/api/telemetry/event')
CONTAINER_SECRET     = os.getenv('CONTAINER_SECRET', '')
MONITOR_INTERFACE    = os.getenv('MONITOR_INTERFACE', 'eth0')

# ── State ──────────────────────────────────────────────────────────────────────
packets_buffer  = deque(maxlen=1000)
alerts_buffer   = deque(maxlen=500)
protocol_stats  = {'modbus': 0, 's7': 0, 'opcua': 0, 'dnp3': 0, 'other': 0}
packet_count    = 0
alert_count     = 0

# ── Known safe hosts (PLC in l2_network) ──────────────────────────────────────
KNOWN_PLC_IPS   = {'10.10.2.10'}
SCADA_IPS       = {'10.10.3.20', '10.10.3.11'}
# Any source not in these sets sending to PLC port 502 is anomalous
AUTHORIZED_SRCS = SCADA_IPS | {'10.10.3.2', '10.10.4.40', '10.10.4.41'}

# ── Protocol detection ─────────────────────────────────────────────────────────
def detect_protocol(packet):
    """Identify ICS/OT protocol from packet destination port."""
    if TCP in packet:
        port = packet[TCP].dport
        if port == 502:   return 'modbus'
        if port == 102:   return 's7'
        if port == 4840:  return 'opcua'
        if port == 20000: return 'dnp3'
    return 'other'

def is_anomalous(packet, src_ip, dst_ip, protocol):
    """Detect anomalous OT traffic patterns."""
    if protocol == 'modbus' and dst_ip in KNOWN_PLC_IPS:
        if src_ip not in AUTHORIZED_SRCS:
            return True, 'modbus_anomaly', 'high', \
                f'Unauthorised Modbus/TCP from {src_ip} to PLC {dst_ip}:502'
    return False, None, 'info', None

# ── Event forwarding ───────────────────────────────────────────────────────────
def forward_event(event_type, severity, data):
    """Forward a structured event to the CyberPro backend telemetry API."""
    if EXERCISE_ID == 'unset':
        return  # No active exercise — skip forwarding

    payload = {
        'exercise_id': EXERCISE_ID,
        'source':      'ids',
        'event_type':  event_type,
        'severity':    severity,
        'data':        data
    }
    headers = {'Content-Type': 'application/json'}
    if CONTAINER_SECRET:
        headers['X-CyberPro-Secret'] = CONTAINER_SECRET

    try:
        requests.post(BACKEND_TELEMETRY, json=payload, headers=headers, timeout=3)
    except Exception as e:
        # Non-critical: backend may not be reachable; log locally only
        pass

def forward_to_collector(log_entry):
    """Forward log to local collector service."""
    try:
        requests.post(f'{COLLECTOR_URL}/api/logs', json=log_entry, timeout=2)
    except Exception:
        pass

# ── Packet processing ──────────────────────────────────────────────────────────
def packet_callback(packet):
    global packet_count, alert_count

    if IP not in packet:
        return

    src_ip   = packet[IP].src
    dst_ip   = packet[IP].dst
    protocol = detect_protocol(packet)
    protocol_stats[protocol] += 1
    packet_count += 1

    pkt_info = {
        'id':        str(uuid.uuid4()),
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'src':       src_ip,
        'dst':       dst_ip,
        'protocol':  protocol,
        'length':    len(packet)
    }

    if TCP in packet:
        pkt_info.update({'sport': packet[TCP].sport, 'dport': packet[TCP].dport})
    elif UDP in packet:
        pkt_info.update({'sport': packet[UDP].sport, 'dport': packet[UDP].dport})

    packets_buffer.append(pkt_info)

    # ── Anomaly detection ──
    anomalous, event_type, severity, description = is_anomalous(
        packet, src_ip, dst_ip, protocol)

    if anomalous:
        alert_count += 1
        alert = {
            **pkt_info,
            'alert': True,
            'alert_type': event_type,
            'severity': severity,
            'description': description,
            'dst_port': pkt_info.get('dport')
        }
        alerts_buffer.append(alert)

        # Forward to backend telemetry API
        forward_event(event_type, severity, {
            'src_ip':  src_ip,
            'dst_ip':  dst_ip,
            'dst_port': pkt_info.get('dport'),
            'protocol': protocol,
            'description': description,
            'packet_length': len(packet)
        })

        # Forward to collector
        forward_to_collector({
            'service': 'IDS',
            'level': severity,
            'message': description,
            'event_type': event_type,
            'data': alert
        })

        print(f"🚨 ALERT [{severity.upper()}]: {description}")

# ── Sniffer thread ─────────────────────────────────────────────────────────────
def start_sniffer():
    if not SCAPY_AVAILABLE:
        print("Running in simulation mode — no actual packet capture")
        return

    print(f"Starting packet capture on interface: {MONITOR_INTERFACE}")
    try:
        sniff(iface=MONITOR_INTERFACE, prn=packet_callback, store=False)
    except Exception as e:
        print(f"❌ Sniffer error: {e}")

# ── Flask API ──────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/packets')
def get_packets():
    limit = min(int(request_arg('limit', 100)), 500)
    return jsonify(list(packets_buffer)[-limit:])

@app.route('/api/alerts')
def get_alerts():
    return jsonify(list(alerts_buffer))

@app.route('/api/stats')
def get_stats():
    return jsonify({
        'protocol_stats': dict(protocol_stats),
        'total_packets':  packet_count,
        'total_alerts':   alert_count,
        'exercise_id':    EXERCISE_ID,
        'interface':      MONITOR_INTERFACE
    })

@app.route('/api/health')
def health():
    return jsonify({
        'status':          'running',
        'packets_captured': packet_count,
        'alerts_generated': alert_count,
        'exercise_id':     EXERCISE_ID,
        'scapy_available': SCAPY_AVAILABLE
    })

def request_arg(name, default):
    """Safe query parameter extraction."""
    from flask import request
    try:
        return request.args.get(name, default)
    except Exception:
        return default

# ── Main ───────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    sniffer = threading.Thread(target=start_sniffer, daemon=True)
    sniffer.start()

    print(f"🔍 CyberPro IDS Monitor starting on port 8000")
    print(f"   Exercise ID: {EXERCISE_ID}")
    print(f"   Backend: {BACKEND_TELEMETRY}")
    app.run(host='0.0.0.0', port=8000, debug=False)
