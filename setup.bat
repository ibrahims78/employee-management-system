@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title Staff Health Analyzer - Secure Setup

:: تفعيل دعم الألوان
reg add HKCU\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1

set "INSTALL_DIR=C:\staff_health_2026"
set "REPO_URL=https://github.com/ibrahims78/Staff-Health-Analyzer.git"
set "APP_PORT=5001"
set "LOG_FILE=%INSTALL_DIR%\setup_report.txt"

cls
echo [1/7] Checking Administrator privileges...
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERROR] Please run as Administrator.
    pause & exit
)

echo [2/7] Checking Git...
git --version >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [INFO] Installing Git...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/Git-2.44.0-64-bit.exe' -OutFile '%TEMP%\git_installer.exe'}"
    start /wait "" "%TEMP%\git_installer.exe" /VERYSILENT
)

echo [3/7] Checking Docker...
docker info >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop.
    pause & exit
)

echo [4/7] Cloning/Updating Repository...
if exist "%INSTALL_DIR%\.git" (
    cd /d "%INSTALL_DIR%"
    git pull origin main
) else (
    git clone --depth 1 %REPO_URL% "%INSTALL_DIR%"
)

echo [5/7] Setting Up Permissions...
if not exist "%INSTALL_DIR%\storage" mkdir "%INSTALL_DIR%\storage"
:: حماية المجلد: المسؤولين تحكم كامل، المستخدمين قراءة فقط، المجلدات التقنية تعديل
icacls "%INSTALL_DIR%" /inheritance:r /grant:r Administrators:(OI)(CI)F /grant:r Users:(OI)(CI)RX
icacls "%INSTALL_DIR%\storage" /grant:r Users:(OI)(CI)M

echo [6/7] Building Containers...
cd /d "%INSTALL_DIR%"
docker compose down >nul 2>&1
docker compose up --build -d
if %errorLevel% NEQ 0 (
    echo [ERROR] Docker Build Failed.
    pause & exit
)

echo [7/7] Finalizing...
start http://localhost:%APP_PORT%
echo Setup Complete. Report saved to %LOG_FILE%
pause