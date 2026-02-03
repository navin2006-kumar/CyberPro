// Dashboard JavaScript

let userSession = null;

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (!data.success) {
            window.location.href = '/';
            return false;
        }

        userSession = data.user;
        document.getElementById('username').textContent = userSession.username;
        return true;
    } catch (error) {
        window.location.href = '/';
        return false;
    }
}

// Load dashboard data
async function loadDashboard() {
    try {
        const response = await fetch('/api/dashboard/stats');
        const data = await response.json();

        if (data.success) {
            updateStats(data.stats);
            loadActivity();
            loadQuickAccess();
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Update stats
function updateStats(stats) {
    document.getElementById('labsCompleted').textContent = stats.labsCompleted || 0;
    document.getElementById('timeSpent').textContent = `${stats.timeSpent || 0}h`;
    document.getElementById('currentStreak').textContent = stats.currentStreak || 0;
    document.getElementById('skillLevel').textContent = stats.skillLevel || 'Beginner';

    // Update progress bar
    const progress = stats.overallProgress || 0;
    document.getElementById('overallProgress').textContent = `${progress}%`;
    document.getElementById('overallProgressBar').style.width = `${progress}%`;
}

// Load recent activity
async function loadActivity() {
    const activityList = document.getElementById('activityList');

    try {
        const response = await fetch('/api/dashboard/activity');
        const data = await response.json();

        if (data.success && data.activity.length > 0) {
            activityList.innerHTML = data.activity.map(item => `
                <div class="activity-item">
                    <div class="activity-icon">${getActivityIcon(item.type)}</div>
                    <div class="activity-content">
                        <div class="activity-title">${item.title}</div>
                        <div class="activity-time">${formatTime(item.timestamp)}</div>
                    </div>
                </div>
            `).join('');
        } else {
            activityList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-content">
                        <div class="activity-title">No recent activity</div>
                        <div class="activity-time">Start a lab to see your activity here</div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

// Load quick access labs
async function loadQuickAccess() {
    const quickLabs = document.getElementById('quickAccessLabs');

    try {
        const response = await fetch('/api/labs?limit=5');
        const data = await response.json();

        if (data.success && data.labs.length > 0) {
            quickLabs.innerHTML = data.labs.slice(0, 5).map(lab => `
                <div class="quick-lab-item" onclick="window.location.href='/lab-detail.html?id=${lab.id}'">
                    <div class="lab-info">
                        <h3>${lab.name}</h3>
                        <span class="lab-badge">${lab.category}</span>
                    </div>
                    <div class="lab-status">${lab.status || 'Available'}</div>
                </div>
            `).join('');
        } else {
            quickLabs.innerHTML = `
                <div class="quick-lab-item">
                    <div class="lab-info">
                        <h3>No labs available</h3>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading quick access:', error);
    }
}

// Get activity icon
function getActivityIcon(type) {
    const icons = {
        'lab_started': '🚀',
        'lab_completed': '✅',
        'lab_stopped': '⏹️',
        'achievement': '🏆',
        'login': '🔐'
    };
    return icons[type] || '📝';
}

// Format time
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Initialize
checkAuth().then(authenticated => {
    if (authenticated) {
        loadDashboard();
    }
});
