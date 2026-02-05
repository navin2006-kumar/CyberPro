# OpenPLC Controller Lab

## 🎯 What You'll Learn

- Program PLCs using ladder logic
- Understand industrial control systems
- Work with Modbus protocol
- Monitor I/O operations

## 🚀 Quick Start

### Through Portal (Recommended)
1. Login to portal at http://localhost:3000
2. Go to Labs → OpenPLC Controller
3. Click "Launch Lab"
4. Web interface opens automatically!

### Direct Launch
```powershell
cd labs/openplc
docker-compose up -d
```

Then open: http://localhost:8080

## 🔐 Default Credentials

- **Username:** `openplc`
- **Password:** `openplc`

## 📚 What's Inside

### OpenPLC Web Interface (Port 8080)
- Program editor
- Ladder logic designer
- I/O monitoring
- Modbus configuration

## 🎓 Learning Exercises

### Exercise 1: First Program (15 min)
1. Login to OpenPLC
2. Go to "Programs"
3. Create a simple ladder logic program
4. Upload and run it
5. Monitor the outputs

### Exercise 2: Modbus Communication (20 min)
1. Configure Modbus slave
2. Set up registers
3. Test with Modbus client
4. Monitor traffic

### Exercise 3: I/O Control (25 min)
1. Create program with inputs/outputs
2. Simulate sensor inputs
3. Control actuator outputs
4. Debug the logic

## 🔧 Troubleshooting

### Container won't start
```powershell
docker logs openplc_controller
```

### Can't access web interface
- Wait 30 seconds after starting
- Check: http://localhost:8080
- Verify port not in use: `netstat -ano | findstr :8080`

### Build takes long time
- First build downloads and compiles OpenPLC (~10-15 min)
- Subsequent starts are instant

## 💡 Tips

1. **Save your work** - Programs persist in container
2. **Use examples** - OpenPLC has built-in examples
3. **Check logs** - Useful for debugging
4. **Modbus port** - 502 (standard Modbus TCP)

## 📖 Resources

- [OpenPLC Documentation](https://www.openplcproject.com/)
- [Ladder Logic Basics](https://www.openplcproject.com/reference)
- [Modbus Protocol](https://modbus.org/)

---

**Ready to program your first PLC? Launch the lab!** 🚀
