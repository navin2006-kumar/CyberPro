const express = require('express');
const ModbusRTU = require('modbus-serial');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 8080;

// Modbus client setup
const modbusClient = new ModbusRTU();
const MODBUS_HOST = process.env.MODBUS_HOST || 'modbus-server';
const MODBUS_PORT = parseInt(process.env.MODBUS_PORT) || 502;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// WebSocket server for real-time updates
const server = app.listen(PORT, async () => {
    console.log(`🏭 SCADA HMI Interface running on port ${PORT}`);
    
    // Connect to Modbus server
    try {
        await modbusClient.connectTCP(MODBUS_HOST, { port: MODBUS_PORT });
        modbusClient.setID(1);
        console.log(`✓ Connected to Modbus server at ${MODBUS_HOST}:${MODBUS_PORT}`);
    } catch (error) {
        console.error('Failed to connect to Modbus server:', error.message);
        console.log('Retrying in 5 seconds...');
        setTimeout(() => connectModbus(), 5000);
    }
});

async function connectModbus() {
    try {
        await modbusClient.connectTCP(MODBUS_HOST, { port: MODBUS_PORT });
        modbusClient.setID(1);
        console.log(`✓ Connected to Modbus server at ${MODBUS_HOST}:${MODBUS_PORT}`);
    } catch (error) {
        console.error('Retry failed:', error.message);
        setTimeout(() => connectModbus(), 5000);
    }
}

const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    clients.add(ws);
    
    ws.on('close', () => {
        clients.delete(ws);
        console.log('WebSocket client disconnected');
    });
});

// Broadcast to all connected clients
function broadcast(data) {
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// API Routes

// Read holding registers
app.get('/api/registers/holding/:start/:count', async (req, res) => {
    try {
        const start = parseInt(req.params.start);
        const count = parseInt(req.params.count);
        
        const data = await modbusClient.readHoldingRegisters(start, count);
        res.json({
            success: true,
            registers: data.data,
            start,
            count
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Read coils
app.get('/api/coils/:start/:count', async (req, res) => {
    try {
        const start = parseInt(req.params.start);
        const count = parseInt(req.params.count);
        
        const data = await modbusClient.readCoils(start, count);
        res.json({
            success: true,
            coils: data.data,
            start,
            count
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Write single coil
app.post('/api/coils/:address', async (req, res) => {
    try {
        const address = parseInt(req.params.address);
        const value = req.body.value === true || req.body.value === 1;
        
        await modbusClient.writeCoil(address, value);
        
        broadcast({
            type: 'coil_changed',
            address,
            value
        });
        
        res.json({
            success: true,
            address,
            value
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Write single register
app.post('/api/registers/:address', async (req, res) => {
    try {
        const address = parseInt(req.params.address);
        const value = parseInt(req.body.value);
        
        await modbusClient.writeRegister(address, value);
        
        broadcast({
            type: 'register_changed',
            address,
            value
        });
        
        res.json({
            success: true,
            address,
            value
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get system status
app.get('/api/status', async (req, res) => {
    try {
        // Read multiple registers for system status
        const holding = await modbusClient.readHoldingRegisters(0, 10);
        const coils = await modbusClient.readCoils(0, 8);
        
        res.json({
            success: true,
            connected: modbusClient.isOpen,
            timestamp: new Date().toISOString(),
            registers: holding.data,
            coils: coils.data
        });
    } catch (error) {
        res.json({
            success: false,
            connected: false,
            message: error.message
        });
    }
});

// Periodic status broadcast
setInterval(async () => {
    try {
        if (modbusClient.isOpen && clients.size > 0) {
            const holding = await modbusClient.readHoldingRegisters(0, 10);
            const coils = await modbusClient.readCoils(0, 8);
            
            broadcast({
                type: 'status_update',
                timestamp: new Date().toISOString(),
                registers: holding.data,
                coils: coils.data
            });
        }
    } catch (error) {
        // Silent fail for periodic updates
    }
}, 2000);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down...');
    modbusClient.close();
    server.close();
    process.exit(0);
});
