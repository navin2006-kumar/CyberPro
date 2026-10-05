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
| **Objective Engine** | `tests/unit/objectiveEngine.test.js` | `ObjectiveEngine` rule evaluation against scoped telemetry | 13 tests covering all PLC-001 objectives, ownership/scope spoofing, invalid payloads/types, configured checks, and persisted evidence IDs |
| **Scoring Engine** | `tests/unit/scoringEngine.test.js` | `ScoringEngine` evidence-backed points and configured pass criteria | 11 tests covering score/objective thresholds, evidence gating, trace fields, and duration math |
| **Timeline Engine** | `tests/unit/timelineEngine.test.js` | `TimelineEngine` chronology & description formatting | 5 tests covering event formatting, relative offsets, and severity mapping |
| **Authentication** | `tests/unit/auth.test.js` | Bcrypt password hashing & credential checking | 5 tests covering hashing, salt uniqueness, and invalid password rejection |
| **RBAC Middleware** | `tests/unit/rbac.test.js` | `requireAuth` & `requireRole` middleware | 12 tests covering all role permutations and unauthenticated access denial |
| **Scenario Lifecycle** | `tests/integration/scenario-flow.test.js` | 9-step scenario exercise lifecycle in in-memory SQLite | End-to-end database verification, including exclusion of spoofed evidence and evidence ID persistence; does not run Docker |
| **Security Matrix** | `tests/security/rbac-enforcement.test.js` | Route privilege boundary defense | 9 tests verifying complete privilege separation |

**Suite Count**: 7 automated test suites. The test runner does not report a single assertion total.

### Phase 1 Verification Record (2026-10-05)
Focused commands executed in the project root:
```bash
node tests/unit/objectiveEngine.test.js
node tests/unit/scoringEngine.test.js
node tests/integration/scenario-flow.test.js
```
Observed results: **Objective Engine 13 passed, Scoring Engine 11 passed, Scenario Lifecycle passed through all 9 steps**. Full-suite result is recorded after the Phase 1 run below.

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

# Integration tests
node tests/integration/scenario-flow.test.js

# Security tests
node tests/security/rbac-enforcement.test.js
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
