# CyberPro Deployment & Operations Guide

**Project**: CyberPro: Scenario-Driven Cyber Range  
**Document**: Operations and Deployment Manual  
**Version**: 2.0  

---

## 1. Prerequisites

Ensure the following runtimes and tools are installed on the host system:

- **Operating System**: Windows 10/11 (with WSL2 backend recommended), Linux (Ubuntu 22.04+), or macOS.
- **Node.js**: Version 18.0.0 or higher (Node 20+ recommended).
- **Docker & Docker Compose**: Docker Desktop 4.20+ with Compose v2 enabled.
- **Python**: Version 3.9+ (required for Scapy and the optional LLM chatbot service).
- **Hardware Minimum**: 4 CPU cores, 8 GB RAM, 20 GB free disk space.

---

## 2. Quick-Start Deployment

### Step 1: Clone the Repository
```bash
git clone https://github.com/navin2006-kumar/CyberPro.git
cd CyberPro/"My Cyber pro"
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` and configure secrets:
```bash
cp .env.example .env
```

Key environment configurations:
```ini
PORT=3000
SESSION_SECRET=c9b2f48d901a4e21a71e54bc82e16d48b1fa23e590
DB_PATH=./data/labs.db
NODE_ENV=development
ADMIN_USERNAME=admin
ADMIN_PASSWORD=StrongAdminPassword!123
CONTAINER_SECRET=shared_internal_telemetry_key_441
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Run Database Migration
Initialize all 10 cyber range and telemetry tables:
```bash
npm run migrate
```

### Step 5: Verify Automated Test Suite
Execute the complete test suite to ensure all engines and security controls pass:
```bash
npm test
```

### Step 6: Start the Server
```bash
npm start
```
The platform will be accessible at `http://localhost:3000`.

---

## 3. Docker Lab Deployment (OilSprings)

The CyberPro platform automatically manages container lifecycles through `LabManager` and `ResetEngine`. To manually build or deploy the OilSprings industrial lab environment:

```bash
cd labs/oilsprings
docker compose build
docker compose up -d
```

Verify that all containers are healthy:
```bash
docker compose ps
```

| Container | Service | Published Port | Health Endpoint |
|---|---|---|---|
| `oilsprings_plc` | OpenPLC Modbus Controller | 8080 (Web), 502 (Modbus) | `http://localhost:8080` |
| `oilsprings_scada` | ScadaBR Supervisory HMI | 8081 (Web) | `http://localhost:8081/ScadaBR` |
| `oilsprings_ids` | Scapy/Sniff Network IDS | 8084 (Dashboard) | `http://localhost:8084/api/health` |
| `oilsprings_collector` | OT Event & Log Collector | 8085 (Dashboard) | `http://localhost:8085/api/health` |
| `oilsprings_pentest` | Kali Attack Station | 8086 (Web Terminal) | `http://localhost:8086` |

To reset and clean up containers:
```bash
docker compose down -v
```

---

## 4. Troubleshooting & Diagnostics

### Issue: Port Conflicts (e.g. port 8080 or 3000 in use)
- **Symptom**: `EADDRINUSE: address already in use :::3000`
- **Remediation**: Check and terminate conflicting processes:
  - Windows: `netstat -ano | findstr :3000` followed by `taskkill /PID <PID> /F`
  - Linux: `lsof -i :3000` followed by `kill -9 <PID>`

### Issue: Docker Daemon Not Running
- **Symptom**: `Error: connect ECONNREFUSED //./pipe/docker_engine`
- **Remediation**: Ensure Docker Desktop is launched and the Docker engine is running before starting labs.

### Issue: Database Locked
- **Symptom**: `SQLITE_BUSY: database is locked`
- **Remediation**: CyberPro utilizes WAL (Write-Ahead Logging) mode. Ensure only one Node server process has `labs.db` open concurrently.
