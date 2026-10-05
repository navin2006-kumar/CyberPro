# CyberPro Automated Testing Strategy & Guide

**Project**: CyberPro: Scenario-Driven Cyber Range  
**Document**: Quality Assurance and Verification Manual  
**Version**: 2.0  

---

## 1. Testing Philosophy

The CyberPro testing strategy prioritizes **end-to-end reliability, mathematical scoring accuracy, and security posture validation**. Testing is organized into three distinct tiers:

1. **Unit Testing**: Tests core algorithms (objective rule evaluation, score calculation, timeline generation, bcrypt authentication, and RBAC middleware) in isolation with mock data.
2. **Integration Testing**: Exercises the end-to-end cyber range lifecycle within an in-memory SQLite database without requiring Docker dependencies.
3. **Security Testing**: Audits authorization boundaries, role escalation vectors, and unauthenticated endpoint denial.

---

## 2. Test Suites Summary

| Suite Name | Path | Target Component | Assertions |
|---|---|---|---|
| **Objective Engine** | `tests/unit/objectiveEngine.test.js` | `ObjectiveEngine` rule evaluation against scoped telemetry | 14 tests covering all PLC-001 objectives, ownership/scope spoofing, invalid payloads/types, configured checks, validation details, and evidence IDs |
| **Scoring Engine** | `tests/unit/scoringEngine.test.js` | `ScoringEngine` evidence-backed points and configured pass criteria | 11 tests covering score/objective thresholds, evidence gating, trace fields, and duration math |
| **Score Replay** | `tests/unit/replayEngine.test.js` | Read-only replay from retained telemetry and persisted score traces | 7 synthetic SQLite cases covering exact replay, event mutations/order, invalid evidence, and rule-version changes |
| **Evidence Dashboard Model** | `tests/unit/evidenceDashboard.test.js` | Backend response mapping for evidence dashboard states | 5 tests for passing, failing, missing evidence, invalid evidence, and failed reset data |
| **Multi-Exercise Concurrency** | `tests/integration/concurrency.test.js` | Interleaved telemetry, simultaneous/repeated scoring, database reopen and rollback | 7 file-backed SQLite integrity checks across three exercise/user pairs; not a capacity benchmark |
| **Timeline Engine** | `tests/unit/timelineEngine.test.js` | `TimelineEngine` chronology & description formatting | 5 tests covering event formatting, relative offsets, and severity mapping |
| **Authentication** | `tests/unit/auth.test.js` | Bcrypt password hashing & credential checking | 5 tests covering hashing, salt uniqueness, and invalid password rejection |
| **RBAC Middleware** | `tests/unit/rbac.test.js` | `requireAuth` & `requireRole` middleware | 12 tests covering all role permutations and unauthenticated access denial |
| **Reset Engine** | `tests/unit/resetEngine.test.js` | Baseline, Docker metadata/config hashes, state comparison, residue and health gates | 6 mocked-reset tests; no Docker daemon is used |
| **Scenario Lifecycle** | `tests/integration/scenario-flow.test.js` | 9-step scenario exercise lifecycle in in-memory SQLite | End-to-end database verification, including exclusion of spoofed evidence and evidence ID persistence; does not run Docker |
| **Security Matrix** | `tests/security/rbac-enforcement.test.js` | Route privilege boundary defense | 9 tests verifying complete privilege separation |
| **Evidence Admission** | `tests/security/evidence-admission.test.js` | Telemetry, score and replay ownership boundary | 17 explicit ACCEPT/REJECT tests using real HTTP routes and in-memory SQLite |

**Suite Count**: 12 automated test suites. The test runner does not report a single assertion total.

### Phase 1 Verification Record (2026-10-05)
Focused commands executed in the project root:
```bash
node tests/unit/objectiveEngine.test.js
node tests/unit/scoringEngine.test.js
node tests/integration/scenario-flow.test.js
```
Observed results: **Objective Engine 13 passed, Scoring Engine 11 passed, Scenario Lifecycle passed through all 9 steps**. Full-suite result is recorded after the Phase 1 run below.

### Phase 2 Verification Record (2026-10-05)
Commands executed from the project root:
```bash
node tests/security/evidence-admission.test.js
npm test
```
Observed results:
```text
Evidence Admission: 16 passed, 0 failed
Total Suites: 8 | Passed: 8 | Failed: 0
```
The new cases define acceptance for owner-submitted student events and secret-authenticated IDS events, and rejection for spoofed sources, wrong exercise/scenario/type, invalid or malformed payloads, forged objective IDs, exact duplicates/replays, non-owner evidence/score requests, and cross-user contamination.

