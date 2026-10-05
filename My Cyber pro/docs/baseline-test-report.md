# CyberPro Baseline Test Report

## 1. Environment

- **Node**: v24.20.0
- **npm**: 11.4.1
- **Docker**: Docker version 29.8.0, build 88096ef
- **Docker Compose**: Docker Compose version v5.5.1
- **OS**: Windows 11 Pro (win32 x64)
- **Report Date**: 2026-10-05

---

## 2. Dependencies

- **Installed**: All 303 packages audited and up-to-date (`@google/genai@0.3.1`, `axios@1.13.5`, `bcrypt@5.1.1`, `body-parser@1.20.4`, `cors@2.8.6`, `dockerode@4.0.9`, `dotenv@16.6.1`, `express-session@1.19.0`, `express@4.22.1`, `nodemon@3.1.11`, `sqlite3@5.1.7`, `uuid@9.0.1`, `ws@8.19.0`).
- **Missing**: None.
- **Warnings**: 
  - `npm audit` reports 31 vulnerabilities (2 low, 8 moderate, 19 high, 2 critical) primarily in transitive dependencies.
  - Server warning at boot: `SESSION_SECRET is not set in environment. Using fallback development secret.`

---

## 3. Test Summary

| Test Area | Result |
|---|---|
| Unit tests | PASS (8 suites, 60 tests passed, 0 failed) |
| Integration tests | PASS (2 suites, 14 tests passed, 0 failed) |
| Scoring | PASS (Scoring Engine 11/11, Score Replay 7/7) |
| Evidence | PASS (Objective Engine 14/14, Evidence Admission 19/19) |
| Database | PASS (SQLite in-memory & file-backed, concurrency, rollback, reopen verified) |
| HTTP/API | PASS (15 local endpoints probed; all returned expected HTTP status and JSON) |
| Reset | MOCKED RESET TEST PASS (6/6); Real Docker reset NOT EXECUTED in test runner |
| Docker | PARTIALLY RUNNING (Daemon running, portal & scada containers up; OilSprings multi-container lab not provisioned) |
| Network | CONFIGURATION INSPECTED (Static Compose/routes inspected; runtime containment NOT EXECUTED) |

---

## 4. Test Results

### Automated Test Runner (`npm test` / `node tests/run-all.js`)

- **Total Suites**: 12
- **Passed Suites**: 12
- **Failed Suites**: 0
- **Total Tests**: 107
- **Passed Tests**: 107
- **Failed Tests**: 0
- **Skipped Tests**: 0

#### Suite-by-Suite Breakdown

1. **Unit: Objective Engine** (`tests/unit/objectiveEngine.test.js`)
   - **Command**: `node tests/unit/objectiveEngine.test.js`
   - **Expected**: 14 passing tests
   - **Actual**: 14 passed, 0 failed (duration: 613ms)
   - **Status**: PASS
   - **Failure Reason**: None

2. **Unit: Scoring Engine** (`tests/unit/scoringEngine.test.js`)
   - **Command**: `node tests/unit/scoringEngine.test.js`
   - **Expected**: 11 passing tests
   - **Actual**: 11 passed, 0 failed (duration: 601ms)
   - **Status**: PASS
   - **Failure Reason**: None

3. **Unit: Score Replay** (`tests/unit/replayEngine.test.js`)
   - **Command**: `node tests/unit/replayEngine.test.js`
   - **Expected**: 7 passing tests
   - **Actual**: 7 passed, 0 failed (duration: 636ms)
   - **Status**: PASS
   - **Failure Reason**: None

4. **Unit: Evidence Dashboard Model** (`tests/unit/evidenceDashboard.test.js`)
   - **Command**: `node tests/unit/evidenceDashboard.test.js`
   - **Expected**: 5 passing tests
   - **Actual**: 5 passed, 0 failed (duration: 596ms)
   - **Status**: PASS
   - **Failure Reason**: None

5. **Unit: Timeline Engine** (`tests/unit/timelineEngine.test.js`)
   - **Command**: `node tests/unit/timelineEngine.test.js`
   - **Expected**: 5 passing tests
   - **Actual**: 5 passed, 0 failed (duration: 607ms)
   - **Status**: PASS
   - **Failure Reason**: None

6. **Unit: Authentication** (`tests/unit/auth.test.js`)
   - **Command**: `node tests/unit/auth.test.js`
   - **Expected**: 5 passing tests
   - **Actual**: 5 passed, 0 failed (duration: 1177ms)
   - **Status**: PASS
   - **Failure Reason**: None

