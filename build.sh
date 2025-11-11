#!/bin/bash
# Master build script for QuestKeeperAI
# Builds both Python backend and Electron frontend, then packages everything

set -e  # Exit on error

echo "🎲 QuestKeeperAI - Master Build Script"
echo "======================================"
echo ""

# Step 1: Build Python Backend
echo "📦 Step 1: Building Python Backend..."
cd python_backend

# Check if PyInstaller is installed
if ! command -v pyinstaller &> /dev/null; then
    echo "⚠️  PyInstaller not found. Installing dependencies..."
    pip install -r requirements.txt
fi

# Run backend build
./build_backend.sh

cd ..
echo "✅ Backend build complete!"
echo ""

# Step 2: Build React Frontend
echo "⚛️  Step 2: Building React Frontend..."
cd mcp-gemini-desktop

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📥 Installing npm dependencies..."
    npm install
fi

# Build frontend with webpack
echo "🔨 Building frontend with webpack..."
npm run build

echo "✅ Frontend build complete!"
echo ""

# Step 3: Package with Electron Builder
echo "📦 Step 3: Packaging Electron App..."
echo "⏳ This may take a few minutes..."

# Detect platform and build accordingly
case "$(uname -s)" in
    Darwin*)
        echo "🍎 Building for macOS..."
        npm run package:mac
        ;;
    Linux*)
        echo "🐧 Building for Linux..."
        npm run package:linux
        ;;
    MINGW*|MSYS*|CYGWIN*)
        echo "🪟 Building for Windows..."
        npm run package:win
        ;;
    *)
        echo "⚠️  Unknown platform, building for current platform..."
        npm run package
        ;;
esac

cd ..
echo ""
echo "🎉 Build Complete!"
echo "===================="
echo ""
echo "📁 Installers are in: mcp-gemini-desktop/release/"
ls -lh mcp-gemini-desktop/release/
echo ""
echo "✨ Ready to install and launch!"
