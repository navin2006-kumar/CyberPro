# CyberPro Research Paper Revision Report (v2)

**Project**: CyberPro: Scenario-Driven Cyber Range for Safe, Measurable Defensive Skills Practice  
**Project ID**: P282 / P-2024-28-CS-118  
**Revised Manuscript Title**: *Evidence-Bound Scoring and Verification in a Scenario-Driven Cyber Range*  
**Output Documents**:
- `P282_Revised_Manuscript_v2.docx`
- `docs/paper_revision_report.md`  
**Date**: October 6, 2026  

---

## 1. Files Inspected

### A. Reference & Guidance Documents
1. `P282_Revised_Manuscript_v1.docx` — Primary editable predecessor manuscript (49 paragraphs, 1 table, 1 inline figure).
2. `P282_Revised_Manuscript_v1.pdf` — Compiled predecessor manuscript layout, formatting, typography, and page structure.
3. `P282_Submission_Guide_v1.pdf` — Controlling instruction and boundary document from Dean, School of Innovation, KGISL Institute of Technology (16 pages).
4. `RE__Action_Required__Review_and_Develop_Your_SoI_Project_Manuscript_—_P-2024-28-CS-118_—_Cyber_Range.zip` — Source archive package containing reference documents.

### B. Project Implementation & Source Files (`CyberPro/My Cyber pro/`)
1. `package.json` & `package-lock.json` — Dependencies, Node configuration (`cyber-lab-platform@1.0.0`), scripts (`npm test`, `npm start`, `npm run dev`, `npm run migrate`).
2. `server.js` — Core Express application entrypoint, middleware, database initialization, session handling.
3. `db.js` & `backend/migrate.js` — SQLite database schema setup, tables (`scenarios`, `scenario_objectives`, `exercise_sessions`, `telemetry_events`, `objective_results`, `exercise_scores`, `reset_records`, `debrief_responses`, `users`).
4. `scenarios/PLC-001/scenario.json` — PLC-001 scenario manifest defining the 4 objectives, topology, scoring conditions, reset verification specifications, and allowed actions.
5. `backend/routes/telemetry.js` — Ingestion route (`POST /api/telemetry/event`), container secret validation, session ownership, status checking, payload validation.
6. `backend/engines/objectiveEngine.js` — Objective detection evaluation, event ID matching, field checks, scoped validation details.
7. `backend/engines/scoringEngine.js` — Score aggregation, threshold evaluation, required-objective gates, rule hashing (`sha256`), score trace persistence, deterministic replay.
8. `backend/engines/resetEngine.js` — Environment snapshot baseline capture, Compose teardown/recreation, health checks, residue probe checks, reset abstention.
9. `backend/engines/timelineEngine.js` — Chronological audit timeline synthesis.
10. `backend/routes/reports.js` — Score reporting, After-Action Report (AAR) generation, debrief submission, replay endpoint (`GET /api/reports/:exerciseId/replay`).
11. `backend/routes/scenarios.js` — Scenario listing, objective metadata retrieval.
12. `backend/middleware/auth.js` — Authentication (`requireAuth`) and role-based access control (`requireRole`).
13. `labs/oilsprings/docker-compose.yml` — Multi-subnet industrial lab topology (OpenPLC, ScadaBR, IDS, Collector, Pentest terminal, Router).
14. `labs/oilsprings/Dockerfile` — OpenPLC container build definition.
15. `public/dashboard.html`, `public/js/dashboard.js`, `public/js/evidence-dashboard-model.js` — Research evidence dashboard model and UI rendering.

### C. Test Suites & Execution Scripts (`tests/`)
1. `tests/run-all.js` — Master automated test runner executing 12 test suites.
2. `tests/unit/objectiveEngine.test.js` — Unit tests for objective matching and event linkage (14 passed).
3. `tests/unit/scoringEngine.test.js` — Unit tests for scoring logic, threshold gates, and rationale (11 passed).
4. `tests/unit/replayEngine.test.js` — Replay consistency and drift detection tests (7 passed).
5. `tests/unit/evidenceDashboard.test.js` — Dashboard model state mapping tests (5 passed).
6. `tests/unit/timelineEngine.test.js` — Timeline synthesis unit tests (5 passed).
7. `tests/unit/auth.test.js` — Password hashing and session authentication unit tests (5 passed).
8. `tests/unit/rbac.test.js` — Role-based authorization middleware unit tests (12 passed).
9. `tests/unit/resetEngine.test.js` — Mocked reset engine tests for dirty state and residue rejection (6 passed).
10. `tests/integration/scenario-flow.test.js` — Full end-to-end scenario lifecycle integration test.
11. `tests/integration/concurrency.test.js` — Multi-exercise concurrent data integrity test (7 passed).
12. `tests/security/rbac-enforcement.test.js` — Endpoint access control matrix enforcement (9 passed).
13. `tests/security/evidence-admission.test.js` — Comprehensive evidence admission security tests.

