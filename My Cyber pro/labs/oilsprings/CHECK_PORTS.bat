@echo off
echo ========================================
echo   Checking Port Usage
echo ========================================
echo.

echo Checking which ports are in use...
echo.

echo Port 8080 (PLC):
netstat -ano | findstr :8080
echo.

echo Port 8081 (SCADA):
netstat -ano | findstr :8081
echo.

echo Port 8083 (EWS):
netstat -ano | findstr :8083
echo.

echo Port 8084 (IDS):
netstat -ano | findstr :8084
echo.

echo Port 8085 (Collector):
netstat -ano | findstr :8085
echo.

echo Port 8086 (Pentest):
netstat -ano | findstr :8086
echo.

echo Port 8087 (Router):
netstat -ano | findstr :8087
echo.

echo ========================================
echo   Docker Containers Using These Ports
echo ========================================
docker ps -a --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
echo.

pause
