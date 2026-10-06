# Final Paper Verification Report

**Project Title**: CyberPro: Scenario-Driven Cyber Range for Safe, Measurable Defensive Skills Practice  
**Project Identifier**: P282 / P-2024-28-CS-118  
**Manuscript Title**: *Evidence-Bound Scoring and Verification in a Scenario-Driven Cyber Range*  
**Output Document**: `P282_Final_Submission_Manuscript.docx`  
**Date**: October 6, 2026  
**Status**: SUBMISSION-READY (Subject only to human author confirmation items listed in Section 16)

---

## 1. Files Inspected
1. `P282_Revised_Manuscript_v1.docx` / `P282_Revised_Manuscript_v2.docx` — Predecessor drafts and revision structures.
2. `P282_Submission_Guide_v1.pdf` — Institutional guidelines from School of Innovation, KGISL Institute of Technology.
3. `My Cyber pro/package.json` & `package-lock.json` — Environment dependencies, script entrypoints (`npm test`, `npm start`).
4. `My Cyber pro/server.js` — Core Express application, middleware routing, SQLite database connection, session handling.
5. `My Cyber pro/backend/migrate.js` & `My Cyber pro/db.js` — Database schemas and migrations (`scenarios`, `exercise_sessions`, `telemetry_events`, `objective_results`, `exercise_scores`, `reset_records`).
6. `My Cyber pro/scenarios/PLC-001/scenario.json` — Scenario definition manifest (4 objectives, 25 points each, passing criteria).
7. `My Cyber pro/backend/routes/telemetry.js` — Telemetry ingestion route, container secret authorization, session validation.
8. `My Cyber pro/backend/engines/objectiveEngine.js` — Objective detection rules, event ID linkage, trimmed string checks.
9. `My Cyber pro/backend/engines/scoringEngine.js` — Score aggregation, threshold gates, SHA-256 rule fingerprinting.
10. `My Cyber pro/backend/engines/resetEngine.js` — Reset baseline capture, health checks, residue probe assertions, abstention logic.
11. `My Cyber pro/backend/engines/timelineEngine.js` — Event timeline generation.
12. `My Cyber pro/backend/routes/reports.js` — Replay verification endpoint (`GET /api/reports/:exerciseId/replay`), After-Action Reports.
13. `My Cyber pro/tests/run-all.js` — Master automated test runner executing all 12 test suites.
14. `figures/figure1_trace_output.png` — Execution score progression visualization across 64 deterministic runs.
15. `results/` & `docs/` — Verification registers (`replay-verification.json`, `concurrency-verification.json`, `final-verification.json`, `improvement-log.md`).

---

## 2. Project Version Inspected
- **Repository Snapshot**: 213 files corresponding to public Git commit `8f426d631f423176063bf2ffac9d2af904f308c7`.
- **Node.js Environment**: `v24.20.0`
- **npm Version**: `11.4.1`
- **SQLite Engine**: Node.js built-in SQLite `3.53.4` (sqlite3 driver `3.44.2`).
- **Operating System Host**: Windows 11 / x86_64.

---

## 3. Previous Manuscript Inspected
- Reviewed `P282_Revised_Manuscript_v1.docx` and `v2`.
- Confirmed that previous drafts contained unverified historical claims (such as 7 student users, 90% task completion, and 6-to-4-minute latency improvements) derived from early project slide decks rather than recorded experimental logs.
- Identified that the earlier manuscripts lacked an integrated, single-narrative structure and needed complete unification into a natural, academic author voice.

---

## 4. Submission Guide Inspected
- Examined the 16-page `P282_Submission_Guide_v1.pdf`.
- Verified the mandatory directive: *"Rewrite the paper as one single consolidated draft of the final implementation, in the authors' own language."*
- Verified strict boundaries regarding what may be claimed (software control-plane verification) versus what must be explicitly disclaimed (human learning outcomes, real industrial plant containment, physical hardware validation).

---

