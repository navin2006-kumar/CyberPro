@echo off
echo ========================================
echo   CyberPro Lab Platform - Quick Start
echo ========================================
echo.

REM Check if Docker is running
echo [1/3] Checking Docker...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo [OK] Docker is running

REM Check if node_modules exists
echo.
echo [2/3] Checking dependencies...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)
echo [OK] Dependencies ready

REM Start the server
echo.
echo [3/3] Starting CyberPro Portal...
echo.
echo ========================================
echo   Portal will start at http://localhost:3000
echo   Default login: admin / admin123
echo ========================================
echo.

npm start
