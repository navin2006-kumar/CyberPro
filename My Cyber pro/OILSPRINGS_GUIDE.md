# OilSprings Lab - Complete Guide

## 🎯 What is OilSprings Lab?

OilSprings is a complete industrial control system (ICS) security lab that simulates a real oil and gas facility. It includes all the components you'd find in a real industrial environment, allowing you to learn OT/ICS security hands-on.

## 🏗️ Lab Architecture

### Network Topology

The lab uses 4 isolated networks to simulate real industrial segmentation:

```
┌─────────────────────────────────────────────────────────┐
│                    L3 Pentest Network                   │
│                     (192.168.5.0/24)                    │
│                    Pentest Terminal                     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                        Router                           │
│              (Connects all networks)                    │
└─────┬──────────────┬──────────────┬────────────────────┘
      │              │              │
┌─────▼──────┐  ┌───▼──────┐  ┌───▼────────────────────┐
│ L2 Network │  │ L3 SCADA │  │ L3 Security Network    │
│192.168.2.0 │  │192.168.3.0│  │   (192.168.4.0/24)     │
│            │  │           │  │                        │
│  PLC       │  │  SCADA    │  │  IDS Monitor          │
│  IDS       │  │  EWS      │  │  Log Collector        │
└────────────┘  │  Collector│  └────────────────────────┘
                └───────────┘
```

## 🔧 Lab Components (7 Services)

### 1. PLC Controller (Port 8080)
**What it is:** OpenPLC Runtime - A real programmable logic controller
**URL:** http://localhost:8080
**Login:** `openplc` / `openplc`

**What you can do:**
- View and modify PLC programs
- Monitor I/O status
- Upload ladder logic programs
- Control industrial processes

**Learning:**
- How PLCs work in industrial environments
- Ladder logic programming
- Industrial protocol communication (Modbus)

---

### 2. SCADA Dashboard (Port 8081)
**What it is:** Node-RED based SCADA system
**URL:** http://localhost:8081
**Login:** No login required

**What you can do:**
- Monitor process values in real-time
- Create custom dashboards
- Configure data flows
- Visualize industrial processes

**Learning:**
- SCADA system architecture
- Process monitoring
- Data visualization
- Industrial protocols (Modbus/TCP)

---

### 3. Engineering Workstation (Port 8083)
**What it is:** VNC-based engineering station
**URL:** http://localhost:8083/vnc.html
**Password:** `labshock`

**What you can do:**
- Access a full Linux desktop environment
- Program PLCs using OpenPLC Editor
- Configure SCADA systems
- Run engineering tools

**Learning:**
- Engineering workflow in OT environments
- PLC programming tools
- System configuration

---

### 4. IDS Monitor (Port 8084)
**What it is:** Network intrusion detection system
**URL:** http://localhost:8084

**What you can do:**
- Monitor network traffic
- Detect anomalies
- View protocol analysis
- Capture packets

**Learning:**
- Network monitoring in OT
- Industrial protocol analysis
- Intrusion detection
- Security monitoring

---

### 5. Log Collector (Port 8085)
**What it is:** Centralized logging system
**URL:** http://localhost:8085

**What you can do:**
- View system logs
- Analyze events
- Track security incidents
- Monitor system health

**Learning:**
- Log management in OT
- Event correlation
- Security analysis
- Incident response

---

### 6. Pentest Terminal (Port 8086)
**What it is:** Web-based penetration testing terminal
**URL:** http://localhost:8086

**What you can do:**
- Run security tools
- Test vulnerabilities
- Practice exploitation
- Network reconnaissance

**Learning:**
- OT penetration testing
- Security assessment
- Vulnerability analysis
- Ethical hacking

---

### 7. Router Interface (Port 8087)
**What it is:** Network router configuration
**URL:** http://localhost:8087

**What you can do:**
- Configure network routing
- Manage firewall rules
- Monitor network traffic
- Test segmentation

**Learning:**
- Network segmentation
- Firewall configuration
- DMZ architecture
- Network security

## 🚀 How to Launch the Lab

### Step 1: Start Docker Desktop
Make sure Docker Desktop is running before starting the lab.

### Step 2: Start the Portal
```powershell
cd "C:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro"
npm start
```

### Step 3: Login
- Open http://localhost:3000
- Username: `admin`
- Password: `admin123`

