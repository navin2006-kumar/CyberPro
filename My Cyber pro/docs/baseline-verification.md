# CyberPro Phase 0 Baseline Verification

**Date:** 2026-10-05  
**Scope:** Baseline inspection and tests only. No application logic was modified.

## Environment

Commands and observed versions:

```text
node --version          v24.20.0
npm --version           11.4.1
docker --version        Docker version 29.8.0, build 88096ef
docker compose version  Docker Compose version v5.5.1
```

`docker info --format "Docker daemon: {{.ServerVersion}}"` could not connect to `npipe:////./pipe/dockerDesktopLinuxEngine`; it exited with code 1. The Docker CLI and Compose plugin are installed, but the Docker Desktop Linux engine was not running. No containers were started.

Compose configuration inspection ran `docker compose -f <compose-file> config --services` on all ten `docker-compose.yml` files. All ten parsed successfully with exit code 0. Four files reported that the Compose `version` attribute is obsolete: `labs/camera_lab/docker-compose.yml`, `labs/network/docker-compose.yml`, `labs/plc/docker-compose.yml`, and `labs/scada/docker-compose.yml`. Parsing configuration does not prove the images build or containers run.

The app's `docker-compose` executable is present at `C:\Users\navin\AppData\Local\Programs\DockerDesktop\resources\bin\docker-compose.exe`.

## Dependencies

`npm ls --depth=0` completed successfully. All dependencies and dev dependencies declared in `package.json` were present:

```text
@google/genai@0.3.1
axios@1.13.5
bcrypt@5.1.1
body-parser@1.20.4
cors@2.8.6
dockerode@4.0.9
dotenv@16.6.1
express-session@1.19.0
express@4.22.1
nodemon@3.1.11
sqlite3@5.1.7
uuid@9.0.1
ws@8.19.0
```

Dependency setup was performed before this Phase 0 during the preceding task: `npm install` reported “added 302 packages” and audited 303 packages. No package installation or dependency-file change was made during Phase 0. At inspection start, `git status --short` showed existing modifications to `README.md` and `docs/testing.md`; these were preserved.

## Baseline Tests

The aggregate command was run from `My Cyber pro`:

```text
> cyber-lab-platform@1.0.0 test
> node tests/run-all.js

Unit: Objective Engine             PASSED (707ms)
Unit: Scoring Engine                PASSED (729ms)
Unit: Timeline Engine               PASSED (795ms)
Unit: Authentication               PASSED (2180ms)
Unit: RBAC Middleware               PASSED (645ms)
Integration: Scenario Lifecycle     PASSED (854ms)
Security: RBAC Enforcement          PASSED (659ms)

Total Suites: 7 | Passed: 7 | Failed: 0
ALL AUTOMATED TEST SUITES PASSED CLEANLY!
```

Each suite was then run individually. The following records the exact output captured for each command, including the recorded exit status:

### `node tests/unit/objectiveEngine.test.js`

```text
🧪 Objective Engine — Unit Tests

	✓ OBJ-1 passes when IDS modbus_anomaly event with matching dst_port exists
	✓ OBJ-1 fails when no IDS modbus_anomaly events exist
	✓ OBJ-1 fails when event has wrong dst_port (not 502)
	✓ OBJ-2 passes when student submits correct identified_ip
	✓ OBJ-2 fails when student submits wrong IP
	✓ OBJ-3 passes when analysis_text has >= 50 characters
	✓ OBJ-3 fails when analysis_text has < 50 characters
	✓ Evidence IDs contain all matching event IDs

─────────────────────────────────
Results: 8 passed, 0 failed
✅ All tests passed.
EXIT_CODE=0
```

### `node tests/unit/scoringEngine.test.js`

```text
🧪 Running Scoring Engine Unit Tests...

	✓ All 4 objectives passed → 100/100, passed = true
	✓ 3 required objectives passed (75/100) → passed = true (threshold 75)
	✓ Score < 75 threshold (50/100) → passed = false
	✓ Required objective failed blocks pass even if total score meets threshold
	✓ Traceability: objective_breakdown preserves evidence_event_ids
	✓ Completion time in minutes calculated from timestamps

Results: 6 passed, 0 failed
EXIT_CODE=0
```

### `node tests/unit/timelineEngine.test.js`

```text
🧪 Running Timeline Engine Unit Tests...

	✓ Empty events array returns valid empty timeline
	✓ Formats IDS modbus_anomaly event into human-readable description
	✓ Formats student action events (host_identified, log_analysis_submitted, containment_action)
	✓ Calculates relative time in seconds and mm:ss from exercise start
	✓ Handles non-JSON string data gracefully without throwing

Results: 5 passed, 0 failed
EXIT_CODE=0
```

### `node tests/unit/auth.test.js`

```text
🧪 Running Authentication Unit Tests...

	✓ Bcrypt hash creates a secure non-plaintext password string
	✓ Bcrypt compare validates correct password against hash
	✓ Bcrypt compare rejects wrong password
	✓ Empty password does not match valid hash
	✓ Password salting generates distinct hashes for identical passwords

Results: 5 passed, 0 failed
EXIT_CODE=0
```

### `node tests/unit/rbac.test.js`

