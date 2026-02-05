@echo off
echo ========================================
echo   Starting All 4 CyberPro Labs
echo ========================================
echo.

REM Check if Docker is running
echo [CHECK] Verifying Docker is running...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo [OK] Docker is running
echo.

REM Stop any existing lab containers to avoid conflicts
echo [CLEANUP] Stopping any existing lab containers...
docker stop openplc_controller scada_nodered network_monitor pentest_kali 2>nul
docker rm openplc_controller scada_nodered network_monitor pentest_kali 2>nul
echo [OK] Cleanup complete
echo.

REM Start Lab 1: OpenPLC
echo ========================================
echo [1/4] Starting OpenPLC Lab...
echo ========================================
cd /d "%~dp0labs\openplc"
docker-compose up -d --build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start OpenPLC lab
    pause
    exit /b 1
)
echo [OK] OpenPLC started on port 8080
echo.

REM Start Lab 2: SCADA Dashboard
echo ========================================
echo [2/4] Starting SCADA Dashboard Lab...
echo ========================================
cd /d "%~dp0labs\scada-dashboard"
docker-compose up -d --build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start SCADA Dashboard lab
    pause
    exit /b 1
)
echo [OK] SCADA Dashboard started on ports 1880, 1881
echo.

REM Start Lab 3: Network Security
echo ========================================
echo [3/4] Starting Network Security Lab...
echo ========================================
cd /d "%~dp0labs\network-security"
docker-compose up -d --build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start Network Security lab
    pause
    exit /b 1
)
echo [OK] Network Security started on port 8082
echo.

REM Start Lab 4: Penetration Testing
echo ========================================
echo [4/4] Starting Penetration Testing Lab...
echo ========================================
cd /d "%~dp0labs\pentest"
docker-compose up -d --build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start Penetration Testing lab
    pause
    exit /b 1
)
echo [OK] Penetration Testing started on port 7681
echo.

REM Return to main directory
cd /d "%~dp0"

REM Show status
echo ========================================
echo   All Labs Started Successfully!
echo ========================================
echo.
echo Lab Access URLs:
echo   1. OpenPLC Controller:    http://localhost:8080
echo   2. SCADA Dashboard:       http://localhost:1880
echo   3. Network Security:      http://localhost:8082
echo   4. Penetration Testing:   http://localhost:7681
echo.
echo Checking container status...
docker ps --filter "name=openplc_controller" --filter "name=scada_nodered" --filter "name=network_monitor" --filter "name=pentest_kali" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
echo ========================================
echo Note: Labs may take 30-60 seconds to fully initialize
echo ========================================
pause
