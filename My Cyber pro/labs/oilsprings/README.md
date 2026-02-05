# OilSprings Lab - Quick Start

## 🚀 Launch the Lab

### Option 1: From Portal (Recommended)
1. Start portal: `npm start` from project root
2. Login at http://localhost:3000
3. Click Labs → OilSprings → Launch Lab
4. All 7 services will auto-open!

### Option 2: Direct Docker Launch
```powershell
cd "C:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro\labs\oilsprings"
docker-compose up -d
```

## 📦 Services

| Service | URL | Port |
|---------|-----|------|
| PLC Controller | http://localhost:8080 | 8080 |
| SCADA Dashboard | http://localhost:8081 | 8081 |
| Engineering Workstation | http://localhost:8083 | 8083 |
| IDS Monitor | http://localhost:8084 | 8084 |
| Log Collector | http://localhost:8085 | 8085 |
| Pentest Terminal | http://localhost:8086 | 8086 |
| Router Interface | http://localhost:8087 | 8087 |

## 🛑 Stop the Lab

```powershell
docker-compose down
```

## 🔧 Troubleshooting

### Check if running
```powershell
docker ps
```

### View logs
```powershell
docker logs oilsprings_plc
docker logs oilsprings_scada
# etc...
```

### Restart a service
```powershell
docker restart oilsprings_plc
```

## 📖 Full Guide

See [OILSPRINGS_GUIDE.md](../../OILSPRINGS_GUIDE.md) in the project root for complete documentation.
