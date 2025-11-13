#!/bin/bash
# QuestKeeperAI - Linux Build Script
# This script builds both the Python backend and Electron frontend into a Linux AppImage

set -e  # Exit on error

echo ""
echo "====================================="
echo "  QuestKeeperAI - Linux Build"
echo "====================================="
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.9+ using your package manager"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "[1/4] Installing Python dependencies..."
cd python_backend
python3 -m pip install --upgrade pip
pip3 install -r requirements.txt
pip3 install pyinstaller
echo "✓ Python dependencies installed"

echo ""
echo "[2/4] Building Python backend with PyInstaller..."
pyinstaller questkeeper.spec --clean --noconfirm
echo "✓ Python backend built"

echo ""
echo "[3/4] Installing Node.js dependencies..."
cd ../mcp-gemini-desktop
npm install
echo "✓ Node.js dependencies installed"

echo ""
echo "[4/4] Building and packaging Electron app..."
npm run package:linux
echo "✓ Electron app packaged"

echo ""
echo "====================================="
echo "  Build Complete!"
echo "====================================="
echo ""
echo "The AppImage can be found at:"
echo "mcp-gemini-desktop/release/QuestKeeperAI-X.X.X.AppImage"
echo ""
