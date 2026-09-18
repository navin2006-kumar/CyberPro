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

CyberPro eliminates heuristic and subjective grading by implementing **deterministic, evidence-traceable evaluation**. Every score is directly tied to immutable telemetry events logged during the exercise session.

---

## 2. Mathematical Scoring Formulation

For any exercise session $E$ operating under scenario $S$ with $N$ objectives:

$$S_{\text{total}} = \sum_{i=1}^{N} s_i$$

Where individual objective score $s_i$ is determined by deterministic predicate $P_i$ evaluated over the telemetry event set $T_E$:

$$s_i = \begin{cases} 
\text{Points}_i & \text{if } P_i(T_E) = \text{true} \\
0 & \text{if } P_i(T_E) = \text{false}
\end{cases}$$

### Pass / Fail Condition
An exercise is marked as **PASSED** if and only if:
1. Total score meets or exceeds the scenario threshold:
$$S_{\text{total}} \ge S_{\text{threshold}} \quad (\text{Default: } 75)$$
2. **All** required objectives are satisfied:
$$\forall i \in \{1 \dots N\}, \quad \text{Required}_i = \text{true} \implies s_i = \text{Points}_i$$

If a student accumulates 75 points but failed a mandatory objective (e.g. `PLC-001-OBJ-1`), the overall exercise state is marked **FAILED**, enforcing critical defensive standard compliance.

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

### Traceability Guarantee
Any instructor, auditor, or academic researcher can answer the question:
> *"Why did this student receive points for Objective 1?"*

By running:
```sql
SELECT o.objective_id, o.status, o.score, t.event_type, t.timestamp, t.data
FROM objective_results o
JOIN telemetry_events t ON instr(o.evidence_event_ids, t.id) > 0
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
