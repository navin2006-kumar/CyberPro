# CyberPro Evidence Matrix

**Scope**: This matrix records the project’s implemented functionality, the evidence that was actually executed, and the status of each claim according to the project evidence taxonomy.

## Status taxonomy

- IMPLEMENTED: the functionality exists in code or configuration.
- VERIFIED: the behavior was executed in the project test suite and passed.
- PARTIALLY VERIFIED: the design is present and some checks exist, but the claim is not fully proven by runtime evidence.
- PROPOSED: future or aspirational direction, not established as implemented evidence.
- NOT VERIFIED: no recorded execution in this workspace supports the claim.
- NOT EXECUTED: the required live operational check was not run.

## Evidence matrix

| Claim | Status | Evidence | Scope and limitation |
|---|---|---|---|
| Objective evaluation matches scenario rules and retains evidence IDs | VERIFIED | `npm test` passed; `tests/unit/objectiveEngine.test.js` passed | This proves deterministic objective evaluation in the code and SQLite-backed workflow. It does not prove learner skill gains. |
| Scoring engine enforces configured thresholds and required-objective gates | VERIFIED | `npm test` passed; `tests/unit/scoringEngine.test.js` passed | Verified in the project’s controlled test environment. This is not a claim about student performance in a live classroom. |
| Replay engine detects changed telemetry, changed rule versions, and inconsistent persisted score traces | VERIFIED | `tests/unit/replayEngine.test.js` passed 7/7; `npm test` passed 12/12 | Verified against synthetic retained telemetry only. It is software-control-plane evidence, not real-world exercise replay. |
| Evidence dashboard renders pass/fail/missing/invalid/reset states from backend payloads | VERIFIED | `tests/unit/evidenceDashboard.test.js` passed 5/5; browser checks of desktop/mobile layouts were performed | This confirms UI state handling and data mapping. It does not prove improved learning or operational effectiveness. |
| Timeline generation reconstructs chronology from tombstone and telemetry data | VERIFIED | `tests/unit/timelineEngine.test.js` passed | Verified for the tested timeline logic in SQLite-backed scenarios. |
| Authentication and RBAC enforce role separation | VERIFIED | `tests/unit/auth.test.js` and `tests/unit/rbac.test.js` passed; `tests/security/rbac-enforcement.test.js` passed | Verified as application-level access control. It does not prove full production server hardening. |
| Evidence admission rejects spoofed, duplicate, malformed, and cross-user telemetry | VERIFIED | `tests/security/evidence-admission.test.js` passed 16/16; `npm test` passed 12/12 | This proves application-level admission checks in the tested environment. It does not guarantee live deployment security or container secret provisioning. |
| Multi-exercise concurrency preserves isolation and idempotent scoring | VERIFIED | `tests/integration/concurrency.test.js` passed 7/7; JSON result file in `results/concurrency-verification.json` | Verified in one Node process with file-backed SQLite; not a production-scale benchmark. |
| Scenario lifecycle completes end-to-end on SQLite-backed exercises | VERIFIED | `tests/integration/scenario-flow.test.js` passed | Verified for the project’s exercise lifecycle logic. It is not a live Docker or live-lab validation. |
| Reset engine rejects dirty or unhealthy state in a mocked reset path | VERIFIED | `tests/unit/resetEngine.test.js` passed 6/6 | This is controlled verification of the reset engine logic, not real Docker reset execution. |
| Real Docker reset succeeds and proves clean-state lab recovery | NOT EXECUTED | `results/reset-verification.json` records `status: "not_executed"` and `clean_state_verified: false` | Docker Engine was unavailable; therefore no real reset or live containment claim is supported. |
| Network containment is fully isolated | NOT VERIFIED | `results/network-containment.json` marks runtime tests as `NOT TESTED` | Configuration review found risks and stale subnets, but there was no live Docker runtime validation. |
| The implementation is production-hardened and secure for deployment | PARTIALLY VERIFIED | Static review and app-level checks exist; live Docker runtime was not available | The codebase includes intended hardening patterns, but deployment-level assurance remains pending. |
| The system proves student learning improvement or defensive skill gains | NOT VERIFIED | No executed learner-performance study, pre/post assessment, or controlled trial exists in this workspace | This must not be asserted as a verified research result. |
| The platform proves real-world industrial containment or production security | NOT VERIFIED | No live telemetry or packet-level runtime validation was executed | The design intent and static configuration evidence do not equal real-world proof. |
| The project is ready for production deployment as a secure industrial system | NOT VERIFIED | No live Docker deployment or operator validation was executed | A deployment claim requires operational evidence beyond the control-plane test suite. |
| Evidence dashboard is the final research artifact for all outcomes | PARTIALLY VERIFIED | Dashboard is implemented and tests pass | The dashboard is verified as a read-only evidence display, not as proof of educational or operational effectiveness. |

## Single-sentence conclusion

The project has strong implementation and verified control-plane evidence, but it does not have verified evidence for live Docker containment, real reset execution, production security, or learner outcomes. The repository should only speak to what was executed and recorded in the test suite and results artifacts.
