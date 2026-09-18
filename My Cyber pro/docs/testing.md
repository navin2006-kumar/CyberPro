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
| **Objective Engine** | `tests/unit/objectiveEngine.test.js` | `ObjectiveEngine` rule evaluation against mock telemetry | 8 tests covering protocol matching, text length boundaries, and event ID binding |
| **Scoring Engine** | `tests/unit/scoringEngine.test.js` | `ScoringEngine` point aggregation and pass criteria | 6 tests covering threshold enforcement, required objectives, and duration math |
| **Timeline Engine** | `tests/unit/timelineEngine.test.js` | `TimelineEngine` chronology & description formatting | 5 tests covering event formatting, relative offsets, and severity mapping |
| **Authentication** | `tests/unit/auth.test.js` | Bcrypt password hashing & credential checking | 5 tests covering hashing, salt uniqueness, and invalid password rejection |
| **RBAC Middleware** | `tests/unit/rbac.test.js` | `requireAuth` & `requireRole` middleware | 12 tests covering all role permutations and unauthenticated access denial |
| **Scenario Lifecycle** | `tests/integration/scenario-flow.test.js` | Full 9-step scenario exercise lifecycle in SQLite | End-to-end verification from provisioning to reset |
| **Security Matrix** | `tests/security/rbac-enforcement.test.js` | Route privilege boundary defense | 9 tests verifying complete privilege separation |

**Total Coverage**: 7 Test Suites, 51 Assertions, 0 Failures.

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
All tests are dependency-free (using built-in Node `assert`), executing in $< 15$ seconds with zero external network requirements.
