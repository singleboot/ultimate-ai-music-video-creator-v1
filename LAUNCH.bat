@echo off
setlocal
title Ultimate Music Video Creator v3
cd /d "%~dp0"

echo ============================================
echo   Ultimate Music Video Creator v3
echo ============================================
echo.

REM Kill anything on our ports
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1

REM Start API backend
echo [1/2] Starting API server on port 8000...
start "API" /MIN cmd /k "cd /d "%~dp0app" && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 4 /nobreak >nul

REM Start Next.js frontend
echo [2/2] Starting frontend on port 3001...
cd /d "%~dp0frontend"
start "Frontend" /MIN cmd /k "npx next dev -p 3001"
timeout /t 4 /nobreak >nul

REM Open browser
start http://localhost:3001

echo.
echo ============================================
echo   Both services started!
echo   Close this window — services run in background.
echo ============================================
timeout /t 3 /nobreak >nul
