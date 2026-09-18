# CyberPro Security Architecture & Controls

**Project**: CyberPro: Scenario-Driven Cyber Range  
**Document**: Security Specification & Controls  
**Version**: 2.0  

---

## 1. Security Architecture Principles

As a cyber range hosting offensive attack simulations against emulated industrial assets, CyberPro adheres to a strict defense-in-depth security model:
1. **Complete Isolation**: Simulated attacks must never propagate beyond designated bridge networks or reach external networks.
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
[ Host / Internet ] 
        │
    (BLOCKED - internal: true)
        │
┌───────┴───────────────────────────────┐
│     l3_scada_network (10.10.3.0/24)   │ ◄── Fully Isolated (No Gateway)
└───────────────────────────────────────┘
┌───────────────────────────────────────┐
│     l3_security_network (10.10.4.0/24)│ ◄── Fully Isolated (No Gateway)
└───────────────────────────────────────┘
```
- Networks `l3_scada_network` and `l3_security_network` have `internal: true` declared, preventing Docker from attaching a default gateway to the host bridge.
- Field controllers cannot establish outbound connections to external addresses.

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
| `/api/telemetry/event` | POST | `student`, `instructor`, `admin`, Container Secret | Record telemetry event |
| `/api/reports/:id/aar` | GET | Student (Owner), `instructor`, `admin` | View After-Action Report |
| `/api/emergency-stop` | POST | `admin` | Immediately terminate all labs |
| `/api/system/status` | GET | `instructor`, `admin` | View Docker host resource state |

### 4.4 Emergency Stop Mechanism
`POST /api/emergency-stop` provides an audited shutdown:
1. Validates `admin` session and logs activity in `activity_logs`.
2. Triggers `labManager.stopAllLabs()`, terminating all running Docker containers.
3. Broadcasts WebSocket event to disconnect and alert all active clients.
