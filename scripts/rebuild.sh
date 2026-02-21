#!/bin/bash
# Full rebuild of Android app (use after changing deps or native code)

export ANDROID_HOME=~/Library/Android/sdk

echo "Rebuilding Android app..."
npx expo run:android
