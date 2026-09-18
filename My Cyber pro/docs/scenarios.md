# CyberPro Scenario Specification: PLC-001

**Scenario ID**: PLC-001  
**Name**: PLC Attack Detection & Incident Response  
**Lab Environment**: OilSprings Industrial Lab  
**Difficulty**: Medium  
**Estimated Time Limit**: 30 Minutes  

---

## 1. Executive Scenario Description

An unauthenticated attacker located on an external reconnaissance segment (`10.10.5.50`) initiates aggressive Modbus/TCP scanning and command injection targeting an OpenPLC field controller (`10.10.2.10`) governing industrial fluid pump operations. 

Students assume the role of an Industrial Incident Responder tasked with:
1. Observing and verifying anomalous protocol alerts emitted by the Network IDS.
2. Identifying the compromised controller IP address on the OT field bus.
3. Conducting forensic log analysis on collected telemetry to determine the attack vector.
4. Implementing network containment to isolate the vulnerable controller.
5. Completing a structured reflective debriefing report.

---

## 2. Verifiable Learning Objectives

| Objective ID | Objective Name | Points | Required | Detection Source | Validation Logic |
|---|---|---|---|---|---|
| `PLC-001-OBJ-1` | Detect Suspicious PLC Activity | 25 | **Yes** | `ids` | `event_type = 'modbus_anomaly'`, `dst_port = 502`, `severity IN ['medium', 'high', 'critical']` |
| `PLC-001-OBJ-2` | Identify Affected Host | 25 | **Yes** | `student` | `event_type = 'host_identified'`, `identified_ip = '10.10.2.10'` |
| `PLC-001-OBJ-3` | Analyse IDS Logs | 25 | **Yes** | `student` | `event_type = 'log_analysis_submitted'`, `analysis_text` length $\ge$ 50 chars |
| `PLC-001-OBJ-4` | Contain Incident | 25 | No (Bonus) | `student` | `event_type = 'containment_action'`, `action_type IN ['block_ip', 'isolate_container', 'firewall_rule']` |

---

## 3. Threat Simulation & Execution Flow

### Step 1: Scenario Activation
1. The student logs into the CyberPro portal and selects **Scenario PLC-001**.
2. The platform allocates an `exercise_id` (UUIDv4) and provisions the `oilsprings` container cluster.
3. System emits `exercise_started` and `lab_provisioned` telemetry events.

### Step 2: Adversary Attack Simulation
From the pentest container (`http://localhost:8086`), the simulation executes a Modbus reconnaissance scan:
```bash
# Example Modbus reconnaissance using Python/pymodbus or nmap
nmap -Pn -sT -p 502 --script modbus-discover 10.10.2.10
```
- The network IDS detects frames originating outside the authorized SCADA subnet (`10.10.3.0/24`).
- IDS emits a `modbus_anomaly` telemetry event with `dst_port: 502`, `severity: high`.
- The event is captured in `telemetry_events` bound to the current `exercise_id`.

### Step 3: Student Investigation & Mitigation
1. **Detection**: Student monitors the IDS alert dashboard at `http://localhost:8084` and notes the anomaly targeting port 502.
2. **Identification**: Student submits the identified IP `10.10.2.10` via the portal investigation tab (`POST /api/telemetry/event` with `event_type: host_identified`).
3. **Log Analysis**: Student reads logs at `http://localhost:8085` and submits a written assessment of the unauthorized Modbus function codes observed.
4. **Containment**: Student applies containment via the portal or console to isolate the compromised target.

---

## 4. Scenario JSON Definition Schema

Each scenario is defined via a machine-readable JSON manifest (`scenarios/<SCENARIO_ID>/scenario.json`):

```json
{
  "scenario_id": "PLC-001",
  "name": "PLC Attack Detection",
  "version": "1.0",
  "description": "...",
  "difficulty": "medium",
  "time_limit_minutes": 30,
  "lab_id": "oilsprings",
  "network_topology": { ... },
  "objectives": [
    {
      "id": "PLC-001-OBJ-1",
      "name": "Detect Suspicious PLC Activity",
      "points": 25,
      "required": true,
      "detection": {
        "source": "ids",
        "event_type": "modbus_anomaly",
        "field_checks": { "dst_port": 502, "severity": ["medium", "high", "critical"] }
      }
    }
  ],
  "success_conditions": {
    "min_objectives_required_passed": 3,
    "min_score": 75
  },
  "reset_verification": {
    "expected_containers": ["oilsprings_plc", "oilsprings_ids", "oilsprings_collector"],
    "health_check_endpoints": [
      { "container": "oilsprings_plc", "url": "http://localhost:8080", "expected_status": 200 }
    ]
  }
}
```
