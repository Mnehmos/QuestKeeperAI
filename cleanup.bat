@echo off
REM QuestKeeperAI - Cleanup Script
REM Saves the installer and removes all build artifacts

echo.
echo =====================================
echo  QuestKeeperAI - Cleanup
echo =====================================
echo.

REM Check if installer exists
if exist "mcp-gemini-desktop\release\*.exe" (
    echo [1/3] Saving installer...

    REM Create installers directory if it doesn't exist
    if not exist "installers" mkdir installers

    REM Copy all .exe files from release to installers directory
    copy "mcp-gemini-desktop\release\*.exe" installers\

    echo ✓ Installer saved to: installers\
    echo.
) else (
    echo [1/3] No installer found in mcp-gemini-desktop\release\
    echo.
)

echo [2/3] Cleaning Python build artifacts...
if exist "python_backend\build" (
    rmdir /s /q "python_backend\build"
    echo   ✓ Removed python_backend\build
)
if exist "python_backend\dist" (
    rmdir /s /q "python_backend\dist"
    echo   ✓ Removed python_backend\dist
)
if exist "python_backend\__pycache__" (
    rmdir /s /q "python_backend\__pycache__"
    echo   ✓ Removed python_backend\__pycache__
)
REM Clean app directories too
for /d /r "python_backend\app" %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d"
echo   ✓ Cleaned Python cache files
echo.

echo [3/3] Cleaning Node.js build artifacts...
if exist "mcp-gemini-desktop\node_modules" (
    echo   Removing node_modules (this may take a moment)...
    rmdir /s /q "mcp-gemini-desktop\node_modules"
    echo   ✓ Removed mcp-gemini-desktop\node_modules
)
if exist "mcp-gemini-desktop\dist" (
    rmdir /s /q "mcp-gemini-desktop\dist"
    echo   ✓ Removed mcp-gemini-desktop\dist
)
if exist "mcp-gemini-desktop\release" (
    rmdir /s /q "mcp-gemini-desktop\release"
    echo   ✓ Removed mcp-gemini-desktop\release
)
echo.

echo =====================================
echo  Cleanup Complete!
echo =====================================
echo.
if exist "installers\*.exe" (
    echo Your installer is saved in: installers\
    dir /b installers\*.exe
) else (
    echo No installer was found to save.
)
echo.
echo All build artifacts have been removed.
echo Run build_windows.bat to rebuild.
echo.
pause
