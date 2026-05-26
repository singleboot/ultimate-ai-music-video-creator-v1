@echo off
title Ultimate Music Video Creator v1
cd /d "%~dp0"

echo ============================================
echo   Ultimate Music Video Creator v1
echo ============================================
echo.

REM Check if setup has been done
if not exist "comfyui\main.py" (
    echo [SETUP] First-time setup required...
    call setup.bat
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Setup failed. Please run setup.bat manually.
        pause
        exit /b 1
    )
)

REM Check if ComfyUI is already running
echo [1/4] Checking ComfyUI...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8188/system_stats' -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %ERRORLEVEL% neq 0 (
    echo [2/4] Starting ComfyUI...
    start "ComfyUI" /B /MIN python comfyui\main.py --port 8188 --listen 127.0.0.1 --force-fp16
    
    echo        Waiting for ComfyUI to be ready...
    :wait_comfy
    powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8188/system_stats' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        timeout /t 3 /nobreak >nul
        goto :wait_comfy
    )
    echo        ComfyUI is ready!
) else (
    echo [OK] ComfyUI already running.
)

REM Start FastAPI backend
echo [3/4] Starting API server...
start "UltimateMV-API" /B /MIN python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload --app-dir app

echo        Waiting for API server...
:wait_api
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    timeout /t 2 /nobreak >nul
    goto :wait_api
)
echo        API server is ready!

REM Start Next.js frontend
echo [4/4] Starting frontend...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo        Installing frontend dependencies...
    npm install >nul 2>&1
)
start "UltimateMV-Frontend" /B /MIN npx next dev -p 3000

echo        Waiting for frontend...
:wait_frontend
timeout /t 3 /nobreak >nul
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    timeout /t 3 /nobreak >nul
    goto :wait_frontend
)

cd /d "%~dp0"

echo.
echo ============================================
echo   All systems ready!
echo   Opening Ultimate Music Video Creator...
echo ============================================
start http://127.0.0.1:3000
echo.
echo   Press any key to stop all services...
pause >nul

echo.
echo Shutting down...
taskkill /FI "WINDOWTITLE eq UltimateMV-API" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq UltimateMV-Frontend" /F >nul 2>&1
echo Done.
