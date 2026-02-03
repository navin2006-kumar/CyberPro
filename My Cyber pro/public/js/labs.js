// Labs JavaScript

let allLabs = [];
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
        return true;
    } catch (error) {
        window.location.href = '/';
        return false;
    }
}

// Load labs
async function loadLabs() {
    try {
        const response = await fetch('/api/labs');
        const data = await response.json();

        if (data.success) {
            allLabs = data.labs;
            filterLabs();
        }
    } catch (error) {
        console.error('Error loading labs:', error);
    } finally {
        document.getElementById('loadingState').style.display = 'none';
    }
}

// Filter labs
function filterLabs() {
    const category = document.getElementById('categoryFilter').value;
    const difficulty = document.getElementById('difficultyFilter').value;
    const status = document.getElementById('statusFilter').value;

    let filtered = allLabs;

    if (category) {
        filtered = filtered.filter(lab => lab.category === category);
    }
    if (difficulty) {
        filtered = filtered.filter(lab => lab.difficulty === difficulty);
    }
    if (status) {
        filtered = filtered.filter(lab => lab.status === status);
    }

    displayLabs(filtered);
}

// Display labs
function displayLabs(labs) {
    const grid = document.getElementById('labsGrid');
    const emptyState = document.getElementById('emptyState');

    if (labs.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    grid.style.display = 'grid';
    emptyState.style.display = 'none';

    grid.innerHTML = labs.map(lab => {
        const serviceCount = lab.services ? lab.services.length : 0;

        return `
            <div class="lab-card ${lab.status || ''}" onclick="openLab(${lab.id})">
                <div class="lab-header">
                    <h3>${lab.name}</h3>
                    <span class="status-badge ${lab.status || 'available'}">${getStatusText(lab.status)}</span>
                </div>
                <div class="lab-meta">
                    <span class="difficulty-badge ${lab.difficulty}">${lab.difficulty.toUpperCase()}</span>
                    <span class="category-badge">${lab.category}</span>
                </div>
                <p class="lab-description">${lab.description.substring(0, 150)}...</p>
                <div class="lab-footer">
                    <div class="lab-services">
                        <span>📦 ${serviceCount} Services</span>
                        ${lab.estimated_time ? `<span>⏱️ ${lab.estimated_time}m</span>` : ''}
                    </div>
                    <button class="btn-launch" onclick="event.stopPropagation(); openLab(${lab.id})">
                        ${lab.status === 'running' ? 'Open →' : 'Launch →'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Get status text
function getStatusText(status) {
    const statusMap = {
        'available': 'Available',
        'running': '● Running',
        'completed': 'Completed'
    };
    return statusMap[status] || 'Available';
}

// Open lab detail page
function openLab(labId) {
    window.location.href = `/lab-detail.html?id=${labId}`;
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
});

// Filter event listeners
document.getElementById('categoryFilter').addEventListener('change', filterLabs);
document.getElementById('difficultyFilter').addEventListener('change', filterLabs);
document.getElementById('statusFilter').addEventListener('change', filterLabs);

// Initialize
checkAuth().then(authenticated => {
    if (authenticated) {
        loadLabs();
    }
});
