# OilSprings Lab - Build and Run Guide

## 🎯 Overview

This lab builds Docker images from the Labshock source code and runs them locally.

## 🚀 First Time Setup (Build Images)

**IMPORTANT:** The first time you run this, it will build all 7 Docker images. This takes **10-20 minutes** depending on your internet speed and computer.

### Step 1: Build the Images

```powershell
cd "C:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro\labs\oilsprings"
docker-compose build
```

This will:
- Build PLC image (~5 min)
- Build SCADA image (~3 min)
- Build EWS image (~5 min)
- Build IDS image (~2 min)
- Build Collector image (~2 min)
- Build Pentest image (~3 min)
- Build Router image (~2 min)

**Total: ~20 minutes first time**

### Step 2: Start the Lab

```powershell
docker-compose up -d
```

### Step 3: Wait for Services

Wait 30-60 seconds for all services to initialize.

### Step 4: Access Services

Open these URLs in your browser:
- PLC Controller: http://localhost:8080
- SCADA Dashboard: http://localhost:8081
- EWS (VNC): http://localhost:8083
- IDS Monitor: http://localhost:8084
- Log Collector: http://localhost:8085
- Pentest Terminal: http://localhost:8086
- Router Interface: http://localhost:8087

## 🔄 Subsequent Runs (After First Build)

Once images are built, starting is fast:

```powershell
docker-compose up -d
```

Takes only **10-30 seconds** to start!

## 🛑 Stop the Lab

```powershell
docker-compose down
```

## 🔧 Troubleshooting

### Build fails
**Check Docker Desktop has enough resources:**
- Settings → Resources
- RAM: At least 4GB
- Disk: At least 20GB free

**Try building one service at a time:**
```powershell
docker-compose build plc
docker-compose build scada
# etc...
```

### Service won't start
**Check logs:**
```powershell
docker logs oilsprings_plc
```

**Restart specific service:**
```powershell
docker-compose restart plc
```

### Rebuild a service
```powershell
docker-compose build --no-cache plc
docker-compose up -d plc
```

## 📊 Check Status

```powershell
# See running containers
docker ps

# See all containers (including stopped)
docker ps -a

# View logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f
```

## 💡 Tips

1. **First build takes time** - Be patient, it's downloading and building everything
2. **Subsequent starts are fast** - Images are cached
3. **Check Docker Desktop** - Make sure it has enough resources
4. **Build during off-hours** - Less network congestion
5. **Keep images** - Don't delete them unless you need space

## 🎓 Using Through Portal

After building once, you can use the portal:

```powershell
cd "C:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro"
npm start
```

Then login and launch OilSprings - all services will auto-open!

---

**Ready? Start with `docker-compose build` and wait for it to complete!** ⏳
