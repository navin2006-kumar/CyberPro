// API Base URL
const API_BASE = '';

// WebSocket connection
let ws = null;
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await checkSession();
    setupEventListeners();
    connectWebSocket();
});

// Check if user is already logged in
async function checkSession() {
    try {
        const response = await fetch(`${API_BASE}/api/auth/session`);
        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            showDashboard();
            loadDashboardData();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Session check failed:', error);
        showLogin();
    }
}

// Setup event listeners
function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            currentUser = data.user;
            showNotification('Login successful!', 'success');
            showDashboard();
            loadDashboardData();
            connectWebSocket();
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please try again.', 'error');
    }
}

// Handle logout
async function handleLogout() {
    try {
        await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
        currentUser = null;
        if (ws) ws.close();
        showLogin();
        showNotification('Logged out successfully', 'info');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Show/hide screens
function showLogin() {
    document.getElementById('loginScreen').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'inline-flex';
}

// Load dashboard data
async function loadDashboardData() {
    await Promise.all([
        refreshStatus(),
        loadLabs()
    ]);
}

// Refresh system status
async function refreshStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/system/status`);
        const data = await response.json();

        if (data.success) {
            // Update Docker status
            const dockerStatusEl = document.getElementById('dockerStatus');
            if (data.docker.running) {
                dockerStatusEl.innerHTML = `
                    <span class="badge badge-success">
                        <span class="status-dot running"></span>
                        Running
                    </span>
                `;
            } else {
                dockerStatusEl.innerHTML = `
                    <span class="badge badge-danger">
                        <span class="status-dot error"></span>
                        Not Running
                    </span>
                `;
            }

            // Update active labs count
            document.getElementById('activeLabs').textContent = data.activeLabs;
        }
    } catch (error) {
        console.error('Error refreshing status:', error);
    }
}

// Load labs
async function loadLabs() {
    try {
        const response = await fetch(`${API_BASE}/api/labs`);
        const data = await response.json();

        if (data.success) {
            renderLabs(data.labs.slice(0, 3)); // Show first 3 labs on dashboard
        }
    } catch (error) {
        console.error('Error loading labs:', error);
    }
}

// Render labs
function renderLabs(labs) {
    const labsGrid = document.getElementById('labsGrid');
    if (!labsGrid) return;

    if (labs.length === 0) {
        labsGrid.innerHTML = '<p class="text-muted">No labs available</p>';
        return;
    }

    labsGrid.innerHTML = labs.map(lab => `
        <div class="card">
            <div class="card-header">
                <h4 class="card-title">${lab.name}</h4>
                ${getStatusBadge(lab.status)}
            </div>
            <div class="card-body">
                <p class="text-muted mb-2">${lab.description}</p>
                <div class="flex gap-1" style="margin-bottom: 1rem;">
                    <span class="badge badge-info">${lab.type.toUpperCase()}</span>
                    <span class="badge ${getDifficultyColor(lab.difficulty)}">${lab.difficulty}</span>
                </div>
                <div class="flex gap-1">
                    ${getLabButtons(lab)}
                </div>
            </div>
        </div>
    `).join('');

    // Add event listeners to buttons
    labs.forEach(lab => {
        const startBtn = document.getElementById(`start-${lab.id}`);
        const stopBtn = document.getElementById(`stop-${lab.id}`);
        const restartBtn = document.getElementById(`restart-${lab.id}`);

        if (startBtn) startBtn.addEventListener('click', () => startLab(lab.id));
        if (stopBtn) stopBtn.addEventListener('click', () => stopLab(lab.id));
        if (restartBtn) restartBtn.addEventListener('click', () => restartLab(lab.id));
    });
}

// Get status badge
function getStatusBadge(status) {
    const badges = {
        running: '<span class="badge badge-success"><span class="status-dot running"></span> Running</span>',
        stopped: '<span class="badge"><span class="status-dot stopped"></span> Stopped</span>',
        starting: '<span class="badge badge-warning"><span class="status-dot starting"></span> Starting</span>',
        stopping: '<span class="badge badge-warning"><span class="status-dot starting"></span> Stopping</span>',
        error: '<span class="badge badge-danger"><span class="status-dot error"></span> Error</span>'
    };
    return badges[status] || badges.stopped;
}

// Get difficulty color
function getDifficultyColor(difficulty) {
    const colors = {
        beginner: 'badge-success',
        intermediate: 'badge-warning',
        advanced: 'badge-danger'
    };
    return colors[difficulty] || 'badge-info';
}

// Get lab buttons based on status
function getLabButtons(lab) {
    if (lab.status === 'running') {
        const accessBtn = `<button id="access-${lab.id}" class="btn btn-primary" style="flex: 1;" onclick="accessLab(${lab.id})">🚀 Access Lab</button>`;
        return `
            ${accessBtn}
            <button id="stop-${lab.id}" class="btn btn-danger" style="flex: 1;">⏹ Stop</button>
            <button id="restart-${lab.id}" class="btn btn-warning" style="flex: 1;">🔄 Restart</button>
        `;
    } else if (lab.status === 'starting' || lab.status === 'stopping') {
        return `<button class="btn btn-secondary" disabled style="flex: 1;">⏳ Please wait...</button>`;
    } else {
        return `<button id="start-${lab.id}" class="btn btn-success" style="flex: 1;">▶ Start Lab</button>`;
    }
}

// Access running lab
async function accessLab(labId) {
    try {
        const response = await fetch(`${API_BASE}/api/labs/${labId}`);
        const data = await response.json();

        if (data.success && data.lab) {
            const labUrl = getLabUrl(data.lab);
            if (labUrl) {
                window.open(labUrl, '_blank');
            } else {
                showNotification('Lab URL not available', 'warning');
            }
        }
    } catch (error) {
        console.error('Error accessing lab:', error);
        showNotification('Failed to access lab', 'error');
    }
}

// Lab control functions
async function startLab(labId) {
    try {
        showNotification('Starting lab...', 'info');
        const response = await fetch(`${API_BASE}/api/labs/${labId}/start`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            showNotification('Lab started successfully! Opening lab interface...', 'success');

            // Get lab details to find the URL
            const labResponse = await fetch(`${API_BASE}/api/labs/${labId}`);
            const labData = await labResponse.json();

            if (labData.success && labData.lab) {
                // Auto-redirect to lab interface
                const labUrl = getLabUrl(labData.lab);
                if (labUrl) {
                    setTimeout(() => {
                        window.open(labUrl, '_blank');
                    }, 2000); // Wait 2 seconds for lab to fully start
                }
            }

            setTimeout(() => loadLabs(), 1000);
        } else {
            showNotification(data.message || 'Failed to start lab', 'error');
        }
    } catch (error) {
        console.error('Error starting lab:', error);
        showNotification('Failed to start lab', 'error');
    }
}

// Get lab URL based on lab type and ports
function getLabUrl(lab) {
    // Parse ports
    let ports;
    try {
        ports = JSON.parse(lab.ports);
    } catch (e) {
        ports = lab.ports;
    }

    // Handle OilSprings lab (object with multiple services)
    if (typeof ports === 'object' && !Array.isArray(ports)) {
        // OilSprings - redirect to SCADA dashboard
        return `http://localhost:${ports.scada}`;
    }

    // Handle simple labs (array of ports)
    if (Array.isArray(ports) && ports.length > 0) {
        return `http://localhost:${ports[0]}`;
    }

    // Fallback
    return null;
}

