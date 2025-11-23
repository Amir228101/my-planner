@echo off
title My Planner App

echo Starting My Planner...
echo.

REM Check if Python is installed
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Python is not installed on this system.
    echo Please install Python from https://www.python.org
    pause
    exit /b
)

REM Start the server on port 5500
start "" python -m http.server 5500

REM Wait a moment for server to start
timeout /t 2 >nul

REM Open the app
start "" http://localhost:5500/index.html

echo App started successfully!
exit /b
