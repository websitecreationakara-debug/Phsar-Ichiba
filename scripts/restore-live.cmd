@echo off
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0restore-live.ps1"
echo.
pause
