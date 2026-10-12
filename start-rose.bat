@echo off
setlocal
rem Project ROSE launcher: API first (no Swagger tab), then the web UI in your browser.
rem
rem Everything runs in ONE minimized window called "ROSE". It closes by itself
rem 20 seconds after you close the last ROSE tab, or right away when you press
rem the power button in ROSE. Closing the "ROSE" window also stops everything.
rem Set ROSE_AUTO_CLOSE=0 to keep ROSE running when no tab is open.

set "UI_DIR=%~dp0"
if not defined ROSE_API_DIR set "ROSE_API_DIR=%~dp0..\project-rose-api"
if not defined ROSE_API_PORT set "ROSE_API_PORT=5175"
set "ROSE_API_URL=http://127.0.0.1:%ROSE_API_PORT%"

if /i "%~1"=="--run" goto run

where dotnet >nul 2>&1 || (echo The .NET SDK was not found. Install .NET 9 from https://dotnet.microsoft.com/download & pause & exit /b 1)
where node >nul 2>&1 || (echo Node.js was not found. Install it from https://nodejs.org & pause & exit /b 1)
if not exist "%ROSE_API_DIR%\src\Rose.Api\Rose.Api.csproj" (echo Cannot find the ROSE API in "%ROSE_API_DIR%". & pause & exit /b 1)
if not exist "%UI_DIR%node_modules" (
  echo Installing UI packages for the first time...
  pushd "%UI_DIR%" & call npm install & popd
)

rem Re-open this script minimized; this window closes straight away.
start "ROSE" /min cmd /c ""%~f0" --run"
exit /b 0

:run
title ROSE
cd /d "%UI_DIR%"
rem npm start = scripts/dev.mjs: builds + starts the API, waits for /health, then starts Vite and opens the browser.
call npm start
if errorlevel 1 (
  echo.
  echo ROSE stopped with an error - see the messages above.
  pause
)