```text
🧪 RBAC Middleware — Unit Tests

	✓ requireAuth: allows request with valid session
	✓ requireAuth: blocks request with no session
	✓ requireAuth: blocks request with null session
	✓ requireRole(student): allows student role
	✓ requireRole(instructor): allows instructor role
	✓ requireRole(admin): allows admin role
	✓ requireRole(instructor): blocks student role
	✓ requireRole(admin): blocks student role
	✓ requireRole(admin): blocks instructor role
	✓ requireRole(instructor): allows admin role (admin > instructor)
	✓ requireRole: returns 401 when not authenticated
	✓ requireRole: returns 403 for unknown role

─────────────────────────────────
Results: 12 passed, 0 failed
✅ All tests passed.
EXIT_CODE=0
```

### `node tests/integration/scenario-flow.test.js`

```text
🚀 Running CyberPro Full Scenario Lifecycle Integration Test...

	✓ Step 1: Provisioned scenario PLC-001 with 4 verifiable objectives
	✓ Step 2: Created active exercise session 7b937777...
	✓ Step 3: Ingested exercise_started & IDS modbus_anomaly telemetry events
	✓ Step 4: Recorded student host identification and analytical debrief input
	✓ Step 5-6: Evaluated objectives & computed 75/100 pass score with evidence bindings
	✓ Step 7: Saved 6-dimension reflective debrief response
	✓ Step 8: Generated chronological timeline from telemetry audit trail
	✓ Step 9: Confirmed clean environment reset and audit recording

🎉 Full Scenario Lifecycle Integration Test Passed Successfully!
EXIT_CODE=0
```

### `node tests/security/rbac-enforcement.test.js`

```text
🔒 Running CyberPro RBAC Security Enforcement Tests...

	✓ Visitor: Blocked from protected endpoints with 401 UNAUTHENTICATED
	✓ Student: Blocked from instructor-only route with 403 INSUFFICIENT_ROLE
	✓ Student: Blocked from admin-only route with 403 INSUFFICIENT_ROLE
	✓ Student: Allowed on student-level exercise routes
	✓ Instructor: Allowed on instructor routes
	✓ Instructor: Allowed on student routes (inherits student privilege)
	✓ Instructor: Blocked from admin routes
	✓ Admin: Allowed on student, instructor, and admin routes
	✓ Invalid or forged role (e.g. "superadmin", "guest") defaults to 403

Results: 9 passed, 0 failed
EXIT_CODE=0
```

**Baseline result: TESTED and VERIFIED** for the seven Node test suites in this environment. This does not verify live Docker behavior.

## Documentation Consistency

The prior `docs/testing.md` stated “51 Assertions” and claimed all tests were dependency-free. The runner does not report a total assertion count, and individual test files require installed packages such as `uuid`, `bcrypt`, and `sqlite3`. The guide has been corrected to state the verified suite count and dependency requirement. The observed 7/7 pass result agrees with the guide's zero-failure status.

## Baseline Architecture

- **Application entry points:** `server.js` starts the Express HTTP API, static portal, and WebSocket server on port 3000. `npm start` runs it; `backend/migrate.js` is the explicit schema migration entry point.
- **Database:** SQLite at `data/labs.db` by default. `db.js` initializes the portal tables and seeds the default admin. `backend/migrate.js` adds the scenario, exercise, telemetry, objective, score, debrief, and reset tables.
- **Scenario loading:** `scenarios/PLC-001/scenario.json` defines the PLC Attack Detection scenario and four objectives. `server.js` seeds PLC-001 and its objectives into SQLite after the database is ready.
- **Telemetry ingestion:** `backend/routes/telemetry.js` accepts `POST /api/telemetry/event`, validates source/severity, requires a user session for student events, and accepts container events with the configured shared secret or an authenticated session. Events are stored in `telemetry_events`.
- **Objective evaluation and scoring:** `backend/engines/objectiveEngine.js` matches scenario objective detection logic against telemetry and binds evidence IDs. `backend/engines/scoringEngine.js` aggregates objective results and required-objective/pass-threshold rules.
- **Reset:** `backend/engines/resetEngine.js` calls Compose down/up, performs configured HTTP health checks, and records reset status. The scenario route exposes instructor-authorized reset.
- **Authentication/RBAC:** `server.js` uses Express sessions and bcrypt password comparison. `backend/middleware/auth.js` enforces the student < instructor < admin role hierarchy.
- **Reports:** `backend/routes/reports.js` provides score, timeline, after-action report, debrief, and submit/scoring endpoints.
- **Docker lab architecture:** `labManager.js` selects each lab's Compose file and invokes `docker-compose` to start/stop it. The top-level Compose file runs an Nginx portal. The OilSprings Compose stack has seven services (PLC, SCADA, EWS, IDS, collector, pentest, router) across four addressed bridge networks, with SCADA and security networks marked internal. Other lab Compose stacks cover camera, network, network security, OpenPLC, pentest, PLC, SCADA, and SCADA dashboard.

## Known Failures and Limitations

- No test failures were observed in the aggregate or individual suite runs.
- Docker daemon was unavailable, so no image builds, container starts, live lab workflows, or real HTTP health checks were executed. Compose files were syntax/configuration parsed only.
- The integration scenario test passed without proving a real Docker lifecycle; treat its reset result as test-level behavior, not live container verification.
- The reported result applies to the installed dependencies and Node v24.20.0 in this workspace. Other Node versions and clean-install reproducibility were not tested in Phase 0.
- The project test runner executes seven suites; it does not establish complete application or Docker-lab coverage.