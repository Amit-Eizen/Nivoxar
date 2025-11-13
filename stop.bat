@echo off
echo ========================================
echo Stopping Nivoxar Application
echo ========================================
echo.

echo Stopping Backend (.NET)...
taskkill /FI "WindowTitle eq Nivoxar Backend*" /F >nul 2>&1

echo Stopping Frontend (SPA Server)...
taskkill /FI "WindowTitle eq Nivoxar Frontend*" /F >nul 2>&1

echo.
echo ========================================
echo All servers stopped!
echo ========================================
echo.
pause
