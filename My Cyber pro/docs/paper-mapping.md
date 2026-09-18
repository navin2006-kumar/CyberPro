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
| **Section 1: Introduction & Threat Landscape** | Need for realistic, safe ICS/OT training platforms addressing modern critical infrastructure vulnerabilities. | `labs/oilsprings/`: Multi-subnet industrial lab with OpenPLC, ScadaBR HMI, and Modbus/TCP protocol support. | `docker compose up` successfully spins up emulated ICS environment; automated port routing verified. |
| **Section 2: Isolated Cyber Range Architecture** | Strict network isolation, defense against attack bleed-out, resource bounding. | `labs/oilsprings/docker-compose.yml`: 4 isolated bridge networks (`internal: true`), dropped root privileges (`cap_drop: ALL`), CPU/memory limits. | `tests/security/rbac-enforcement.test.js`, container security flags audit. |
| **Section 3: Scenario-Driven Workflow (PLC-001)** | Formal scenario definition, verifiable learning objectives, attack vectors, time limits. | `scenarios/PLC-001/scenario.json`: JSON manifest with 4 objectives (`PLC-001-OBJ-1` through `OBJ-4`), network topology, and success criteria. | `backend/routes/scenarios.js`, automated scenario loader. |
| **Section 4: Telemetry Capture & Event Processing** | Non-invasive, continuous logging of network anomalies and student actions into an immutable audit trail. | `labs/oilsprings/ids/monitor.py` (Scapy/sniffing), `collector/collector.py` (JSONL persistence), `backend/routes/telemetry.js` (`telemetry_events` table). | Structured JSON telemetry schema with foreign key binding to active `exercise_id`. |
| **Section 5: Evidence-Based Objective Scoring** | Deterministic, transparent scoring tied directly to telemetry evidence; elimination of CTF-style guessing. | `backend/engines/objectiveEngine.js`: Rule predicates matching telemetry.<br>`backend/engines/scoringEngine.js`: Evidence-bound score aggregation. | `tests/unit/objectiveEngine.test.js` (8/8 passed), `tests/unit/scoringEngine.test.js` (6/6 passed). |
| **Section 6: Clean State Reset & Teardown** | Automated environment restoration to ensure experimental reproducibility across trials. | `backend/engines/resetEngine.js`: Container recreation (`down -v` / `up -d`), HTTP health checks (`200 OK`), audit log in `reset_records`. | `tests/integration/scenario-flow.test.js` (Step 9 verified). |
| **Section 7: Reflective Debriefing & AAR** | Cognitive reinforcement through structured post-exercise reflection (Kolb's Experiential Learning Cycle). | `backend/routes/reports.js`: 6-dimension debriefing submission (`q_detected`, `q_evidence`, `q_action`, etc.), After-Action Report generation. | `debrief_responses` table, `GET /api/reports/:id/aar` API endpoint. |
| **Section 8: Visual Timeline Synthesis** | Chronological timeline generated strictly from audit events without manual modification. | `backend/engines/timelineEngine.js`: Generates event sequence with relative offsets ($\Delta t$) and severity indicators. | `tests/unit/timelineEngine.test.js` (5/5 passed). |
| **Section 9: Security, RBAC & Governance** | Multi-tiered authorization, visitor denial, admin emergency killswitch. | `backend/middleware/auth.js` (`requireAuth`, `requireRole`), `POST /api/emergency-stop`, removal of plaintext credential logging. | `tests/security/rbac-enforcement.test.js` (9/9 passed). |
| **Section 10: Experimental Evaluation & Testing** | Comprehensive automated verification proving software correctness and reliability. | `tests/run-all.js`: 7 automated test suites spanning 45+ assertions. | `npm test` runs all 7 test suites with 0 failures in $<15$ seconds. |
