#!/bin/bash
# Start the Android emulator

EMULATOR=~/Library/Android/sdk/emulator/emulator
AVD_NAME="Medium_Phone_API_36.1"

echo "Starting emulator: $AVD_NAME"
$EMULATOR -avd "$AVD_NAME" &

echo "Waiting for emulator to boot..."
~/Library/Android/sdk/platform-tools/adb wait-for-device
echo "Emulator ready!"
