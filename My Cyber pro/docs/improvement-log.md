# CyberPro Improvement Log

## 2026-10-05 — Phase 1: Evidence Validation and Scoring

### Implemented

- Objective evidence matching is scoped by `exercise_id`, authoritative exercise `scenario_id`, configured `source` and `event_type`, and event ownership. Student evidence must belong to the exercise owner; non-student evidence with a session `user_id` is rejected.
- Malformed detection logic and malformed, non-object, missing, or incorrectly typed telemetry payload values fail closed. Minimum text checks require a non-empty string meeting the configured length; enumerated values must match exactly.
- Objective results persist matching evidence event IDs. Scoring deduplicates IDs and awards configured objective points only for pass results with at least one evidence ID.
- Overall pass requires both the scenario-configured minimum score and the scenario-configured minimum number of passed required objectives. Configuration is read from a populated `success_conditions` field or the matching scenario manifest; no hardcoded threshold defaults are used.
- Score responses expose each objective ID, status, points earned/possible, evidence count, and evidence event IDs.
- The in-memory SQLite lifecycle fixture now mirrors telemetry scenario/owner columns and tests spoofed evidence plus persisted trace IDs.

### Verification

Focused commands executed:

```text
node tests/unit/objectiveEngine.test.js       Results: 13 passed, 0 failed
node tests/unit/scoringEngine.test.js         Results: 11 passed, 0 failed
node tests/integration/scenario-flow.test.js  Full Scenario Lifecycle Integration Test Passed Successfully
```

Full-suite verification will be recorded after `npm test` is run for this phase. The SQLite integration test does not start Docker; live lab telemetry, container resets, and health checks are not verified here.

## 2026-10-05 — Phase 2: Negative and Security Testing

### Implemented

- Telemetry admission now allows only the defined student event types from the authenticated exercise owner and only allowlisted event types from supported container sources with a configured shared secret.
- Events must target an existing active exercise. The scenario is bound to the exercise row; a conflicting scenario ID is rejected.
- JSON object shape, source/event-type pairing, severity, and objective-relevant payload fields are validated. Client-supplied objective IDs and unsupported metadata are rejected.
- Canonical duplicate detection rejects a repeated exercise/source/event type/severity/payload tuple with HTTP 409. Objective evaluation remains independently owner- and scenario-scoped.
- Added a real HTTP + in-memory SQLite security suite and registered it in the master runner. It covers 16 explicit ACCEPT/REJECT cases, including spoofing, scope mismatch, malformed input, duplicates/replays, unauthorized submission/score access, and cross-user contamination.

### Verification

Commands executed on 2026-10-05:

```text
node tests/security/evidence-admission.test.js
Results: 16 passed, 0 failed

npm test
Total Suites: 8 | Passed: 8 | Failed: 0
```

Diagnostics reported no errors in the changed JavaScript files. Verification is application-level only. Docker was unavailable during Phase 0, so live lab telemetry, secret injection into containers, deployment behavior, and complete security assurance are not verified.

## 2026-10-05 — Phase 3: Verified Lab Reset

### Implemented

- Added pre-exercise baseline capture before inserting the exercise database row. The snapshot includes expected/actual services, container IDs/names, image IDs/digests, network IDs/configuration, volumes, repository-side and in-container configuration SHA-256 hashes, temporary-file probes, and expected health endpoints.
- Reset retains pre-reset and post-reset snapshots, checks expected and unexpected resources, compares image/network/volume/config state, checks probe-file absence, and writes `results/reset-verification.json`.
- Reset cannot report success when the baseline is missing/invalid, no health endpoints are configured, a health check fails, expected state differs, or a probe artifact remains.
- Added a unit suite that invokes ResetEngine using mocked Docker resources/Compose commands and real temporary filesystem fixtures.

### Verification

```text
node tests/unit/resetEngine.test.js
MOCKED RESET TEST: 6 passed, 0 failed

npm test
Total Suites: 9 | Passed: 9 | Failed: 0

REAL DOCKER RESET TEST: NOT EXECUTED
Reason: docker info could not connect to npipe:////./pipe/dockerDesktopLinuxEngine.
```

No real lab exercise modification, Docker Compose reset, or live health check occurred. `results/reset-verification.json` therefore records `status: not_executed` and `clean_state_verified: false`. Mock results are not represented as real Docker evidence.

## 2026-10-05 — Phase 4: Network Containment Verification

### Static Findings

