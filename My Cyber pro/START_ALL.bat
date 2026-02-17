@echo off
echo.
echo ╔════════════════════════════════════════════════╗
echo ║     🚀 Starting CyberPro Platform              ║
echo ╚════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo Starting Python Chatbot Service...
start "Python Chatbot Service" cmd /k START_CHATBOT.bat

echo Waiting for chatbot service to initialize...
timeout /t 5 /nobreak >nul

echo Starting Node.js Portal...
start "CyberPro Portal" cmd /k START_PORTAL.bat

echo.
echo ✓ Both services are starting in separate windows
echo ✓ Python Chatbot: http://localhost:5000
echo ✓ CyberPro Portal: http://localhost:3000
echo.
pause
