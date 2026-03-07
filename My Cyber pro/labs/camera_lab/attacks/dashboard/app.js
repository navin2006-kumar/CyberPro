const TERM_PORT = 7683;
let currentMode = 'walkthrough'; // default mode

document.addEventListener('DOMContentLoaded', () => {
    // Set terminal iframe src using current hostname
    const iframe = document.getElementById('terminal-iframe');
    iframe.src = `http://${window.location.hostname}:${TERM_PORT}`;

    // Load saved mode preference
    const savedMode = localStorage.getItem('attackMode');
    if (savedMode) {
        setMode(savedMode);
    }

    // Poll status every 3 seconds
    setInterval(pollStatus, 3000);
    pollStatus();

    // Click-to-copy on code blocks
    document.querySelectorAll('.cmd code').forEach(el => {
        el.addEventListener('click', () => {
            navigator.clipboard.writeText(el.textContent).then(() => {
                toast('Copied to clipboard!', 'success');
            });
        });
    });
});

// --- Mode Toggle ---
function setMode(mode) {
    currentMode = mode;
    localStorage.setItem('attackMode', mode);

    // Update button states
    document.getElementById('mode-adventure').classList.toggle('active', mode === 'adventure');
    document.getElementById('mode-walkthrough').classList.toggle('active', mode === 'walkthrough');

    // Update body class for CSS
    if (mode === 'adventure') {
        document.body.classList.add('adventure-mode');
    } else {
        document.body.classList.remove('adventure-mode');
    }

    toast(`${mode === 'adventure' ? '🎯 Adventure' : '📖 Walkthrough'} mode activated`, 'success');
}

// --- Camera Feed ---
function showCameraFeed() {
    const feed = document.getElementById('camera-feed');
    const stream = document.getElementById('camera-stream');
    const diagramPanel = document.querySelector('.diagram-panel');

    stream.src = `/api/camera/stream?t=${Date.now()}`;
    feed.classList.add('show');
    diagramPanel.classList.add('feed-active');
}

function closeCameraFeed() {
    const feed = document.getElementById('camera-feed');
    const diagramPanel = document.querySelector('.diagram-panel');

    feed.classList.remove('show');
    diagramPanel.classList.remove('feed-active');
}

// --- Status polling ---
async function pollStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        updateDiagram(data);
    } catch (e) { }
}

function updateDiagram(s) {
    setNodeState('attacker', s.attacker ? 'active' : 'locked');
    setNodeState('fw1', s.fw1 ? 'breached' : 'locked');
    setNodeState('fw2', s.fw2 ? 'breached' : 'locked');
    setNodeState('camera', s.camera ? 'breached' : 'locked');

    setConn('conn-fw1', s.attacker);
    setConn('conn-fw2', s.fw1);
    setConn('conn-camera', s.fw2);

    // Mark steps done
    if (s.fw1) markStepDone(2);
    if (s.fw2) markStepDone(3);
    if (s.camera) {
        markStepDone(4);
        // Show camera feed when camera is breached
        showCameraFeed();
    }
}

function setNodeState(id, state) {
    const node = document.getElementById('node-' + id);
    if (!node) return;
    node.className = 'node ' + state;
    const badge = node.querySelector('.node-badge');
    if (badge) {
        badge.textContent = state === 'active' ? 'ACTIVE' : state === 'breached' ? 'BREACHED' : 'LOCKED';
        badge.className = 'node-badge ' + state;
    }
}

function setConn(id, active) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', active);
}

function markStepDone(num) {
    const steps = document.querySelectorAll('.step');
    if (steps[num - 1]) {
        steps[num - 1].classList.add('done');
        const btn = steps[num - 1].querySelector('.vbtn');
        if (btn) { btn.textContent = '✓ VERIFIED'; btn.classList.add('ok'); btn.disabled = true; }
    }
}

// --- Toggle step expand/collapse ---
function toggleStep(header) {
    const body = header.nextElementSibling;
    header.classList.toggle('open');
    body.classList.toggle('open');
}

// --- Verify breach ---
async function verify(target) {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = 'CHECKING...';
    try {
        const res = await fetch(`/api/verify/${target}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            btn.textContent = '✓ VERIFIED';
            btn.classList.add('ok');
            toast(data.message, 'success');
            pollStatus();
        } else {
            btn.textContent = '⚡ RETRY';
            btn.disabled = false;
            toast(data.message, 'fail');
        }
    } catch (e) {
        btn.textContent = '⚡ RETRY';
        btn.disabled = false;
        toast('Connection error', 'fail');
    }
}

// --- Manual mark complete ---
async function markDone(target) {
    await fetch(`/api/mark/${target}`, { method: 'POST' });
    toast(`${target.toUpperCase()} marked as breached!`, 'success');
    pollStatus();
}

// --- Reset progress ---
async function resetProgress() {
    await fetch('/api/reset', { method: 'POST' });
    document.querySelectorAll('.vbtn').forEach(b => { b.textContent = '⚡ VERIFY'; b.classList.remove('ok'); b.disabled = false; });
    document.querySelectorAll('.step').forEach(s => s.classList.remove('done'));
    closeCameraFeed();
    toast('Progress reset', 'success');
    pollStatus();
}

// --- Toast notification ---
function toast(msg, type) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + type;
    setTimeout(() => { el.className = 'toast'; }, 2500);
}
