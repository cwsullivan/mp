#!/bin/bash

# Murder Poops - Android Build Script
# This script builds the app for Android using EAS Build

set -e

echo "=== Murder Poops Android Build ==="
echo ""

# Navigate to project root
cd "$(dirname "$0")/../.."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if logged into EAS
echo "Checking EAS login status..."
if ! eas whoami &> /dev/null; then
    echo "Please log in to EAS first:"
    eas login
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install

# Select build type
echo ""
echo "Select build type:"
echo "  1) Preview (APK for testing)"
echo "  2) Production (AAB for Play Store)"
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        echo ""
        echo "Building preview APK..."
        eas build --platform android --profile preview
        ;;
    2)
        echo ""
        echo "Building production AAB..."
        eas build --platform android --profile production
        echo ""
        echo "To submit to Play Store, run:"
        echo "  eas submit --platform android --profile production"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "=== Build Complete ==="
echo "Check the EAS dashboard for build status and download link."
