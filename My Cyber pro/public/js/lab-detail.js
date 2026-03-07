// Lab Detail JavaScript

let labId = null;
let labData = null;
let statusCheckInterval = null;

// Get lab ID from URL
function getLabId() {
    const params = new URLSearchParams(window.location.search);
    return parseInt(params.get('id'));
}

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();

        if (!data.success) {
            window.location.href = '/';
            return false;
        }
        return true;
    } catch (error) {
        window.location.href = '/';
        return false;
    }
}

// Load lab details
async function loadLabDetails() {
    try {
        const response = await fetch(`/api/labs/${labId}`);
        const data = await response.json();

        if (data.success) {
            labData = data.lab;
            displayLabInfo();
            updateLabStatus();
            startStatusPolling();
        } else {
            alert('Lab not found');
            window.location.href = '/labs.html';
        }
    } catch (error) {
        console.error('Error loading lab:', error);
    }
}

// Display lab information
function displayLabInfo() {
    document.getElementById('labName').textContent = labData.name;
    document.getElementById('labDifficulty').textContent = labData.difficulty.toUpperCase();
    document.getElementById('labDifficulty').className = `difficulty-badge ${labData.difficulty}`;
    document.getElementById('labCategory').textContent = labData.category;
    document.getElementById('labDescription').textContent = labData.description;
    document.getElementById('labTime').textContent = `${labData.estimated_time || 60} minutes`;

    // Learning objectives
    const objectives = labData.learning_objectives || [];
    const objectivesList = document.getElementById('labObjectives');
    if (objectives.length > 0) {
        objectivesList.innerHTML = objectives.map(obj => `<li>${obj}</li>`).join('');
    } else {
        objectivesList.innerHTML = '<li>Hands-on practice with real environments</li>';
    }

    // Services
    displayServices();
}

// Display services
function displayServices() {
    const servicesList = document.getElementById('servicesList');
    const services = labData.services || [];
    const isRunning = labData.status === 'running';

    if (services.length > 0) {
        servicesList.innerHTML = services.map(service => `
            <div class="service-item">
                <div>
                    <div class="service-name">${service.name}</div>
                    <div class="service-port">Port: ${service.port}</div>
                </div>
                <a href="#" class="service-link" data-url="${service.url}" data-running="${isRunning}">Open &rarr;</a>
            </div>
        `).join('');

        // Attach click handlers via event delegation
        servicesList.querySelectorAll('.service-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                if (link.dataset.running === 'true') {
                    window.open(link.dataset.url, '_blank');
                } else {
                    alert('Lab is not running. Click "Start Lab" and wait a few seconds for the containers to start.');
                }
            });
        });
    } else {
        servicesList.innerHTML = '<p style="color: #888;">No services configured</p>';
    }
}


// Update lab status
async function updateLabStatus() {
    try {
        const response = await fetch(`/api/labs/${labId}/status`);
        const data = await response.json();

        if (data.success) {
            const status = data.status;
            const statusIndicator = document.getElementById('labStatus');

            statusIndicator.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            statusIndicator.className = `status-indicator ${status}`;

            // Update buttons
            if (status === 'running') {
                document.getElementById('startBtn').style.display = 'none';
                document.getElementById('stopBtn').style.display = 'block';
                document.getElementById('loadingIndicator').style.display = 'none';
            } else if (status === 'starting') {
                document.getElementById('startBtn').style.display = 'none';
                document.getElementById('stopBtn').style.display = 'none';
                document.getElementById('loadingIndicator').style.display = 'block';
            } else {
                document.getElementById('startBtn').style.display = 'block';
                document.getElementById('stopBtn').style.display = 'none';
                document.getElementById('loadingIndicator').style.display = 'none';
            }

            // Update resources
            if (data.resources) {
                document.getElementById('cpuUsage').textContent = data.resources.cpu || '--';
                document.getElementById('memoryUsage').textContent = data.resources.memory || '--';
                document.getElementById('containerCount').textContent = data.resources.containers || '--';
            }

            // Update service links
            labData.status = status;
            displayServices();
        }
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

// Start lab
async function startLab() {
    const startBtn = document.getElementById('startBtn');
    startBtn.disabled = true;

    try {
        const response = await fetch(`/api/labs/${labId}/start`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            document.getElementById('loadingIndicator').style.display = 'block';
            document.getElementById('startBtn').style.display = 'none';

            // Auto-open services in new tabs (Labshock-style)
            if (data.autoOpen && data.services && data.services.length > 0) {
                console.log('Auto-opening services:', data.services);

                // Show notification
                showNotification(`Opening ${data.services.length} service tab(s)...`, 'info');

                // Wait a bit for containers to fully start
                setTimeout(() => {
                    let blockedCount = 0;

                    data.services.forEach((service, index) => {
                        // Stagger the opening slightly to avoid browser blocking
                        setTimeout(() => {
                            console.log(`Opening service: ${service.name} at ${service.url}`);
                            const newWindow = window.open(service.url, `_blank_${service.name.replace(/\s+/g, '_')}`);

                            // Check if pop-up was blocked
                            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                                blockedCount++;
                                console.warn(`Pop-up blocked for ${service.name}`);
                            }
                        }, index * 300); // 300ms delay between each tab
                    });

                    // Check if any were blocked and show message
                    setTimeout(() => {
                        if (blockedCount > 0) {
                            showNotification('Some tabs were blocked by your browser. Please allow pop-ups and use the "Open" buttons below.', 'warning');
                        } else {
                            showNotification(`Successfully opened ${data.services.length} service tab(s)!`, 'success');
                        }
                    }, (data.services.length * 300) + 500);
                }, 3000); // Wait 3 seconds for containers to initialize
            }

            // Poll for status
            setTimeout(() => updateLabStatus(), 2000);
        } else {
            alert(data.message || 'Failed to start lab');
            startBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error starting lab:', error);
        alert('Error starting lab');
        startBtn.disabled = false;
    }
}

// Show notification helper
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.lab-notification');
    if (existing) {
        existing.remove();
    }

    // Create notification
    const notification = document.createElement('div');
    notification.className = `lab-notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}


// Stop lab
async function stopLab() {
    if (!confirm('Are you sure you want to stop this lab?')) {
        return;
    }

    const stopBtn = document.getElementById('stopBtn');
    stopBtn.disabled = true;

    try {
        const response = await fetch(`/api/labs/${labId}/stop`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            updateLabStatus();
        } else {
            alert(data.message || 'Failed to stop lab');
        }
    } catch (error) {
        console.error('Error stopping lab:', error);
        alert('Error stopping lab');
    } finally {
        stopBtn.disabled = false;
    }
}

// Start status polling
function startStatusPolling() {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }

    statusCheckInterval = setInterval(() => {
        updateLabStatus();
    }, 5000); // Check every 5 seconds
}

// Event listeners
document.getElementById('startBtn').addEventListener('click', startLab);
document.getElementById('stopBtn').addEventListener('click', stopLab);
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
});

// Initialize
labId = getLabId();
if (!labId) {
    window.location.href = '/labs.html';
} else {
    checkAuth().then(authenticated => {
        if (authenticated) {
            loadLabDetails();
        }
    });
}
