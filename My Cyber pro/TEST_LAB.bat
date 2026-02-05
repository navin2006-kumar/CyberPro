@echo off
echo ========================================
echo   Quick Lab Test
echo ========================================
echo.

echo Testing SCADA Dashboard lab...
echo.

cd "labs\scada-dashboard"

echo Building container (first time only, ~5 min)...
docker-compose build

echo.
echo Starting container...
docker-compose up -d

echo.
echo Waiting 10 seconds for startup...
timeout /t 10 /nobreak >nul

echo.
echo Testing service...
curl http://localhost:1880

echo.
echo ========================================
echo If you see HTML output above, it works!
echo Open: http://localhost:1880
echo ========================================
echo.

pause
