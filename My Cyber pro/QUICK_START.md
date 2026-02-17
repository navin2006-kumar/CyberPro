# 🚀 Quick Start Guide - CyberPro Platform

## Running the Complete Platform

### Option 1: Simple Start (Recommended)
Double-click `START_CYBERPRO.bat` to launch the entire platform.

This will:
- ✅ Check if Docker is running
- ✅ Install Node.js dependencies (if needed)
- ✅ Start the CyberPro portal server
- ✅ Display all available labs

**Portal will be available at:** http://localhost:3000

### Option 2: Manual Start
```bash
# Make sure Docker Desktop is running first
node server.js
```

---

## Default Login
- **Username:** `admin`
- **Password:** `admin123`

---

## Available Pages

| Page | URL | Description |
|------|-----|-------------|
| **Login** | http://localhost:3000 | Main login page |
| **Dashboard** | http://localhost:3000/dashboard.html | User dashboard |
| **Labs** | http://localhost:3000/labs.html | Browse all labs |
| **Profile** | http://localhost:3000/profile.html | User profile & stats |

---

## Available Labs

### 1. OpenPLC Controller
- **Category:** PLC
- **Difficulty:** Beginner
- **Port:** 8080

### 2. SCADA Dashboard
- **Category:** SCADA
- **Difficulty:** Beginner
- **Ports:** 1880, 1881

### 3. Network Security
- **Category:** Network
- **Difficulty:** Intermediate
- **Port:** 8082

### 4. Penetration Testing
- **Category:** Pentest
- **Difficulty:** Advanced
- **Ports:** 7681, 8081, 3001

### 5. Camera Lab (NEW!)
- **Category:** Penetration Testing
- **Difficulty:** Intermediate
- **Ports:** 7681 (Terminal), 8080 (Dashboard)
- **Features:** IP camera exploitation, firewall bypass, live feed access

---

## Troubleshooting

### Docker Not Running
```
[ERROR] Docker is not running!
```
**Solution:** Start Docker Desktop and wait for it to fully initialize, then run the batch file again.

### Port Already in Use
If you see port conflicts:
1. Stop the existing server (Ctrl+C)
2. Check for running Docker containers: `docker ps`
3. Stop conflicting containers if needed

### Dependencies Installation Failed
```
[ERROR] Failed to install dependencies
```
**Solution:**
1. Make sure Node.js is installed (v14 or higher)
2. Run manually: `npm install`
3. Check for error messages

---

## Stopping the Server

Press **Ctrl+C** in the command window where the server is running.

---

## Other Useful Batch Files

- **START_PORTAL.bat** - Start only the portal (lighter version)
- **START_ALL_LABS.bat** - Start all labs with Docker
- **RESET_DATABASE.bat** - Reset user database
- **TEST_LAB.bat** - Test individual lab configurations

---

## Project Structure

```
My Cyber pro/
├── START_CYBERPRO.bat      ← Main launcher
├── server.js                ← Node.js server
├── db.js                    ← Database management
├── public/                  ← Web interface
│   ├── index.html           ← Login page
│   ├── dashboard.html       ← Dashboard
│   ├── labs.html            ← Labs listing
│   └── profile.html         ← User profile
└── labs/                    ← Lab environments
    ├── camera_lab/          ← Camera exploitation lab
    ├── openplc/             ← PLC lab
    ├── scada-dashboard/     ← SCADA lab
    └── ...
```

---

## Need Help?

Check the documentation files:
- `QUICKSTART.md` - Quick start guide
- `RUNNING_LABS.md` - Lab-specific instructions
- `TROUBLESHOOTING.md` - Common issues
- `HOW_TO_WORK_WITH_LAB.md` - Lab usage guide

---

**Enjoy your CyberPro learning experience! 🔬🛡️**
