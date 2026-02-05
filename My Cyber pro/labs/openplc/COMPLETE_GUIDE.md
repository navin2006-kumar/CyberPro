# Complete OpenPLC Guide for CyberPro

## 📖 Table of Contents

1. [What is OpenPLC?](#what-is-openplc)
2. [Installation & Setup](#installation--setup)
3. [Getting Started](#getting-started)
4. [Programming Basics](#programming-basics)
5. [Advanced Features](#advanced-features)
6. [Security Testing](#security-testing)
7. [Troubleshooting](#troubleshooting)
8. [Resources](#resources)

---

## 🎯 What is OpenPLC?

OpenPLC is an **open-source Programmable Logic Controller (PLC)** that runs on various platforms. In your CyberPro project, it serves as a hands-on lab for learning:

- **Industrial Control Systems (ICS)**
- **Operational Technology (OT) Security**
- **PLC Programming with Ladder Logic**
- **Modbus Protocol**
- **SCADA Integration**

### Why OpenPLC in CyberPro?

✅ **Free & Open-Source** - No licensing costs  
✅ **Real PLC Runtime** - Not a simulation, actual PLC software  
✅ **Web-Based Interface** - Easy to use  
✅ **Modbus Support** - Industry-standard protocol  
✅ **Educational** - Perfect for learning ICS security  

---

## 🚀 Installation & Setup

### Method 1: Through CyberPro Portal (Recommended)

**Prerequisites:**
- Docker Desktop installed and running
- CyberPro portal running (`npm start`)

**Steps:**

1. **Reset Database** (first time only):
   ```powershell
   cd "C:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro"
   
   # Stop portal (Ctrl+C)
   # Delete old database
   del cyberpro.db
   
   # Restart portal
   npm start
   ```

2. **Launch Lab:**
   - Open http://localhost:3000
   - Login: `admin` / `admin123`
   - Go to **Labs**
   - Click **OpenPLC Controller**
   - Click **Launch Lab**

3. **Wait for Build** (first time only):
   - Initial build: ~10-15 minutes
   - Downloads and compiles OpenPLC from source
   - Subsequent starts: instant!

4. **Access OpenPLC:**
   - Automatically opens at http://localhost:8080
   - Or manually visit http://localhost:8080

### Method 2: Direct Docker Launch

```powershell
cd "C:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro\labs\openplc"

# Build (first time)
docker-compose build

# Start
docker-compose up -d

# Check status
docker ps

# View logs
docker logs openplc_controller

# Stop
docker-compose down
```

---

## 🎓 Getting Started

### First Login

1. **Open:** http://localhost:8080
2. **Default Credentials:**
   - Username: `openplc`
   - Password: `openplc`

3. **You'll see the OpenPLC Dashboard:**
   - Programs
   - Slave Devices
   - Monitoring
   - Hardware
   - Settings

### Interface Overview

```
┌─────────────────────────────────────┐
│         OpenPLC Dashboard           │
├─────────────────────────────────────┤
│ Programs      │ Create/Upload PLC   │
│               │ programs            │
├───────────────┼─────────────────────┤
│ Slave Devices │ Configure Modbus    │
│               │ slaves              │
├───────────────┼─────────────────────┤
│ Monitoring    │ View I/O status     │
│               │ in real-time        │
├───────────────┼─────────────────────┤
│ Hardware      │ Configure I/O pins  │
│               │ and settings        │
├───────────────┼─────────────────────┤
│ Settings      │ System config       │
└───────────────┴─────────────────────┘
```

---

## 💻 Programming Basics

### Exercise 1: Your First Ladder Logic Program (15 min)

**Goal:** Create a simple program that turns on an output when an input is active.

**Steps:**

1. **Go to Programs Tab**
   - Click "Programs" in the menu

2. **Create New Program**
   - Click "Upload new program"
   - Choose "Blank Program"
   - Or use example: "Blink LED"

3. **Understanding Ladder Logic:**

```
Ladder Logic Basics:

Input Contact:    ──| |──    (Normally Open)
                  ──|/|──    (Normally Closed)

Output Coil:      ──( )──    (Energize output)

Example Program:
┌────────────────────────────────┐
│  %IX0.0    %QX0.0              │
│  ──| |──────( )──              │
│                                │
│  When Input 0 is ON,           │
│  Output 0 turns ON             │
└────────────────────────────────┘
```

4. **Upload Program:**
   - Click "Choose File"
   - Select your `.st` file
   - Click "Upload Program"

5. **Start PLC:**
   - Click "Start PLC"
   - Status changes to "Running"

6. **Monitor:**
   - Go to "Monitoring" tab
   - See inputs/outputs in real-time

### Exercise 2: Blink LED Program (20 min)

**Create a program that blinks an output every second.**

**Ladder Logic:**
```
TON (Timer On Delay)
┌──────────────────────────────────┐
│  %QX0.0    TON1                  │
│  ──|/|─────[TON]─────( )──       │
│             IN  Q                │
│             PT=T#1s              │
│                                  │
│  Output toggles every 1 second   │
└──────────────────────────────────┘
```

**Structured Text (.st file):**
```st
PROGRAM Blink
VAR
    timer1: TON;
    output: BOOL;
END_VAR

timer1(IN := NOT output, PT := T#1s);

IF timer1.Q THEN
    output := NOT output;
END_IF;

%QX0.0 := output;
END_PROGRAM
```

**Steps:**
1. Create file `blink.st` with above code
2. Upload to OpenPLC
3. Start PLC
4. Watch output blink in Monitoring tab

### Exercise 3: Multiple Inputs/Outputs (25 min)

**Create a program with multiple conditions.**

**Scenario:** Safety system
- Input 0: Emergency Stop
- Input 1: Start Button
- Input 2: Sensor
- Output 0: Motor

**Logic:**
- Motor runs when Start pressed AND Sensor active
- Motor stops when Emergency Stop pressed

**Ladder Logic:**
```
┌────────────────────────────────────────┐
│  %IX0.0    %IX0.1    %IX0.2    %QX0.0  │
│  ──|/|──────| |───────| |───────( )──  │
│  E-Stop    Start    Sensor    Motor   │
│                                        │
│  Motor ON when:                        │
│  - E-Stop NOT pressed (NC contact)    │
│  - Start pressed                       │
│  - Sensor active                       │
└────────────────────────────────────────┘
```

---

## 🔧 Advanced Features

### Modbus Configuration

OpenPLC supports Modbus TCP/RTU for communication with SCADA systems.

**Setup Modbus Slave:**

1. **Go to Slave Devices**
2. **Add New Device:**
   - Device Name: `SCADA_System`
   - Slave ID: `1`
   - IP Address: `localhost` (or SCADA IP)
   - Port: `502`

3. **Configure Registers:**
   - Coils (Digital Outputs): `0-15`
   - Discrete Inputs: `0-15`
   - Holding Registers: `0-31`
   - Input Registers: `0-31`

4. **Test Connection:**
   ```powershell
   # Using modpoll (Modbus testing tool)
   modpoll -m tcp -a 1 -r 1 -c 10 localhost
   ```

### Connecting to SCADA Dashboard

**If you have the SCADA Dashboard lab running:**

1. **In OpenPLC:**
   - Configure Modbus slave on port 502

2. **In Node-RED (SCADA):**
   - Add Modbus Read node
   - Configure:
     - Server: `localhost:502`
     - Unit ID: `1`
     - Address: `0`
     - Quantity: `10`

3. **Create Flow:**
   ```
   [Modbus Read] → [Function] → [Dashboard Gauge]
   ```

4. **View Data:**
   - Open SCADA dashboard
   - See PLC values in real-time

### Hardware Configuration

**Configure I/O Pins:**

1. **Go to Hardware Tab**
2. **Select Platform:**
   - For Docker: "Linux"
   - For Raspberry Pi: "RPi"

3. **Map Pins:**
   - Digital Inputs: `%IX0.0` to `%IX0.7`
   - Digital Outputs: `%QX0.0` to `%QX0.7`
   - Analog Inputs: `%IW0` to `%IW7`

---

## 🔒 Security Testing

### Exercise 4: Security Assessment (30 min)

**Learn to identify PLC vulnerabilities.**

**1. Network Scanning:**
```powershell
# From Pentest lab (if running)
nmap -p 502,8080 localhost

# Expected output:
# 502/tcp  open  modbus
# 8080/tcp open  http-proxy
```

**2. Modbus Enumeration:**
```powershell
# Using nmap scripts
nmap -p 502 --script modbus-discover localhost
```

**3. Web Interface Testing:**
```powershell
# Check for default credentials
curl -u openplc:openplc http://localhost:8080

# Directory enumeration
dirb http://localhost:8080
```

**4. Traffic Analysis:**
```powershell
# Capture Modbus traffic (from Network Security lab)
tcpdump -i any -w plc_traffic.pcap port 502

# Analyze with Wireshark
wireshark plc_traffic.pcap
```

**Security Findings:**
- ⚠️ Default credentials
- ⚠️ Unencrypted Modbus
- ⚠️ No authentication on Modbus
- ⚠️ Web interface accessible

**Mitigation:**
- Change default password
- Use VPN for Modbus
- Implement network segmentation
- Enable HTTPS

---

## 🛠️ Troubleshooting

### Container Won't Start

**Check logs:**
```powershell
docker logs openplc_controller
```

**Common issues:**
- Port 8080 already in use
- Docker not running
- Build failed

**Solution:**
```powershell
# Check port
netstat -ano | findstr :8080

# Rebuild
cd labs/openplc
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Can't Access Web Interface

**Checks:**
1. Container running?
   ```powershell
   docker ps | findstr openplc
   ```

2. Port accessible?
   ```powershell
   curl http://localhost:8080
   ```

3. Firewall blocking?
   - Check Windows Firewall
   - Allow port 8080

### Program Won't Upload

**Common causes:**
- Invalid syntax in .st file
- File too large
- PLC already running

**Solution:**
1. Stop PLC first
2. Check syntax
3. Try example program first

### Modbus Not Working

**Debug steps:**
```powershell
# Test Modbus port
telnet localhost 502

# Check OpenPLC logs
docker logs openplc_controller | grep -i modbus

# Verify slave config
# Go to Slave Devices tab in OpenPLC
```

---

## 📚 Resources

### Official Documentation
- [OpenPLC Website](https://www.openplcproject.com/)
- [OpenPLC GitHub](https://github.com/thiagoralves/OpenPLC_v3)
- [Programming Guide](https://www.openplcproject.com/reference)

### Learning Materials
- [Ladder Logic Tutorial](https://www.openplcproject.com/reference/basics)
- [IEC 61131-3 Standard](https://plcopen.org/iec-61131-3)
- [Modbus Protocol Spec](https://modbus.org/docs/Modbus_Application_Protocol_V1_1b3.pdf)

### Video Tutorials
- [OpenPLC Getting Started](https://www.youtube.com/watch?v=lhAqMIf8e1w)
- [Ladder Logic Basics](https://www.youtube.com/results?search_query=ladder+logic+tutorial)

### Community
- [OpenPLC Forum](https://www.openplcproject.com/forum)
- [GitHub Issues](https://github.com/thiagoralves/OpenPLC_v3/issues)

---

## 🎯 Learning Path

**Beginner (Week 1):**
1. ✅ Install and access OpenPLC
2. ✅ Create first ladder logic program
3. ✅ Understand inputs/outputs
4. ✅ Use timers and counters

**Intermediate (Week 2):**
1. ✅ Configure Modbus communication
2. ✅ Connect to SCADA system
3. ✅ Create complex logic
4. ✅ Monitor in real-time

**Advanced (Week 3):**
1. ✅ Security assessment
2. ✅ Network analysis
3. ✅ Vulnerability testing
4. ✅ Implement security controls

---

## 💡 Pro Tips

1. **Save Your Work** - Programs persist in Docker volume
2. **Use Examples** - OpenPLC has built-in examples
3. **Test Incrementally** - Start simple, add complexity
4. **Monitor Constantly** - Use Monitoring tab while developing
5. **Learn Modbus** - Essential for SCADA integration
6. **Practice Security** - Always think about vulnerabilities

---

## 🚀 Next Steps

After mastering OpenPLC:

1. **SCADA Dashboard Lab** - Connect OpenPLC to Node-RED
2. **Network Security Lab** - Analyze Modbus traffic
3. **Penetration Testing Lab** - Test PLC security

---

**Ready to start programming PLCs? Launch the lab!** 🎓