- Compose declares four `10.10.x` networks; only SCADA and security networks use `internal: true`. The router joins all four networks, has `NET_ADMIN`, and attempts to enable IPv4 forwarding.
- `router/rules.json` contains an any-to-any ACCEPT entry. Router UI rules and PLC/pentest/collector entrypoint routes use stale `192.168.x` subnets, while Compose assigns `10.10.x`. No effective packet-filter application was found in the inspected router files.
- Pentest and L2 bridges are non-internal. Eight TCP host ports are declared: 8080, 8081, 8083, 8084, 8085, 2222, 8086, and 8087. Modbus/TCP 502 is not host-published.
- IDS points to `host.docker.internal:3000`, but its Compose service does not explicitly receive `EXERCISE_ID` or `CONTAINER_SECRET`.

### Runtime Verification

`docker info` could not connect to `npipe:////./pipe/dockerDesktopLinuxEngine`. All six requested traffic tests therefore have observed-result counts of **0 PASS, 0 BLOCKED, 0 UNEXPECTED, 6 NOT TESTED**. No packet/connectivity probe was run and no public endpoint was contacted. Static configuration concerns are separately marked **UNEXPECTED** in `results/network-containment.json`; they are not reported as observed network behavior. No "network fully isolated" claim is made.

## 2026-10-05 — Phase 5: Evidence Chain and Replay

### Implemented

- Objective results now return and persist the rule, candidate count, accepted evidence IDs, rejected event IDs/reasons, and evaluation timestamp.
- Final scoring returns and persists an auditable score trace containing exercise/scenario IDs, objective components, evidence details, total/maximum score, configured thresholds, final decision, scenario rule version, and a SHA-256 rule fingerprint.
- Added read-only replay at `GET /api/reports/:exerciseId/replay`. It uses retained telemetry and the Objective Engine without overwriting original objective or score rows, then compares objective results, evidence/validation details, score components, final decision, and rule fingerprint.
- Deterministic comparison ignores evaluation timestamps and telemetry ordering. Rule-version/hash changes and event mutations are discrepancies.
- Added synthetic SQLite replay tests and generated `results/replay-verification.json`.

### Verification

```text
node tests/unit/replayEngine.test.js
Results: 7 passed, 0 failed

node tests/security/evidence-admission.test.js
Results: 17 passed, 0 failed

npm test
Total Suites: 10 | Passed: 10 | Failed: 0
```

The replay cases include exact match, removed event, changed payload, duplicate event, reordered event timestamps, newly malformed event, and changed scenario rule version. Verification is software/control-plane only and must not be described as learner performance or live-lab verification.

## 2026-10-05 — Phase 6: Multi-Exercise Data Integrity

### Implemented and Tested

- Added `tests/integration/concurrency.test.js` using three unique users, exercise IDs, and per-exercise telemetry against a temporary file-backed SQLite database.
- Interleaved six telemetry inserts and concurrently scored Exercise A/B/C; each score and evidence list was asserted to contain only its own exercise's events.
- Repeated scoring concurrently (two calls per exercise) and verified one score row and one objective result per exercise, with no point multiplication.
- Verified duplicate event primary-key rejection, persistent independent results after database close/reopen, and rollback after a controlled foreign-key insert failure.
- Generated `results/concurrency-verification.json` with the exact workload, per-case outcomes, and scope disclaimer.

### Verification

```text
node tests/integration/concurrency.test.js
Results: 7 passed, 0 failed

npm test
Total Suites: 11 | Passed: 11 | Failed: 0
```

This is the tested local single-process SQLite workload only; it is not evidence of production-scale capacity or behavior across multiple application processes.

## 2026-10-05 — Phase 7: Research Evidence Dashboard

### Implemented and Tested

- Replaced the generic dashboard content with an exercise evidence review showing backend-returned scenario/exercise IDs, objective statuses/points/evidence IDs, score fields, selected-objective event details, chronological timeline, and latest reset/health/residue record.
- Dashboard data loads through score, timeline, telemetry, scenario, and exercise APIs. Exercise detail now includes the latest reset record; malformed telemetry returns raw data plus `parse_error` for display instead of failing the event-list request.
- Added five view-model tests for passing, failing, missing-evidence, invalid-evidence, and failed-reset payloads. The API security suite verifies malformed event and persisted reset data responses.

### Verification

```text
node tests/unit/evidenceDashboard.test.js
Results: 5 passed, 0 failed

node tests/security/evidence-admission.test.js
Results: 19 passed, 0 failed
```

Values are sourced from backend responses; missing values display as unavailable. Browser verification loaded pass, fail, missing-evidence, invalid-evidence, and failed-reset fixtures through the actual server using a temporary SQLite database. At 1440px document width was 1425px; at a 390px mobile viewport it was 375px, with no horizontal overflow. Screenshots were inspected but not saved to the repository. Verification covers UI/API display behavior only, not learner performance.

```text
npm test
Total Suites: 12 | Passed: 12 | Failed: 0
```