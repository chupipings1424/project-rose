@echo off
setlocal
rem Project ROSE: starts the API first, waits until it is ready, then the web UI.
rem The API and the UI each get their own window. Close a window (or Ctrl+C) to stop it.

set "UI_DIR=%~dp0"
if not defined ROSE_API_DIR set "ROSE_API_DIR=%~dp0..\project-rose-api"
if not defined ROSE_API_PORT set "ROSE_API_PORT=5175"
set "ROSE_API_URL=http://127.0.0.1:%ROSE_API_PORT%"

where dotnet >nul 2>&1 || (echo The .NET SDK was not found. Install .NET 9 from https://dotnet.microsoft.com/download & pause & exit /b 1)
where node >nul 2>&1 || (echo Node.js was not found. Install it from https://nodejs.org & pause & exit /b 1)
if not exist "%ROSE_API_DIR%\src\Rose.Api\Rose.Api.csproj" (echo Cannot find the ROSE API in "%ROSE_API_DIR%". & pause & exit /b 1)

rem 1. API (skipped if it is already running)
curl -s -f -o nul "%ROSE_API_URL%/health" && (
  echo ROSE API is already running at %ROSE_API_URL%
  goto ui
)
echo Starting the ROSE API...
rem --no-launch-profile = do not open Swagger in the browser
start "ROSE API" /D "%ROSE_API_DIR%\src\Rose.Api" cmd /k "set ASPNETCORE_ENVIRONMENT=Development&& set URLS=%ROSE_API_URL%&& dotnet run --no-launch-profile"

echo Waiting for the API (the first build can take a minute)...
for /l %%i in (1,1,90) do (
  curl -s -f -o nul "%ROSE_API_URL%/health" && goto ready
  ping -n 3 127.0.0.1 >nul
)
echo The API did not start. Check the "ROSE API" window for errors.
pause
exit /b 1

:ready
echo ROSE API is ready at %ROSE_API_URL%  (Swagger: %ROSE_API_URL%/swagger)

:ui
rem 2. Web UI: Vite opens the browser by itself (unless ROSE_NO_OPEN=1)
if not exist "%UI_DIR%node_modules" (
  echo Installing UI packages for the first time...
  pushd "%UI_DIR%" & call npm install & popd
)
set "OPEN_FLAG=--open"
if "%ROSE_NO_OPEN%"=="1" set "OPEN_FLAG="
start "ROSE UI" /D "%UI_DIR%" cmd /k "npm run dev -- %OPEN_FLAG%"
echo ROSE UI is starting - the browser opens by itself (usually http://localhost:5180)
ping -n 4 127.0.0.1 >nul