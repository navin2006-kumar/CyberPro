# CyberPro - Open-Source Cyber Security Labs

## 🎯 Overview

CyberPro is a web-based platform for hands-on cyber security training with **4 fully functional, open-source labs**:

1. **OpenPLC Controller** - Learn PLC programming
2. **SCADA Dashboard** - Build industrial dashboards  
3. **Network Security** - Monitor and analyze traffic
4. **Penetration Testing** - Practice ethical hacking

## ✨ Features

- 🚀 **One-Click Launch** - Start labs instantly from web portal
- 🪟 **Auto-Open Tabs** - All lab services open automatically
- 📚 **Guided Learning** - Each lab includes exercises and tutorials
- 🐳 **Docker-Based** - Isolated, reproducible environments
- 🆓 **100% Open-Source** - No licensing required

## 🚀 Quick Start

### Prerequisites

- Docker Desktop (running)
- Node.js 16+ and npm
- 4GB+ RAM
- Windows/Linux/Mac

### Installation

```powershell
# Clone or navigate to project
cd "C:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro"

# Install dependencies
npm install

# Start portal
npm start
```

### Access Portal

1. Open http://localhost:3000
2. Login: `admin` / `admin123`
3. Go to **Labs**
4. Click any lab → **Launch Lab**
5. Services auto-open in new tabs! 🎉

## 📦 Available Labs

### 1. OpenPLC Controller (Beginner)
**What:** Real PLC programming environment  
**Services:** OpenPLC Web Interface (8080)  
**Learn:** Ladder logic, Modbus, I/O control  
**Time:** 60 minutes

### 2. SCADA Dashboard (Beginner)
**What:** Node-RED based SCADA system  
**Services:** Flow Editor (1880), Dashboard (1881)  
**Learn:** Data flows, visualization, monitoring  
**Time:** 60 minutes

### 3. Network Security (Intermediate)
**What:** Packet capture and analysis  
**Services:** Network Monitor (8082)  
**Learn:** tcpdump, traffic analysis, diagnostics  
**Time:** 50 minutes

### 4. Penetration Testing (Advanced)
**What:** Kali Linux tools in browser  
**Services:** Web Terminal (7681)  
**Learn:** nmap, metasploit, ethical hacking  
**Time:** 90 minutes

## 🎓 Learning Path

**Recommended Order:**
1. Start with **OpenPLC** - Understand industrial systems
2. Then **SCADA Dashboard** - Build monitoring interfaces
3. Next **Network Security** - Analyze traffic
4. Finally **Penetration Testing** - Test security

## 🔧 Manual Lab Launch

You can also launch labs directly:

```powershell
# OpenPLC
cd labs/openplc
docker-compose up -d

# SCADA Dashboard
cd labs/scada-dashboard
docker-compose up -d

# Network Security
cd labs/network-security
docker-compose up -d

# Penetration Testing
cd labs/pentest
docker-compose up -d
```

## 📖 Documentation

Each lab has detailed documentation:
- `labs/openplc/README.md`
- `labs/scada-dashboard/README.md`
- `labs/network-security/README.md`
- `labs/pentest/README.md`

## 🐛 Troubleshooting

### Portal won't start
```powershell
# Check if port 3000 is free
netstat -ano | findstr :3000

# Restart portal
npm start
```

### Lab won't launch
```powershell
# Check Docker is running
docker ps

# View lab logs
docker logs <container_name>

# Rebuild lab
cd labs/<lab_name>
docker-compose build --no-cache
docker-compose up -d
```

### Services not accessible
- Wait 30-60 seconds for containers to fully start
- Check firewall isn't blocking ports
- Verify no port conflicts: `netstat -ano | findstr :<port>`

## 🎯 Project Structure

```
CyberPro/
├── server.js           # Portal backend
├── db.js              # Database with lab definitions
├── labManager.js      # Docker lab management
├── public/            # Frontend files
│   ├── labs.html
│   ├── lab-detail.html
│   └── js/
└── labs/              # Lab configurations
    ├── openplc/
    ├── scada-dashboard/
    ├── network-security/
    └── pentest/
```

## 💡 Tips

- **Build Once** - First lab launch builds Docker images (~5-15 min)
- **Subsequent Starts** - Instant after initial build
- **Stop Labs** - Use portal or `docker-compose down`
- **Save Work** - Some labs persist data in volumes
- **Browser Popups** - Allow popups for localhost:3000

## 🤝 Contributing

Want to add more labs? Each lab needs:
1. `Dockerfile` - Container definition
2. `docker-compose.yml` - Service configuration
3. `README.md` - Learning guide
4. Entry in `db.js` - Portal integration

## 📝 License

Open-source labs using:
- OpenPLC (GPL-3.0)
- Node-RED (Apache-2.0)
- Kali Linux (GPL)
- Various open-source tools

## 🎉 Get Started!

```powershell
npm start
```

Then visit http://localhost:3000 and start learning! 🚀

---

**Happy Hacking!** 🔐
