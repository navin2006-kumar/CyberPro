# OilSprings Lab - Quick Start

## 🚀 Start the Lab (3 Simple Steps)

### Step 1: Open PowerShell

Press `Win + X` and select "Windows PowerShell" or "Terminal"

### Step 2: Navigate to Lab Directory

```powershell
cd "c:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro\labs\oilsprings"
```

### Step 3: Start All Services

```powershell
docker-compose up -d
```

**Wait ~30 seconds** for all services to start.

## 🌐 Access the Portal

Open your browser to:

**http://localhost:9000/portal.html**

Or open the file directly:
`c:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro\labs\oilsprings\portal.html`

## 📊 Access Individual Services

| Service | URL | Description |
|---------|-----|-------------|
| **PLC** | http://localhost:8080 | OpenPLC Runtime |
| **SCADA** | http://localhost:8081 | Node-RED Dashboard |
| **EWS** | http://localhost:8083 | Engineering Workstation |
| **IDS** | http://localhost:8084 | Network Monitor |
| **Collector** | http://localhost:8085 | Log Collector |
| **Pentest** | http://localhost:8086 | Kali Terminal |
| **Router** | http://localhost:8087 | Network Router |

## ✅ Check if Lab is Running

```powershell
docker-compose ps
```

All services should show "Up" status.

## 🛑 Stop the Lab

```powershell
docker-compose down
```

## 🔄 Restart the Lab

```powershell
docker-compose restart
```

## 📝 View Logs

```powershell
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f scada
```

## ⚠️ Troubleshooting

### Docker Not Running
**Error**: "Cannot connect to Docker daemon"  
**Solution**: Start Docker Desktop and wait for it to fully initialize

### Port Already in Use
**Error**: "Port is already allocated"  
**Solution**: Stop other services using those ports or change ports in `docker-compose.yml`

### Services Not Starting
```powershell
# Stop everything
docker-compose down

# Remove volumes
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

---

**That's it! Your OilSprings lab is now running! 🎉**