## 5. Evidence and Results Inspected
- **Regression Suite**: 16 paired fixtures evaluated across the received prototype versus the candidate implementation.
- **Scripted Exercise Traces**: 64 sequential test runs verifying four-stage objective score progression.
- **Score Assertions**: 256 stage assertions (25 -> 50 -> 75 -> 75/100 points).
- **Evidence Linkage**: 224 unique foreign-key links between objective results and accepted raw telemetry events.
- **Raw Evidence Retention**: 64 verification checks confirming 0 mutations to underlying raw events during score recalculation.
- **Loopback HTTP Tests**: 17 live HTTP assertions confirming session security, CSRF protection, and endpoint admission rules.
- **File Persistence**: 1 retained database row verified across a clean SQLite database close and reopen.
- **Master Test Suite**: 12 of 12 test suites passed cleanly (`npm test`, 107 total test assertions, 0 failures).

---

## 6. Major Changes Made
1. **Unified Narrative Structure**: Eliminated all revision diary framing ("in revision 1 we did", "after mentor feedback", "action 1, action 2"). Structured the manuscript into a single coherent research narrative:
   $$\text{Problem} \longrightarrow \text{Research Gap} \longrightarrow \text{Architecture} \longrightarrow \text{Control Design} \longrightarrow \text{Implementation} \longrightarrow \text{Methodology} \longrightarrow \text{Results} \longrightarrow \text{Discussion} \longrightarrow \text{Limitations} \longrightarrow \text{Conclusion}$$
2. **Authentic Academic Voice**: Authored the entire manuscript in natural, clear academic English fitting an early-career undergraduate engineering team. Removed artificial AI buzzwords, repetitive rhetorical transitions, and exaggerated claims.
3. **Formal Control Taxonomy**: Explicitly formalized the 16 declared control requirements and their mapping to the audited flaws in the received prototype (Table 1).
4. **Clean Tabular and Graphical Integration**: Embedded Table 1 (Control Requirements Comparison), Table 2 (Quantitative Evaluation Summary), and Figure 1 (`figures/figure1_trace_output.png`) with descriptive, evidence-bounded captions.

---

## 7. Unsupported Claims Removed
The following historical or unverified claims were permanently removed from the experimental results sections:
- ❌ **"Validated across 6 or 7 student users"**: Removed from results; feedback records show only 2 opinion survey rows with no recorded trial logs.
- ❌ **"90% task completion rate"**: Removed; no denominator or cohort logs exist.
- ❌ **"Reduced detection time from 6 minutes to 4 minutes"**: Removed; timestamp differences in test fixtures are static test inputs, not human trial measurements.
- ❌ **"Demonstrated student skill improvement or pedagogical efficacy"**: Disclaimed; no human educational trial was conducted.
- ❌ **"Validated live Modbus network containment or physical PLC isolation"**: Disclaimed; network containment was reviewed statically and marked not tested at runtime.
- ❌ **"Production-ready or complete security"**: Disclaimed; 31 legacy npm audit vulnerabilities and shared-secret boundaries remain.

---

## 8. New Results Included
The paper strictly reports verified, reproducible figures:
- **Baseline Requirement Fulfillment**: 5 / 16 (31.3%) in the received prototype.
- **Candidate Requirement Fulfillment**: 16 / 16 (100.0%) in the corrected implementation.
- **Scripted Exercise Runs**: 64 automated runs.
- **Score-Stage Assertions**: 256 / 256 passing checks.
- **Evidence Links**: 224 unique foreign-key links to raw telemetry events.
- **Raw Retention**: 64 / 64 checks confirming zero mutation of raw telemetry.
- **Loopback HTTP Checks**: 17 / 17 passing requests.
- **Persistence Verification**: 1 retained row verified after clean file close and reopen.
- **Repository Master Tests**: 12 / 12 test suites passing (107 individual tests).

---

## 9. Figures Checked
- **Figure 1**: Embedded `figures/figure1_trace_output.png` at high resolution (5.4 inches width).
- **Caption**: Explicitly clarifies that the alternating 75 vs. 100 scores reflect programmatic inclusion of the optional containment action in even-indexed runs, demonstrating deterministic rubric evaluation rather than an empirical human score distribution.
- **Integrity**: Figure is referenced and discussed in the text of Section 8.2.

---

