@echo off
echo ========================================
echo Starting Nivoxar Application
echo ========================================
echo.

echo [1/2] Starting Backend (.NET API)...
start "Nivoxar Backend" cmd /k "cd /d %~dp0 && dotnet run"

echo [2/2] Starting Frontend (SPA Server)...
timeout /t 3 /nobreak >nul
start "Nivoxar Frontend" cmd /k "cd /d %~dp0 && npx serve -s . -p 5501"

echo.
echo ========================================
echo Nivoxar is starting...
echo ========================================
echo.
echo Backend:  http://localhost:5000/api
echo Frontend: http://127.0.0.1:5501
echo.
echo Press any key to open the app in browser...
pause >nul

start http://127.0.0.1:5501

echo.
echo Application is running!
echo Close both terminal windows to stop the servers.
echo.
