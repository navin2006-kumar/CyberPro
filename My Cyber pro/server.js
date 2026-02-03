require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const Database = require('./db');
const LabManager = require('./labManager');
const ChatbotService = require('./chatbot');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 3000;
const db = new Database(process.env.DB_PATH);
const labManager = new LabManager(db);
const chatbot = new ChatbotService();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'cyber-lab-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Authentication required' });
    }
};

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('✓ WebSocket client connected');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received:', data);
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

// Broadcast function for real-time updates
function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// ============ API Routes ============

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Cyber Lab Platform is running',
        timestamp: new Date().toISOString()
    });
});

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await db.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        await db.logActivity(user.id, 'login', 'User logged in');

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
    await db.logActivity(req.session.userId, 'logout', 'User logged out');
    req.session.destroy();
    res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/session', (req, res) => {
    if (req.session.userId) {
        res.json({
            success: true,
            user: {
                id: req.session.userId,
                username: req.session.username,
                role: req.session.role
            }
        });
    } else {
        res.status(401).json({ success: false, message: 'Not authenticated' });
    }
});

// Lab routes
app.get('/api/labs', requireAuth, async (req, res) => {
    try {
        const labs = await labManager.getAllLabsStatus();
        res.json({ success: true, labs });
    } catch (error) {
        console.error('Error getting labs:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/labs/:id', requireAuth, async (req, res) => {
    try {
        const lab = await db.getLabById(req.params.id);
        if (!lab) {
            return res.status(404).json({ success: false, message: 'Lab not found' });
        }

        const status = await labManager.getLabStatus(req.params.id);
        res.json({ success: true, lab: { ...lab, ...status } });
    } catch (error) {
        console.error('Error getting lab:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/labs/:id/start', requireAuth, async (req, res) => {
    try {
        const result = await labManager.startLab(parseInt(req.params.id), req.session.userId);

        if (result.success) {
            broadcast({
                type: 'lab_started',
                labId: req.params.id,
                message: 'Lab started successfully'
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Error starting lab:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/labs/:id/stop', requireAuth, async (req, res) => {
    try {
        const result = await labManager.stopLab(parseInt(req.params.id), req.session.userId);

        if (result.success) {
            broadcast({
                type: 'lab_stopped',
                labId: req.params.id,
                message: 'Lab stopped successfully'
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Error stopping lab:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/labs/:id/restart', requireAuth, async (req, res) => {
    try {
        const result = await labManager.restartLab(parseInt(req.params.id), req.session.userId);

        if (result.success) {
            broadcast({
                type: 'lab_restarted',
                labId: req.params.id,
                message: 'Lab restarted successfully'
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Error restarting lab:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/labs/:id/logs', requireAuth, async (req, res) => {
    try {
        const tail = parseInt(req.query.tail) || 100;
        const result = await labManager.getLabLogs(parseInt(req.params.id), tail);
        res.json(result);
    } catch (error) {
        console.error('Error getting logs:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// System routes
app.get('/api/system/status', requireAuth, async (req, res) => {
    try {
        const dockerRunning = await labManager.docker.isDockerRunning();
        const systemInfo = dockerRunning ? await labManager.docker.getSystemInfo() : null;

        res.json({
            success: true,
            docker: {
                running: dockerRunning,
                info: systemInfo
            },
            activeLabs: labManager.activeLabs.size
        });
    } catch (error) {
        console.error('Error getting system status:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Chatbot routes
app.post('/api/chatbot/message', requireAuth, async (req, res) => {
    try {
        const { message, context } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        const result = await chatbot.processMessage(req.session.userId, message, context || {});
        res.json(result);
    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/chatbot/history', requireAuth, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const history = chatbot.getConversationHistory(req.session.userId, limit);
        res.json({ success: true, history });
    } catch (error) {
        console.error('Error getting chat history:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/chatbot/reset', requireAuth, (req, res) => {
    try {
        const result = chatbot.resetConversation(req.session.userId);
        res.json(result);
    } catch (error) {
        console.error('Error resetting chat:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/labs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'labs.html'));
});

app.get('/docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'docs', 'getting-started.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start server only after database is ready
async function startServer() {
    try {
        // Wait for database to be ready
        console.log('⏳ Initializing database...');
        await db.waitForReady();
        console.log('✓ Database ready');

        // Start HTTP server
        server.listen(PORT, () => {
            console.log('\n╔════════════════════════════════════════════════╗');
            console.log('║     🔬 Cyber Lab Platform - Server Ready      ║');
            console.log('╚════════════════════════════════════════════════╝\n');
            console.log(`🌐 Portal:    http://localhost:${PORT}`);
            console.log(`📚 Docs:      http://localhost:${PORT}/docs`);
            console.log(`🧪 Labs:      http://localhost:${PORT}/labs`);
            console.log(`\n✓ Database initialized`);
            console.log(`✓ Lab manager ready`);
            console.log(`✓ WebSocket server running`);
            console.log(`\n📝 Default credentials: admin / admin123\n`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');

    try {
        // Stop all running labs
        await labManager.stopAllLabs();

        // Close database
        db.close();

        // Close server
        server.close(() => {
            console.log('✓ Server closed');
            process.exit(0);
        });
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// Start the server
startServer();

module.exports = { app, server, db, labManager };
