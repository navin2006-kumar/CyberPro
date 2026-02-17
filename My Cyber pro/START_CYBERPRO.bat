@echo off
cls
color 0A
echo ====================================================
echo    🔬 CyberPro - Complete Platform Launcher
echo ====================================================
echo.

REM Check if Docker is running
echo [STEP 1/4] Checking Docker...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)
echo [✓] Docker is running
echo.

REM Check and install Node.js dependencies
echo [STEP 2/4] Checking Node.js dependencies...
if not exist "node_modules\" (
    echo Installing dependencies... This may take a few minutes.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Failed to install dependencies
        echo Please check your Node.js installation
        echo.
        pause
        exit /b 1
    )
    echo [✓] Dependencies installed
) else (
    echo [✓] Dependencies already installed
)
echo.

REM Create database directory if it doesn't exist
if not exist "database\" (
    echo Creating database directory...
    mkdir database
)

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] No .env file found
    echo Using default configuration...
    echo.
)

REM Show available labs
echo [STEP 3/4] Available Labs:
echo    - OpenPLC Controller (port 8080)
echo    - SCADA Dashboard (ports 1880, 1881)
echo    - Network Security (port 8082)
echo    - Penetration Testing (ports 7681, 8081, 3001)
echo    - Camera Lab (ports 7681, 8080)
echo.

REM Start the portal server
echo [STEP 4/4] Starting CyberPro Portal...
echo.
echo ====================================================
echo   🌐 Portal URL: http://localhost:3000
echo   📚 Labs Page:  http://localhost:3000/labs.html
echo   👤 Profile:    http://localhost:3000/profile.html
echo.
echo   🔐 Default Login Credentials:
echo      Username: admin
echo      Password: admin123
echo ====================================================
echo.
echo ⏳ Server is starting...
echo    Press Ctrl+C to stop the server
echo.

REM Start the Node.js server
node server.js

REM If server stops
echo.
echo ====================================================
echo   Server stopped.
echo ====================================================
pause
