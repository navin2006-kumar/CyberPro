@echo off
echo ========================================
echo   OilSprings Lab - Quick Launcher
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Docker...
docker ps >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

echo Starting OilSprings Lab...
docker-compose up -d

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start lab!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Lab Started Successfully!
echo ========================================
echo.
echo Waiting for services to initialize...
timeout /t 5 /nobreak >nul

echo.
echo Opening portal in browser...
start "" "portal.html"

echo.
echo ========================================
echo   Services Available:
echo ========================================
echo   PLC:        http://localhost:8080
echo   SCADA:      http://localhost:8081
echo   EWS:        http://localhost:8083
echo   IDS:        http://localhost:8084
echo   Collector:  http://localhost:8085
echo   Pentest:    http://localhost:8086
echo   Router:     http://localhost:8087
echo ========================================
echo.
echo Press any key to exit...
pause >nul