## 10. Tables Checked
- **Table 1**: 12 rows × 5 columns detailing the 11 identified flaws in the received prototype and candidate remediation controls.
- **Table 2**: 11 rows × 4 columns summarizing the quantitative verification metrics and explicit interpretation boundaries.
- **Formatting**: Clear borders, subtle header background fills (`#F1F5F9`), alternating row shading, explicit cell margins, and proper captioning.

---

## 11. References Checked
All 5 references from the academic foundation were verified for bibliographic completeness, correct authors, titles, venues, years, and valid DOIs:
1. `[1]` Yamin et al., *Computers & Security*, 2020 (Cyber range taxonomy).
2. `[2]` Chindrus & Caruntu, *Information*, 2023 (Red/blue competition platform).
3. `[3]` Stouffer et al., *NIST SP 800-82 Rev. 3*, 2023 (OT/ICS security).
4. `[4]` Petersen et al., *NIST SP 800-181 Rev. 1*, 2020 (NICE Cybersecurity Framework).
5. `[5]` Souppaya et al., *NIST SP 800-218*, 2022 (Secure Software Development Framework).

---

## 12. AI Assistance Disclosure Included
- Placed a dedicated section immediately following Section 12 (Conclusion) and preceding References.
- Transparently discloses that generative AI tooling (OpenAI ChatGPT and Codex) provided assistance across source review, patch formulation, test fixture generation, quantitative data synthesis, trace graphics, and manuscript structuring.
- Explicitly states that the human student author team independently reviewed, validated, and approved all code, claims, numbers, figures, and prose, assuming full scientific responsibility.

---

## 13. Limitations Included
Section 10 comprehensively documents all eight applicable technical boundaries:
1. Bounded software control-plane evaluation on local SQLite fixtures.
2. Synthetic scripted fixtures with zero human student participants.
3. No real industrial attack packet generation or physical PLC execution.
4. Docker execution hurdles (missing `./appdata/openplc.db` dependency in lab config).
5. Static shared-secret collector trust boundary.
6. Absence of hardware cryptographic attestation or replay nonces.
7. Local SQLite file administrative mutability.
8. 31 unresolved legacy npm audit vulnerabilities.

---

## 14. Formatting Checked
- Document margins: 1.0 inch (72 pt) on all sides.
- Document geometry: Standard US Letter (8.5 × 11.0 in).
- Primary typography: Times New Roman, 10.5 pt body text, 1.15 line spacing, 4 pt paragraph spacing after.
- Headings: Bold, distinct font hierarchy (Title 17 pt, Heading 1 12 pt, Heading 2 11 pt).
- Header/Footer: Running footer with page numbering.
- Word Document: Saved as `P282_Final_Submission_Manuscript.docx`.

---

## 15. Internal Consistency Checked
- Zero instances of unsupported claims (`7 users`, `90%`, `6 minutes`, `4 minutes`, `student skill improvement`, `fully secure`).
- All numeric values (5/16, 16/16, 64 exercises, 256 score checks, 224 links, 64 retention checks, 17 HTTP checks, 1 retained row) are consistent across Abstract, Introduction, Section 5, Section 7, Section 8, Table 1, Table 2, and Conclusion.
- Zero placeholder markers (`TODO`, `FIXME`, `[INSERT]`, `[CITATION NEEDED]`).

---

## 16. Remaining Items Requiring HUMAN Confirmation
Before final upload to the target conference or journal submission portal, the human authors must confirm:
1. **Author Byline Order**: Confirm that the author sequence (`Navinkumar M, Girinath K, Natarajan V, Heamanthraj S, Sabarinathan V, Nabin Sil`) accurately reflects institutional agreements.
2. **Author Affiliations & Emails**: Add specific institutional email addresses or department names if required by the target venue.
3. **Author Consent**: Ensure all listed co-authors have reviewed `P282_Final_Submission_Manuscript.docx` and consented to formal submission.
4. **Target Venue Selection**: Verify if the target venue requires a specific template (e.g., IEEE two-column format or ACM double-blind format) and adjust layout columns accordingly.
5. **Funding or Acknowledgment Statements**: Add any institutional project grant numbers or formal acknowledgments to faculty mentors if required.
