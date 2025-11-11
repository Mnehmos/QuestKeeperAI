#!/bin/bash
# Build script for QuestKeeperAI Python Backend
# Creates a standalone executable using PyInstaller

set -e  # Exit on error

echo "🔨 Building QuestKeeperAI Backend..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf build dist

# Build with PyInstaller
echo "📦 Running PyInstaller..."
pyinstaller questkeeper.spec --clean

# Verify build
if [ -d "dist/questkeeper_backend" ]; then
    echo "✅ Backend built successfully!"
    echo "📁 Output: dist/questkeeper_backend/"
    ls -lh dist/questkeeper_backend/
else
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "🎉 Backend packaging complete!"
echo "📍 Executable: dist/questkeeper_backend/questkeeper_backend"
