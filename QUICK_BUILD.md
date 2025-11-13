# Quick Build Reference

## For Windows

1. **Install Prerequisites:**
   - Python 3.9+ from https://www.python.org/
   - Node.js 16+ from https://nodejs.org/

2. **Run Build Script:**
   ```cmd
   build_windows.bat
   ```

3. **Find Your Installer:**
   ```
   mcp-gemini-desktop\release\QuestKeeperAI Setup X.X.X.exe
   ```

## For macOS

1. **Install Prerequisites:**
   ```bash
   # Install Homebrew if you don't have it
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

   # Install Python and Node.js
   brew install python node
   ```

2. **Run Build Script:**
   ```bash
   ./build_mac.sh
   ```

3. **Find Your Installer:**
   ```
   mcp-gemini-desktop/release/QuestKeeperAI-X.X.X.dmg
   ```

## For Linux

1. **Install Prerequisites:**
   ```bash
   sudo apt-get update
   sudo apt-get install python3 python3-pip nodejs npm build-essential
   ```

2. **Run Build Script:**
   ```bash
   ./build_linux.sh
   ```

3. **Find Your Installer:**
   ```
   mcp-gemini-desktop/release/QuestKeeperAI-X.X.X.AppImage
   ```

## What Gets Built?

The build creates a **complete standalone application** that includes:
- ✅ Python runtime (no Python installation needed by end users)
- ✅ All Python dependencies
- ✅ Flask backend server
- ✅ Electron desktop app
- ✅ React frontend
- ✅ All Node.js dependencies

## Build Time

Expect the full build to take:
- **First build:** 10-15 minutes (downloading and installing dependencies)
- **Subsequent builds:** 3-5 minutes (dependencies cached)

## Output Size

Typical installer sizes:
- **Windows:** ~150-250 MB
- **macOS:** ~200-300 MB
- **Linux:** ~150-250 MB

The size includes the complete Python runtime and all dependencies, so end users don't need anything pre-installed.

## Security Note

When running `npm install`, you may see vulnerability warnings:

```
4 vulnerabilities (2 low, 1 moderate, 1 critical)
```

**Don't worry!** These are in development dependencies (build tools) only.

✅ **Production app has 0 vulnerabilities** (verified with `npm audit --production`)
✅ **Dev dependencies are NOT included in the final .exe**
✅ **Safe to distribute to end users**

See `SECURITY.md` for full details and how to fix them if desired.

## Troubleshooting

**Build script fails?**
- Make sure Python and Node.js are in your PATH
- Try running the commands manually (see BUILD.md)

**"Permission denied" on Linux/Mac?**
```bash
chmod +x build_linux.sh  # or build_mac.sh
```

**Python/Node.js not found?**
```bash
# Check if installed:
python --version    # Should show 3.9+
node --version      # Should show 16+
npm --version       # Should show 8+
```

**npm vulnerabilities?**
- See `SECURITY.md` - they're in dev dependencies only
- The final .exe is secure for distribution

## For More Details

See **BUILD.md** for:
- Manual build steps
- Advanced configuration
- Distribution guidelines
- CI/CD integration
- Platform-specific notes
