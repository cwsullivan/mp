#!/bin/bash
# Start Expo dev server and open on Android emulator

export ANDROID_HOME=~/Library/Android/sdk

echo "Starting Expo dev server..."
npx expo start --android
