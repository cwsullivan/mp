#!/bin/bash
# Master script: Start emulator (if needed), rebuild, and deploy

export ANDROID_HOME=~/Library/Android/sdk
ADB=~/Library/Android/sdk/platform-tools/adb
EMULATOR=~/Library/Android/sdk/emulator/emulator
AVD_NAME="Medium_Phone_API_36.1"

# Check if emulator is running
if ! $ADB devices | grep -q "emulator"; then
    echo "Starting emulator..."
    $EMULATOR -avd "$AVD_NAME" &
    echo "Waiting for emulator to boot..."
    $ADB wait-for-device
    sleep 10  # Extra time for full boot
fi

echo ""
echo "Building and deploying app..."
npx expo run:android
