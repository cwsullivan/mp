#!/bin/bash
# Build production AAB for Google Play Store

echo "Building production AAB for Play Store..."
eas build --platform android --profile production

echo ""
echo "Once complete, download the .aab from the EAS dashboard."
echo "To submit to Play Store, run: eas submit --platform android"
