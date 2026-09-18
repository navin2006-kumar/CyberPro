# CyberPro Architecture Specification

**Project**: CyberPro: Scenario-Driven Cyber Range for Safe, Measurable Defensive Skills Practice  
**Project ID**: P-2024-28-CS-118  
**Theme**: Industrial Control Systems (ICS) & Operational Technology (OT) Cyber Range  
**Document Version**: 2.0  

---

## 1. System Overview

CyberPro is an isolated, container-based cyber range architected to provide safe, reproducible, and verifiable cybersecurity training and defensive skill evaluation. The platform bridges realistic industrial process emulation with rigorous, evidence-traceable assessment.

Unlike traditional Capture-the-Flag (CTF) environments that reward binary flag extraction, CyberPro evaluates defensive competencies (detection, incident correlation, containment, and reflective debriefing) through automated telemetry analysis.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CyberPro Platform                                │
├──────────────────────────────────┬──────────────────────────────────────────┤
│        Frontend & Portal         │              Backend Core                │
│  - Web Portal (HTML5 / Vanilla)  │  - Express.js API Gateway (port 3000)    │
│  - WebSocket Telemetry Stream    │  - SQLite Engine (WAL mode, v2 schema)   │
│  - After-Action Report (AAR) UI  │  - Session & RBAC Auth Middleware        │
├──────────────────────────────────┴──────────────────────────────────────────┤
│                            Core Engines Layer                               │
│  ┌──────────────────────┐ ┌──────────────────────┐ ┌─────────────────────┐  │
│  │   Objective Engine   │ │    Scoring Engine    │ │   Timeline Engine   │  │
│  │ (Automated Evidence) │ │(Traceable Point Agg) │ │ (Telemetry Audit)   │  │
│  └──────────────────────┘ └──────────────────────┘ └─────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Reset Engine                                  │  │
│  │           (Container Teardown + Health Audit Verification)            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│               Emulated OT Target System (OilSprings Lab)                    │
│  ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────────────┐  │
│  │ OpenPLC Modbus  │   │ ScadaBR HMI      │   │ Suricata/Scapy IDS       │  │
│  │ 10.10.2.10:502  │   │ 10.10.3.20:8080  │   │ 10.10.4.41 (Net-Sniff)   │  │
│  └─────────────────┘   └──────────────────┘   └──────────────────────────┘  │
│  ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────────────┐  │
│  │ Pentest Station │   │ Log Collector    │   │ VyOS/Router Bridge       │  │
│  │ 10.10.5.50      │   │ 10.10.4.40:5000  │   │ Layer 2/3 Segmentation   │  │
│  └─────────────────┘   └──────────────────┘   └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Multi-Tiered Network Topology

The industrial cyber range enforces strict Layer 2 and Layer 3 isolation across four distinct bridge networks using Docker networking. No internal OT network possesses direct public internet routing.

| Network Name | Subnet | Isolation | Purpose | Connected Containers |
|---|---|---|---|---|
| `l2_network` | `10.10.2.0/24` | Internal / Controlled Port Map | Field control bus (Modbus/TCP) | `oilsprings_plc`, `oilsprings_router` |
| `l3_scada_network` | `10.10.3.0/24` | Fully Internal (`internal: true`) | Supervisory control and HMI | `oilsprings_scada`, `oilsprings_ews`, `oilsprings_router` |
| `l3_security_network` | `10.10.4.0/24` | Fully Internal (`internal: true`) | Out-of-band monitoring & logs | `oilsprings_ids`, `oilsprings_collector`, `oilsprings_router` |
| `l3_pentest_network` | `10.10.5.0/24` | Controlled Port Map | Adversary simulation origin | `oilsprings_pentest`, `oilsprings_router` |

### Network Access Control Rules
1. **Adversary Traffic Path**: The pentest container (`10.10.5.50`) must route across the emulated router to reach the PLC subnet.
2. **Monitoring Tap**: The IDS monitor taps traffic traversing the ICS bus without intercepting or altering payload state.
3. **Collector Backhaul**: The collector receives logs over the isolated `l3_security_network` and proxies security events to the CyberPro backend via structured JSON REST calls.

---

## 3. Core Analytical Engines

### 3.1 Objective Engine (`backend/engines/objectiveEngine.js`)
Evaluates student progression by executing deterministic rules against captured telemetry in `telemetry_events`.
- **Field Matching**: Checks protocol attributes (`dst_port`, `src_ip`, `event_type`, `severity`).
- **Submission Validation**: Assesses textual submissions for length and keywords (e.g. log analysis report minimum length of 50 chars).
- **Evidence Binding**: Every evaluation returns `evidence_event_ids`, an array of foreign keys directly linking the pass/fail state to immutable telemetry entries.

### 3.2 Scoring Engine (`backend/engines/scoringEngine.js`)
Aggregates objective outcomes into a transparent score:
$$\text{Score} = \sum_{i \in \text{Passed}} \text{Points}_i$$
- Pass criteria: Total score $\ge \text{Pass Threshold}$ (e.g., 75%) **AND** zero failed required objectives.
- Audit Trail: Returns full objective breakdown preserving every evidence event ID.

### 3.3 Timeline Engine (`backend/engines/timelineEngine.js`)
Generates an unforgeable chronology derived exclusively from the database audit log.
- Translates raw event parameters into human-readable tactical summaries.
- Computes relative exercise time ($\Delta t$) from exercise initiation ($t_0$).

### 3.4 Reset Engine (`backend/engines/resetEngine.js`)
Guarantees clean state reproducibility between exercises:
1. Stops and removes active container instances (`docker compose down -v`).
2. Recreates volumes and restarts services (`docker compose up -d`).
3. Executes HTTP health checks against all core endpoints (`PLC:8080`, `IDS:8084`, `Collector:8085`).
4. Verifies clean state and records audit log in `reset_records`.

---

## 4. Data Storage Architecture

CyberPro uses an optimized SQLite database (`data/labs.db`) with Foreign Key constraints enabled:

- `users`: Credentials (bcrypt), privilege tier (`student`, `instructor`, `admin`).
- `labs`: Container configuration paths, port mappings, metadata.
- `scenarios`: Scenario definitions, difficulty, time constraints.
- `scenario_objectives`: Verifiable objective rules and point values.
- `exercise_sessions`: Active and historical student exercise sessions.
- `telemetry_events`: Immutable event log capturing IDS alerts, system transitions, and student actions.
- `objective_results`: Evaluation outcomes bound to specific evidence event IDs.
- `exercise_scores`: Formal aggregated score and pass/fail determination.
- `debrief_responses`: Structured 6-dimensional reflective learning submissions.
- `reset_records`: Teardown and health check audit records.
