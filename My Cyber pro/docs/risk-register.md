# CyberPro Operational & Security Risk Register

**Project**: CyberPro: Scenario-Driven Cyber Range  
**Document**: Threat Modeling and Risk Register  
**Version**: 2.0  

---

## 1. Risk Assessment Methodology

Risks are assessed using a standard $5 \times 5$ qualitative matrix:
- **Likelihood (L)**: 1 (Rare) to 5 (Almost Certain)
- **Impact (I)**: 1 (Insignificant) to 5 (Catastrophic)
- **Risk Score (R)**: $L \times I$  
  - Low (1–6), Medium (8–12), High (15–25)

---

## 2. Risk Register Matrix

| Risk ID | Threat Scenario / Vulnerability | L | I | Initial Risk | Technical Mitigation Strategy | Residual Risk | Status |
|---|---|---|---|---|---|---|---|
| **RSK-001** | **Container Escape / Host Breakout**: Attacker in pentest container leverages Linux kernel vulnerability or container misconfiguration to compromise host OS. | 2 | 5 | **High (10)** | Removed all `privileged: true` flags; dropped all capabilities via `cap_drop: ALL`; added `security_opt: no-new-privileges:true`. Container user runs without root permissions. | Low (2) | **Mitigated** |
| **RSK-002** | **Simulated Attack Spillover**: Port scan or Modbus injection traverses Docker gateway onto the campus or corporate production network. | 2 | 5 | **High (10)** | Configured `internal: true` on all internal OT subnets (`l3_scada_network`, `l3_security_network`). Non-internal networks utilize strict port forwarding with no host bridge routing. | Low (2) | **Mitigated** |
| **RSK-003** | **Host Resource Exhaustion (DoS)**: Rogue script, packet flood, or memory leak causes the host operating system to crash. | 3 | 4 | **High (12)** | Hard resource limits configured on every container in `docker-compose.yml` (`mem_limit: 512m-1024m`, `cpus: 0.5-1.0`). Memory watchdogs kill overconsuming containers. | Low (3) | **Mitigated** |
| **RSK-004** | **Telemetry & Score Tampering**: Malicious student submits fabricated telemetry events or alters scores via unprotected API endpoints. | 3 | 4 | **High (12)** | Container events require `CONTAINER_SECRET` header validation. Student submissions require authenticated session matching session ownership. Scoring engine computes from immutable `telemetry_events`. | Low (3) | **Mitigated** |
| **RSK-005** | **Default Credential Exposure**: Platform deploys with well-known credentials (`admin/admin123`) logged to public console output. | 4 | 3 | **High (12)** | Console credential echoing removed from `server.js`. Passwords hashed with bcrypt (salt rounds = 10). Credentials managed via environment variables. | Low (2) | **Mitigated** |
| **RSK-006** | **Session Hijacking & XSS**: Session cookie stolen via JavaScript injection or cross-site request forgery. | 3 | 3 | **Medium (9)** | Enforced `httpOnly: true`, `sameSite: 'lax'`, and dynamic `secure: true` in production. Wildcard CORS disabled; restricted to trusted origins. | Low (2) | **Mitigated** |
| **RSK-007** | **Incomplete Reset State (Dirty Lab)**: Leftover exploit artifacts or corrupted PLC registers from a previous user bias subsequent student scoring. | 4 | 3 | **High (12)** | `ResetEngine` performs complete container teardown (`down -v`), recreates volumes, and executes automated HTTP health checks against all core endpoints before certifying clean state. | Low (2) | **Mitigated** |
| **RSK-008** | **Privilege Escalation via Unprotected Routes**: Student role accesses administrative functions or student-to-student data. | 3 | 4 | **High (12)** | Centralized RBAC middleware (`requireRole('admin')`, `requireRole('instructor')`) enforced on all API endpoints. Ownership checks ensure students can only view their own AARs. | Low (2) | **Mitigated** |
