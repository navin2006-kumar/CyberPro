# Running CyberPro Labs - User Guide

## 🎯 Overview

CyberPro is a Labshock-style cyber security lab platform that provides hands-on learning with Docker-based OT/ICS security environments. This guide will help you get started.

## ✅ Prerequisites

Before running the platform, ensure you have:

1. **Docker Desktop** installed and running
   - Download from: https://www.docker.com/products/docker-desktop
   - Verify installation: `docker --version`
   - **IMPORTANT**: Docker Desktop must be running before starting the portal

2. **Node.js** (v14 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

3. **Dependencies installed**
   ```powershell
   cd "C:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro"
   npm install
   ```

## 🚀 Quick Start

### Step 1: Start Docker Desktop

1. Open Docker Desktop application
2. Wait for Docker to fully start (whale icon in system tray should be steady)
3. Verify Docker is running:
   ```powershell
   docker ps
   ```

### Step 2: Start the Portal

```powershell
cd "C:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro"
npm start
```

You should see:
```
✓ Database connected
✓ Database tables initialized
✓ Database ready
🌐 Portal:    http://localhost:3000
📚 Docs:      http://localhost:3000/docs
🧪 Labs:      http://localhost:3000/labs
```

### Step 3: Login

1. Open your browser to: **http://localhost:3000**
2. Login with default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`

### Step 4: Launch a Lab

1. Navigate to **Labs** page
2. Click on **OilSprings Industrial Lab**
3. Click the **"Launch Lab"** button
4. Wait 3-5 seconds for containers to start
5. **All 7 service tabs will automatically open!** 🎉

## 🧪 OilSprings Lab Services

When you launch the OilSprings lab, these services will automatically open in new tabs:

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| PLC Controller | 8080 | http://localhost:8080 | OpenPLC Runtime |
| SCADA Dashboard | 8081 | http://localhost:8081 | Node-RED SCADA Interface |
| Engineering Workstation | 8083 | http://localhost:8083/vnc.html | VNC Web Interface |
| IDS Monitor | 8084 | http://localhost:8084 | Network Intrusion Detection |
| Log Collector | 8085 | http://localhost:8085 | Centralized Logging |
| Pentest Terminal | 8086 | http://localhost:8086 | Web-based Terminal |
| Router Interface | 8087 | http://localhost:8087 | Network Router Config |

## 🛑 Stopping Labs

### Stop a Running Lab

1. Go to the lab detail page
2. Click **"Stop Lab"** button
3. Confirm the action
4. All containers will be stopped and removed

### Stop the Portal

Press `Ctrl+C` in the terminal where the portal is running.

### Stop All Docker Containers

```powershell
docker stop $(docker ps -q)
```

## 🔧 Troubleshooting

### Issue: "Docker is not running"

**Solution**: 
1. Open Docker Desktop
2. Wait for it to fully start
3. Try launching the lab again

### Issue: Services don't open automatically

**Solution**:
1. Check browser popup blocker settings
2. Allow popups for `localhost:3000`
3. Manually click service links in the lab detail page

### Issue: Port already in use

**Solution**:
```powershell
# Check what's using the port
netstat -ano | findstr :8080

# Stop conflicting containers
docker ps
docker stop <container_id>
```

### Issue: Lab won't start

**Solution**:
1. Check Docker Desktop is running
2. Check available disk space (need at least 5GB)
3. View logs in terminal for error messages
4. Try restarting Docker Desktop

### Issue: Database errors

**Solution**:
```powershell
# Delete and reinitialize database
rm -r data
npm start
```

## 📊 Monitoring Lab Status

### Check Running Containers

```powershell
docker ps
```

### View Container Logs

```powershell
docker logs <container_name>
```

### Check Resource Usage

```powershell
docker stats
```

## 🎓 Learning Path

1. **Start with OilSprings Lab** - Get familiar with the complete OT/ICS environment
2. **Explore each service** - Understand what each component does
3. **Try SCADA Lab** - Focus on SCADA-specific concepts
4. **Network Lab** - Learn network monitoring and security
5. **Pentest Lab** - Practice offensive security techniques

## 💡 Tips

- **Browser Popups**: Allow popups from localhost:3000 for auto-open to work
- **Container Startup**: Wait 3-5 seconds after clicking "Launch" for containers to fully initialize
- **Resource Management**: Stop labs when not in use to free up system resources
- **Multiple Labs**: Only run one lab at a time to avoid port conflicts
- **Session Persistence**: Your login session lasts 24 hours

## 🆘 Getting Help

If you encounter issues:

1. Check the terminal output for error messages
2. Verify Docker Desktop is running
3. Check Docker logs: `docker logs <container_name>`
4. Restart the portal and try again
5. Check that no other services are using the required ports

## 🔐 Security Notes

- Default credentials should be changed in production
- Labs are for educational purposes only
- Keep Docker Desktop updated
- Labs run in isolated Docker networks
- All data is stored locally

## 📝 Next Steps

- Explore the chatbot for guided learning
- Complete lab objectives
- Track your progress in the dashboard
- Try different difficulty levels

---

**Enjoy your hands-on OT/ICS security learning experience!** 🚀
