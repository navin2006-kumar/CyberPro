'use strict';

const evidenceModel = window.CyberProEvidenceModel;
const refs = {
    username: document.getElementById('username'),
    form: document.getElementById('exercise-form'),
    input: document.getElementById('exercise-id'),
    loadButton: document.getElementById('load-exercise'),
    loadStatus: document.getElementById('load-status'),
    error: document.getElementById('dashboard-error'),
    scenarioId: document.getElementById('scenario-id'),
    scenarioName: document.getElementById('scenario-name'),
    exerciseId: document.getElementById('record-exercise-id'),
    exerciseStatus: document.getElementById('exercise-status'),
    finalResult: document.getElementById('final-result'),
    scoreTotal: document.getElementById('score-total'),
    scoreMaximum: document.getElementById('score-maximum'),
    scoreThreshold: document.getElementById('score-threshold'),
    requiredObjectives: document.getElementById('required-objectives'),
    objectivesPassed: document.getElementById('objectives-passed'),
    objectiveCount: document.getElementById('objective-count'),
    objectiveList: document.getElementById('objective-list'),
    selectedObjective: document.getElementById('selected-objective'),
    evidenceRows: document.getElementById('evidence-rows'),
    timelineCount: document.getElementById('timeline-count'),
    timelineList: document.getElementById('timeline-list'),
    resetResult: document.getElementById('reset-result'),
    resetRequested: document.getElementById('reset-requested'),
    resetStatus: document.getElementById('reset-status'),
    resetClean: document.getElementById('reset-clean'),
    resetFailure: document.getElementById('reset-failure'),
    healthChecks: document.getElementById('health-checks'),
    residueChecks: document.getElementById('residue-checks')
};

let currentModel = null;

function displayValue(value) {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
}

function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
}

function replaceWithMessage(container, message, className = 'empty-row') {
    container.replaceChildren(makeElement('li', className, message));
}

async function fetchJson(url) {
    const response = await fetch(url, { credentials: 'same-origin' });
    const payload = await response.json();
    if (!response.ok || payload.success === false) {
        throw new Error(payload.message || `Request failed (${response.status})`);
    }
    return payload;
}

function setResultBadge(element, value) {
    element.textContent = displayValue(value);
    element.dataset.result = value === null || value === undefined ? '' : String(value).toLowerCase();
}

function renderObjectives(model) {
    refs.objectiveCount.textContent = String(model.objectives.length);
    refs.objectiveList.replaceChildren();

    if (model.objectives.length === 0) {
        refs.objectiveList.append(makeElement('p', 'empty-row', 'No objective results were returned.'));
        renderEvidence(null);
        return;
    }

    for (const objective of model.objectives) {
        const id = objective.objective_id || objective.id;
        const button = makeElement('button', 'objective-row');
        button.type = 'button';
        button.dataset.objectiveId = id;
        button.setAttribute('aria-pressed', 'false');
        button.append(
            makeElement('span', 'objective-id', id),
            makeElement('span', 'objective-name', objective.name),
            makeElement('span', 'objective-meta')
        );
        const meta = button.lastElementChild;
        const status = makeElement('strong', 'objective-status', objective.status);
        status.dataset.status = String(objective.status || '').toLowerCase();
        meta.append(status);
        meta.append(makeElement('span', '', `${displayValue(objective.points_earned)} / ${displayValue(objective.points_possible)} pts`));
        meta.append(makeElement('span', '', `${displayValue(objective.evidence_count)} events`));
        button.addEventListener('click', () => selectObjective(id));
        refs.objectiveList.append(button);
    }

    selectObjective(model.objectives[0].objective_id || model.objectives[0].id);
}

function selectObjective(objectiveId) {
    if (!currentModel) return;
    refs.objectiveList.querySelectorAll('.objective-row').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.objectiveId === objectiveId));
    });
    renderEvidence(objectiveId);
}

function renderEvidence(objectiveId) {
    refs.evidenceRows.replaceChildren();
    refs.selectedObjective.textContent = displayValue(objectiveId);
    if (!currentModel || !objectiveId) {
        const row = makeElement('tr');
        row.append(makeElement('td', 'empty-row', 'Select an objective to inspect its evidence.'));
        row.firstElementChild.colSpan = 6;
        refs.evidenceRows.append(row);
        return;
    }

    const evidence = evidenceModel.getObjectiveEvidence(currentModel, objectiveId);
    if (evidence.length === 0) {
        const row = makeElement('tr');
        const cell = makeElement('td', 'empty-row', 'No evidence events are recorded for this objective.');
        cell.colSpan = 6;
        row.append(cell);
        refs.evidenceRows.append(row);
        return;
    }

    for (const item of evidence) {
        const row = makeElement('tr');
        const eventId = makeElement('td');
        eventId.append(makeElement('code', '', item.eventId));
        const fields = item.relevantFields === null ? 'Event details unavailable' :
            JSON.stringify(item.relevantFields, null, 2);
        const validation = makeElement('td', item.validationResult.startsWith('accepted')
            ? 'validation-good' : 'validation-bad', item.validationResult);
        row.append(
            eventId,
            makeElement('td', '', item.eventType),
            makeElement('td', '', item.source),
            makeElement('td', '', item.timestamp),
            makeElement('td', 'field-cell', fields),
            validation
        );
        refs.evidenceRows.append(row);
    }
}