### D. Retained Results & Documentation (`results/` & `docs/`)
1. `results/final-verification.json` — Comprehensive verification audit log.
2. `results/replay-verification.json` — 7-case synthetic replay verification log.
3. `results/concurrency-verification.json` — 7-case multi-exercise concurrency verification log.
4. `results/reset-verification.json` — Reset verification status recording Docker unavailability.
5. `results/network-containment.json` — Network topology audit documenting static review and unexecuted runtime tests.
6. `docs/evidence-matrix.md` — Project claim status taxonomy and evidence matrix.
7. `docs/paper-results-ready.md` — Executed and paper-ready results register.
8. `docs/paper-mapping.md` — Academic traceability mapping between manuscript sections and codebase.
9. `docs/reproducibility.md` — Research protocol and experimental reproducibility instructions.
10. `docs/final-verification-report.md` — Environment, Docker, and release gate verification summary.
11. `docs/baseline-verification.md` & `docs/baseline-test-report.md` — Pre-existing baseline test reports.
12. `docs/risk-register.md`, `docs/scenarios.md`, `docs/scoring.md`, `docs/security.md`, `docs/testing.md`.

---

## 2. Project Version and Commit Inspected

- **Repository Source Snapshot**: 213 files matching public Git main commit:  
  `8f426d631f423176063bf2ffac9d2af904f308c7`
- **Node.js Environment**: `v24.20.0`
- **npm Version**: `11.4.1`
- **SQLite Engine**: Node.js built-in SQLite `3.53.4` (sqlite3 driver `3.44.2`)
- **Docker Daemon (Installed but Blocked on Build)**: `29.8.0`

---

## 3. Old Manuscript Claims Reviewed & Claim/Evidence Matrix

Every technical claim in the previous manuscript and project milestone documentation was classified under the project evidence standard:

| Claim Description | Source Document | Current Implementation Status | Executed Evidence | Verification Status | Allowed in Revised Results? | Rewriting / Handling Instruction |
|---|---|---|---|---|---|---|
| Platform improves student threat detection latency from 6 min to 4 min | Stage milestone deck | None; timestamps in fixtures are fixed static test inputs | None; no time-series trial data exists | **UNSUPPORTED / HISTORICAL** | **NO** | Removed from results; noted in Section 2 as unverified historical claim. |
| Platform validated with 7 users achieving 90% task completion | Stage milestone deck | None; linked feedback sheet contains only 2 opinion rows | 2 survey rows with rating 4; no trial log | **UNSUPPORTED / HISTORICAL** | **NO** | Removed from results; documented as opinion survey only, not an empirical sample. |
| System proves improved student defensive skill or educational effectiveness | Manuscript v1 / Stage decks | None; no pre/post assessments or learning metrics | No student trials or pedagogical trials | **NOT VERIFIED** | **NO** | Explicitly disclaimed in Abstract, Section 1, Section 8, and Section 10. |
| System proves real-world OT / Modbus network containment | Stage decks / Scenario | Docker Compose network definitions with bridge drivers | `results/network-containment.json` shows runtime tests NOT TESTED | **NOT VERIFIED** | **NO** | Disclaimed; labeled as format string submission in Objective 4. |
| Clean-state reset restores containers and purges all malware residue | Manuscript v1 / ResetEngine | `ResetEngine` logic with baseline comparison and residue probes | `tests/unit/resetEngine.test.js` passed 6/6 mocked tests; `results/reset-verification.json` records NOT EXECUTED | **PARTIALLY VERIFIED (Software Logic Only)** | **PARTIAL** | Reported strictly as software control flow; real Docker reset explicitly marked NOT EXECUTED. |
| Received modules met only 5 of 16 declared control requirements | Manuscript v1 / Submission Guide | Ingestion routes, scoring engine, reset engine in received state | 16 paired fixtures in test harness; 5 passed, 11 failed | **VERIFIED** | **YES** | Reported as primary regression baseline in Section 5 and Section 8. |
| Corrected candidate implementation satisfies 16 of 16 declared requirements | Manuscript v1 / Candidate patch | Four patched modules (`telemetry.js`, `objectiveEngine.js`, `scoringEngine.js`, `resetEngine.js`) | 16 paired fixtures in test harness; 16 passed | **VERIFIED** | **YES** | Reported as core verification achievement in Section 8 (Table 2). |
| 64 scripted exercises verify 256 score stages, 224 event links, and 64 raw retention checks | Manuscript v1 / Submission Guide | Scripted runner across 64 deterministic exercise fixtures | 64 sequential test runs; 256 stage assertions, 224 foreign key links, 64 raw checks | **VERIFIED** | **YES** | Reported as deterministic control-plane fixture results; explicitly not human subjects. |
| 17 loopback HTTP security and admission checks pass | Manuscript v1 / Submission Guide | Active Express HTTP server on loopback interface | 17 HTTP requests tested covering auth, CSRF, spoofing, ownership, reset | **VERIFIED** | **YES** | Reported as loopback integration verification in Section 8. |
| Disk-backed SQLite database retains records after close and reopen | Manuscript v1 / Submission Guide | Temporary file-backed SQLite database operations | Single row inserted, DB closed, reopened, and queried | **VERIFIED** | **YES** | Reported as ordinary file persistence verification in Section 8. |
| Replay engine detects telemetry tampering, missing events, and rule drift | Unit test suite | `scoringEngine.js` replay method and rule hash | `tests/unit/replayEngine.test.js` passed 7/7 synthetic replay cases | **VERIFIED** | **YES** | Reported as software replay verification in Section 6 and Section 8. |
| Multi-exercise concurrency preserves data integrity and score idempotency | Integration test suite | Transactional SQLite schema and foreign key constraints | `tests/integration/concurrency.test.js` passed 7/7 test cases | **VERIFIED** | **YES** | Reported as single-process file-backed SQLite concurrency check. |
| Master automated test suite passes cleanly | `tests/run-all.js` | 12 automated test suites in repository | `npm test` passed: 12/12 suites, 0 failures | **VERIFIED** | **YES** | Reported as overall repository verification status. |
| Production-hardened enterprise deployment readiness | Early project decks | Express app with session cookies; 31 npm audit vulnerabilities | `results/final-verification.json` logs 31 unresolved npm vulnerabilities | **UNSUPPORTED** | **NO** | Explicitly disclaimed in Section 10 (Limitations). |

