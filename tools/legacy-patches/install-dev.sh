#!/bin/bash
set -e

echo "🚀 Starte Dev-Build & Installation für Android via USB-Kabel..."

# 1. Ensure local.properties
if [ ! -f android/local.properties ]; then
  echo "⚙️  Erstelle android/local.properties..."
  echo "sdk.dir=/Users/davidbachmann/Library/Android/sdk" > android/local.properties
fi

# 2. Check ADB connection
ADB="/Users/davidbachmann/Library/Android/sdk/platform-tools/adb"
DEVICES=$($ADB devices | grep -v "List" | grep "device" || true)

if [ -z "$DEVICES" ]; then
  echo "❌ Kein Android-Gerät über USB gefunden!"
  echo "Bitte schließe dein Handy per USB an und aktiviere USB-Debugging."
  exit 1
fi

echo "📱 Verbundenes Gerät gefunden: $DEVICES"

# 3. Compile and install debug APK onto phone (only for arm64-v8a to build 4x faster)
cd android
echo "🔨 Kompiliere & installiere 'Iron Log (Dev)' (com.taiser.ptnutritionapp.dev)..."
./gradlew :app:installDebug -PreactNativeArchitectures=arm64-v8a --console=rich
cd ..

# 4. Reverse TCP port so phone over USB can reach Metro Bundler
echo "🔌 Verbinde USB-Port 8081 für Metro Bundler..."
$ADB reverse tcp:8081 tcp:8081

# 5. Launch the dev app on phone
echo "🚀 Starte 'Iron Log (Dev)' auf dem Smartphone..."
$ADB shell am start -n com.taiser.ptnutritionapp.dev/com.taiser.ptnutritionapp.MainActivity

echo ""
echo "✅ Installation erfolgreich abgeschlossen!"
echo "🎉 'Iron Log (Dev)' ist jetzt auf deinem Handy installiert – direkt neben deiner normalen 'Iron Log' App!"
echo "💡 Um Live-Änderungen (Hot Reloading) zu nutzen, starte einfach im Terminal:"
echo "   npm start"
