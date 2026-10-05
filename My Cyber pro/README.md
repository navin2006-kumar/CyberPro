# CyberPro: Scenario-Driven Cyber Range for Safe, Measurable Defensive Skills Practice

[![Project Status](https://img.shields.io/badge/Status-Research--Grade%20Cyber%20Range-blue.svg)](https://github.com/navin2006-kumar/CyberPro)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tests: 12/12 Passing](https://img.shields.io/badge/Automated%20Tests-12%2F12%20Passed-brightgreen.svg)](docs/testing.md)
[![Node.js: >=18](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-blue.svg)](https://nodejs.org/)
[![Docker: Compose v2](https://img.shields.io/badge/Docker-Compose%20v2-2496ED.svg)](https://www.docker.com/)

**Project ID**: P-2024-28-CS-118  
**Theme**: Scenario-Driven Cyber Range for Operational Technology (OT) and Critical Infrastructure Defense  
**Repository**: [https://github.com/navin2006-kumar/CyberPro.git](https://github.com/navin2006-kumar/CyberPro.git)

---

## 🔬 Overview & Scientific Motivation

**CyberPro** is an isolated, container-based cyber range architected to provide safe, reproducible, and verifiable cybersecurity training and defensive skill evaluation for industrial control systems (ICS) and operational technology (OT).

Traditional Capture-the-Flag (CTF) platforms reward binary flag discovery, often encouraging heuristic guessing without measuring defensive competencies. CyberPro introduces an **evidence-based assessment model**:
- **Continuous Telemetry Capture**: Collects real-time network and host events during exercises without altering industrial process state.
- **Deterministic Objective Evaluation**: Analyzes telemetry against formal objective rules, binding earned scores to immutable event records.
- **Experiential Reflection**: Incorporates Kolb's learning cycle via structured 6-dimensional reflective debriefing prior to After-Action Report (AAR) generation.
- **Clean-State Reproducibility**: Automated reset protocol verifies complete container reconstruction and health checks before certifying the environment for subsequent learners.

---

## 🏛️ System Architecture

CyberPro operates on a modular, decoupled architecture bridging a hardened Node.js backend with an isolated multi-subnet industrial target lab:

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

For detailed architecture diagrams and network rules, see [docs/architecture.md](docs/architecture.md).

---

## ⚡ Core Analytical Engines

| Engine | File Location | Core Responsibility |
|---|---|---|
| **Objective Engine** | `backend/engines/objectiveEngine.js` | Evaluates deterministic predicates against telemetry events, binding foreign keys to passed objectives. |
| **Scoring Engine** | `backend/engines/scoringEngine.js` | Computes transparent point totals, enforces pass thresholds (75%) and mandatory objective constraints. |
| **Timeline Engine** | `backend/engines/timelineEngine.js` | Derives chronological event sequence directly from telemetry audit logs with relative time offsets. |
| **Reset Engine** | `backend/engines/resetEngine.js` | Orchestrates container teardown (`down -v`), reconstruction (`up -d`), and HTTP health check audits. |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: >= 18.0.0
- **Docker & Docker Compose**: v2+
- **Python**: >= 3.9 (for Scapy / IDS simulation)

### 1. Installation
```bash
# Clone repository
git clone https://github.com/navin2006-kumar/CyberPro.git
cd CyberPro/"My Cyber pro"

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

### 2. Database Migration
Initialize the database with the cyber range schema (scenarios, telemetry, scores, reset records):
```bash
npm run migrate
```

### 3. Run Automated Tests
Verify platform integrity via the master test suite:
```bash
npm test
```

### 4. Start the Application
```bash
npm start
```
Access the management portal at **`http://localhost:3000`**.

---

## 🛡️ Security & Hardening Controls

The project configuration includes defense-in-depth patterns intended to reduce risk and preserve separation in the lab design:
- **No Privileged Containers**: `privileged: true` has been eliminated from all services.
- **Dropped Capabilities**: Containers enforce `cap_drop: ALL`, retaining only required capabilities (`NET_ADMIN` on PLC, `NET_RAW` on IDS).
- **Resource Constraints**: Hard memory quotas (512MB–1024MB) and CPU allocations (0.5–1.0) are declared for services.
- **Isolated Subnets**: Internal OT networks declare `internal: true`, but runtime containment remains unverified because Docker Engine was unavailable during execution.
- **Role-Based Access Control**: Strict privilege tiers (`student`, `instructor`, `admin`) are enforced via centralized middleware and the test suite.
- **Emergency Stop**: Audited killswitch (`POST /api/emergency-stop`) is implemented and covered by the application-level checks.

See [docs/security.md](docs/security.md) and [docs/risk-register.md](docs/risk-register.md) for full threat models and mitigations.

---

## 🧪 Automated Verification Suite

The project currently includes 12 automated suites covering the objective engine, scoring, replay, timeline, auth/RBAC, reset logic, scenario lifecycle, concurrency, and evidence admission. This verifies the implemented control-plane behavior and SQLite-backed data integrity in the tested environment; it does not establish learner learning gains, real-world containment effectiveness, or live Docker runtime security.

### Verification Status
Command executed on 2026-10-05:
```bash
cd "C:\Users\navin\Documents\cyber\CyberPro\My Cyber pro"
npm test
```
Observed result:
```
Total Suites: 12 | Passed: 12 | Failed: 0
```

Result table from the actual run:
```
┌─────────┬───────────────────────────────────────────┬──────────┬──────────┐
│ (index) │ name                                      │ status   │ duration │
├─────────┼───────────────────────────────────────────┼──────────┼──────────┤
│ 0       │ 'Unit: Objective Engine'                  │ 'PASSED' │ '475ms'  │
│ 1       │ 'Unit: Scoring Engine'                    │ 'PASSED' │ '493ms'  │
│ 2       │ 'Unit: Score Replay'                      │ 'PASSED' │ '606ms'  │
│ 3       │ 'Unit: Evidence Dashboard Model'          │ 'PASSED' │ '562ms'  │
│ 4       │ 'Unit: Timeline Engine'                   │ 'PASSED' │ '576ms'  │
│ 5       │ 'Unit: Authentication'                    │ 'PASSED' │ '1687ms' │
│ 6       │ 'Unit: RBAC Middleware'                   │ 'PASSED' │ '596ms'  │
│ 7       │ 'Unit: Reset Engine'                      │ 'PASSED' │ '583ms'  │
│ 8       │ 'Integration: Scenario Lifecycle'         │ 'PASSED' │ '605ms'  │
│ 9       │ 'Integration: Multi-Exercise Concurrency' │ 'PASSED' │ '829ms'  │
│ 10      │ 'Security: RBAC Enforcement'              │ 'PASSED' │ '519ms'  │
│ 11      │ 'Security: Evidence Admission'            │ 'PASSED' │ '1125ms' │
└─────────┴───────────────────────────────────────────┴──────────┴──────────┘
```

To run individual suites, refer to [docs/testing.md](docs/testing.md). For the strict evidence classification and manuscript-ready summary, see [docs/evidence-matrix.md](docs/evidence-matrix.md) and [docs/paper-results-ready.md](docs/paper-results-ready.md).

---

## 📚 Complete Documentation Suite

- 📐 [Architecture Specification](docs/architecture.md) — System components, network layout, database schema.
- 🚀 [Deployment & Operations Guide](docs/deployment.md) — Prerequisites, step-by-step setup, troubleshooting.
- 🎯 [Scenario Specification: PLC-001](docs/scenarios.md) — Threat model, learning objectives, attack workflow.
- 📊 [Scoring Methodology](docs/scoring.md) — Mathematical formulation, evidence binding, debrief dimensions.
- 🔒 [Security Architecture](docs/security.md) — Container hardening, network isolation, RBAC matrix.
- ⚠️ [Risk Register](docs/risk-register.md) — Threat matrix, vulnerability analysis, technical mitigations.
- 🔁 [Reproducibility Protocol](docs/reproducibility.md) — Deterministic pinning, clean-state reset protocol.
- 📋 [Research Manuscript Mapping](docs/paper-mapping.md) — Traceability matrix linking manuscript sections to codebase and evidence status.
- 📊 [Evidence Matrix](docs/evidence-matrix.md) — Claim-level classification of what is implemented, verified, proposed, or not executed.
- 🧾 [Paper-Ready Results Summary](docs/paper-results-ready.md) — Only the results that were actually executed and recorded in this workspace.
- 🧪 [Automated Testing Manual](docs/testing.md) — Unit, integration, security test execution and CI guide.

---

## 📄 License & Attribution

CyberPro is distributed under the **MIT License**.  
Developed under Project **P-2024-28-CS-118**: *Scenario-Driven Cyber Range for Safe, Measurable Defensive Skills Practice*.