7. **Unit: RBAC Middleware** (`tests/unit/rbac.test.js`)
   - **Command**: `node tests/unit/rbac.test.js`
   - **Expected**: 12 passing tests
   - **Actual**: 12 passed, 0 failed (duration: 561ms)
   - **Status**: PASS
   - **Failure Reason**: None

8. **Unit: Reset Engine** (`tests/unit/resetEngine.test.js`)
   - **Command**: `node tests/unit/resetEngine.test.js`
   - **Expected**: 6 passing mocked tests
   - **Actual**: 6 passed, 0 failed (duration: 652ms)
   - **Status**: PASS (MOCKED RESET)
   - **Failure Reason**: None

9. **Integration: Scenario Lifecycle** (`tests/integration/scenario-flow.test.js`)
   - **Command**: `node tests/integration/scenario-flow.test.js`
   - **Expected**: 7 passing lifecycle stages (9 steps)
   - **Actual**: 7 passed, 0 failed (duration: 597ms)
   - **Status**: PASS
   - **Failure Reason**: None

10. **Integration: Multi-Exercise Concurrency** (`tests/integration/concurrency.test.js`)
    - **Command**: `node tests/integration/concurrency.test.js`
    - **Expected**: 7 passing concurrency/isolation tests
    - **Actual**: 7 passed, 0 failed (duration: 804ms)
    - **Status**: PASS
    - **Failure Reason**: None

11. **Security: RBAC Enforcement** (`tests/security/rbac-enforcement.test.js`)
    - **Command**: `node tests/security/rbac-enforcement.test.js`
    - **Expected**: 9 passing security boundary tests
    - **Actual**: 9 passed, 0 failed (duration: 608ms)
    - **Status**: PASS
    - **Failure Reason**: None

12. **Security: Evidence Admission** (`tests/security/evidence-admission.test.js`)
    - **Command**: `node tests/security/evidence-admission.test.js`
    - **Expected**: 19 passing admission boundary tests
    - **Actual**: 19 passed, 0 failed (duration: 1046ms)
    - **Status**: PASS
    - **Failure Reason**: None

---

### Safe HTTP API Probe Results (`http://localhost:3000`)

| Endpoint Name | Method | Path | Expected Status | Actual Status | Result |
|---|---|---|---|---|---|
| Health Check | GET | `/api/health` | 200 | 200 | PASS |
| Session (Unauthenticated) | GET | `/api/auth/session` | 401 | 401 | PASS |
| Admin Login | POST | `/api/auth/login` | 200 | 200 | PASS |
| Session (Authenticated) | GET | `/api/auth/session` | 200 | 200 | PASS |
| List Scenarios | GET | `/api/scenarios` | 200 | 200 | PASS |
| Get Scenario PLC-001 | GET | `/api/scenarios/PLC-001` | 200 | 200 | PASS |
| List Labs | GET | `/api/labs` | 200 | 200 | PASS |
| Get Lab 1 Detail | GET | `/api/labs/1` | 200 | 200 | PASS |
| System Status | GET | `/api/system/status` | 200 | 200 | PASS |
| Ingest Telemetry (No Secret) | POST | `/api/telemetry/event` | 401 | 401 | PASS |
| Get Score (Missing Exercise) | GET | `/api/reports/non-existent-id/score` | 404 | 404 | PASS |
| Get Timeline (Missing Exercise) | GET | `/api/reports/non-existent-id/timeline` | 404 | 404 | PASS |
| Get Replay (Missing Exercise) | GET | `/api/reports/non-existent-id/replay` | 404 | 404 | PASS |
| Reset Exercise (Missing Exercise) | POST | `/api/exercises/non-existent-id/reset` | 404 | 404 | PASS |
| Admin Logout | POST | `/api/auth/logout` | 200 | 200 | PASS |

---

## 5. Current Architecture

- **Backend Application**: Express.js server (`server.js`) with WebSocket (`ws`) broadcasting, body-parser, session-based cookies (`express-session`), and RBAC authentication (`backend/middleware/auth.js`).
- **Engines**:
  - `ObjectiveEngine.js`: Queries `telemetry_events` matching detection rules. Evaluates field checks, minimum lengths, severity, and event types. Strictly enforces session/user ownership and generates evidence IDs.
  - `ScoringEngine.js`: Calculates points exclusively for evidence-backed passing objectives. Evaluates minimum score threshold and required objective count. Emits canonical JSON SHA-256 rule hashes and score traces, and supports score replay verification.
  - `TimelineEngine.js`: Generates structured, human-readable chronology from audit logs and telemetry events.
  - `ResetEngine.js`: Implements pre-reset baseline capture, teardown (`docker compose down --remove-orphans --volumes`), clean rebuild (`docker compose up -d --force-recreate`), snapshot comparison, residue probe verification, and HTTP health check polling.
