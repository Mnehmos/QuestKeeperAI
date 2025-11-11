@echo off
REM Build script for QuestKeeperAI Python Backend (Windows)
REM Creates a standalone executable using PyInstaller

echo Building QuestKeeperAI Backend...

REM Clean previous builds
echo Cleaning previous builds...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

REM Build with PyInstaller
echo Running PyInstaller...
pyinstaller questkeeper.spec --clean

REM Verify build
if exist "dist\questkeeper_backend" (
    echo Backend built successfully!
    echo Output: dist\questkeeper_backend\
    dir dist\questkeeper_backend
) else (
    echo Build failed!
    exit /b 1
)

echo.
echo Backend packaging complete!
echo Executable: dist\questkeeper_backend\questkeeper_backend.exe
