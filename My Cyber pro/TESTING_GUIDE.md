# Testing OilSprings Lab Through Portal - Step by Step

## ✅ Pre-Test Checklist

1. **Docker containers running?**
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

2. **Portal running?**
   - Check terminal where you ran `npm start`
   - Should show "Server Ready" message
   - No errors

## 🧪 Manual Test Steps

### Step 1: Access Portal
1. Open browser
2. Go to: **http://localhost:3000**
3. **Expected:** Login page appears

### Step 2: Login
1. Username: `admin`
2. Password: `admin123`
3. Click Login
4. **Expected:** Dashboard or home page appears

### Step 3: Navigate to Labs
1. Click **"Labs"** in the navigation menu
2. **Expected:** Labs page with lab cards appears

### Step 4: Find OilSprings Lab
1. Look for **"OilSprings Industrial Lab"** card
2. **Expected:** Card shows:
   - Lab name
   - Description
   - Category: Industrial
   - Difficulty: Intermediate
   - "View Details" or "Launch" button

### Step 5: Open Lab Details
1. Click on the OilSprings lab card
2. **Expected:** Lab detail page opens showing:
   - Lab description
   - 7 services listed
   - "Launch Lab" button
   - Learning objectives

### Step 6: Launch the Lab
1. Click **"Launch Lab"** button
2. **Expected:**
   - Button shows "Starting..." or loading state
   - After 3-5 seconds: Status changes to "Running"
   - **7 new tabs should automatically open** with services:
     - http://localhost:8080 (PLC)
     - http://localhost:8081 (SCADA)
     - http://localhost:8083 (EWS)
     - http://localhost:8084 (IDS)
     - http://localhost:8085 (Collector)
     - http://localhost:8086 (Pentest)
     - http://localhost:8087 (Router)

### Step 7: Verify Services
Check each tab:
1. **PLC (8080):** Should show OpenPLC login page
2. **SCADA (8081):** Should show Node-RED interface
3. **EWS (8083):** Should show VNC connection screen
4. **IDS (8084):** Should show IDS interface
5. **Collector (8085):** Should show log collector
6. **Pentest (8086):** Should show terminal interface
7. **Router (8087):** Should show router config

### Step 8: Stop the Lab
1. Go back to lab detail page
2. Click **"Stop Lab"** button
3. **Expected:**
   - Lab status changes to "Stopped"
   - Containers stop (check with `docker ps`)

## 🐛 Troubleshooting

### Issue: Portal won't load (http://localhost:3000)
**Check:**
```powershell
# Is npm start running?
# Check the terminal where you ran npm start
```

**Fix:**
```powershell
cd "C:\Users\navin\OneDrive\문서\MY cyber\CyberPro\My Cyber pro"
npm start
```

### Issue: Login fails
**Check:** Database initialized correctly
**Fix:** Restart portal - it will recreate default admin user

### Issue: OilSprings lab not showing
**Check:** Database has OilSprings lab entry
**Fix:** Check `db.js` has OilSprings in `seedDefaultData()`

### Issue: "Launch Lab" button does nothing
**Check browser console:**
1. Press F12
2. Go to Console tab
3. Click "Launch Lab"
4. Look for errors

**Common causes:**
- API endpoint not responding
- Docker not running
- Port conflicts

### Issue: Tabs don't auto-open
**Check:**
1. Browser popup blocker - Allow popups for localhost:3000
2. Check browser console for errors
3. Manually click service links

### Issue: Services show "Connection refused"
**Check:**
```powershell
docker ps
```
**Fix:**
- Wait 30-60 seconds for containers to fully start
- Check container logs: `docker logs oilsprings_plc`
- Restart containers: `docker-compose restart`

### Issue: Lab won't stop
**Check:**
```powershell
docker ps
```
**Manual stop:**
```powershell
cd labs/oilsprings
docker-compose down
```

## 📊 Success Criteria

✅ Portal loads at localhost:3000  
✅ Login works with admin/admin123  
✅ Labs page shows OilSprings lab  
✅ Lab detail page displays correctly  
✅ "Launch Lab" starts containers  
✅ 7 tabs auto-open with services  
✅ All services are accessible  
✅ "Stop Lab" stops containers  

## 🎯 Quick Test Commands

```powershell
# Check portal is running
curl http://localhost:3000

# Check Docker containers
docker ps

# Check specific service
curl http://localhost:8080

# View portal logs
# (Check terminal where npm start is running)

# View container logs
docker logs oilsprings_plc
docker logs oilsprings_scada
```

## 📝 Report Template

After testing, note:

**Portal Access:**
- [ ] Portal loaded successfully
- [ ] Login worked
- [ ] Labs page displayed

**Lab Launch:**
- [ ] OilSprings lab visible
- [ ] Launch button worked
- [ ] Tabs auto-opened
- [ ] Number of tabs opened: ___

**Services Status:**
- [ ] PLC (8080): ___________
- [ ] SCADA (8081): ___________
- [ ] EWS (8083): ___________
- [ ] IDS (8084): ___________
- [ ] Collector (8085): ___________
- [ ] Pentest (8086): ___________
- [ ] Router (8087): ___________

**Issues Found:**
- ___________________________
- ___________________________

---

**Follow this guide step-by-step and report any issues!**
