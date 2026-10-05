# CyberPro Evidence-Based Scoring Methodology

**Project**: CyberPro: Scenario-Driven Cyber Range  
**Document**: Objective Scoring Specification  
**Version**: 2.0  

---

## 1. Principles of Objective Evaluation

Traditional cyber training environments typically utilize flags (e.g., `CTF{...}`) that only confirm whether an action succeeded, without capturing:
- *How* the learner detected the event.
- *When* the learner responded relative to incident onset.
- *What* evidence supported the learner's decision.

CyberPro implements deterministic, evidence-traceable evaluation. An objective can pass only when matching telemetry is scoped to the exercise and scenario, has the configured source and event type, contains a valid JSON object, passes each configured field check, and has a valid event ID. Student evidence must belong to the exercise owner; non-student evidence must not be attributed to a session user.

---

## 2. Mathematical Scoring Formulation

For any exercise session $E$ operating under scenario $S$ with $N$ objectives:

$$S_{\text{total}} = \sum_{i=1}^{N} s_i$$

Where individual objective score $s_i$ is determined by deterministic predicate $P_i$ evaluated over the telemetry event set $T_E$:

$$s_i = \begin{cases} 
	ext{Points}_i & \text{if } P_i(T_E) = \text{true and at least one evidence event ID is retained} \\
0 & \text{if } P_i(T_E) = \text{false}
\end{cases}$$

### Pass / Fail Condition
An exercise is marked as **PASSED** if and only if:
1. `total_score >= success_conditions.min_score`.
2. The number of evidence-backed passed required objectives is at least `success_conditions.min_objectives_required_passed`.

Both settings are read from the scenario manifest's `success_conditions` object (or the database field when populated). There are no hardcoded score or objective-count defaults. For PLC-001, the configured values are 75 points and 3 required objectives. Objectives 1-3 are marked required; objective 4 is optional. A failed required objective does not independently override these two configured gates.

---

## 3. Evidence Binding Architecture

Whenever `ObjectiveEngine` evaluates an objective, it extracts and records the primary keys (`id`) of every telemetry event that satisfied the rule:

```
┌───────────────────────────────┐
│     telemetry_events          │
│ id: "5a2e...-ids-alert"       │
│ event_type: "modbus_anomaly"  │
│ dst_port: 502                 │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│     objective_results         │
│ objective_id: "PLC-001-OBJ-1" │
│ status: "pass"                │
│ score: 25                     │
│ evidence_event_ids:           │
│   ["5a2e...-ids-alert"]       │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│      exercise_scores          │
│ total_score: 75               │
│ passed: 1                     │
│ scored_at: "2026-09-17..."    │
└───────────────────────────────┘
```

The score response's `objective_breakdown` exposes `objective_id`, `status`, `points_earned`, `points_possible`, `evidence_count`, and `evidence_event_ids` for every objective. The scorer derives awarded points from the configured objective points only when status is pass and at least one valid event ID is present. IDs are deduplicated before counting and returned. The SQLite lifecycle test verifies persisted `objective_results.evidence_event_ids` and excludes wrong-exercise, wrong-scenario, wrong-owner, and spoofed-source rows.

### Traceability Guarantee
Any instructor, auditor, or academic researcher can answer the question:
> *"Why did this student receive points for Objective 1?"*

By running:
```sql
SELECT o.objective_id, o.status, o.score, t.id, t.event_type, t.timestamp, t.data
FROM objective_results o
JOIN json_each(o.evidence_event_ids) evidence ON evidence.value = t.id
JOIN telemetry_events t ON t.id = evidence.value
WHERE o.exercise_id = 'target-exercise-id';
```

---

## 4. Reflective Debriefing Dimension

To reinforce experiential learning (Kolb's Experiential Learning Cycle), students complete a structured 6-point reflective debriefing prior to receiving their After-Action Report (AAR):

1. **Detection**: What specific anomaly or indicator was first observed?
2. **Evidence**: Which logs, packet captures, or alerts confirmed the attack?
3. **Action**: What defensive or containment steps were implemented?
4. **Difficulty**: What challenges or operational ambiguities were encountered?
5. **Alternative**: What would you execute differently in a production setting?
6. **Insight**: What key industrial cybersecurity principle was reinforced?

Debrief responses are persisted in `debrief_responses` and correlated with the final AAR.

## 5. Auditable Score Trace and Replay

Each persisted `objective_results` row now retains `evidence_event_ids`, `validation_details`, and `evaluated_at`. The validation details include the objective rule, candidate event count, accepted event IDs, and rejected event IDs with validation reasons. The score response and persisted `exercise_scores.score_trace` carry:

- Exercise ID and scenario ID.
- Each objective ID, status, awarded score, evidence IDs, validation details, and evaluation timestamp.
- Total and maximum score, configured pass threshold, minimum required objectives, and final `PASS`/`FAIL` decision.
- Scenario rule version and SHA-256 fingerprint covering the scenario version, success conditions, objective points/required flags, and detection rules.

`GET /api/reports/:exerciseId/replay` checks the caller's exercise ownership, reruns the Objective Engine against retained telemetry without writing results, and compares the replay to the persisted objective rows and original score. The comparison ignores evaluation timestamps and event ordering, but compares status, score, evidence IDs, validation trace, final score gates/decision, and rule version/hash. A changed version is reported as inconsistent even if its numeric score happens to remain equal.

Replay validates deterministic software/control-plane behavior only. It is not a replay or measure of learner performance. The current regression suite uses synthetic retained events in in-memory SQLite; it does not establish broader production or research validity.
