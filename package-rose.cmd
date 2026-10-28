@echo off
rem Builds ROSE.exe (one file: API + web UI) into a ROSE folder next to this repo.
rem Needs .NET 9 SDK and Node.js on THIS PC only; the other laptop needs nothing.
cd /d "%~dp0"
where dotnet >nul 2>&1 || (echo The .NET SDK was not found. Install .NET 9 from https://dotnet.microsoft.com/download & pause & exit /b 1)
where node >nul 2>&1 || (echo Node.js was not found. Install it from https://nodejs.org & pause & exit /b 1)
if not exist node_modules call npm install
call npm run package -- %*
pause
