# CyberPro Architecture Specification

**Project**: CyberPro: Scenario-Driven Cyber Range for Safe, Measurable Defensive Skills Practice  
**Project ID**: P-2024-28-CS-118  
**Theme**: Industrial Control Systems (ICS) & Operational Technology (OT) Cyber Range  
**Document Version**: 2.0  

---

## 1. System Overview

CyberPro is an isolated, container-based cyber range architected to provide safe, reproducible, and verifiable cybersecurity training and defensive skill evaluation. The platform bridges realistic industrial process emulation with rigorous, evidence-traceable assessment.

Unlike traditional Capture-the-Flag (CTF) environments that reward binary flag extraction, CyberPro evaluates defensive competencies (detection, incident correlation, containment, and reflective debriefing) through automated telemetry analysis. OilSprings network containment is a configured objective, not a verified property; see [results/network-containment.json](../results/network-containment.json).

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

The OilSprings Compose model declares four bridge networks. These declarations do not establish Layer 2/3 containment: the router joins all four networks, has `NET_ADMIN`, and attempts to enable IPv4 forwarding. Docker Engine was unavailable for runtime connectivity tests on 2026-10-05.

| Network Name | Subnet | Compose setting | Purpose | Connected Containers |
|---|---|---|---|---|
| `l2_network` | `10.10.2.0/24` | Internal / Controlled Port Map | Field control bus (Modbus/TCP) | `oilsprings_plc`, `oilsprings_router` |
| `l3_scada_network` | `10.10.3.0/24` | Fully Internal (`internal: true`) | Supervisory control and HMI | `oilsprings_scada`, `oilsprings_ews`, `oilsprings_router` |
| `l3_security_network` | `10.10.4.0/24` | Fully Internal (`internal: true`) | Out-of-band monitoring & logs | `oilsprings_ids`, `oilsprings_collector`, `oilsprings_router` |
| `l3_pentest_network` | `10.10.5.0/24` | Controlled Port Map | Adversary simulation origin | `oilsprings_pentest`, `oilsprings_router` |

### Intended Paths and Containment Caveats
- **Authorized exercise path:** pentest (`10.10.5.50`) → router (`10.10.5.2` / `10.10.2.2`) → PLC (`10.10.2.10:502`).
- **Collector path:** PLC configuration points to collector (`10.10.4.40:5000`) through the router.
- **Telemetry backhaul:** IDS configuration points to `host.docker.internal:3000`; Compose does not inject `EXERCISE_ID` or `CONTAINER_SECRET` into the IDS service.
- **Host exposure:** Compose publishes TCP ports `8080`, `8081`, `8083`, `8084`, `8085`, `2222`, `8086`, and `8087`; Modbus/TCP `502` is not published.
- **Configuration discrepancy:** router rules and PLC/pentest/collector entrypoint routes use `192.168.x` subnets while Compose uses `10.10.x`. `router/rules.json` contains an any-to-any ACCEPT rule, and no effective packet-filter application was found in the inspected router files.
- **Potential egress/transit:** pentest and L2 bridges are not `internal`; the multi-homed router may transit traffic between subnets. These are configuration risks, not observed connections.
- **Runtime status:** all six approved containment tests are `NOT TESTED` because Docker Engine was unavailable. Do not describe this topology as fully isolated. See [results/network-containment.json](../results/network-containment.json).

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

### 3.5 Evidence Dashboard (`public/dashboard.html`)
The dashboard is a read-oriented evidence review surface. It loads score from `/api/reports/:id/score`, scenario metadata from `/api/scenarios/:id`, timeline from `/api/reports/:id/timeline`, telemetry from `/api/telemetry/events/:id`, and exercise/reset metadata from `/api/exercises/:id`. Objective status, points, evidence IDs, score thresholds, final decision, health checks, and residue details are rendered from those responses; absent values remain visibly absent. Exercise detail includes the latest persisted reset record, and malformed telemetry is returned with raw data and a parse-error marker so invalid evidence remains inspectable. The evidence page omits the unrelated chatbot widget to keep the records unobstructed and avoid requests to a separate chat service.

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