### Step 4: Launch OilSprings
1. Click on **Labs** in the navigation
2. Find **OilSprings Industrial Lab**
3. Click **Launch Lab**
4. Wait 5-10 seconds for containers to start
5. **All 7 services will automatically open in new tabs!**

### Step 5: Allow Popups
If tabs don't open automatically:
- Allow popups for `localhost:3000` in your browser
- Or manually click each service link in the lab page

## 📚 Learning Scenarios

### Scenario 1: Basic Monitoring (Beginner)
**Time:** 30 minutes

1. **Open SCADA Dashboard** (Port 8081)
   - Observe the process values
   - Identify what's being monitored

2. **Check PLC Status** (Port 8080)
   - Login and view the running program
   - Check I/O status

3. **Monitor Network** (Port 8084)
   - Watch traffic between PLC and SCADA
   - Identify Modbus protocol packets

**Goal:** Understand how OT components communicate

---

### Scenario 2: Engineering Tasks (Intermediate)
**Time:** 60 minutes

1. **Access Engineering Workstation** (Port 8083)
   - Connect via VNC
   - Open OpenPLC Editor

2. **Modify PLC Program**
   - Create a simple ladder logic
   - Upload to PLC

3. **Update SCADA**
   - Modify Node-RED flows
   - Add new monitoring points

**Goal:** Learn engineering workflow

---

### Scenario 3: Security Assessment (Advanced)
**Time:** 90 minutes

1. **Network Reconnaissance** (Port 8086)
   - Scan the networks
   - Identify services

2. **Protocol Analysis** (Port 8084)
   - Capture Modbus traffic
   - Analyze protocol structure

3. **Vulnerability Testing**
   - Test for common OT vulnerabilities
   - Document findings

4. **Review Logs** (Port 8085)
   - Check for security events
   - Correlate activities

**Goal:** Practice OT security assessment

## 🛑 Stopping the Lab

### Option 1: From Portal
1. Go to the lab detail page
2. Click **Stop Lab**
3. Confirm

### Option 2: Command Line
```powershell
cd "C:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro\labs\oilsprings"
docker-compose down
```

### Option 3: Stop All Containers
```powershell
docker stop $(docker ps -q --filter "name=oilsprings")
```

## 🔧 Troubleshooting

### Lab won't start
**Check:**
```powershell
docker ps
docker-compose logs
```

**Solution:**
```powershell
cd labs/oilsprings
docker-compose down
docker-compose up -d
```

### Service not accessible
**Wait:** Containers need 10-30 seconds to fully start
**Check:** `docker ps` to see if containers are running
**Logs:** `docker logs oilsprings_<service_name>`

### Port conflicts
**Find what's using the port:**
```powershell
netstat -ano | findstr :8080
```

**Stop conflicting service:**
```powershell
docker stop <container_id>
```

## 💡 Tips for Learning

1. **Start Simple:** Begin with just SCADA and PLC
2. **Take Notes:** Document what you discover
3. **Experiment:** Try breaking things (it's a lab!)
4. **Use Logs:** Check logs when things don't work
5. **Network Analysis:** Always monitor traffic
6. **Practice Regularly:** Consistency builds skills

## 🎓 Learning Objectives

After completing this lab, you should be able to:

✅ Understand OT/ICS architecture  
✅ Configure and monitor SCADA systems  
✅ Program basic PLC logic  
✅ Analyze industrial protocols  
✅ Implement network segmentation  
✅ Perform security monitoring  
✅ Conduct OT penetration testing  
✅ Manage logs and incidents  

## 📖 Additional Resources

- **Modbus Protocol:** Learn about industrial communication
- **Ladder Logic:** PLC programming fundamentals
- **SCADA Security:** Best practices and standards
- **ICS-CERT:** Security advisories and guidelines

## ⚠️ Important Notes

- **Educational Use Only:** Never use these techniques on real systems without permission
- **Isolated Environment:** Lab runs in Docker containers
- **Resource Usage:** Lab uses ~2GB RAM when running
- **Data Persistence:** Some data is lost when lab stops

## 🆘 Getting Help

If you encounter issues:
1. Check Docker Desktop is running
2. View container logs: `docker logs <container_name>`
3. Restart the lab
4. Check the main README.md for general troubleshooting

---

**Ready to learn OT/ICS security? Launch the lab and start exploring!** 🚀
