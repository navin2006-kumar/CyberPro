# OilSprings Lab - Quick Start Guide

## 🚀 Launch in 3 Steps

### Step 1: Navigate to Lab Directory

```bash
cd "c:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro\labs\oilsprings"
```

### Step 2: Start All Services

```bash
docker-compose up -d
```

This will:
- Create 4 isolated networks
- Build 7 container images (first time only - takes 10-15 minutes)
- Start all services in the background

### Step 3: Access Services

Wait ~30 seconds for all services to initialize, then open:

- **PLC**: http://localhost:8080
- **SCADA**: http://localhost:8081
- **IDS Monitor**: http://localhost:8084
- **Log Collector**: http://localhost:8085
- **Router**: http://localhost:8087

## 📊 Check Status

```bash
docker-compose ps
```

All services should show "Up" status.

## 🛑 Stop the Lab

```bash
docker-compose down
```

## 🔄 Restart After Changes

```bash
docker-compose down
docker-compose up -d --build
```

## ⚡ First Time Setup

The first time you run the lab, Docker will:
1. Download base images (~2GB)
2. Build custom images (~5-10 minutes)
3. Create networks and volumes

Subsequent starts are much faster (~30 seconds).

## 🎯 Quick Test

1. Open SCADA dashboard: http://localhost:8081
2. Open IDS Monitor: http://localhost:8084
3. Watch the IDS capture Modbus traffic from SCADA to PLC!

## 📖 Full Documentation

See [README.md](README.md) for complete documentation.

---

**Enjoy your OT security lab! 🛡️**
