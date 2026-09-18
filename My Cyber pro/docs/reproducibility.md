# CyberPro Reproducibility & Research Protocol

**Project**: CyberPro: Scenario-Driven Cyber Range  
**Document**: Research Protocol & Scientific Reproducibility  
**Version**: 2.0  

---

## 1. Rationale for Cyber Range Reproducibility

Scientific validity in cybersecurity education research demands that experimental trials and skill assessments be **strictly reproducible**:
- Different students undergoing the same scenario must experience identical starting conditions.
- Re-running an assessment must produce identical evaluation scores given the same input telemetry.
- Target system state must not degrade across repeated exercise iterations.

---

## 2. Deterministic Environment Provisioning

CyberPro achieves deterministic state across trials through four layers of configuration pinning:

### 2.1 Container & Dependency Pinning
- Docker base images pin exact versions (e.g. `python:3.9-slim`, `debian:bullseye-slim`).
- Python libraries are locked in `requirements.txt` with exact hashes or major/minor tags.
- Node.js dependencies are locked in `package-lock.json`.

### 2.2 Network & IP Determinism
All subnets and container IPs are statically declared in `docker-compose.yml`:
- OpenPLC: `10.10.2.10`
- SCADA HMI: `10.10.3.20`
- Network IDS: `10.10.4.41`
- Log Collector: `10.10.4.40`
- Pentest Origin: `10.10.5.50`
This static mapping ensures that automated IDS rules, routing tables, and student packet captures remain identical across all executions.

### 2.3 Environment Metadata Binding
Each `exercise_session` record logs:
- `environment_version`: Git commit hash or package version.
- `config_version`: Version string of the scenario manifest (`scenario.json`).
- `start_time` and `end_time`: ISO 8601 UTC timestamps.

---

## 3. The Clean-State Reset Protocol

To eliminate "dirty lab" state (residual attack logs, altered Modbus coil registers, or zombie network sockets), `ResetEngine` executes an automated four-phase reset protocol:

```
[ Active / Dirty Lab ]
          │
          ▼ Phase 1: Teardown
   docker compose down -v
   (Purges ephemeral volumes and networks)
          │
          ▼ Phase 2: Reconstruction
   docker compose up -d
   (Fresh container images and baseline configs)
          │
          ▼ Phase 3: Health Probing
   HTTP 200 checks on PLC, IDS, and Collector
          │
          ▼ Phase 4: Certification
   Persist record in reset_records with clean_state_verified = 1
```

### Verification Criteria
A reset is marked `clean_state_verified = true` if and only if:
1. All expected containers are running (`docker compose ps --filter status=running`).
2. `http://localhost:8080` (OpenPLC web console) responds with status `200`.
3. `http://localhost:8084/api/health` (IDS monitor) responds with status `200`.
4. `http://localhost:8085/api/health` (Log collector) responds with status `200`.

---

## 4. Benchmark Baseline Execution

For comparative research studies, an automated reference baseline can be executed:
1. Spin up scenario `PLC-001`.
2. Run standard attack script from the pentest station.
3. Assert that the IDS captures the anomaly within $\le 5$ seconds.
4. Verify that `ObjectiveEngine` successfully triggers passing status for `PLC-001-OBJ-1`.
5. Trigger reset and verify that health checks return status `200` in $< 30$ seconds.