These tests verify application-level behavior only. They do not establish complete security assurance or verify a running Docker deployment.

### Phase 5 Replay Verification Record (2026-10-05)
Command executed:
```bash
node tests/unit/replayEngine.test.js
```
Observed result: `Results: 7 passed, 0 failed`. The suite writes [results/replay-verification.json](../results/replay-verification.json) from synthetic retained telemetry in in-memory SQLite. It verifies software/control-plane replay consistency only; it does not measure learner performance.

Full-suite command: `npm test`
Observed result: `Total Suites: 10 | Passed: 10 | Failed: 0`.

### Phase 6 Multi-Exercise Integrity Record (2026-10-05)
Command executed:
```bash
node tests/integration/concurrency.test.js
```
Observed result: `Results: 7 passed, 0 failed`. The suite uses three users and three exercises in one Node process against a temporary file-backed SQLite database. It interleaves six telemetry inserts, runs scoring concurrently and repeatedly, checks duplicate IDs, closes/reopens the database, replays all three scores, and rolls back an intentional foreign-key failure. The recorded scope is the tested workload only, not production-scale capacity.

The report is [results/concurrency-verification.json](../results/concurrency-verification.json).

Full-suite command: `npm test`
Observed result: `Total Suites: 11 | Passed: 11 | Failed: 0`.

### Phase 7 Evidence Dashboard Record (2026-10-05)
Command executed:
```bash
node tests/unit/evidenceDashboard.test.js
```
Observed result: `Results: 5 passed, 0 failed`. Fixture cases cover backend payloads for passing, failing, missing evidence, invalid evidence, and a failed reset. API tests additionally verify malformed telemetry and stored reset health/residue responses.

Browser verification used the actual CyberPro server and a separate temporary SQLite database seeded only with synthetic UI fixtures. Pass, fail, missing-evidence, invalid-evidence, and failed-reset records were loaded through the real authenticated APIs. At 1440px the document width was 1425px; at 390px it was 375px, with no horizontal overflow. Screenshots were visually inspected in the browser tool but were not saved into the repository.

Full-suite command: `npm test`
Observed result: `Total Suites: 12 | Passed: 12 | Failed: 0`.

### Phase 3 Reset Verification Record (2026-10-05)
Command executed:
```bash
node tests/unit/resetEngine.test.js
```
Observed result: `Results: 6 passed, 0 failed`. All cases are labeled **MOCKED RESET TEST**; Docker snapshots and Compose commands are mocked, while temporary files/config fixtures are actually created and restored by the test.

Full-suite command: `npm test`
Observed result: `Total Suites: 9 | Passed: 9 | Failed: 0`.

**REAL DOCKER RESET TEST: NOT EXECUTED.** `docker info` could not connect to the Docker Desktop Linux engine, so no real exercise modifications, reset, or live health check were run. [results/reset-verification.json](../results/reset-verification.json) records `status: not_executed` and `clean_state_verified: false`.

---

## 3. Running the Test Suites

### Run All Tests via NPM (Recommended)
To execute all test suites sequentially with formatted summary table output:
```bash
npm test
```

### Run Individual Test Suites
```bash
# Unit tests
node tests/unit/objectiveEngine.test.js
node tests/unit/scoringEngine.test.js
node tests/unit/timelineEngine.test.js
node tests/unit/auth.test.js
node tests/unit/rbac.test.js
node tests/unit/resetEngine.test.js
node tests/unit/replayEngine.test.js
node tests/unit/evidenceDashboard.test.js

# Integration tests
node tests/integration/scenario-flow.test.js
node tests/integration/concurrency.test.js

# Security tests
node tests/security/rbac-enforcement.test.js
node tests/security/evidence-admission.test.js
```

---

## 4. Continuous Integration (CI) Automation

For GitHub Actions or local pre-commit hooks, add the following workflow step:

```yaml
name: CyberPro CI Verification
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Run automated test suite
        run: npm test
```
The suites use Node's built-in `assert` for checks and also require installed project dependencies, including `uuid`, `bcrypt`, and `sqlite3`. Install dependencies from this directory with `npm install` before running the tests. The automated lifecycle suite does not require a running Docker daemon and does not verify live container resets or health checks.
