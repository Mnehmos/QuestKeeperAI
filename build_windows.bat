@echo off
REM QuestKeeperAI - Windows Build Script
REM This script builds both the Python backend and Electron frontend into a Windows executable

echo.
echo =====================================
echo  QuestKeeperAI - Windows Build
echo =====================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.9+ from https://www.python.org/
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Installing Python dependencies...
cd python_backend
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller
if errorlevel 1 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Building Python backend with PyInstaller...
pyinstaller questkeeper.spec --clean --noconfirm
if errorlevel 1 (
    echo ERROR: Failed to build Python backend
    pause
    exit /b 1
)

echo.
echo [3/4] Installing Node.js dependencies...
cd ..\mcp-gemini-desktop
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    exit /b 1
)

echo.
echo [4/4] Building and packaging Electron app...
call npm run package:win
if errorlevel 1 (
    echo ERROR: Failed to build Electron app
    pause
    exit /b 1
)

echo.
echo =====================================
echo  Build Complete!
echo =====================================
echo.
echo The installer can be found at:
echo mcp-gemini-desktop\release\QuestKeeperAI Setup X.X.X.exe
echo.
pause
