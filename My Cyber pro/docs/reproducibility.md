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
This records the declared addresses only; it does not establish routing behavior. OilSprings entrypoint routes still use `192.168.x` subnets while Compose assigns `10.10.x` networks. Runtime routing and containment were not tested because Docker Engine was unavailable. See [results/network-containment.json](../results/network-containment.json).

### 2.3 Environment Metadata Binding
Each `exercise_session` record logs:
- `environment_version`: Git commit hash or package version.
- `config_version`: Version string of the scenario manifest (`scenario.json`).
- `start_time` and `end_time`: ISO 8601 UTC timestamps.
- `baseline_snapshot`: captured before the exercise row is inserted; records container IDs, image IDs/digests, network IDs/configuration, volumes, expected services, selected configuration hashes, temporary-file probes, and expected health endpoints.

---

## 3. The Verified Clean-State Reset Protocol

To detect known "dirty lab" state, `ResetEngine` records a pre-exercise baseline, captures pre/post-reset state, and checks expected resources and configured residue probes:

```
[ Active / Dirty Lab ]
          │
          ▼ Phase 1: Baseline before exercise row
   Containers/images, networks/config, volumes,
   expected services, hashes, file probes, health endpoints
          │
          ▼ Phase 2: Capture modified pre-reset state
   Record test artifacts and configuration hashes
          │
          ▼ Phase 3: Teardown and reconstruction
   docker compose down --remove-orphans --volumes
   docker compose up -d --force-recreate
          │
          ▼ Phase 4: Compare resources and residue
   Check expected/unexpected resources, hashes,
   and absence of controlled test artifacts
          │
          ▼ Phase 5: Health checks and report
   Require configured endpoints; write
   results/reset-verification.json
```

`clean_state_verified` is true only when the baseline is valid, all expected services/containers/networks/volumes exist, no unexpected resources are found, image and configuration state matches, temporary probe files are absent, and every configured health endpoint returns its expected status. The scenario selects both repository-side files and in-container files (`/app/config/config.json` and `sources.json` in IDS/collector) for SHA-256 comparison. An empty health endpoint list cannot pass. Container and network IDs are retained in both snapshots; changed IDs caused by recreation are not by themselves considered residue.

### Controlled Reset Probe
In a real authorized OilSprings exercise, create bounded test artifacts in the collector's disposable logs volume before instructor reset:

```powershell
docker exec oilsprings_collector sh -c "printf 'phase3 test state`n' > /app/logs/reset-verification-probe.txt; printf 'probe_mode=modified`n' > /app/logs/reset-verification-config.ini"
```

The first file is exercise state; the second is a controlled configuration probe. The pre-reset snapshot records their presence and hashes; reset requires both absent afterward. Selected source, Compose, and scenario files are hashed at baseline and compared after reset.

### Verification Status (2026-10-05)
`node tests/unit/resetEngine.test.js` is a **MOCKED RESET TEST**: **6 passed, 0 failed**. It invokes ResetEngine with mocked Docker snapshots/Compose execution and real temporary fixture files. It does not prove a real lab was reset.

The **REAL DOCKER RESET TEST** was **NOT EXECUTED** because `docker info` could not connect to the Docker Desktop Linux engine. No container probe was created, no real reset was invoked, and no live health or residue checks were observed. [results/reset-verification.json](../results/reset-verification.json) records `status: not_executed` and `clean_state_verified: false`.

---

## 4. Benchmark Baseline Execution

For comparative research studies, an automated reference baseline can be executed:
1. Spin up scenario `PLC-001`.
2. Run standard attack script from the pentest station.
3. Assert that the IDS captures the anomaly within $\le 5$ seconds.
4. Verify that `ObjectiveEngine` successfully triggers passing status for `PLC-001-OBJ-1`.
5. Trigger reset and verify that health checks return status `200` in $< 30$ seconds.

## 5. Score Replay Protocol

An original score stores the objective validation trace, evaluation timestamps, final score components, and a fingerprint of the scenario rule version and scoring configuration. `GET /api/reports/:exerciseId/replay` reevaluates retained telemetry with the current Objective Engine in read-only mode and compares the result against the original objective rows and score trace. It does not replace the original result.

When retained evidence and rule fingerprint are unchanged, objective statuses, points, evidence IDs, thresholds, and final decision should match. Event timestamps may be reordered without changing the result; timestamps for the new evaluation are recorded separately and excluded from the deterministic comparison. Missing, changed, duplicated, or newly invalid events, and changed rule versions are reported as discrepancies.

Verification on 2026-10-05: `node tests/unit/replayEngine.test.js` reported **7 passed, 0 failed**; `npm test` reported **10 suites passed, 0 failed**. The replay suite uses synthetic retained telemetry and in-memory SQLite. This is software/control-plane replay verification only, not learner-performance measurement or an end-to-end lab replay.

## 6. Multi-Exercise Data Integrity

`tests/integration/concurrency.test.js` creates three users and three unique completed exercise sessions on a temporary file-backed SQLite database. It interleaves six telemetry inserts across A/B/C, concurrently scores each exercise, repeats two scoring calls per exercise, rejects a duplicate event primary key, closes and reopens the database, replays each persisted score, and checks rollback after an invalid foreign-key telemetry insert.

On 2026-10-05 this specific workload reported **7 passed, 0 failed** and produced [results/concurrency-verification.json](../results/concurrency-verification.json). This tests data isolation/idempotency in one Node process and a local SQLite file only. It does not measure production-scale load, multiple application processes, network databases, or maximum concurrency capacity.
