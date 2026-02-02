# Cyber Lab Platform

> **Modern OT/ICS Security Lab Platform** - A reliable, web-based cyber range for hands-on operational technology and industrial control systems security training.

![Platform Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![Docker](https://img.shields.io/badge/docker-required-blue)

## 🎯 Overview

Cyber Lab Platform is a comprehensive, web-based training environment for OT/ICS security professionals. Built with reliability and ease of use as core principles, it provides isolated lab environments for learning SCADA systems, PLC programming, network monitoring, and penetration testing.

### Key Features

✨ **Beautiful Web Portal** - Modern, responsive interface with real-time lab control  
🔒 **Isolated Environments** - Each lab runs in isolated Docker containers  
🔄 **Auto-Recovery** - Built-in health monitoring ensures labs run without failures  
📊 **Real-time Monitoring** - Live status updates via WebSocket  
🎓 **Multiple Lab Types** - SCADA, PLC, Network Monitoring, and Penetration Testing  
🚀 **Quick Start** - Labs launch in under 30 seconds  

## 📋 Requirements

- **Docker Desktop** (Windows/Mac) or Docker Engine (Linux)
- **Node.js** 18.0.0 or higher
- **Minimum**: 2 CPU cores, 4GB RAM, 10GB disk space
- **Recommended**: 4 CPU cores, 8GB RAM, 20GB disk space

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env if needed (optional)
```

### 3. Start the Platform

```bash
npm start
```

### 4. Access the Portal

Open your browser and navigate to:
```
http://localhost:3000
```

**Default credentials:**
- Username: `admin`
- Password: `admin123`

## 🧪 Available Labs

### 1. SCADA Fundamentals
- **Difficulty**: Beginner
- **Protocols**: Modbus/TCP
- **Port**: 8080
- **Description**: Learn SCADA systems with Modbus protocol simulation

### 2. PLC Programming
- **Difficulty**: Intermediate
- **Runtime**: OpenPLC
- **Port**: 8081
- **Description**: Program and interact with PLC runtime

### 3. Network Monitoring
- **Difficulty**: Intermediate
- **Tools**: Packet capture, traffic analysis
- **Port**: 8082
- **Description**: Monitor and analyze OT network traffic

### 4. ICS Penetration Testing
- **Difficulty**: Advanced
- **Tools**: Kali Linux, custom exploits
- **Port**: 8083
- **Description**: Practice offensive security in isolated environment

## 🎮 Using the Platform

### Starting a Lab

1. Log in to the portal
2. Navigate to the Labs page
3. Click "Start Lab" on your desired lab
4. Wait for the lab to initialize (~30 seconds)
5. Access the lab via the provided port

### Stopping a Lab

1. Click "Stop" on the running lab
2. The lab will gracefully shut down
3. All containers and resources are cleaned up

### Restarting a Lab

If a lab encounters issues, use the "Restart" button for automatic recovery.

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Web Portal (Express)            │
│  - Authentication                       │
│  - Lab Management API                   │
│  - WebSocket Server                     │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│      Lab Manager                        │
│  - Lifecycle Management                 │
│  - Health Monitoring                    │
│  - Auto-Recovery                        │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│      Docker Engine                      │
│  ┌──────────┐  ┌──────────┐            │
│  │ SCADA    │  │   PLC    │            │
│  │  Lab     │  │   Lab    │            │
│  └──────────┘  └──────────┘            │
│  ┌──────────┐  ┌──────────┐            │
│  │ Network  │  │ Pentest  │            │
│  │  Lab     │  │   Lab    │            │
│  └──────────┘  └──────────┘            │
└─────────────────────────────────────────┘
```

## 📁 Project Structure

```
My cyber/
├── server.js              # Main Express server
├── db.js                  # Database layer (SQLite)
├── labManager.js          # Lab lifecycle management
├── docker-utils.js        # Docker API wrapper
├── package.json           # Dependencies
├── .env.example           # Environment template
│
├── public/                # Frontend files
│   ├── index.html         # Main portal
│   ├── labs.html          # Labs catalog
│   ├── css/
│   │   └── style.css      # Premium styling
│   ├── js/
│   │   └── app.js         # Frontend logic
│   └── docs/
│       └── getting-started.html
│
├── labs/                  # Lab configurations
│   ├── scada/
│   │   └── docker-compose.yml
│   ├── plc/
│   │   └── docker-compose.yml
│   ├── network/
│   │   └── docker-compose.yml
│   └── pentest/
│       └── docker-compose.yml
│
└── data/                  # Database and logs
    └── labs.db
```

## 🔧 Configuration

### Environment Variables

Edit `.env` to customize:

```env
PORT=3000                    # Server port
DB_PATH=./data/labs.db       # Database location
SESSION_SECRET=your-secret   # Session encryption key
AUTO_RECOVERY=true           # Enable auto-recovery
MAX_CONCURRENT_LABS=5        # Max simultaneous labs
```

### Adding Custom Labs

1. Create a new directory in `labs/`
2. Add a `docker-compose.yml` file
3. Add lab entry to database via portal or SQL

## 🛡️ Security

- All labs run in isolated Docker networks
- No external network access by default
- Session-based authentication
- Password hashing with bcrypt
- CORS protection enabled

## 🐛 Troubleshooting

### Docker Not Running

**Error**: "Docker is not running"  
**Solution**: Start Docker Desktop and wait for it to fully initialize

### Port Already in Use

**Error**: "Port 3000 already in use"  
**Solution**: Change `PORT` in `.env` or stop the conflicting service

### Lab Won't Start

**Error**: Lab stuck in "starting" state  
**Solution**: Use the "Restart" button or manually stop via Docker Desktop

### Database Locked

**Error**: "Database is locked"  
**Solution**: Ensure only one instance of the platform is running

## 📚 API Documentation

### Authentication

```javascript
POST /api/auth/login
Body: { username, password }

POST /api/auth/logout

GET /api/auth/session
```

### Labs

```javascript
GET /api/labs              // List all labs
GET /api/labs/:id          // Get lab details
POST /api/labs/:id/start   // Start a lab
POST /api/labs/:id/stop    // Stop a lab
POST /api/labs/:id/restart // Restart a lab
GET /api/labs/:id/logs     // Get lab logs
```

### System

```javascript
GET /api/system/status     // System and Docker status
GET /api/health            // Platform health check
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## 📄 License

MIT License - feel free to use this project for educational purposes.

## ⚠️ Disclaimer

This platform is intended for **educational and training purposes only** in isolated environments. Never use these tools or techniques against systems you don't own or have explicit permission to test.

## 🙏 Acknowledgments

Inspired by [Labshock](https://github.com/zakharb/labshock) - the #1 Industrial Cyber Lab platform.

---

**Built with ❤️ for the OT/ICS security community**
