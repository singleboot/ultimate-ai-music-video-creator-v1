@echo off
title Ultimate Music Video Creator v1 - Setup
cd /d "%~dp0"

echo ============================================
echo   Ultimate Music Video Creator v1 - Setup
echo ============================================
echo.
echo This script links your existing ComfyUI installation
echo to make this app portable (no file duplication).
echo.

REM Check if comfyui already exists
if exist "comfyui\main.py" (
    echo [OK] ComfyUI already linked.
    goto :check_dirs
)

REM Try to find ComfyUI
set COMFY_PATH=
if exist "F:\001 Comfyui Easy installer\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI\main.py" (
    set COMFY_PATH=F:\001 Comfyui Easy installer\ComfyUI-Easy-Install\ComfyUI-Easy-Install\ComfyUI
)

if "%COMFY_PATH%"=="" (
    echo.
    echo Enter the path to your ComfyUI installation:
    echo (e.g. C:\ComfyUI\ComfyUI)
    set /p COMFY_PATH="Path: "
)

if not exist "%COMFY_PATH%\main.py" (
    echo [ERROR] Invalid ComfyUI path - main.py not found!
    pause
    exit /b 1
)

echo.
echo Linking ComfyUI from: %COMFY_PATH%
echo.

REM Create junctions (NTFS symlinks for directories)
mklink /J "%~dp0comfyui\models" "%COMFY_PATH%\models" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARN] Could not create models junction. Trying copy instead...
    mkdir "%~dp0comfyui\models" >nul 2>&1
)

mklink /J "%~dp0comfyui\custom_nodes" "%COMFY_PATH%\custom_nodes" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARN] Could not create custom_nodes junction. Trying copy instead...
    mkdir "%~dp0comfyui\custom_nodes" >nul 2>&1
)

mklink /J "%~dp0comfyui\input" "%COMFY_PATH%\input" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARN] Could not create input junction. Trying copy instead...
    mkdir "%~dp0comfyui\input" >nul 2>&1
)

mklink /J "%~dp0comfyui\output" "%COMFY_PATH%\output" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARN] Could not create output junction. Trying copy instead...
    mkdir "%~dp0comfyui\output" >nul 2>&1
)

REM Copy core ComfyUI files (not models)
echo Copying core ComfyUI files...
xcopy "%COMFY_PATH%\*.py" "%~dp0comfyui\" /Y >nul 2>&1
xcopy "%COMFY_PATH%\*.txt" "%~dp0comfyui\" /Y >nul 2>&1
xcopy "%COMFY_PATH%\web" "%~dp0comfyui\web\" /E /I /Y >nul 2>&1
xcopy "%COMFY_PATH%\comfy" "%~dp0comfyui\comfy\" /E /I /Y >nul 2>&1
xcopy "%COMFY_PATH%\app" "%~dp0comfyui\app\" /E /I /Y >nul 2>&1
xcopy "%COMFY_PATH%\nodes.py" "%~dp0comfyui\" /Y >nul 2>&1
xcopy "%COMFY_PATH%\folder_paths.py" "%~dp0comfyui\" /Y >nul 2>&1
xcopy "%COMFY_PATH%\execution.py" "%~dp0comfyui\" /Y >nul 2>&1
xcopy "%COMFY_PATH%\server.py" "%~dp0comfyui\" /Y >nul 2>&1

echo [OK] ComfyUI linked successfully!
echo.

REM Save ComfyUI path to config
powershell -Command "(Get-Content config.json) -replace '\"path\": \"\"', '\"path\": \"%COMFY_PATH:\=\\%\"' | Set-Content config.json"

:check_dirs
echo Creating input directories...
mkdir "%~dp0input\fulllyrics" 2>nul
mkdir "%~dp0input\themestyle" 2>nul
mkdir "%~dp0input\storyconcept" 2>nul
mkdir "%~dp0input\subjectandscenes" 2>nul
mkdir "%~dp0output\Aceaudio" 2>nul

echo Installing Python dependencies...
pip install -r "%~dp0app\requirements.txt" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARN] pip install had issues. You may need to run: pip install -r app\requirements.txt
)

echo Installing Node.js dependencies...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    npm install >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [WARN] npm install had issues. You may need to run: npm install
    )
)
cd /d "%~dp0"

echo.
echo ============================================
echo   Setup Complete!
echo   Run LAUNCH.bat to start the app.
echo ============================================
pause
