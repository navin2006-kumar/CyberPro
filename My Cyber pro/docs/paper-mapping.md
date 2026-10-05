# CyberPro Research Manuscript Traceability Matrix

**Project**: CyberPro: Scenario-Driven Cyber Range for Safe, Measurable Defensive Skills Practice  
**Project ID**: P-2024-28-CS-118  
**Manuscript**: *Scenario-Driven Cyber Range for Safe, Measurable Defensive Skills Practice – Developmental Manuscript*  
**Document**: Research Traceability Mapping  
**Version**: 2.0  

---

## 1. Executive Summary

This document establishes direct traceability between the theoretical constructs, requirements, and design specifications defined in the research manuscript and the practical software components implemented in the CyberPro codebase.

Every core concept in the developmental manuscript is substantiated by concrete source code, automated test suites, and empirical telemetry artifacts.

---

## 2. Manuscript Section to Codebase Mapping Matrix

| Manuscript Section & Theme | Core Academic Requirement | Implemented Components | Verification & Evidence |
|---|---|---|---|
| **Section 1: Introduction & Threat Landscape** | Need for realistic, safe ICS/OT training platforms addressing modern critical infrastructure vulnerabilities. | `labs/oilsprings/`: Multi-subnet industrial lab with OpenPLC, ScadaBR HMI, and Modbus/TCP protocol support. | Compose configuration parsing was verified during Phase 0; Docker Engine was unavailable, so container startup and port routing have not been verified. |
| **Section 2: Isolated Cyber Range Architecture** | Strict network isolation, defense against attack bleed-out, resource bounding. | `labs/oilsprings/docker-compose.yml`: 4 isolated bridge networks (`internal: true`), dropped root privileges (`cap_drop: ALL`), CPU/memory limits. | `tests/security/rbac-enforcement.test.js`, container security flags audit. |
| **Section 3: Scenario-Driven Workflow (PLC-001)** | Formal scenario definition, verifiable learning objectives, attack vectors, time limits. | `scenarios/PLC-001/scenario.json`: JSON manifest with 4 objectives (`PLC-001-OBJ-1` through `OBJ-4`), network topology, and success criteria. | `backend/routes/scenarios.js`, automated scenario loader. |
| **Section 4: Telemetry Capture & Event Processing** | Non-invasive, continuous logging of network anomalies and student actions into an immutable audit trail. | `labs/oilsprings/ids/monitor.py` (Scapy/sniffing), `collector/collector.py` (JSONL persistence), `backend/routes/telemetry.js` (`telemetry_events` table). | Structured JSON telemetry schema with foreign key binding to active `exercise_id`. |
| **Section 5: Evidence-Based Objective Scoring** | Deterministic, transparent scoring tied directly to telemetry evidence; elimination of CTF-style guessing. | `backend/engines/objectiveEngine.js`: exercise/scenario/source/event/owner scoping, strict payload checks, evidence ID retention.<br>`backend/engines/scoringEngine.js`: awards points only for evidence-backed objective passes and applies manifest-configured score and required-objective thresholds. | `tests/unit/objectiveEngine.test.js` (13 passed), `tests/unit/scoringEngine.test.js` (11 passed), and `tests/integration/scenario-flow.test.js` (SQLite evidence-scope and persistence checks passed). |
| **Section 6: Clean State Reset & Teardown** | Automated environment restoration to ensure experimental reproducibility across trials. | `backend/engines/resetEngine.js`: Container recreation (`down -v` / `up -d`), HTTP health checks (`200 OK`), audit log in `reset_records`. | Integration test Step 9 verifies reset-record behavior only; live container recreation and health checks remain unverified because Docker Engine was unavailable. |
| **Section 7: Reflective Debriefing & AAR** | Cognitive reinforcement through structured post-exercise reflection (Kolb's Experiential Learning Cycle). | `backend/routes/reports.js`: 6-dimension debriefing submission (`q_detected`, `q_evidence`, `q_action`, etc.), After-Action Report generation. | `debrief_responses` table, `GET /api/reports/:id/aar` API endpoint. |
| **Section 8: Visual Timeline Synthesis** | Chronological timeline generated strictly from audit events without manual modification. | `backend/engines/timelineEngine.js`: Generates event sequence with relative offsets ($\Delta t$) and severity indicators. | `tests/unit/timelineEngine.test.js` (5/5 passed). |
| **Section 9: Security, RBAC & Governance** | Multi-tiered authorization, visitor denial, admin emergency killswitch. | `backend/middleware/auth.js` (`requireAuth`, `requireRole`), `POST /api/emergency-stop`, removal of plaintext credential logging. | `tests/security/rbac-enforcement.test.js` (9/9 passed). |
| **Section 10: Experimental Evaluation & Testing** | Automated verification of the tested software behavior. | `tests/run-all.js`: 7 automated suites; updated objective and scoring suites cover scoped evidence, malformed data, score boundaries, and evidence trace fields. | Record only command output in [testing.md](testing.md) and [improvement-log.md](improvement-log.md); the runner does not report an assertion total or guarantee complete application coverage. |
