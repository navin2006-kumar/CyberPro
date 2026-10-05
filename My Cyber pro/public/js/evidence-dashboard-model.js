'use strict';

(function (root, factory) {
    const model = factory();
    if (typeof module === 'object' && module.exports) module.exports = model;
    else root.CyberProEvidenceModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function buildDashboardModel({ score, timeline, telemetry, exercise, scenario }) {
        const exerciseRecord = exercise?.exercise || {};
        const scenarioRecord = scenario?.scenario || {};
        const objectiveTrace = new Map((score.objective_results || []).map(result =>
            [result.objective_id, result]));

        return {
            exerciseId: score.exercise_id || exerciseRecord.id || null,
            scenarioId: score.scenario_id || exerciseRecord.scenario_id || scenarioRecord.id || null,
            scenarioName: scenarioRecord.name || null,
            objectives: (score.objective_breakdown || []).map(objective => ({
                ...objective,
                trace: objectiveTrace.get(objective.objective_id || objective.id) || null
            })),
            score: {
                total: score.total_score,
                maximum: score.max_score,
                passThreshold: score.pass_threshold,
                minimumRequiredObjectives: score.minimum_required_objectives,
                objectivesPassed: score.objectives_passed,
                requiredObjectivesPassed: score.required_objectives_passed,
                finalDecision: score.final_decision
            },
            timeline: timeline?.entries || [],
            telemetryEvents: telemetry?.events || [],
            reset: exerciseRecord.reset_record || null
        };
    }

    function getObjectiveEvidence(model, objectiveId) {
        const objective = model.objectives.find(item =>
            (item.objective_id || item.id) === objectiveId);
        if (!objective) return [];

        const details = objective.trace?.validation_details || {};
        const acceptedIds = new Set(details.accepted_event_ids || objective.evidence_event_ids || []);
        const rejected = new Map((details.rejected_events || []).map(item =>
            [item.event_id, item.reasons || []]));
        const ids = new Set([
            ...(objective.evidence_event_ids || []),
            ...acceptedIds,
            ...rejected.keys()
        ]);
        const events = new Map(model.telemetryEvents.map(event => [event.id, event]));

        return [...ids].sort().map(id => {
            const event = events.get(id);
            const rejectionReasons = rejected.get(id);
            let validationResult = 'not listed in validation trace';
            if (acceptedIds.has(id)) validationResult = 'accepted';
            else if (rejectionReasons) validationResult = `rejected: ${rejectionReasons.join(', ')}`;

            return {
                eventId: id,
                eventType: event?.event_type || null,
                source: event?.source || null,
                timestamp: event?.timestamp || null,
                relevantFields: event?.data ?? null,
                validationResult
            };
        });
    }

    return { buildDashboardModel, getObjectiveEvidence };
});