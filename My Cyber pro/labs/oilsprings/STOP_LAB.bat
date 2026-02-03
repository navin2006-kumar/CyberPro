@echo off
echo ========================================
echo   OilSprings Lab - Stop Script
echo ========================================
echo.

cd /d "%~dp0"

echo Stopping OilSprings Lab...
docker-compose down

echo.
echo ========================================
echo   Lab Stopped Successfully!
echo ========================================
echo.
pause
