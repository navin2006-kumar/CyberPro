@echo off
echo ========================================
echo   Stop ALL Docker Containers
echo ========================================
echo.

echo Stopping all running containers...
for /f "tokens=*" %%i in ('docker ps -q') do docker stop %%i

echo.
echo Removing all containers...
docker container prune -f

echo.
echo Removing all networks...
docker network prune -f

echo.
echo ========================================
echo   All Docker containers stopped!
echo ========================================
echo.
echo You can now start the OilSprings lab:
echo   docker-compose up -d
echo.
pause
