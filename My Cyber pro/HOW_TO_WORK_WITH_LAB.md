# How to Work with OilSprings Lab

## 🎯 Two Ways to Run the Lab

### Method 1: Through Portal (Recommended - Auto-Opens All Services)

1. **Start the Portal**
   ```powershell
   cd "C:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro"
   npm start
   ```

2. **Login**
   - Open http://localhost:3000
   - Username: `admin`
   - Password: `admin123`

3. **Launch Lab**
   - Click **Labs** → **OilSprings Industrial Lab**
   - Click **Launch Lab** button
   - Wait 5-10 seconds
   - **All 7 services will automatically open in new tabs!**

### Method 2: Direct Docker (Manual)

1. **Navigate to lab directory**
   ```powershell
   cd "C:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro\labs\oilsprings"
   ```

2. **Start the lab**
   ```powershell
   docker-compose up -d
   ```
   
   Or double-click `START_LAB.bat`

3. **Manually open services**
   - PLC: http://localhost:8080
   - SCADA: http://localhost:8081
   - EWS: http://localhost:8083
   - IDS: http://localhost:8084
   - Collector: http://localhost:8085
   - Pentest: http://localhost:8086
   - Router: http://localhost:8087

## 📦 What Each Service Does

### 1. PLC Controller (Port 8080)
**Login:** `openplc` / `openplc`

- View and modify PLC programs
- Monitor I/O status
- Upload ladder logic
- Control industrial processes

### 2. SCADA Dashboard (Port 8081)
**No login required**

- Monitor process values in real-time
- Create custom dashboards
- Configure data flows
- Visualize industrial processes

### 3. Engineering Workstation (Port 8083)
**VNC Password:** `labshock`

- Full Linux desktop environment
- Program PLCs using OpenPLC Editor
- Configure SCADA systems
- Run engineering tools

### 4. IDS Monitor (Port 8084)
- Monitor network traffic
- Detect anomalies
- View protocol analysis
- Capture packets

### 5. Log Collector (Port 8085)
- View system logs
- Analyze events
- Track security incidents
- Monitor system health

### 6. Pentest Terminal (Port 8086)
- Web-based terminal
- Run security tools
- Test vulnerabilities
- Network reconnaissance

### 7. Router Interface (Port 8087)
- Configure network routing
- Manage firewall rules
- Monitor network traffic
- Test segmentation

## 🔧 Common Tasks

### Check if Lab is Running
```powershell
docker ps
```

You should see 7 containers:
- oilsprings_plc
- oilsprings_scada
- oilsprings_ews
- oilsprings_ids
- oilsprings_collector
- oilsprings_pentest
- oilsprings_router

### View Container Logs
```powershell
docker logs oilsprings_plc
docker logs oilsprings_scada
# etc...
```

### Restart a Service
```powershell
docker restart oilsprings_plc
```

### Stop the Lab
```powershell
cd labs/oilsprings
docker-compose down
```

Or from portal: Click "Stop Lab"

### Pull Latest Images
```powershell
docker-compose pull
```

## 🎓 Learning Exercises

### Exercise 1: Basic Monitoring (30 min)
1. Open SCADA Dashboard (8081)
2. Observe process values
3. Open PLC Controller (8080)
4. Check running program
5. Open IDS Monitor (8084)
6. Watch traffic between PLC and SCADA

**Goal:** Understand how OT components communicate

### Exercise 2: Engineering Tasks (60 min)
1. Access EWS (8083) via VNC
2. Open OpenPLC Editor
3. Create simple ladder logic
4. Upload to PLC
5. Modify SCADA flows in Node-RED
6. Test the changes

**Goal:** Learn engineering workflow

### Exercise 3: Security Assessment (90 min)
1. Use Pentest Terminal (8086)
2. Scan the networks
3. Analyze Modbus traffic in IDS (8084)
4. Test for vulnerabilities
5. Review logs in Collector (8085)
6. Document findings

**Goal:** Practice OT security assessment

## 🐛 Troubleshooting

### Services won't start
**Check Docker:**
```powershell
docker ps
docker-compose logs
```

**Restart:**
```powershell
docker-compose down
docker-compose up -d
```

### Port already in use
**Find what's using it:**
```powershell
netstat -ano | findstr :8080
```

**Stop conflicting container:**
```powershell
docker stop <container_id>
```

### Service not responding
**Wait 30 seconds** - containers need time to initialize

**Check logs:**
```powershell
docker logs oilsprings_<service_name>
```

### Images won't pull
**Check internet connection**

**Try manual pull:**
```powershell
docker pull zakharbz/labshock-plc:latest
docker pull zakharbz/labshock-scada:latest
# etc...
```

## 📊 Network Architecture

The lab uses 4 isolated networks:

- **L2 Network (192.168.2.0/24)** - Field devices (PLC)
- **L3 SCADA Network (192.168.3.0/24)** - Control systems (SCADA, EWS)
- **L3 Security Network (192.168.4.0/24)** - Monitoring (IDS, Collector)
- **L3 Pentest Network (192.168.5.0/24)** - Testing (Pentest)
- **Router** - Connects all networks

## 💡 Tips

1. **Allow popups** in your browser for auto-open to work
2. **Wait 10-30 seconds** after starting for services to initialize
3. **Check logs** if something doesn't work
4. **Use portal method** for best experience
5. **Stop lab** when not in use to save resources

## 🆘 Need Help?

1. Check container status: `docker ps`
2. View logs: `docker logs oilsprings_<service>`
3. Restart Docker Desktop
4. Check ports 8080-8087 are not in use
5. See [OILSPRINGS_GUIDE.md](../../OILSPRINGS_GUIDE.md) for detailed guide

---

**Ready to start learning? Launch the lab and explore!** 🚀