---

## 4. Claims Removed

The following unsupported, speculative, or conflated claims were completely excised from the paper:
1. **7 Student Users**: Removed all assertions that 7 learners completed the lab.
2. **90% Completion Rate**: Removed claims of a 90% task success rate.
3. **Detection Latency Reduction (6 min → 4 min)**: Removed claims of measured human detection speed improvements.
4. **Educational & Skill Gain Claims**: Removed all statements implying that CyberPro proves learner skill acquisition, pedagogical superiority, or training effectiveness.
5. **Real Industrial / Modbus Attack Execution**: Removed claims that live cyberattacks or penetration testing were executed against running PLC hardware.
6. **Real Docker Clean-State Reset Certification**: Removed claims that container teardown and reconstitution were validated in live Docker operations.
7. **Complete Network Isolation / Containment**: Removed claims that the OilSprings lab is fully isolated from external networks or cross-subnet egress.
8. **Enterprise / Production Security Certification**: Removed claims that the platform is production-ready, invulnerable, or certified under commercial standards.
9. **AI Model Performance Evaluation**: Removed any claims that external generative AI models or intelligent tutoring systems were experimentally benchmarked.

---

## 5. Claims Rewritten and Qualified

1. **"64 Exercises" → Deterministic Scripted Fixtures**: Clarified that the 64 exercises are automated, synthetic test fixtures executed to verify scoring determinism, not 64 human trainees.
2. **Objective 3 (50-Character Analysis)**: Rewritten to emphasize that checking for 50 trimmed string characters validates submission *format* rather than the substantive quality of incident analysis.
3. **Objective 4 (Containment Action)**: Rewritten to clarify that selecting a containment action label (`block_ip`, `isolate_container`) is a format-level selection, not proof of verified network isolation.
4. **Reset Engine Liveness vs. Clean-State**: Rewritten to emphasize that HTTP service responsiveness is merely liveness evidence and that the candidate *abstains* from certifying clean state when residue probes or baseline data are missing.
5. **16/16 Requirements Passed**: Qualified as a finite regression comparison against 16 investigator-selected counterexamples, explicitly stating that it does not represent an exhaustive security audit or penetration test.

---

## 6. New Verified Results Documented in Revised Manuscript (v2)

