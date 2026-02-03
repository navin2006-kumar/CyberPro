const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 8082;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const server = app.listen(PORT, () => {
    console.log(`🌐 Network Monitor UI running on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    clients.add(ws);

    ws.on('close', () => {
        clients.delete(ws);
        console.log('WebSocket client disconnected');
    });
});

function broadcast(data) {
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Simulated network statistics
let stats = {
    totalPackets: 0,
    httpPackets: 0,
    modbusPackets: 0,
    icmpPackets: 0,
    otherPackets: 0,
    bytesTransferred: 0,
    activeConnections: 0
};

// API Routes
app.get('/api/stats', (req, res) => {
    res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/connections', (req, res) => {
    const connections = generateMockConnections();
    res.json({
        success: true,
        connections,
        count: connections.length
    });
});

app.get('/api/protocols', (req, res) => {
    const protocols = {
        'HTTP/HTTPS': Math.floor(stats.httpPackets),
        'Modbus/TCP': Math.floor(stats.modbusPackets),
        'ICMP': Math.floor(stats.icmpPackets),
        'Other': Math.floor(stats.otherPackets)
    };

    res.json({
        success: true,
        protocols
    });
});

app.get('/api/traffic-history', (req, res) => {
    const history = generateTrafficHistory();
    res.json({
        success: true,
        history
    });
});

// Helper functions
function generateMockConnections() {
    const connections = [
        { src: '192.168.1.10', dst: '192.168.1.50', port: 502, protocol: 'Modbus/TCP', state: 'ESTABLISHED' },
        { src: '192.168.1.20', dst: '192.168.1.100', port: 80, protocol: 'HTTP', state: 'ESTABLISHED' },
        { src: '192.168.1.30', dst: '192.168.1.50', port: 502, protocol: 'Modbus/TCP', state: 'ESTABLISHED' },
        { src: '192.168.1.40', dst: '8.8.8.8', port: 53, protocol: 'DNS', state: 'TIME_WAIT' },
        { src: '192.168.1.15', dst: '192.168.1.100', port: 443, protocol: 'HTTPS', state: 'ESTABLISHED' }
    ];

    return connections;
}

function generateTrafficHistory() {
    const history = [];
    const now = Date.now();

    for (let i = 59; i >= 0; i--) {
        history.push({
            timestamp: now - (i * 1000),
            packets: Math.floor(Math.random() * 50) + 20,
            bytes: Math.floor(Math.random() * 10000) + 5000
        });
    }

    return history;
}

// Simulate network activity
function simulateNetworkActivity() {
    // Increment packet counts
    const httpInc = Math.random() * 5;
    const modbusInc = Math.random() * 3;
    const icmpInc = Math.random() * 2;
    const otherInc = Math.random() * 1;

    stats.httpPackets += httpInc;
    stats.modbusPackets += modbusInc;
    stats.icmpPackets += icmpInc;
    stats.otherPackets += otherInc;
    stats.totalPackets = stats.httpPackets + stats.modbusPackets + stats.icmpPackets + stats.otherPackets;

    // Increment bytes
    stats.bytesTransferred += Math.floor(Math.random() * 5000) + 1000;

    // Random active connections
    stats.activeConnections = Math.floor(Math.random() * 3) + 3;

    // Broadcast to clients
    broadcast({
        type: 'stats_update',
        stats,
        timestamp: new Date().toISOString()
    });
}

// Update stats every 2 seconds
setInterval(simulateNetworkActivity, 2000);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down...');
    server.close();
    process.exit(0);
});
