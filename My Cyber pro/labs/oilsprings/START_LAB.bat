@echo off
echo ========================================
echo   OilSprings Lab - Clean Start
echo ========================================
echo.

echo [1/3] Stopping and removing old containers/networks...
docker-compose down 2>nul

echo.
echo [2/3] Starting OilSprings lab...
docker-compose up -d

if %errorlevel% neq 0 (
    echo [ERROR] Failed to start lab
    pause
    exit /b 1
)

echo.
echo [3/3] Waiting for services to initialize...
timeout /t 15 /nobreak >nul

echo.
echo ========================================
echo   OilSprings Lab Started!
echo ========================================
echo.
echo Services available at:
echo   PLC Controller:     http://localhost:8080
echo   SCADA Dashboard:    http://localhost:8081
echo   EWS (VNC):          http://localhost:8083
echo   IDS Monitor:        http://localhost:8084
echo   Log Collector:      http://localhost:8085
echo   Pentest Terminal:   http://localhost:8086
echo   Router Interface:   http://localhost:8087
echo.
echo Check status: docker ps
echo View logs:    docker logs oilsprings_plc
echo Stop lab:     docker-compose down
echo.
pause
