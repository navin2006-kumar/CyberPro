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
| **Section 2: Network Containment Architecture** | Segmented network design and tested defense against unintended cross-network/egress paths. | `labs/oilsprings/docker-compose.yml`: 4 bridge networks, with only SCADA/security marked `internal`; a router joins all four. | Static review found stale `192.168.x` routes/rules, an any-to-any ACCEPT JSON rule, non-internal pentest/L2 bridges, and host port mappings. All six runtime tests are NOT TESTED because Docker Engine was unavailable; see `results/network-containment.json`. No full-isolation claim is supported. |
| **Section 3: Scenario-Driven Workflow (PLC-001)** | Formal scenario definition, verifiable learning objectives, attack vectors, time limits. | `scenarios/PLC-001/scenario.json`: JSON manifest with 4 objectives (`PLC-001-OBJ-1` through `OBJ-4`), network topology, and success criteria. | `backend/routes/scenarios.js`, automated scenario loader. |
| **Section 4: Telemetry Capture & Event Processing** | Non-invasive, continuous logging of network anomalies and student actions into an immutable audit trail. | `labs/oilsprings/ids/monitor.py` (Scapy/sniffing), `collector/collector.py` (JSONL persistence), `backend/routes/telemetry.js` (`telemetry_events` table). | Structured JSON telemetry schema with foreign key binding to active `exercise_id`. |
| **Section 5: Evidence-Based Objective Scoring and Replay** | Deterministic score components auditable back to retained telemetry, with repeatable control-plane evaluation under unchanged rules. | `backend/engines/objectiveEngine.js`: scoped validation details, accepted/rejected event trace, evidence IDs, evaluation timestamp.<br>`backend/engines/scoringEngine.js`: persisted score trace and rule fingerprint; read-only replay comparison exposed at `GET /api/reports/:exerciseId/replay`. | `tests/unit/replayEngine.test.js`: 7/7 synthetic SQLite replay cases, covering exact replay, missing/changed/duplicate/invalid evidence, timestamp reorder, and changed rule version. Software/control-plane verification only; not learner performance. |
| **Section 6: Clean State Reset & Teardown** | Automated environment restoration to ensure experimental reproducibility across trials. | `backend/engines/resetEngine.js`: Captures pre-exercise container/image/network/volume/config/file-probe baseline; recreates Compose resources; compares expected state and writes `results/reset-verification.json`; requires configured health checks. | `tests/unit/resetEngine.test.js`: 6/6 MOCKED RESET TEST cases, including residue/config drift and unhealthy service rejection. REAL DOCKER RESET TEST: NOT EXECUTED because Docker Engine was unavailable; no real clean-state claim is made. |
| **Section 7: Reflective Debriefing & AAR** | Cognitive reinforcement through structured post-exercise reflection (Kolb's Experiential Learning Cycle). | `backend/routes/reports.js`: 6-dimension debriefing submission (`q_detected`, `q_evidence`, `q_action`, etc.), After-Action Report generation. | `debrief_responses` table, `GET /api/reports/:id/aar` API endpoint. |
| **Section 8: Visual Timeline Synthesis** | Chronological timeline generated strictly from audit events without manual modification. | `backend/engines/timelineEngine.js`: Generates event sequence with relative offsets ($\Delta t$) and severity indicators. | `tests/unit/timelineEngine.test.js` (5/5 passed). |
| **Section 9: Security, RBAC & Governance** | Multi-tiered authorization, visitor denial, admin emergency killswitch. | `backend/middleware/auth.js` (`requireAuth`, `requireRole`), `POST /api/emergency-stop`, removal of plaintext credential logging. | `tests/security/rbac-enforcement.test.js` (9/9 passed). |
| **Section 10: Experimental Evaluation & Testing** | Automated verification of the tested software behavior. | `tests/run-all.js`: includes evidence admission, mocked reset verification, and retained-event score replay suites. | Replay tests verify deterministic control-plane behavior on synthetic data; they do not measure learner performance, verify a live lab, or guarantee complete application coverage. See [testing.md](testing.md) and [improvement-log.md](improvement-log.md). |
