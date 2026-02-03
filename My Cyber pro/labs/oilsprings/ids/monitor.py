#!/usr/bin/env python3
"""
OilSprings Network Monitor - IDS Component
Real-time network traffic monitoring for OT/ICS protocols
"""

from scapy.all import sniff, IP, TCP, UDP
from flask import Flask, render_template, jsonify
from flask_cors import CORS
from threading import Thread
from collections import deque
import time
import os

app = Flask(__name__)
CORS(app)

# Store recent packets
packets_buffer = deque(maxlen=1000)
protocol_stats = {
    'modbus': 0,
    's7': 0,
    'opcua': 0,
    'other': 0
}

def detect_protocol(packet):
    """Detect industrial protocol from packet"""
    if TCP in packet:
        port = packet[TCP].dport
        if port == 502:
            return 'modbus'
        elif port == 102:
            return 's7'
        elif port == 4840:
            return 'opcua'
    return 'other'

def packet_callback(packet):
    """Process captured packets"""
    if IP in packet:
        protocol = detect_protocol(packet)
        protocol_stats[protocol] += 1
        
        packet_info = {
            'timestamp': time.time(),
            'src': packet[IP].src,
            'dst': packet[IP].dst,
            'protocol': protocol,
            'length': len(packet)
        }
        
        if TCP in packet:
            packet_info['sport'] = packet[TCP].sport
            packet_info['dport'] = packet[TCP].dport
        elif UDP in packet:
            packet_info['sport'] = packet[UDP].sport
            packet_info['dport'] = packet[UDP].dport
            
        packets_buffer.append(packet_info)

def start_sniffer():
    """Start packet capture in background"""
    interface = os.getenv('MONITOR_INTERFACE', 'eth0')
    print(f"Starting packet capture on {interface}...")
    sniff(iface=interface, prn=packet_callback, store=False)

@app.route('/')
def index():
    """Main dashboard"""
    return render_template('index.html')

@app.route('/api/packets')
def get_packets():
    """Get recent packets"""
    return jsonify(list(packets_buffer)[-100:])

@app.route('/api/stats')
def get_stats():
    """Get protocol statistics"""
    return jsonify(protocol_stats)

@app.route('/api/health')
def health():
    """Health check"""
    return jsonify({'status': 'running', 'packets_captured': len(packets_buffer)})

if __name__ == '__main__':
    # Start packet sniffer in background
    sniffer_thread = Thread(target=start_sniffer, daemon=True)
    sniffer_thread.start()
    
    # Start web server
    print("Starting Network Monitor on port 8000...")
    app.run(host='0.0.0.0', port=8000, debug=False)