The revised paper incorporates exclusively verified, reproducible results:
- **Requirement Regression**: Received implementation passed 5/16; corrected candidate passed 16/16.
- **Deterministic Exercise Progression**: 64 scripted exercises produced 256 verified score stages (25, 50, 75, and 75/100).
- **Evidence Traceability**: 224 event-to-objective links were verified as unique and traceable to accepted raw telemetry rows.
- **Raw Evidence Immutability**: 64 raw retention checks confirmed that score re-calculation does not alter underlying `telemetry_events` rows.
- **Loopback HTTP Verification**: 17 of 17 loopback HTTP security checks passed, verifying authentication, CSRF, spoofing rejection, ownership boundaries, and reset refusal.
- **Disk Persistence**: 1 retained row verified in file-backed SQLite after normal closure and reopening.
- **Score Replay & Drift Detection**: 7 of 7 replay test cases passed, proving detection of missing, altered, or duplicate events, and rule version drift.
- **Master Test Suite Execution**: 12 of 12 test suites passed cleanly via `npm test`.

---

## 7. Remaining Unsupported Claims & Boundaries

The manuscript explicitly maintains the following unverified boundaries:
- **Human Study**: Exactly 0 human participants were evaluated in this study.
- **Docker Execution**: Exactly 0 live Docker containers were executed during this evaluation due to a container build failure (`./appdata/openplc.db`).
- **AI API Calls**: Exactly 0 external AI-provider calls were executed within the range.
- **Physical Equipment**: Zero physical PLCs, RTUs, or industrial hardware devices were evaluated.
- **Packet-Level Traffic**: Zero live network packet captures (PCAP) were generated during the bounded test harness run.

---

## 8. Current Limitations Explicitly Disclosed

Section 10 of the revised manuscript details:
1. Study bounded to software/control-plane verification.
2. Deterministic synthetic test fixtures rather than human learner cohorts.
3. Absence of statistical probability or failure distribution inference.
4. Docker Engine build failure blocking live container lifecycle validation.
5. Static configuration review of network topology without runtime egress testing.
6. Telemetry authority bounded by a static shared secret (`CONTAINER_SECRET`).
7. Absence of cryptographic hardware attestation or network-layer replay prevention.
8. Local SQLite database file remains mutable by privileged OS administrators.
9. 31 unresolved npm vulnerabilities in legacy dependencies.

---

## 9. AI Assistance Disclosure Status

A complete and transparent AI Assistance Disclosure is incorporated as an unnumbered section preceding References in `P282_Revised_Manuscript_v2.docx`:
- **Tooling Used**: OpenAI ChatGPT and Codex.
- **Scope of Assistance**: Substantive technical assistance, including:
  1. Static security analysis and source review across all 213 files.
  2. Code recovery and patching of the four backend modules.
  3. Test harness and deterministic fixture script design.
  4. Tabular data synthesis and verification metrics extraction.
  5. Figure 1 trace output graphic generation.
  6. Manuscript restructuring and alignment with scientific evidence boundaries.
- **Human Author Responsibility**: The author team independently reviewed, verified, and approved all code, results, citations, and text, assuming full intellectual responsibility.

---

## 10. Final Verification Checklist

- [x] **New Document Created**: `P282_Revised_Manuscript_v2.docx` created without overwriting v1.
- [x] **Revision Report Created**: `docs/paper_revision_report.md` created.
- [x] **Title Consistency**: "Evidence-Bound Scoring and Verification in a Scenario-Driven Cyber Range" used consistently.
- [x] **Section Structure Followed**: Follows the required 12-section structure plus Abstract, Keywords, AI Disclosure, References, and Appendix A.
- [x] **No Placeholder Text**: Document checked for `TODO`, `TBD`, `placeholder`, `XXXX`, `???`; zero occurrences found.
- [x] **Numeric Consistency**:
  - Requirements: 5/16 received vs. 16/16 candidate
  - Exercises: 64 deterministic runs
  - Score stages: 256 checks (25, 50, 75, 75/100)
  - Event links: 224 unique links
  - Raw retention: 64 checks
  - HTTP checks: 17/17 passed
  - Persistence: 1 row retained
  - Human participants: 0
  - Live Docker runs: 0
  - AI API calls: 0
- [x] **Formatting Standards**: A4 dimensions, clean 0.75" margins, Times New Roman typography, professional styled tables (Table 1 & Table 2), embedded Figure 1 with caption.
- [x] **Ready for Human Review**: Both documents are complete, internally consistent, scientifically defensible, and ready for human author review and reconciliation.
