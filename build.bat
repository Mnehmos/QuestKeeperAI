@echo off
REM Master build script for QuestKeeperAI (Windows)
REM Builds both Python backend and Electron frontend, then packages everything

echo QuestKeeperAI - Master Build Script
echo ======================================
echo.

REM Step 1: Build Python Backend
echo Step 1: Building Python Backend...
cd python_backend

REM Check if PyInstaller is installed
pyinstaller --version >nul 2>&1
if errorlevel 1 (
    echo PyInstaller not found. Installing dependencies...
    pip install -r requirements.txt
)

REM Run backend build
call build_backend.bat
if errorlevel 1 (
    echo Backend build failed!
    exit /b 1
)

cd ..
echo Backend build complete!
echo.

REM Step 2: Build React Frontend
echo Step 2: Building React Frontend...
cd mcp-gemini-desktop

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
)

REM Build frontend with webpack
echo Building frontend with webpack...
call npm run build
if errorlevel 1 (
    echo Frontend build failed!
    exit /b 1
)

echo Frontend build complete!
echo.

REM Step 3: Package with Electron Builder
echo Step 3: Packaging Electron App...
echo This may take a few minutes...
echo Building for Windows...
call npm run package:win
if errorlevel 1 (
    echo Packaging failed!
    exit /b 1
)

cd ..
echo.
echo Build Complete!
echo ====================
echo.
echo Installers are in: mcp-gemini-desktop\release\
dir mcp-gemini-desktop\release
echo.
echo Ready to install and launch!
