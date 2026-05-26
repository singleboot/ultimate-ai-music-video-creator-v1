@echo off
title Ultimate Music Video Creator v1
cd /d "%~dp0"

echo ============================================
echo   Ultimate Music Video Creator v1
echo ============================================
echo.

REM Ensure input directories exist
mkdir "%~dp0input\fulllyrics" 2>nul
mkdir "%~dp0input\themestyle" 2>nul
mkdir "%~dp0input\storyconcept" 2>nul
mkdir "%~dp0input\subjectandscenes" 2>nul
mkdir "%~dp0output\Aceaudio" 2>nul

REM Check if setup has been done
if not exist "comfyui\main.py" if exist "F:\001 Comfyui Easy installer\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\main.py" (
    echo [SETUP] Auto-linking ComfyUI...
    mklink /J "%~dp0comfyui\models" "F:\001 Comfyui Easy installer\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\models" >nul 2>&1
    mklink /J "%~dp0comfyui\custom_nodes" "F:\001 Comfyui Easy installer\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\custom_nodes" >nul 2>&1
    mklink /J "%~dp0comfyui\input" "F:\001 Comfyui Easy installer\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\input" >nul 2>&1
    mklink /J "%~dp0comfyui\output" "F:\001 Comfyui Easy installer\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\output" >nul 2>&1
    xcopy "F:\001 Comfyui Easy installer\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\*.py" "%~dp0comfyui\" /Y >nul 2>&1
    xcopy "F:\001 Comfyui Easy installer\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\web" "%~dp0comfyui\web\" /E /I /Y >nul 2>&1
    xcopy "F:\001 Comfyui Easy installer\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\comfy" "%~dp0comfyui\comfy\" /E /I /Y >nul 2>&1
    xcopy "F:\001 Comfyui Easy installer\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\app" "%~dp0comfyui\app\" /E /I /Y >nul 2>&1
    xcopy "F:\001 Comfyui Easy installer\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\nodes.py" "%~dp0comfyui\" /Y >nul 2>&1
    xcopy "F:\001 Comfyui Easy installer\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\folder_paths.py" "%~dp0comfyui\" /Y >nul 2>&1
    xcopy "F:\001 Comfyui Easy installer\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\execution.py" "%~dp0comfyui\" /Y >nul 2>&1
    xcopy "F:\001 Comfyui Easy installer\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\server.py" "%~dp0comfyui\" /Y >nul 2>&1
    echo [OK] ComfyUI linked.
)
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
start "UltimateMV-API" /B /MIN cmd /c "cd /d "%~dp0app" && python -m uvicorn main:app --host 127.0.0.1 --port 8000"

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
