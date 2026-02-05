@echo off
echo ========================================
echo   Resetting CyberPro Database
echo ========================================
echo.

echo This will delete the database and recreate it with the new labs.
echo.
pause

echo Stopping portal...
taskkill /F /IM node.exe 2>nul

echo.
echo Deleting old database...
del /F /Q "cyberpro.db" 2>nul

echo.
echo Database deleted. Restart the portal with: npm start
echo The database will be recreated with all 4 new labs!
echo.
pause
