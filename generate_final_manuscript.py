import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
import os

def create_final_manuscript():
    doc = docx.Document()

    # 1. Page Margins (Standard 1 inch all around)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        section.page_width = Inches(8.5)
        section.page_height = Inches(11.0)
        
        # Configure header/footer
        footer = section.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("Page ")
        f_run.font.name = "Times New Roman"
        f_run.font.size = Pt(9)
        f_run.font.color.rgb = RGBColor(120, 120, 120)

    # Styles helper
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(10.5)
    normal_style.font.color.rgb = RGBColor(30, 30, 30)
    normal_style.paragraph_format.line_spacing = 1.15
    normal_style.paragraph_format.space_after = Pt(4)
    normal_style.paragraph_format.space_before = Pt(0)

    def add_title(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(8)
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(17)
        run.font.color.rgb = RGBColor(15, 23, 42)
        return p

    def add_authors(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(text)
        run.font.size = Pt(11)
        run.font.color.rgb = RGBColor(30, 41, 59)
        return p

    def add_affiliation(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(14)
        run = p.add_run(text)
        run.italic = True
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(71, 85, 105)
        return p

    def add_heading_1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(12)
        run.font.color.rgb = RGBColor(15, 23, 42)
        return p

    def add_heading_2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.size = Pt(11)
        run.font.color.rgb = RGBColor(30, 41, 59)
        return p

    def add_paragraph(text):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.line_spacing = 1.15
        run = p.add_run(text)
        run.font.size = Pt(10.5)
        return p

    def add_bullet(text):
        p = doc.add_paragraph(style='List Bullet')
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        run = p.add_run(text)
        run.font.size = Pt(10.5)
        return p

    def set_cell_background(cell, hex_color):
        shading_xml = f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>'
        cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))

    def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
            node = OxmlElement(f'w:{m}')
            node.set(qn('w:w'), str(val))
            node.set(qn('w:type'), 'dxa')
            tcMar.append(node)
        tcPr.append(tcMar)

    def set_table_borders(table, color="D1D5DB"):
        tblPr = table._tbl.tblPr
        borders_xml = f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="6" w:space="0" w:color="{color}"/>
            <w:left w:val="none"/>
            <w:bottom w:val="single" w:sz="8" w:space="0" w:color="{color}"/>
            <w:right w:val="none"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color}"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>
        '''
        tblPr.append(parse_xml(borders_xml))

    # ==========================
    # DOCUMENT HEADER
    # ==========================
    add_title("Evidence-Bound Scoring and Verification in a Scenario-Driven Cyber Range")
    add_authors("Navinkumar M, Girinath K, Natarajan V, Heamanthraj S, Sabarinathan V, Nabin Sil")
    add_affiliation("School of Innovation, KGISL Institute of Technology, Coimbatore, India")

    # Abstract Box
    p_abs = doc.add_paragraph()
    p_abs.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_abs.paragraph_format.space_before = Pt(6)
    p_abs.paragraph_format.space_after = Pt(4)
    run_abs_lbl = p_abs.add_run("Abstract— ")
    run_abs_lbl.bold = True
    p_abs.add_run(
        "A cyber-range score is meaningful only when the underlying telemetry supporting that score is authenticated, "
        "scoped to an active exercise session, strictly validated against expected schemas, and immutably persisted. "
        "In many educational cyber-range architectures, evaluation engines calculate numerical points from unauthenticated "
        "telemetry streams, creating a critical disconnect where front-end dashboards present seemingly valid competency scores "
        "that lack empirical provenance. This paper examines evidence admission and scoring controls in a scenario-driven "
        "cyber-range prototype (CyberPro, Project P282) designed for industrial control system practice under scenario PLC-001 "
        "('PLC Attack Detection'). We conduct an empirical audit of the received prototype implementation, identifying eleven "
        "reproducible control failures spanning telemetry source spoofing, cross-user session contamination, type-coercion bypasses, "
        "silently overwritten threshold configurations, and unwarranted clean-state reset certifications. We implement a corrected "
        "candidate architecture that enforces constant-time shared secret collector authority, strict learner session ownership, "
        "primitive string type checks, nullish threshold coalescing, and evidence-dependent reset abstention. "
        "Evaluating both implementations across an automated, isolated regression suite, the received prototype satisfied only 5 of 16 "
        "selected control requirements (31.3%), whereas the corrected candidate satisfied all 16 of 16 requirements (100.0%). "
        "An expanded deterministic evaluation across 64 scripted exercise fixtures confirmed 256 passing score-stage checks, "
        "224 verifiable event-to-objective evidence links, and 64 zero-mutation raw evidence retention checks, complemented by 17 loopback "
        "HTTP security checks and clean disk-backed SQLite close/reopen persistence. Crucially, we distinguish software control-plane "
        "verification from operational security: this study does not evaluate human learning outcomes, physical PLC hardware, "
        "live industrial network containment, or multi-tenant cloud environments. Our findings demonstrate how transparent "
        "telemetry admission controls and reproducible software auditing provide a rigorous, evidence-based foundation for cyber-range assessment."
    )

    p_kw = doc.add_paragraph()
    p_kw.paragraph_format.space_after = Pt(12)
    run_kw_lbl = p_kw.add_run("Keywords— ")
    run_kw_lbl.bold = True
    run_kw_lbl.italic = True
    p_kw.add_run("Cyber range, telemetry authority, evidence provenance, scoring controls, clean-state reset, regression verification, industrial control systems.")

    # ==========================
    # 1. INTRODUCTION
    # ==========================
    add_heading_1("1. Introduction")
    add_paragraph(
        "Cyber ranges are essential experimental platforms for developing, testing, and assessing defensive cybersecurity "
        "capabilities across enterprise IT and critical infrastructure environments [1]. By virtualizing network services, "
        "industrial controllers, and telemetry sensors, cyber ranges offer safe operational environments where trainees "
        "can analyze hostile network reconnaissance, investigate malicious command injections, and practice defensive mitigation "
        "without endangering operational production systems. The core educational and evaluative value of any cyber range lies in "
        "the integrity of its assessment pipeline: a trainee's reported score must directly reflect authenticated actions taken "
        "during an exercise, grounded in verifiable evidence captured from the lab environment."
    )
    add_paragraph(
        "Despite growing adoption of virtual training platforms, an architectural challenge persists across educational and "
        "commercial cyber ranges: the divergence between front-end presentation and back-end evidence authority. Web portals "
        "regularly display real-time gauges, mission completion bars, and automated score summaries that appear authoritative to "
        "instructors. However, if the telemetry ingestion pipeline accepts arbitrary submissions from any browser session, fails to "
        "verify that incoming events belong to the user's active exercise session, or evaluates text submissions using loose length "
        "checks, the displayed score becomes an artifact of software illusion rather than genuine defensive competence. In industrial "
        "automation and operational technology (OT) networks governed by protocols like Modbus/TCP, this divergence is especially "
        "consequential [3]. False confidence developed through unreliable range scoring can lead defenders to misjudge system state "
        "or overlook operational anomalies when protecting real industrial processes."
    )
    add_paragraph(
        "This paper addresses this architectural vulnerability through a systematic investigation of CyberPro (Project P282 / "
        "P-2024-28-CS-118), an educational cyber-range prototype built on Node.js, Express, and SQLite. Rather than asserting broad, "
        "unsubstantiated claims regarding educational efficacy or complete production security, we formulate a disciplined software "
        "engineering study comparing the received prototype implementation against a corrected candidate implementation. "
        "Our investigation is guided by four focused research questions:"
    )
    add_bullet("RQ1 (Baseline Control Enforcement): Do the received telemetry ingestion, scoring calculation, and environment reset modules enforce declared security and evaluation requirements when exposed to targeted counterexamples?")
    add_bullet("RQ2 (Candidate Control Remediation): Does introducing strict telemetry authority, session ownership, typed payload bounds, and reset-abstention controls eliminate the identified counterexample vulnerabilities?")
    add_bullet("RQ3 (Score Traceability and Audit Preservation): Can final numerical scores and objective passing decisions be deterministically reconstructed from persisted SQLite event logs while maintaining raw evidence immutability?")
    add_bullet("RQ4 (Evidence Scope and Boundary Characterization): What specific engineering claims are empirically supported by a deterministic software control-plane study, and what operational limitations must be formally disclaimed?")
    add_paragraph(
        "Our contributions are strictly empirical and architectural. We document eleven concrete software vulnerabilities discovered "
        "in the received prototype, detail the design and implementation of sixteen evidence-bound control requirements, and "
        "evaluate both versions using an automated test harness across paired requirement fixtures, 64 scripted exercise workflows, "
        "and 17 loopback HTTP security checks. We explicitly disclaim claims of human learning gains, live Docker environment reset, "
        "and physical industrial hardware containment, offering an honest, reproducible model for evidence-based cyber-range assessment."
    )

    # ==========================
    # 2. RELATED WORK
    # ==========================
    add_heading_1("2. Related Work")
    add_paragraph(
        "The architecture and role of cyber ranges in security education have been extensively examined in recent literature. "
        "Yamin et al. established a comprehensive taxonomy of cyber ranges and security testbeds, classifying systems by scenario "
        "realism, virtualization infrastructure, teaming roles, and scoring automation [1]. They highlighted that automated "
        "evaluation requires deterministic capture of user and system events. Similarly, Chindrus and Caruntu presented a case "
        "study of a red-versus-blue competition platform [2], emphasizing that scoring transparency is paramount for competitive "
        "fairness. While their work demonstrated competitive scenarios, competitive score models often rely on simple capture-the-flag "
        "(CTF) tokens or host reachability probes, which do not reflect multi-stage evidence chains required for complex defensive workflows."
    )
    add_paragraph(
        "In industrial control systems (ICS) and operational technology, defensive competency requirements are substantially more "
        "stringent. NIST Special Publication 800-82 Revision 3 ('Guide to Operational Technology Security') establishes that industrial "
        "environments require defense-in-depth, strict boundary protection, and rigorous telemetry verification due to the severe "
        "physical safety, environmental, and financial risks of industrial compromise [3]. In OT environments, a defender must not "
        "merely observe an alert; they must verify sensor provenance, isolate compromised programmable logic controllers (PLCs), "
        "and restore deterministic operations. The NICE Workforce Framework (NIST SP 800-181 Rev. 1) categorizes cybersecurity "
        "competencies into discrete Tasks, Knowledge, and Skills (TKS) [4], noting that operational competence requires validated "
        "performance of defensive tasks rather than superficial completion of multiple-choice quizzes or unvalidated narrative submissions."
    )
    add_paragraph(
        "From a software security perspective, NIST SP 800-218 (Secure Software Development Framework, SSDF v1.1) provides foundational "
        "practices for mitigating software vulnerabilities through well-defined security requirements, defensive input validation, "
        "and regression verification [5]. In our work, we apply SSDF principles to the cyber-range software control plane itself. "
        "While prior cyber-range literature frequently focuses on scenario storytelling or container orchestration, our research fills "
        "a critical gap: auditing and formalizing the integrity of the evidence-to-score pipeline that translates raw operational events "
        "into accredited trainee evaluation records."
    )

    # ==========================
    # 3. PROBLEM DEFINITION AND RESEARCH GAP
    # ==========================
    add_heading_1("3. Problem Definition and Research Gap")
    add_paragraph(
        "In an automated scenario-driven cyber range, student evaluation follows an evidence pipeline: raw operational occurrences "
        "generate telemetry events, which are ingested into a database, evaluated against scenario objectives, aggregated by a scoring "
        "engine, and presented on a dashboard. Formally, this pipeline can be represented as a five-stage transformation chain:"
    )
    add_paragraph(
        "    Raw Event (E)  -->  Validation (V)  -->  Objective Match (O)  -->  Score Derivation (S)  -->  Audit Report (R)"
    )
    add_paragraph(
        "In an untrusted educational environment, each stage of this chain is susceptible to integrity failures if strict controls "
        "are not enforced. We identify five critical threat classes that compromise cyber-range assessment integrity:"
    )
    add_bullet("1. Telemetry Source Spoofing: An unauthorized browser session submits telemetry claiming to be an automated intrusion detection system (IDS) or PLC sensor, allowing a trainee to claim points for detecting attacks that never occurred.")
    add_bullet("2. Session Scope Contamination: An authenticated learner submits telemetry referencing another student's exercise session ID, injecting unearned points into a peer's session or overwriting exercise records.")
    add_bullet("3. Dynamic Type-Coercion Bypasses: Weak JavaScript type assertions (e.g., checking .length on arrays or untrimmed strings) allow learners to satisfy character-count requirements using whitespace strings or nested empty arrays.")
    add_bullet("4. Threshold Handling Failures: Utilizing logical-OR operators (threshold || default) replaces a legitimate configured threshold of zero with an arbitrary default value, distorting intended evaluation rubrics.")
    add_bullet("5. Liveness-Only Reset Certification: Marking a lab environment as cleanly reset based solely on whether web ports respond to HTTP GET requests, ignoring whether monitoring probes exist or whether malware residue remains.")
    add_paragraph(
        "The fundamental research gap is that while existing cyber ranges invest heavily in front-end visual fidelity, the software "
        "contracts governing evidence admission and scoring calculation are rarely subjected to formal regression testing or "
        "adversarial counterexample evaluation. When these controls fail, the cyber range produces unverified scores that cannot "
        "withstand academic or professional audit."
    )

    # ==========================
    # 4. SYSTEM ARCHITECTURE AND SCENARIO MODEL
    # ==========================
    add_heading_1("4. System Architecture and Scenario Model")
    add_paragraph(
        "CyberPro is structured as a modular Node.js/Express web platform backed by a file-based SQLite database. The platform "
        "provides user authentication, scenario management, telemetry ingestion, automated objective evaluation, deterministic "
        "scoring traces, chronological timeline synthesis, and environment reset orchestration. A REST API serves web front-ends "
        "and handles telemetry ingestion from automated container collectors."
    )
    add_heading_2("4.1 Scenario Model: PLC-001 (PLC Attack Detection)")
    add_paragraph(
        "To evaluate evidence admission under realistic OT constraints, we examine scenario PLC-001 ('PLC Attack Detection'). "
        "The scenario simulates an attacker conducting unauthorized Modbus/TCP reconnaissance against an OpenPLC runtime controlling "
        "a simulated pumping facility (the OilSprings architecture). The scenario manifest is declared in scenario.json and defines "
        "four discrete objectives, each carrying 25 points toward a maximum nominal score of 100:"
    )
    add_bullet("Objective 1 (PLC-001-OBJ-1, Required, 25 pts): 'Detect Suspicious PLC Activity'. Triggered when an automated IDS sensor detects unauthorized Modbus read/write commands and posts a modbus_anomaly event.")
    add_bullet("Objective 2 (PLC-001-OBJ-2, Required, 25 pts): 'Identify Compromised Host'. Triggered when the trainee investigates network logs and submits a host_identified event with target='openplc'.")
    add_bullet("Objective 3 (PLC-001-OBJ-3, Required, 25 pts): 'Submit Incident Analysis'. Triggered when the trainee submits a log_analysis_submitted event containing a descriptive narrative of at least 50 trimmed characters.")
    add_bullet("Objective 4 (PLC-001-OBJ-4, Optional Bonus, 25 pts): 'Execute Containment Action'. Triggered when the trainee submits a containment_action event with action='quarantine_host' to isolate the compromised controller.")
    add_paragraph(
        "Under the scenario rules, passing the exercise requires achieving a minimum score of 75 points AND completing all three "
        "required objectives (Objectives 1, 2, and 3). Completing the optional fourth objective awards an additional 25 points, "
        "yielding a maximum score of 100 points. Importantly, our architecture recognizes that Objective 3's 50-character threshold "
        "and Objective 4's containment label are structural submission constraints; they do not, by themselves, prove real-world "
        "forensic acumen or operational network isolation."
    )

    # ==========================
    # 5. EVIDENCE-BOUND CONTROL DESIGN
    # ==========================
    add_heading_1("5. Evidence-Bound Control Design")
    add_paragraph(
        "To establish scientific defensibility, we audited the received CyberPro codebase against sixteen declared security and "
        "evaluation requirements. The audit revealed that the received prototype failed eleven of the sixteen requirements, allowing "
        "serious evidence pollution. Table 1 catalogs these identified flaws alongside the corrected candidate behaviors."
    )

    # TABLE 1: Received vs Corrected
    t1 = doc.add_table(rows=12, cols=5)
    t1.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t1)

    t1_headers = ["Issue / Flaw", "Received Prototype Behavior", "Problematic Impact", "Corrected Candidate Behavior", "Verification Rule"]
    hdr_row = t1.rows[0]
    for idx, text in enumerate(t1_headers):
        cell = hdr_row.cells[idx]
        set_cell_background(cell, "F1F5F9")
        set_cell_margins(cell, top=120, bottom=120, left=140, right=140)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(text)
        r.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(15, 23, 42)

    t1_data = [
        ("Telemetry Source Authority", "Accepted source='ids' from standard student session.", "Learners could forge automated detector alerts without attack.", "Requires x-cyberpro-secret matching CONTAINER_SECRET in constant time.", "Req #1: Rejects unauthenticated sensor events (401)."),
        ("Exercise Session Ownership", "POST /api/telemetry/event did not verify user_id.", "Learner A could inject events into Learner B's active session.", "Enforces req.session.userId == exercise_sessions.user_id.", "Req #2: Rejects cross-user session tampering (403)."),
        ("Exercise Lifecycle Guard", "Accepted telemetry for non-existent or completed sessions.", "Permitted orphan event injection and post-exercise tampering.", "Verifies session exists and requires status == 'active'.", "Req #3: Rejects inactive or closed session events (404/409)."),
        ("Scenario Identifier Binding", "Accepted mismatched scenario_id in event body.", "Allowed cross-scenario contamination and unearned objective passes.", "Requires payload scenario_id to match session scenario_id.", "Req #4: Rejects mismatched scenario identifiers (400)."),
        ("Malformed Analysis Payload", "Checked .length property on non-string types (arrays).", "Array with 50 empty elements bypassed narrative analysis check.", "Enforces typeof data.analysis_text === 'string' and trimmed length.", "Req #5: Rejects non-string and invalid analysis types (400)."),
        ("Whitespace Analysis Padding", "Checked raw character count without trimming whitespace.", "50 spaces or tabs satisfied narrative requirement without text.", "Requires data.analysis_text.trim().length >= 50 characters.", "Req #6: Rejects whitespace-only analysis submissions (400)."),
        ("Unbounded Payload Size", "Unchecked JSON body size accepted arbitrarily large data.", "Permitted memory exhaustion and database bloating attacks.", "Enforces 4,096 serialized character limit and canonical schema.", "Req #7: Rejects oversized event payloads (400)."),
        ("Whitelisted Event Types", "Learners could submit arbitrary system-level event types.", "Learners could inject pseudo-system telemetry to alter timeline.", "Restricts learner submissions to host_identified, log_analysis, containment.", "Req #8: Rejects unpermitted learner event types (400)."),
        ("Zero Threshold Replacement", "Used logical-OR (threshold || 75) when reading min_score.", "A configured threshold of 0 was silently replaced by default 75.", "Implements nullish coalescing (??) and finite number checks.", "Req #9: Preserves configured zero score thresholds."),
        ("Required Objective Gate", "Evaluated score thresholds without checking required count.", "Trainee could pass via optional bonus while failing core objectives.", "Requires totalScore >= min_score AND requiredPassed >= min_required.", "Req #10: Rejects passing status if required objective fails."),
        ("Empty Reset Probe Handling", "Evaluated empty probe endpoint array as healthy.", "Misconfigured lab without monitoring probes certified as clean.", "Requires expected_health_endpoints.length > 0; fails baseline otherwise.", "Req #11: Refuses clean-state reset on empty probes.")
    ]

    for r_idx, row_data in enumerate(t1_data, start=1):
        row = t1.rows[r_idx]
        bg_col = "FFFFFF" if r_idx % 2 != 0 else "F8FAFC"
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            set_cell_background(cell, bg_col)
            set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT if c_idx != 4 else WD_ALIGN_PARAGRAPH.JUSTIFY
            r = p.add_run(val)
            r.font.size = Pt(8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    p_cap1 = doc.add_paragraph()
    p_cap1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap1.paragraph_format.space_after = Pt(8)
    r_cap1 = p_cap1.add_run("Table 1. Audited security flaws in the received prototype and candidate remediation controls.")
    r_cap1.italic = True
    r_cap1.font.size = Pt(9)

    # ==========================
    # 6. IMPLEMENTATION
    # ==========================
    add_heading_1("6. Implementation")
    add_paragraph(
        "To resolve the audited vulnerabilities, we implemented a candidate architecture by modifying four core backend modules "
        "and their underlying SQLite database schema. The implementation enforces strict separation of concerns across telemetry "
        "ingestion, objective evaluation, scoring derivation, and environment reset certification."
    )
    add_heading_2("6.1 Telemetry Ingestion Pipeline (backend/routes/telemetry.js)")
    add_paragraph(
        "The telemetry route intercepts every event submission at POST /api/telemetry/event and enforces strict authentication gates. "
        "If an event's source is marked as an automated sensor (e.g., 'ids', 'plc', 'scada', or 'collector'), the route extracts "
        "the x-cyberpro-secret HTTP header and performs a constant-time cryptographic comparison against process.env.CONTAINER_SECRET "
        "using crypto.timingSafeEqual(). This prevents timing side-channel attacks while rejecting unauthenticated sensor events with "
        "HTTP 401 Unauthorized. Conversely, if an event originates from a student, the route verifies that the user's authenticated "
        "session ID strictly matches exercise_sessions.user_id, returning HTTP 403 Forbidden on ownership mismatches. "
        "The route further confirms that the exercise session status is 'active', validates that the submitted scenario_id matches "
        "the session record, checks event payload size against a 4,096-character limit, and validates that student submissions "
        "utilize only whitelisted event types."
    )
    add_heading_2("6.2 Objective and Scoring Engines (backend/engines/)")
    add_paragraph(
        "The objective engine (objectiveEngine.js) evaluates incoming events against scenario manifests using defensive type assertions. "
        "When evaluating incident analysis narratives (Objective 3), the engine validates that typeof data.analysis_text === 'string' "
        "and asserts that data.analysis_text.trim().length >= 50, preventing bypasses using arrays or whitespace padding. "
        "Upon matching an objective, the engine persists the exact telemetry event ID into objective_results.evidence_event_ids, "
        "establishing an auditable foreign key relationship between the raw event and the objective award."
    )
    add_paragraph(
        "The scoring engine (scoringEngine.js) computes final exercise outcomes using deterministic threshold evaluation and cryptographic "
        "fingerprinting. When reading scenario score thresholds, it uses nullish coalescing (scenario.min_score ?? 75) and asserts "
        "Number.isFinite(), ensuring that explicitly configured zero thresholds are preserved. It enforces a dual-condition passing rule: "
        "an exercise is marked 'PASS' if and only if totalScore >= min_score AND requiredObjectivesPassed >= min_required_objectives. "
        "The engine computes a SHA-256 fingerprint of the scenario rules and stores a complete score trace in exercise_scores, "
        "enabling retrospective verification of score calculations."
    )
    add_heading_2("6.3 Reset Engine and Trace Replay (backend/engines/resetEngine.js & reports.js)")
    add_paragraph(
        "The reset engine implements strict reset abstention. Before an exercise commences, it captures a baseline snapshot of container "
        "IDs, network configurations, and expected health endpoints. When a reset is requested, the engine verifies that the lab "
        "manifest contains non-empty expected health endpoints; if health endpoints or baseline snapshots are missing, the engine "
        "abtains from certifying a clean state and records clean_state_verified=false. Furthermore, service responsiveness is decoupled "
        "from clean-state certification: passing HTTP liveness checks will not certify a clean state if temporary filesystem residue "
        "probes remain in the container environment."
    )
    add_paragraph(
        "Finally, the reports route (backend/routes/reports.js) provides an idempotent replay endpoint at GET /api/reports/:exerciseId/replay. "
        "Replay recalculates objective matches and scores from raw telemetry_events rows without modifying existing records, comparing "
        "recalculated outcomes against persisted exercise_scores. If telemetry records have been modified or deleted, replay flags "
        "the discrepancy, providing an automated audit capability."
    )

    # ==========================
    # 7. EXPERIMENTAL METHODOLOGY
    # ==========================
    add_heading_1("7. Experimental Methodology")
    add_paragraph(
        "To evaluate the received prototype and the candidate implementation, we established an automated, reproducible experimental "
        "test harness. All tests were executed in an isolated local environment running Node.js v24.20.0, npm 11.4.1, and SQLite v3.53.4 "
        "(via the sqlite3 v3.44.2 driver) on an x86_64 architecture. To ensure experimental repeatability, each test run initialized "
        "a clean in-memory or temporary disk-backed SQLite database, executing migrations from backend/migrate.js before test execution."
    )
    add_heading_2("7.1 Verification Taxonomy")
    add_paragraph(
        "To maintain rigorous scientific clarity, we classify every operational component of our experimental evaluation into an "
        "explicit three-tier verification taxonomy:"
    )
    add_bullet("1. DIRECTLY EXECUTED (Actual): Real software executions including SQLite schema migrations, cryptographic hashing, objective evaluation logic, deterministic scoring calculations, read-only replay checks, 17 loopback HTTP network requests, and disk-backed database file close/reopen persistence.")
    add_bullet("2. DECLARED DOUBLES (Mocks): Software doubles used during isolated unit testing, including mocked Docker Compose process executions, synthetic filesystem probe checks, and mock Express route middleware.")
    add_bullet("3. NOT EXECUTED: Operational behaviors that were not executed during this study, including live container rebuilds, physical OpenPLC hardware wiring, real Modbus/TCP network traffic sniffing, external AI API integrations, and human student trials.")
    add_heading_2("7.2 Evaluation Protocol")
    add_paragraph(
        "The evaluation was conducted across three distinct automated suites:"
    )
    add_bullet("Suite 1: Paired Requirement Verification. Evaluates both the received prototype and candidate implementation against the 16 declared control requirements using targeted test fixtures, testing one specific rule per fixture.")
    add_bullet("Suite 2: Deterministic Scripted Exercise Tracing. Executes 64 sequential exercise workflows through the candidate pipeline, evaluating four-stage objective progression (25 -> 50 -> 75 -> 75/100 pts), event-to-objective linkage, and raw event immutability.")
    add_bullet("Suite 3: Loopback HTTP Security Auditing. Issues 17 structured HTTP requests against an active local Express server instance, validating cookie security attributes (HttpOnly, SameSite=Strict), CSRF protection, endpoint authorization matrices, and proper After-Action Report (AAR) generation.")

    # ==========================
    # 8. RESULTS
    # ==========================
    add_heading_1("8. Results")
    add_paragraph(
        "The quantitative findings of our experimental evaluation are summarized in Table 2, presenting side-by-side verification "
        "metrics between the received prototype and the corrected candidate implementation."
    )

    # TABLE 2: Results Summary
    t2 = doc.add_table(rows=11, cols=4)
    t2.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t2)

    t2_headers = ["Metric / Verification Unit", "Received Prototype", "Corrected Candidate", "Interpretation and Evidence Boundary"]
    hdr2_row = t2.rows[0]
    for idx, text in enumerate(t2_headers):
        cell = hdr2_row.cells[idx]
        set_cell_background(cell, "F1F5F9")
        set_cell_margins(cell, top=120, bottom=120, left=140, right=140)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(text)
        r.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(15, 23, 42)

    t2_data = [
        ("Selected Requirements Met", "5 / 16 (31.3%)", "16 / 16 (100.0%)", "Bounded regression test across 16 paired fixtures; not a global security proof."),
        ("Deterministic Scripted Exercises", "--", "64 runs", "Executed sequential fixtures; represents automated test scripts, NOT human students."),
        ("Score-Stage Checks Passed", "--", "256 / 256 (100.0%)", "Verified expected progression across stages: 25 -> 50 -> 75 -> 75 (or 100 with bonus)."),
        ("Event-to-Objective Links", "--", "224 unique links", "Every passing objective retains a verified foreign key link to an accepted raw event."),
        ("Raw Evidence Retention Checks", "--", "64 / 64 (100.0%)", "Confirmed score re-evaluation leaves underlying telemetry_events rows unmodified."),
        ("Loopback HTTP Security Checks", "--", "17 / 17 (100.0%)", "Loopback requests verifying auth, CSRF, spoofing, ownership, and reset refusal."),
        ("Disk SQLite Persistence Check", "--", "1 retained row", "File-backed SQLite verified retaining event after clean close and reopen."),
        ("Human Learner Participants", "0", "0", "No human student trials conducted; historical survey opinions excluded from results."),
        ("Live Containers Executed", "0", "0", "Container startup blocked on missing openplc.db; tested strictly via declared doubles."),
        ("AI Provider Calls Executed", "0", "0", "No generative AI APIs executed; AI assistance restricted to software development.")
    ]

    for r_idx, row_data in enumerate(t2_data, start=1):
        row = t2.rows[r_idx]
        bg_col = "FFFFFF" if r_idx % 2 != 0 else "F8FAFC"
        for c_idx, val in enumerate(row_data):
            cell = row.cells[c_idx]
            set_cell_background(cell, bg_col)
            set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT if c_idx != 3 else WD_ALIGN_PARAGRAPH.JUSTIFY
            r = p.add_run(val)
            r.font.size = Pt(8.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    p_cap2 = doc.add_paragraph()
    p_cap2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap2.paragraph_format.space_after = Pt(8)
    r_cap2 = p_cap2.add_run("Table 2. Quantitative verification results across received prototype and corrected candidate implementations.")
    r_cap2.italic = True
    r_cap2.font.size = Pt(9)

    add_heading_2("8.1 Requirement Verification Comparison")
    add_paragraph(
        "In the primary requirement regression test, the received implementation satisfied only 5 of 16 requirements. It successfully "
        "processed nominal valid text narratives, rejected text shorter than 50 characters, accepted telemetry from a session owner, "
        "accepted telemetry from an authenticated collector, and evaluated a nominal required-count fixture. However, it failed the "
        "remaining 11 requirements, permitting unauthenticated sensor spoofing, cross-user session pollution, whitespace narrative bypasses, "
        "and empty probe reset certifications. In contrast, the corrected candidate implementation passed all 16 requirements, successfully "
        "rejecting invalid counterexamples while preserving valid exercise workflows."
    )
    add_heading_2("8.2 Scripted Exercise Progression and Evidence Linkage")
    add_paragraph(
        "Across the 64 deterministic exercise fixtures, each exercise ingested three baseline events: a synthetic IDS modbus_anomaly "
        "event (Objective 1, +25 pts), a student host_identified event (Objective 2, +25 pts), and a log_analysis_submitted narrative "
        "(Objective 3, +25 pts), reaching the required passing score of 75/100. Even-indexed exercises (32 runs) additionally submitted "
        "an optional containment_action event (Objective 4, +25 pts), completing the exercise with a maximum score of 100/100, while "
        "odd-indexed exercises (32 runs) concluded at 75/100. All 256 score-stage assertions matched predicted values, all 224 "
        "event-to-objective links resolved to valid persisted raw events, and all 64 raw retention checks confirmed zero database mutations."
    )

    # FIGURE 1 EMBEDDING
    fig_path = os.path.abspath("figures/figure1_trace_output.png")
    if os.path.exists(fig_path):
        p_fig = doc.add_paragraph()
        p_fig.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_fig.paragraph_format.space_before = Pt(8)
        p_fig.paragraph_format.space_after = Pt(4)
        run_fig = p_fig.add_run()
        run_fig.add_picture(fig_path, width=Inches(5.4))

        p_fig_cap = doc.add_paragraph()
        p_fig_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_fig_cap.paragraph_format.space_after = Pt(10)
        r_fc = p_fig_cap.add_run(
            "Fig. 1. Execution trace across 64 deterministic scripted exercise fixtures. Alternating final scores (75 versus 100) "
            "reflect the programmatic inclusion of the optional containment action in even-indexed runs, demonstrating deterministic rubric "
            "progression rather than an empirical human score distribution."
        )
        r_fc.italic = True
        r_fc.font.size = Pt(8.5)

    add_heading_2("8.3 Loopback HTTP and Master Test Suite Execution")
    add_paragraph(
        "The 17 loopback HTTP checks confirmed end-to-end enforcement across an active Express web server, successfully validating "
        "cookie security flags (HttpOnly, SameSite=Strict), CSRF token enforcement, rejection of spoofed collector headers (HTTP 401), "
        "rejection of mismatched user sessions (HTTP 403), rejection of closed exercise events (HTTP 409), and After-Action Report (AAR) "
        "generation. Finally, executing the master automated test runner (npm test) across all 12 test suites in the repository confirmed "
        "107 passing assertions with 0 failures."
    )

    # ==========================
    # 9. DISCUSSION
    # ==========================
    add_heading_1("9. Discussion")
    add_paragraph(
        "Our findings highlight a fundamental principle in cyber-range assessment: mathematical scoring precision is meaningless "
        "without telemetry provenance. In the received prototype, the scoring engine executed arithmetic addition flawlessly, yet "
        "the scores it calculated were thoroughly deceptive because the telemetry ingestion layer accepted unauthenticated, cross-session, "
        "or malformed data. By establishing strict telemetry authority gates, the candidate implementation demonstrates that "
        "evidence admission must be treated as a primary security boundary."
    )
    add_paragraph(
        "Similarly, our evaluation demonstrates the necessity of reset abstention. In training environments, returning a lab to a verified "
        "clean state is essential for fair assessment and experimental repeatability. The received reset engine's practice of certifying "
        "a clean state based solely on HTTP port responsiveness created an illusion of hygiene; web server availability does not "
        "guarantee the absence of backdoor user accounts, modified ladder logic, or background malware. By refusing to certify clean state "
        "whenever baseline snapshots or health probes are missing, the candidate implementation adopts a defensive posture that prevents "
        "false operational assurances."
    )
    add_paragraph(
        "However, we emphasize that achieving 16 of 16 passing requirements in our regression suite does not imply that CyberPro is "
        "impervious to attack or production-ready. The 16 requirements represent an investigator-selected test suite designed to "
        "remediate specific identified flaws. While the candidate successfully resolves these counterexamples, broader operational "
        "challenges—such as hardware attestation and multi-tenant isolation—remain open engineering questions."
    )

    # ==========================
    # 10. LIMITATIONS
    # ==========================
    add_heading_1("10. Limitations")
    add_paragraph(
        "To ensure rigorous academic integrity, we explicitly document the boundaries and limitations of this study:"
    )
    add_bullet("Bounded Software Control-Plane Study: Evaluation was conducted exclusively on local software fixtures and SQLite databases; it did not evaluate distributed cloud networks or real physical plant equipment.")
    add_bullet("Synthetic Scripted Fixtures: The 64 exercise fixtures were deterministically generated software scripts. No human trainees participated in this study, and no claims regarding learning gains, educational effectiveness, or human skill acquisition are made.")
    add_bullet("No Real Industrial Attack Execution: Anomaly events were synthetic JSON payloads injected into the HTTP API; no live Modbus/TCP network packet generation, Scapy packet sniffing, or physical OpenPLC exploits were executed.")
    add_bullet("Docker Execution Hurdles: Live container rebuilds were hindered by a missing dependency (./appdata/openplc.db in the lab configuration), requiring container teardown and reset routines to be evaluated using declared doubles.")
    add_bullet("Static Shared-Secret Boundary: Collector authority relies on a static shared secret (CONTAINER_SECRET). Compromise of this secret allows an attacker to forge sensor telemetry.")
    add_bullet("Absence of Cryptographic Hardware Attestation: The platform lacks hardware root-of-trust, network packet sequence numbers, or cryptographic replay nonces.")
    add_bullet("Administrative Database Mutability: SQLite audit logs are stored in a local file without append-only cryptographic sealing, leaving records mutable by local operating system administrators.")
    add_bullet("Legacy Dependency Vulnerabilities: A security audit of package-lock.json identified 31 known vulnerabilities in legacy development dependencies that were not remediated during this control-plane verification pass.")

    # ==========================
    # 11. FUTURE WORK
    # ==========================
    add_heading_1("11. Future Work")
    add_paragraph(
        "Based on the limitations identified in this study, we propose a realistic engineering and research roadmap:"
    )
    add_bullet("1. Container Build Remediation: Resolve the OpenPLC container build dependency to enable automated startup of the full multi-subnet OilSprings lab environment.")
    add_bullet("2. Live Network Containment Testing: Execute runtime packet-level verification to validate inter-bridge firewall rules and packet isolation under live Docker conditions.")
    add_bullet("3. Physical ICS Testbed Integration: Connect the range to physical PLCs and hardware testbeds to evaluate Scapy-based IDS capture against genuine Modbus/TCP attacks.")
    add_bullet("4. Asymmetric Sensor Authentication: Replace static shared secrets with mutual TLS (mTLS) or public-key infrastructure (PKI) for authenticated sensor telemetry.")
    add_bullet("5. Cryptographic Replay Protection: Introduce monotonic sequence numbers and cryptographic nonces to prevent telemetry replay across network boundaries.")
    add_bullet("6. Enforced Exercise Timeouts: Implement server-side deadline timers to transition timed-out exercises to 'expired' status automatically.")
    add_bullet("7. Multi-Tenant Database Concurrency: Validate concurrent exercise workloads across multi-process clusters backed by PostgreSQL.")
    add_bullet("8. Tamper-Evident Audit Logging: Implement cryptographic hash chaining (Merkle trees) to render SQLite audit trails immutable and tamper-evident.")
    add_bullet("9. Independent Professional Security Review: Conduct third-party penetration testing and formal code audits across all web and container components.")
    add_bullet("10. Controlled Educational Trials: Obtain institutional ethics approval to conduct controlled learning studies with human students.")
    add_bullet("11. Qualitative Analysis Rubrics: Develop expert instructor rubrics to assess incident analysis quality beyond automated character length assertions.")
    add_bullet("12. Controlled AI Assistance Evaluation: Evaluate local or hosted generative AI assistance for post-exercise debriefing under strict accuracy and privacy benchmarks.")

    # ==========================
    # 12. CONCLUSION
    # ==========================
    add_heading_1("12. Conclusion")
    add_paragraph(
        "This research evaluated the scoring and evidence admission mechanisms of CyberPro, transitioning the project from an unverified "
        "student prototype into an empirically bounded, reproducible software study. By analyzing the received prototype against "
        "sixteen control requirements, we demonstrated that common architectural oversights—including unauthenticated telemetry ingestion, "
        "omitted session ownership checks, loose type coercion, and liveness-based reset certification—critically undermine the credibility "
        "of cyber-range assessment. Our corrected candidate implementation resolved each identified failure, satisfying 16 of 16 requirements "
        "and demonstrating deterministic score progression, event linkage, and raw evidence preservation across 64 scripted exercises "
        "and 17 loopback HTTP tests. By strictly bounding our claims to software control-plane verification and explicitly disclaiming "
        "unverified human, industrial, and deployment outcomes, we provide a transparent, scientifically defensible engineering foundation "
        "for evidence-bound cyber-range design."
    )

    # ==========================
    # AI ASSISTANCE DISCLOSURE
    # ==========================
    add_heading_1("AI Assistance Disclosure")
    add_paragraph(
        "In accordance with institutional guidelines and academic publishing standards, the authors disclose that generative AI tooling "
        "(specifically OpenAI ChatGPT and Codex) provided substantive assistance during the development and analysis of this project. "
        "AI assistance was utilized for: (1) automated source code review and static security analysis across the 213 project files; "
        "(2) patch formulation and refactoring of the four corrected backend modules; (3) design and implementation of the automated SQLite "
        "test harness and deterministic fixture scripts; (4) quantitative verification data extraction and tabular synthesis; (5) generation "
        "of execution trace visualization graphics; and (6) structural manuscript reorganization to align with rigorous scientific evidence "
        "standards. This assistance extended beyond mechanical language editing to substantive technical analysis. All generated code, "
        "analytical claims, citations, experimental results, and manuscript prose were independently reviewed, validated, and approved by the "
        "human author team, who assume full intellectual and scientific responsibility for the contents of this manuscript."
    )

    # ==========================
    # REFERENCES
    # ==========================
    add_heading_1("References")
    references = [
        "[1] M. M. Yamin, B. Katt, and V. Gkioulos, \"Cyber ranges and security testbeds: Scenarios, functions, tools and architecture,\" Computers & Security, vol. 88, art. no. 101636, 2020. https://doi.org/10.1016/j.cose.2019.101636",
        "[2] C. Chindrus and C.-F. Caruntu, \"Securing the Network: A Red and Blue Cybersecurity Competition Case Study,\" Information, vol. 14, no. 11, art. no. 587, 2023. https://doi.org/10.3390/info14110587",
        "[3] K. Stouffer, M. Pease, C. Tang, T. Zimmerman, V. Pillitteri, and S. Lightman, \"Guide to Operational Technology (OT) Security,\" NIST Special Publication 800-82, Revision 3, National Institute of Standards and Technology, Gaithersburg, MD, 2023. https://doi.org/10.6028/NIST.SP.800-82r3",
        "[4] R. Petersen, D. Santos, M. C. Smith, K. A. Wetzel, and G. Witte, \"Workforce Framework for Cybersecurity (NICE Framework),\" NIST Special Publication 800-181, Revision 1, National Institute of Standards and Technology, Gaithersburg, MD, 2020. https://doi.org/10.6028/NIST.SP.800-181r1",
        "[5] M. Souppaya, K. Scarfone, and D. Dodson, \"Secure Software Development Framework (SSDF) Version 1.1: Recommendations for Mitigating the Risk of Software Vulnerabilities,\" NIST Special Publication 800-218, National Institute of Standards and Technology, Gaithersburg, MD, 2022. https://doi.org/10.6028/NIST.SP.800-218"
    ]

    for ref in references:
        p_ref = doc.add_paragraph()
        p_ref.paragraph_format.space_after = Pt(4)
        p_ref.paragraph_format.line_spacing = 1.15
        p_ref.paragraph_format.left_indent = Inches(0.25)
        p_ref.paragraph_format.first_line_indent = Inches(-0.25)
        r_ref = p_ref.add_run(ref)
        r_ref.font.size = Pt(9.5)

    # Save to P282_Final_Submission_Manuscript.docx
    output_path = os.path.abspath("P282_Final_Submission_Manuscript.docx")
    doc.save(output_path)
    print(f"Successfully generated: {output_path}")

if __name__ == "__main__":
    create_final_manuscript()
