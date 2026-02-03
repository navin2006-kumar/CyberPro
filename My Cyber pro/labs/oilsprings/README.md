# OilSprings Lab - Complete OT Security Environment

> **A Labshock-Inspired Industrial Cyber Security Lab**

## 🎯 Overview

OilSprings is a comprehensive, production-ready OT/ICS security lab environment featuring realistic industrial control systems, network segmentation, and security monitoring capabilities. This lab provides hands-on experience with SCADA systems, PLCs, network monitoring, and penetration testing in a safe, isolated environment.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OilSprings Lab Network                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  L2 Network (192.168.2.0/24) - Field Level                  │
│  ├─ PLC (192.168.2.10) - OpenPLC Runtime                    │
│  ├─ SCADA (192.168.2.20) - Node-RED HMI                     │
│  ├─ IDS (192.168.2.41) - Network Monitor                    │
│  └─ Router (192.168.2.2) - Gateway                          │
│                                                               │
│  L3 SCADA Network (192.168.3.0/24) - Control Level          │
│  ├─ SCADA (192.168.3.20) - Control Interface                │
│  ├─ EWS (192.168.3.11) - Engineering Workstation            │
│  ├─ Collector (192.168.3.40) - Log Aggregation              │
│  └─ Router (192.168.3.2) - Gateway                          │
│                                                               │
│  L3 Security Network (192.168.4.0/24) - Security Zone       │
│  ├─ IDS (192.168.4.41) - Monitoring & Detection             │
│  ├─ Collector (192.168.4.40) - SIEM Integration             │
│  └─ Router (192.168.4.2) - Gateway                          │
│                                                               │
│  L3 Pentest Network (192.168.5.0/24) - Testing Zone         │
│  ├─ Pentest (192.168.5.50) - Kali Linux Station             │
│  └─ Router (192.168.5.2) - Gateway                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose V2
- Minimum: 4GB RAM, 2 CPU cores, 10GB disk space
- Recommended: 8GB RAM, 4 CPU cores, 20GB disk space

### Launch the Lab

```bash
cd "c:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro\labs\oilsprings"
docker-compose up -d
```

### Access Services

Once all containers are running, access the following services:

| Service | URL | Description |
|---------|-----|-------------|
| **PLC** | http://localhost:8080 | OpenPLC Runtime & Modbus Server |
| **SCADA** | http://localhost:8081 | Node-RED Dashboard & HMI |
| **EWS** | http://localhost:8083 | Engineering Workstation (VNC) |
| **IDS** | http://localhost:8084 | Network Monitor & Packet Capture |
| **Collector** | http://localhost:8085 | Log Collection & Analysis |
| **Pentest** | http://localhost:8086 | Web Terminal (Kali Linux) |
| **Router** | http://localhost:8087 | Firewall & Routing Control |

### Stop the Lab

```bash
docker-compose down
```

## 📦 Components

### 1. PLC (Programmable Logic Controller)
- **Technology**: OpenPLC Runtime
- **Protocols**: Modbus/TCP (Port 502)
- **Web Interface**: Port 8080
- **Features**:
  - Full IEC 61131-3 support (LD, ST, FBD, IL, SFC)
  - Real-time I/O simulation
  - Modbus server for SCADA communication
  - Web-based programming interface

### 2. SCADA (Supervisory Control and Data Acquisition)
- **Technology**: Node-RED
- **Protocols**: Modbus, OPC UA, S7, MQTT
- **Web Interface**: Port 8081
- **Features**:
  - Real-time dashboard
  - PLC data visualization
  - Control interface
  - Historical data logging
  - Pre-configured flows for PLC communication

### 3. Engineering Workstation (EWS)
- **Technology**: XFCE Desktop via VNC
- **Web Interface**: Port 8083 (noVNC)
- **Features**:
  - Full Linux desktop environment
  - OpenPLC Editor (planned)
  - Network tools
  - Configuration utilities

