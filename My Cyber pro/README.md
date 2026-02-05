# CyberPro - OT/ICS Security Lab Platform

A hands-on industrial cybersecurity learning platform with Docker-based labs. **Start with OilSprings - a complete industrial environment with 7 services that auto-open in your browser!**

## 🚀 Quick Start (3 Steps)

### 1. Start Docker Desktop
Make sure Docker Desktop is running.

### 2. Start the Portal
```powershell
cd "C:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro"
npm start
```

### 3. Launch OilSprings Lab
1. Open http://localhost:3000
2. Login: `admin` / `admin123`
3. Click **Labs** → **OilSprings Industrial Lab** → **Launch Lab**
4. **All 7 services automatically open in new tabs!** 🎉

## 🧪 OilSprings Lab - What You Get

When you launch OilSprings, these 7 services open automatically:

| Service | Port | What It Does |
|---------|------|--------------|
| **PLC Controller** | 8080 | Program and control industrial processes |
| **SCADA Dashboard** | 8081 | Monitor and visualize operations |
| **Engineering Workstation** | 8083 | Full desktop for PLC programming |
| **IDS Monitor** | 8084 | Network intrusion detection |
| **Log Collector** | 8085 | Centralized logging and analysis |
| **Pentest Terminal** | 8086 | Security testing tools |
| **Router Interface** | 8087 | Network configuration |

**📖 Complete Guide:** See [OILSPRINGS_GUIDE.md](OILSPRINGS_GUIDE.md) for detailed instructions, learning scenarios, and troubleshooting.

## ✨ Key Features

- ✅ **Auto-Open Services** - All lab services open in new tabs automatically
- ✅ **Real OT/ICS Environment** - Actual industrial protocols and systems
- ✅ **Network Segmentation** - 4 isolated networks simulating real architecture
- ✅ **Hands-On Learning** - Practice with real tools and protocols
- ✅ **Safe Environment** - Isolated Docker containers

## 🛑 Stopping the Lab

**From Portal:**
- Go to lab page → Click "Stop Lab"

**From Command Line:**
```powershell
cd labs/oilsprings
docker-compose down
```

## 🔧 Troubleshooting

### Services don't auto-open
- Allow popups for `localhost:3000` in your browser
- Or manually click service links in the lab page

### Lab won't start
```powershell
# Check Docker is running
docker ps

# Restart the lab
cd labs/oilsprings
docker-compose down
docker-compose up -d
```

### Port conflicts
```powershell
# Find what's using a port
netstat -ano | findstr :8080

# Stop all OilSprings containers
docker stop $(docker ps -q --filter "name=oilsprings")
```

## 📚 Documentation

- **[OILSPRINGS_GUIDE.md](OILSPRINGS_GUIDE.md)** - Complete lab guide with learning scenarios
- **[RUNNING_LABS.md](RUNNING_LABS.md)** - Detailed platform documentation
- **[QUICKSTART.md](QUICKSTART.md)** - Quick reference guide

## 🎓 Learning Path

1. **Start OilSprings** - Get familiar with all 7 services
2. **Basic Monitoring** - Learn SCADA and PLC basics (30 min)
3. **Engineering Tasks** - Modify PLC programs (60 min)
4. **Security Assessment** - Practice OT security testing (90 min)

See [OILSPRINGS_GUIDE.md](OILSPRINGS_GUIDE.md) for detailed scenarios.

## 📊 System Requirements

- **Docker Desktop** (required)
- **CPU**: 2+ cores (4+ recommended)
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 10GB free space

## 🔒 Security Notice

- For educational use only
- Never use on production systems
- Labs run in isolated Docker networks
- Default credentials should be changed

## 📁 Project Structure

```
My Cyber pro/
├── server.js              # Portal server
├── labManager.js          # Docker lab control
├── db.js                  # Database
├── labs/
│   └── oilsprings/        # OilSprings lab
│       ├── docker-compose.yml
│       ├── plc/
│       ├── scada/
│       ├── ews/
│       ├── ids/
│       ├── collector/
│       ├── pentest/
│       └── router/
└── public/                # Web interface
```

## 🆘 Need Help?

1. Check [OILSPRINGS_GUIDE.md](OILSPRINGS_GUIDE.md) troubleshooting section
2. View container logs: `docker logs oilsprings_<service>`
3. Restart Docker Desktop
4. Check that ports 8080-8087 are not in use

---

**Ready to learn OT/ICS security? Run `npm start` and launch OilSprings!** 🚀

