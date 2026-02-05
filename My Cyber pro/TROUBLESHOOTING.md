# Troubleshooting Guide - Lab Launch Issues

## 🔍 Common Issues & Solutions

### Issue 1: Labs Not Showing in Portal

**Problem:** Old labs still showing, new labs not visible

**Solution:** Reset the database

```powershell
# Stop portal (Ctrl+C in terminal)

# Delete database
del cyberpro.db

# Restart portal
npm start
```

The database will recreate with all 4 new labs!

---

### Issue 2: Lab Won't Start

**Problem:** Click "Launch Lab" but nothing happens

**Checks:**
1. Is Docker running?
   ```powershell
   docker ps
   ```

2. Check browser console (F12) for errors

3. Check portal logs in terminal

**Solution:**
```powershell
# Restart Docker Desktop
# Then restart portal
npm start
```

---

### Issue 3: Container Builds But Won't Run

**Problem:** Build succeeds but container exits immediately

**Check logs:**
```powershell
docker ps -a
docker logs <container_name>
```

**Common causes:**
- Missing files in Dockerfile COPY commands
- Port already in use
- Insufficient permissions

---

### Issue 4: Port Already in Use

**Problem:** `Bind for 0.0.0.0:8080 failed: port is already allocated`

**Solution:**
```powershell
# Find what's using the port
netstat -ano | findstr :8080

# Stop that process or change lab port
```

---

### Issue 5: Build Takes Forever

**Problem:** Docker build stuck or very slow

**This is normal for first build!**
- OpenPLC: ~10-15 minutes (compiles from source)
- SCADA: ~5 minutes (downloads Node-RED modules)
- Network: ~3 minutes
- Pentest: ~15-20 minutes (downloads Kali packages)

**Subsequent starts are instant!**

---

## 🚀 Quick Reset Procedure

If labs aren't working:

```powershell
# 1. Stop all containers
docker stop $(docker ps -q)
docker rm $(docker ps -aq)

# 2. Delete database
del cyberpro.db

# 3. Restart portal
npm start

# 4. Login and try launching a lab
# First launch will build the image
```

---

## ✅ Verification Steps

### Step 1: Check Database Has New Labs
```powershell
# After starting portal, check logs for:
# "✓ Default admin user created"
# "✓ Database ready"
```

### Step 2: Check Labs Page
1. Login to http://localhost:3000
2. Go to Labs
3. Should see 4 labs:
   - OpenPLC Controller
   - SCADA Dashboard
   - Network Security
   - Penetration Testing

### Step 3: Test Simple Lab
1. Try **SCADA Dashboard** first (fastest build)
2. Click "Launch Lab"
3. Wait for build (~5 min first time)
4. Check if tabs open

---

## 📋 Lab Status Checklist

For each lab, verify:

**OpenPLC:**
- [ ] Dockerfile exists in `labs/openplc/`
- [ ] docker-compose.yml exists
- [ ] Port 8080 is free
- [ ] Can build: `cd labs/openplc && docker-compose build`

**SCADA Dashboard:**
- [ ] Dockerfile exists in `labs/scada-dashboard/`
- [ ] docker-compose.yml exists
- [ ] Ports 1880, 1881 are free
- [ ] Can build: `cd labs/scada-dashboard && docker-compose build`

**Network Security:**
- [ ] Dockerfile exists in `labs/network-security/`
- [ ] app.py exists
- [ ] docker-compose.yml exists
- [ ] Port 8082 is free

**Penetration Testing:**
- [ ] Dockerfile exists in `labs/pentest/`
- [ ] docker-compose.yml exists
- [ ] Port 7681 is free

---

## 🆘 Still Not Working?

1. **Check Docker Desktop is running**
2. **Check terminal for error messages**
3. **Try building one lab manually:**
   ```powershell
   cd labs/scada-dashboard
   docker-compose build
   docker-compose up -d
   ```
4. **Check if service is accessible:**
   ```powershell
   curl http://localhost:1880
   ```

---

## 💡 Pro Tips

- **First launch is slow** - Be patient during initial builds
- **Use simple labs first** - SCADA builds fastest
- **Check one thing at a time** - Don't launch all labs at once
- **Read the logs** - They usually tell you what's wrong
- **Restart helps** - When in doubt, restart Docker and portal

---

**Need more help? Check the logs and error messages!**
