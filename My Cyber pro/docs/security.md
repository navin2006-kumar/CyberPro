# CyberPro Security Architecture & Controls

**Project**: CyberPro: Scenario-Driven Cyber Range  
**Document**: Security Specification & Controls  
**Version**: 2.0  

---

## 1. Security Architecture Principles

As a cyber range hosting offensive attack simulations against emulated industrial assets, CyberPro adheres to a strict defense-in-depth security model:
1. **Containment Verification**: Isolation is a requirement to test, not a property inferred from bridge or `internal: true` declarations.
2. **Principle of Least Privilege**: Containers run with minimal Linux capabilities and dropped privileges (`cap_drop: ALL`).
3. **Resource Bounding**: Hard CPU and memory quotas prevent denial-of-service (DoS) or host system starvation.
4. **Separation of Roles**: Multi-tiered Role-Based Access Control (RBAC) separates administrative, instructional, and learner operations.
5. **Audited Failsafes**: Instant kill switches enable instructors to immediately terminate all running containers.

---

## 2. Container Hardening & Isolation

### 2.1 Privilege Dropping & Capability Pruning
The OilSprings lab containers explicitly enforce privilege reduction in `docker-compose.yml`:

```yaml
services:
  plc:
    build: ./plc
    cap_drop:
      - ALL
    cap_add:
      - NET_ADMIN
    security_opt:
      - no-new-privileges:true
    mem_limit: 512m
    cpus: "0.5"
```
- `privileged: true` has been **completely eliminated** from all services.
- The IDS container uses `NET_RAW` capability solely for passive packet sniffing and does not run as root.
- `security_opt: no-new-privileges:true` prevents privilege escalation via `setuid` binaries.

### 2.2 Host Resource Caps
To ensure host OS stability during concurrent lab sessions:
- **PLC**: 512MB RAM, 0.5 CPU cores.
- **SCADA HMI**: 1024MB RAM, 1.0 CPU cores.
- **IDS Monitor**: 512MB RAM, 0.5 CPU cores.
- **Log Collector**: 512MB RAM, 0.5 CPU cores.
- **Pentest Container**: 1024MB RAM, 1.0 CPU cores.

---

## 3. Network Containment Boundaries

```
pentest -- l3_pentest_network -- router -- l2_network -- PLC
                  |
          +-------------+--------------+
          |                            |
       l3_scada_network             l3_security_network
        SCADA / EWS                 IDS / collector
```

OilSprings Compose declares four subnets. `l3_scada_network` and `l3_security_network` use `internal: true`, while `l2_network` and `l3_pentest_network` do not. The router is attached to all four networks, has `NET_ADMIN`, and attempts to enable IP forwarding. The router UI rules are not proof of kernel firewall enforcement: the inspected `rules.json` accepts any-to-any, the UI rule list uses `192.168.x` subnets, and service entrypoints also use `192.168.x` while Compose uses `10.10.x`.

Host-published TCP ports are `8080`, `8081`, `8083`, `8084`, `8085`, `2222`, `8086`, and `8087`; Modbus/TCP `502` is not published by this Compose file. `host_ip` is unspecified, so no loopback-only bind is declared.

**Verification status (2026-10-05):** all six requested runtime paths are `NOT TESTED`; Docker Engine was unavailable. Static configuration findings are recorded as `UNEXPECTED` in [results/network-containment.json](../results/network-containment.json). No claim of "network fully isolated" is made. Internal bridge flags alone do not rule out transit routing through the multi-homed router or egress from non-internal bridges.

---

## 4. Application Security Controls

### 4.1 Session Hardening
Express session cookies are configured with defense against XSS and session fixation:
- `httpOnly: true`: Prevents client-side scripts from reading session tokens.
- `sameSite: 'lax'`: Mitigates Cross-Site Request Forgery (CSRF).
- `secure: true`: Enforced automatically in production HTTPS environments.
- `SESSION_SECRET`: Verified at startup; refuses to boot in production if unconfigured.

### 4.2 Cross-Origin Resource Sharing (CORS)
- Open wildcard CORS (`app.use(cors())`) has been removed.
- Production origin validation allows only authorized endpoints configured via `CORS_ALLOWED_ORIGINS`.

### 4.3 Role-Based Access Control (RBAC) Matrix
Privilege hierarchy: `admin (3)` > `instructor (2)` > `student (1)`

| Endpoint | Method | Allowed Roles | Description |
|---|---|---|---|
| `/api/scenarios` | GET | `student`, `instructor`, `admin` | List active scenarios |
| `/api/exercises/start` | POST | `student`, `instructor`, `admin` | Launch an exercise session |
| `/api/telemetry/event` | POST | Exercise owner (student evidence), Container Secret (container events) | Record validated telemetry |
| `/api/reports/:id/aar` | GET | Student (Owner), `instructor`, `admin` | View After-Action Report |
| `/api/emergency-stop` | POST | `admin` | Immediately terminate all labs |
| `/api/system/status` | GET | `instructor`, `admin` | View Docker host resource state |

### 4.4 Evidence Admission Controls

`POST /api/telemetry/event` applies application-level admission checks before storing evidence:

- Student submissions are limited to `host_identified`, `log_analysis_submitted`, and `containment_action`; the authenticated user must own an active exercise.
- Container sources (`ids`, `plc`, `scada`, `collector`, `ews`) require the configured `CONTAINER_SECRET`; a logged-in session alone cannot impersonate a container.
- The exercise must exist and be active. The scenario is taken from that exercise; a conflicting submitted scenario is rejected.
- Source/event-type pairs are allowlisted. Payloads must be JSON objects and objective-relevant fields are type-checked before insertion. Client-supplied `objective_id` and other unsupported envelope fields are rejected.
- A canonicalized repeat of the same exercise/source/event type/severity/payload is rejected with HTTP 409, covering duplicate submissions and exact payload replays.
- The Objective Engine independently scopes evaluation to exercise, scenario, source, event type, payload checks, and event ownership. A score request for another student’s exercise is rejected.

Verification evidence: `node tests/security/evidence-admission.test.js` passed **16 tests, 0 failed**; `npm test` passed **8 suites, 0 failed** on 2026-10-05. These are application-level checks using in-memory SQLite and an HTTP test server. They do not establish complete security assurance, deployment security, container-secret provisioning, or live Docker behavior. See [docs/testing.md](testing.md) and [docs/improvement-log.md](improvement-log.md).

### 4.5 Reset Residue Evidence

Exercise creation stores a pre-exercise snapshot before inserting the exercise row. Reset verification compares container/service identities, image IDs/digests, expected network IDs/configuration, volumes, selected configuration SHA-256 hashes, and configured temporary-file probes. Reset cannot report success unless configured health checks pass and no resource/configuration difference or residual probe artifact remains. Missing baselines and empty health-check lists fail closed.

The **MOCKED RESET TEST** passed **6/6** on 2026-10-05. The **REAL DOCKER RESET TEST** was **NOT EXECUTED** because Docker Engine was unavailable. [results/reset-verification.json](../results/reset-verification.json) explicitly records `not_executed`; no live reset assurance is claimed. These checks do not establish complete security assurance or prove host/container integrity beyond the recorded checks.

### 4.6 Emergency Stop Mechanism
`POST /api/emergency-stop` provides an audited shutdown:
1. Validates `admin` session and logs activity in `activity_logs`.
2. Triggers `labManager.stopAllLabs()`, terminating all running Docker containers.
3. Broadcasts WebSocket event to disconnect and alert all active clients.
