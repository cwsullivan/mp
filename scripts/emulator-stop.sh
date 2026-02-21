#!/bin/bash
# Stop the Android emulator

echo "Stopping emulator..."
~/Library/Android/sdk/platform-tools/adb emu kill
echo "Emulator stopped."