### 4. Network IDS/Monitor
- **Technology**: Python + Scapy
- **Web Interface**: Port 8084
- **Features**:
  - Real-time packet capture
  - Protocol detection (Modbus, S7, OPC UA)
  - Traffic visualization
  - Statistics dashboard
  - Export capabilities

### 5. Log Collector
- **Technology**: Python + Flask
- **Web Interface**: Port 8085
- **Features**:
  - Centralized log aggregation
  - Multi-service log collection
  - Real-time log streaming
  - Log level filtering
  - Export to JSON
  - SIEM integration ready

### 6. Pentest Station
- **Technology**: Kali Linux
- **Access**: SSH (Port 2222), Web Terminal (Port 8086)
- **Credentials**: root/toor
- **Features**:
  - Pre-installed OT/ICS tools
  - nmap, metasploit, scapy
  - Python with pymodbus
  - Network utilities
  - Web-based terminal access

### 7. Router
- **Technology**: Python + iptables
- **Web Interface**: Port 8087
- **Features**:
  - Network segmentation control
  - Firewall rule management
  - Inter-network routing
  - Traffic statistics
  - Rule enable/disable

## 🎓 Learning Objectives

### Beginner Level
- [ ] Access and navigate the PLC web interface
- [ ] View SCADA dashboard and understand data flow
- [ ] Monitor network traffic in the IDS
- [ ] Understand network segmentation

### Intermediate Level
- [ ] Program PLC logic using OpenPLC
- [ ] Create custom SCADA flows in Node-RED
- [ ] Analyze Modbus traffic patterns
- [ ] Configure firewall rules in Router
- [ ] Collect and analyze logs

### Advanced Level
- [ ] Perform reconnaissance from Pentest station
- [ ] Identify vulnerabilities in OT protocols
- [ ] Simulate attacks and detect them in IDS
- [ ] Create correlation rules for SIEM
- [ ] Implement network segmentation best practices

## 🔒 Security Notes

> [!WARNING]
> This lab contains offensive security tools and vulnerable configurations for educational purposes only.

- All services run in isolated Docker networks
- No external network access by default
- Pentest tools are for lab use only
- Never use these techniques against production systems
- Always practice responsible disclosure

## 🛠️ Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
docker ps

# View service logs
docker-compose logs [service-name]

# Restart specific service
docker-compose restart [service-name]
```

### Port Conflicts

If ports are already in use, edit `docker-compose.yml` and change the host port (left side of the colon):

```yaml
ports:
  - "8090:8080"  # Changed from 8080:8080
```

### Network Issues

```bash
# Verify networks are created
docker network ls | grep oilsprings

# Check container network connectivity
docker-compose exec scada ping plc
```

## 📊 Monitoring & Logs

### View All Logs
```bash
docker-compose logs -f
```

### View Specific Service
```bash
docker-compose logs -f scada
```

### Check Service Health
```bash
docker-compose ps
```

## 🔄 Updates & Maintenance

### Rebuild After Changes
```bash
docker-compose build
docker-compose up -d
```

### Clean Restart
```bash
docker-compose down -v
docker-compose up -d --build
```

## 🤝 Integration with CyberPro Platform

This lab integrates seamlessly with the main CyberPro platform:

1. The lab is automatically discovered by the platform
2. Start/stop via the web portal at http://localhost:3000
3. Real-time status monitoring
4. Integrated with the chatbot for guided learning

## 📚 Additional Resources

- [OpenPLC Documentation](https://www.openplcproject.com/)
- [Node-RED Guide](https://nodered.org/docs/)
- [Modbus Protocol Specification](https://modbus.org/)
- [ICS Security Best Practices](https://www.cisa.gov/ics)

## ⚠️ Disclaimer

This lab is provided for **educational and training purposes only** in isolated environments. Never use these tools or techniques against systems you don't own or have explicit permission to test. The authors are not responsible for any misuse or damage.

## 📄 License

MIT License - See main CyberPro project for details.

---

**Built with ❤️ for the OT/ICS security community**  
*Inspired by Labshock - The #1 Industrial Cyber Lab*