async function stopLab(labId) {
    try {
        showNotification('Stopping lab...', 'info');
        const response = await fetch(`${API_BASE}/api/labs/${labId}/stop`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            showNotification('Lab stopped successfully!', 'success');
            setTimeout(() => loadLabs(), 1000);
        } else {
            showNotification(data.message || 'Failed to stop lab', 'error');
        }
    } catch (error) {
        console.error('Error stopping lab:', error);
        showNotification('Failed to stop lab', 'error');
    }
}

async function restartLab(labId) {
    try {
        showNotification('Restarting lab...', 'info');
        const response = await fetch(`${API_BASE}/api/labs/${labId}/restart`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            showNotification('Lab restarted successfully!', 'success');
            setTimeout(() => loadLabs(), 1000);
        } else {
            showNotification(data.message || 'Failed to restart lab', 'error');
        }
    } catch (error) {
        console.error('Error restarting lab:', error);
        showNotification('Failed to restart lab', 'error');
    }
}

// WebSocket connection
function connectWebSocket() {
    if (!currentUser) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('✓ WebSocket connected');
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Reconnect after 5 seconds if user is still logged in
        if (currentUser) {
            setTimeout(connectWebSocket, 5000);
        }
    };
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'lab_started':
        case 'lab_stopped':
        case 'lab_restarted':
            showNotification(data.message, 'success');
            loadLabs();
            refreshStatus();
            break;
        default:
            console.log('Unknown WebSocket message:', data);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
