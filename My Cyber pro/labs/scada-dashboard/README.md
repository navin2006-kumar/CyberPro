# SCADA Dashboard Lab

## 🎯 What You'll Learn

- Build SCADA dashboards
- Create data flows
- Monitor industrial processes
- Visualize real-time data

## 🚀 Quick Start

### Through Portal
1. Login at http://localhost:3000
2. Go to Labs → SCADA Dashboard
3. Click "Launch Lab"
4. Interfaces open automatically!

### Direct Launch
```powershell
cd labs/scada-dashboard
docker-compose up -d
```

## 🌐 Services

| Service | URL | Purpose |
|---------|-----|---------|
| Flow Editor | http://localhost:1880 | Create data flows |
| Dashboard | http://localhost:1881/ui | View SCADA dashboard |

## 🎓 Learning Exercises

### Exercise 1: First Dashboard (20 min)
1. Open Flow Editor (port 1880)
2. Drag nodes from palette
3. Create simple flow
4. Deploy and view dashboard

### Exercise 2: Data Simulation (25 min)
1. Add inject nodes for data
2. Create function nodes
3. Connect to dashboard gauges
4. Simulate process values

### Exercise 3: Modbus Integration (30 min)
1. Install Modbus nodes
2. Connect to PLC (if running OpenPLC lab)
3. Read/write registers
4. Display on dashboard

## 💡 Tips

- **Save flows** - Click Deploy to save
- **Dashboard** - Access at /ui endpoint
- **Debug** - Use debug nodes to troubleshoot
- **Templates** - Use dashboard templates for custom UI

## 📖 Resources

- [Node-RED Documentation](https://nodered.org/docs/)
- [Dashboard Nodes](https://flows.nodered.org/node/node-red-dashboard)
- [Modbus Guide](https://flows.nodered.org/node/node-red-contrib-modbus)

---

**Build your first SCADA dashboard!** 📊
