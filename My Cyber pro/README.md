# CyberPro - Simple Labshock-Style Setup

## 🚀 Quick Start (Just Like Labshock!)

### Step 1: Start the Portal
```powershell
docker-compose up -d
```

### Step 2: Open Portal
Open browser to: **http://localhost**

### Step 3: Start OilSprings Lab
From the portal, navigate to `labs\oilsprings` and run:
```powershell
docker-compose up -d
```

### Step 4: Access Services
Click on any service in the portal!

## 📋 What You Get

- **Portal** at http://localhost (like Labshock portal)
- **OilSprings Lab** with 7 services
- **One-click access** to all services
- **Simple commands** - just like Labshock!

## 🛑 Stop Everything

```powershell
# Stop portal
docker-compose down

# Stop lab
cd labs\oilsprings
docker-compose down
```

## 🎯 Exactly Like Labshock

| Labshock | Your Setup |
|----------|------------|
| `docker-compose up -d` | `docker-compose up -d` |
| Portal at https://localhost:443 | Portal at http://localhost |
| Click to access services | Click to access services |
| Simple & clean | Simple & clean ✅ |

**That's it! Simple and working!** 🎉