function renderTimeline(entries) {
    refs.timelineCount.textContent = String(entries.length);
    refs.timelineList.replaceChildren();
    if (entries.length === 0) {
        replaceWithMessage(refs.timelineList, 'No timeline events were returned.');
        return;
    }

    for (const entry of entries) {
        const item = makeElement('li', 'timeline-item');
        item.append(
            makeElement('time', 'timeline-time', entry.timestamp),
            makeElement('span', 'timeline-description', entry.description || entry.event_type),
            makeElement('span', 'timeline-source', `${displayValue(entry.source)} / ${displayValue(entry.event_type)}`)
        );
        refs.timelineList.append(item);
    }
}

function renderKeyValueList(container, values, emptyMessage) {
    container.replaceChildren();
    const entries = Object.entries(values || {});
    if (entries.length === 0) {
        replaceWithMessage(container, emptyMessage);
        return;
    }
    for (const [key, value] of entries) {
        container.append(makeElement('li', '', `${key}: ${JSON.stringify(value)}`));
    }
}

function renderReset(reset) {
    if (!reset) {
        setResultBadge(refs.resetResult, null);
        refs.resetRequested.textContent = '—';
        refs.resetStatus.textContent = '—';
        refs.resetClean.textContent = '—';
        refs.resetFailure.textContent = '—';
        replaceWithMessage(refs.healthChecks, 'No reset record was returned.');
        replaceWithMessage(refs.residueChecks, 'No reset record was returned.');
        return;
    }

    const resultLabel = reset.clean_state_verified
        ? `${displayValue(reset.status)} / verified`
        : `${displayValue(reset.status)} / not verified`;
    setResultBadge(refs.resetResult, reset.status);
    refs.resetResult.textContent = resultLabel;
    refs.resetRequested.textContent = displayValue(reset.start_time);
    refs.resetStatus.textContent = displayValue(reset.status);
    refs.resetClean.textContent = displayValue(reset.clean_state_verified);
    refs.resetFailure.textContent = displayValue(reset.failure_reason);

    const details = reset.health_check_result || {};
    renderKeyValueList(refs.healthChecks, details.health_checks, 'No health-check details were recorded.');
    const residue = [
        ...(details.differences || []),
        ...(details.residual_artifacts || [])
    ];
    renderKeyValueList(refs.residueChecks,
        Object.fromEntries(residue.map((item, index) => [`${index + 1}`, item])),
        'No residue details were recorded.');
}

function renderDashboard(model, exerciseRecord) {
    currentModel = model;
    refs.scenarioId.textContent = displayValue(model.scenarioId);
    refs.scenarioName.textContent = displayValue(model.scenarioName);
    refs.exerciseId.textContent = displayValue(model.exerciseId);
    refs.exerciseStatus.textContent = displayValue(exerciseRecord.status);
    refs.scoreTotal.textContent = displayValue(model.score.total);
    refs.scoreMaximum.textContent = displayValue(model.score.maximum);
    refs.scoreThreshold.textContent = displayValue(model.score.passThreshold);
    refs.requiredObjectives.textContent = displayValue(model.score.minimumRequiredObjectives);
    refs.objectivesPassed.textContent = displayValue(model.score.objectivesPassed);
    setResultBadge(refs.finalResult, model.score.finalDecision);
    renderObjectives(model);
    renderTimeline(model.timeline);
    renderReset(model.reset);
}

async function loadExercise(exerciseId) {
    const encodedId = encodeURIComponent(exerciseId);
    refs.loadButton.disabled = true;
    refs.loadStatus.textContent = 'Loading record';
    refs.error.hidden = true;

    try {
        const exercise = await fetchJson(`/api/exercises/${encodedId}`);
        const scenarioId = exercise.exercise.scenario_id;
        const [score, timeline, telemetry, scenario] = await Promise.all([
            fetchJson(`/api/reports/${encodedId}/score`),
            fetchJson(`/api/reports/${encodedId}/timeline`),
            fetchJson(`/api/telemetry/events/${encodedId}`),
            fetchJson(`/api/scenarios/${encodeURIComponent(scenarioId)}`)
        ]);
        const model = evidenceModel.buildDashboardModel({ score, timeline, telemetry, exercise, scenario });
        renderDashboard(model, exercise.exercise);
        refs.input.value = exerciseId;
        refs.loadStatus.textContent = 'Record loaded';
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('exercise', exerciseId);
        window.history.replaceState({}, '', currentUrl);
    } catch (error) {
        refs.loadStatus.textContent = 'Load failed';
        refs.error.textContent = error.message;
        refs.error.hidden = false;
    } finally {
        refs.loadButton.disabled = false;
    }
}

async function initialize() {
    try {
        const session = await fetchJson('/api/auth/session');
        refs.username.textContent = session.user.username;
    } catch {
        window.location.href = '/';
        return;
    }

    refs.form.addEventListener('submit', event => {
        event.preventDefault();
        const exerciseId = refs.input.value.trim();
        if (exerciseId) loadExercise(exerciseId);
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        } finally {
            window.location.href = '/';
        }
    });

    const requestedExercise = new URL(window.location.href).searchParams.get('exercise');
    if (requestedExercise) {
        refs.input.value = requestedExercise;
        await loadExercise(requestedExercise);
    }
}

initialize();
