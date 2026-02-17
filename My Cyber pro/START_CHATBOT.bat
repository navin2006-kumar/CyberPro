@echo off
echo.
echo ╔════════════════════════════════════════════════╗
echo ║     🤖 Starting Python Chatbot Service        ║
echo ╚════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

REM Check if requirements are installed
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Dependencies not installed. Installing now...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

echo ✓ Starting chatbot service...
echo.
python chatbot_service.py

pause