- **Persistence Layer**:
  - Runtime: SQLite database at `./data/labs.db`.
  - Automated tests: in-memory (`:memory:`) or temporary file-backed SQLite instances.
- **Container Infrastructure**:
  - Root `docker-compose.yml`: Nginx web portal on port `80:80`.
  - Lab `labs/oilsprings/docker-compose.yml`: 7 services (`plc`, `scada`, `ews`, `ids`, `collector`, `pentest`, `router`) across 4 subnets (`l2_network`, `l3_scada_network`, `l3_security_network`, `l3_pentest_network`).
  - Standalone labs in `labs/openplc`, `labs/scada-dashboard`, `labs/network-security`, `labs/pentest`, and `labs/camera_lab`.

---

## 6. Current Limitations

1. **OilSprings Lab Missing from Database**: The `labs` table in `./data/labs.db` contains 5 lab entries (`openplc`, `scada-dashboard`, `network-security`, `pentest`, `camera-lab`), but does NOT contain `oilsprings`. When `server.js` seeds `PLC-001`, it searches for slug `oilsprings`, fails, and defaults to `lab_id = 1` (`openplc`), pointing to the single-container OpenPLC compose file instead of the 7-container OilSprings lab.
2. **Subnet IP Mismatches**: Container entrypoint scripts in `labs/oilsprings/` (e.g., `plc/entrypoint.sh`, `pentest/entrypoint.sh`, `router/router.py`) add routes using `192.168.x.x` subnets, while `labs/oilsprings/docker-compose.yml` configures `10.10.x.x` networks.
3. **Permissive Router Policy**: `labs/oilsprings/router/rules.json` contains a default permissive rule `{"src": "any", "dst": "any", "port": "any", "proto": "any", "action": "ACCEPT"}` rather than a deny-by-default firewall policy.
4. **OilSprings Images Unbuilt**: While the Docker daemon is operational, the custom images for the 7 OilSprings containers have not been built locally.
5. **Reset Test is Mocked**: In the automated test suite, `resetEngine.test.js` only executes with mocked Docker adapters. Live container recreation and health checks are not executed during `npm test`.

---

## 7. Documentation Discrepancies

1. **Evidence Admission Test Count**: `docs/testing.md` reports 17 explicit ACCEPT/REJECT tests for `evidence-admission.test.js`, but the actual test file defines and passes 19 tests.
2. **Objective Engine Test Count**: `docs/testing.md` Section 2 Phase 1 record states `Objective Engine 13 passed`, whereas running `node tests/unit/objectiveEngine.test.js` executes 14 passed tests.
3. **OilSprings Portal Launch Claim**: Top-level `README.md` states: *"Navigate to Labs page -> Click on OilSprings Industrial Lab -> Click Launch Lab -> All 7 service tabs will automatically open!"*. In reality, `oilsprings` is absent from `labs.db`, so the portal cannot launch the OilSprings environment.
4. **IP Topology Documentation**: `OILSPRINGS_GUIDE.md` diagrams and text describe networks `192.168.2.0/24`, `192.168.3.0/24`, `192.168.4.0/24`, `192.168.5.0/24`, contradicting `labs/oilsprings/docker-compose.yml` which defines `10.10.2.0/24` through `10.10.5.0/24`.
5. **Docker Availability Claims**: `docs/testing.md`, `docs/reproducibility.md`, and `results/reset-verification.json` claim Docker Desktop was unavailable with named-pipe errors. In our current environment, Docker Desktop 29.8.0 is running and responsive.

---

## 8. Environment-Limited Tests

- **REAL DOCKER RESET RUNTIME**: **NOT EXECUTED** during automated testing. `tests/unit/resetEngine.test.js` uses a mock adapter to verify state tracking, config hashes, and residue detection logic. Live container teardown and spin-up were not executed in `npm test`.
- **RUNTIME NETWORK CONTAINMENT**: **NOT EXECUTED**. Network isolation was reviewed via static Docker Compose configuration only. No live packet capture, intra-subnet routing probes, or external egress tests were executed against running containers.

---

## 9. Baseline Conclusion

**PARTIALLY RUNNING**

- The application control plane, HTTP APIs, authentication, RBAC, database persistence, telemetry ingestion rules, scoring engine, score replay, and all 107 automated unit and integration tests are **100% operational and passing**.
- However, the project cannot be classified as fully running because the primary OT scenario environment (`OilSprings`) is not mapped in the application database (`labs.db`), has conflicting internal network route configurations, and has not had its multi-container Docker deployment or live reset verified in runtime.
