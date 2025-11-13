# QuestKeeperAI - Build Instructions

This guide explains how to build QuestKeeperAI into distributable installers for Windows, macOS, and Linux.

## Prerequisites

### All Platforms
- **Node.js** 18+ and npm
- **Python** 3.9+
- **Git**

### Platform-Specific

#### Windows
- No additional requirements

#### macOS
- Xcode Command Line Tools: `xcode-select --install`

#### Linux
- Build essentials: `sudo apt-get install build-essential`

## Quick Build

The easiest way to build the complete application:

### Windows
```cmd
build_windows.bat
```

### macOS
```bash
./build_mac.sh
```

### Linux
```bash
./build_linux.sh
```

These scripts will automatically:
1. Install all required Python dependencies
2. Build the Python backend into a standalone executable with PyInstaller
3. Install all Node.js dependencies
4. Build the React frontend with webpack
5. Package everything into a platform-specific installer with electron-builder

## Manual Build Steps

If you prefer to build each component separately:

### 1. Build Python Backend

```bash
cd python_backend

# Install dependencies
pip install -r requirements.txt

# Build with PyInstaller
pyinstaller questkeeper.spec --clean

# Output: dist/questkeeper_backend/
```

### 2. Build React Frontend

```bash
cd mcp-gemini-desktop

# Install dependencies
npm install

# Build with webpack
npm run build

# Output: dist/
```

### 3. Package with Electron Builder

```bash
cd mcp-gemini-desktop

# Package for your platform
npm run package

# Or build for specific platforms:
npm run package:mac     # macOS .dmg
npm run package:win     # Windows .exe installer
npm run package:linux   # Linux AppImage
```

## Output Locations

After building, you'll find installers in:

```
mcp-gemini-desktop/release/
├── QuestKeeperAI-0.2.0.dmg          # macOS
├── QuestKeeperAI Setup 0.2.0.exe    # Windows
└── QuestKeeperAI-0.2.0.AppImage     # Linux
```

## Development Mode

To run the app in development without packaging:

### 1. Start Python Backend

```bash
cd python_backend
python main.py
```

### 2. Build Frontend & Run Electron

```bash
cd mcp-gemini-desktop
npm install
npm run build
npm start
```

Or use the dev mode with hot reload:

```bash
npm run dev
```

## Troubleshooting

### PyInstaller Issues

If PyInstaller fails to build:
```bash
# Clear cache and retry
rm -rf build dist __pycache__
pyinstaller questkeeper.spec --clean
```

### Webpack Build Errors

If webpack fails:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Electron Builder Issues

If packaging fails:
```bash
# Clear electron-builder cache
npm run package -- --clean
```

## Platform-Specific Notes

### macOS
- The app will be code-signed if you have a Developer ID
- First launch may require "Open" from right-click menu (Gatekeeper)
- Universal builds include both Intel and Apple Silicon

### Windows
- The NSIS installer allows custom install location
- Windows Defender may scan the installer on first run
- Desktop and Start Menu shortcuts are created automatically

### Linux
- AppImage is self-contained and portable
- Make executable: `chmod +x QuestKeeperAI-*.AppImage`
- No installation needed, just run it

## File Structure

```
QuestKeeperAI/
├── python_backend/
│   ├── main.py                      # Backend entry point
│   ├── questkeeper.spec             # PyInstaller config
│   ├── requirements.txt             # Python dependencies
│   └── dist/questkeeper_backend/    # Built backend (after build)
├── mcp-gemini-desktop/
│   ├── src/                         # React source code
│   ├── dist/                        # Webpack output (after npm run build)
│   ├── main.js                      # Electron main process
│   ├── package.json                 # Build configuration & dependencies
│   └── release/                     # Final installers (after packaging)
├── build_windows.bat                # Master build script for Windows
├── build_mac.sh                     # Master build script for macOS
├── build_linux.sh                   # Master build script for Linux
└── BUILD.md                         # This file
```

## Advanced Configuration

### Changing App Name/Version

Edit `mcp-gemini-desktop/package.json`:
```json
{
  "name": "quest-keeper-ai",
  "version": "0.2.0",
  "build": {
    "appId": "com.questkeeper.ai",
    "productName": "QuestKeeperAI"
  }
}
```

### Adding Icons

Place icon files in `mcp-gemini-desktop/assets/`:
- `icon.icns` - macOS (1024x1024)
- `icon.ico` - Windows (256x256)
- `icon.png` - Linux (512x512)

### Backend Port Configuration

The backend runs on port 5001 by default. To change:

Edit `mcp-gemini-desktop/main.js`:
```javascript
const pythonPort = 5001; // Change this
```

## Distribution

After building, you can distribute the installers:

### macOS
- `.dmg` file - Users drag to Applications folder
- Can notarize for Gatekeeper approval

### Windows
- `.exe` installer - Standard Windows installation
- Can code-sign for SmartScreen trust

### Linux
- `.AppImage` - Portable, no installation needed
- Can also build `.deb` for Debian/Ubuntu

## Size Optimization

Typical installer sizes:
- macOS DMG: ~200-300 MB
- Windows EXE: ~150-250 MB
- Linux AppImage: ~150-250 MB

To reduce size:
- Remove unused dependencies
- Exclude dev dependencies in production
- Use compression in electron-builder config

## CI/CD Integration

For automated builds, see `.github/workflows/` (if available) or use:

```yaml
# Example GitHub Actions workflow
- name: Build QuestKeeperAI
  run: |
    chmod +x build.sh
    ./build.sh
```

## Support

If you encounter issues:
1. Check this BUILD.md file
2. Review logs in the terminal
3. Open an issue on GitHub with build logs

---

**Version:** 0.2.0
**Last Updated:** 2025-11-11
