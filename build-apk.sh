#!/bin/bash
set -e  # Stoppe sofort bei jedem Fehler

# Stelle sicher dass local.properties existiert (wird nach expo prebuild --clean gelöscht)
ensure_local_properties() {
  if [ ! -f android/local.properties ]; then
    echo "⚙️  Erstelle android/local.properties..."
    echo "sdk.dir=/Users/davidbachmann/Library/Android/sdk" > android/local.properties
  fi
}

echo "🚀 Starte Expo Prebuild (Clean & Synchronisiere Native Modules)..."
npx expo prebuild -p android --clean

# local.properties wird von prebuild --clean gelöscht → neu erstellen
ensure_local_properties

# KRITISCH: React Native 0.86 unterstützt newArchEnabled=false NICHT mehr!
# Wir lassen die Standardeinstellung (New Architecture an).

echo "🔨 Starte lokalen Android Compile-Vorgang via Gradle..."
cd android

# Startzeitpunkt merken
START_TIME=$(date +%s)

# Gradle mit "rich" Console starten (erzwingt die Gradle-eigene Progressbar)
./gradlew assembleRelease --console=rich
BUILD_RESULT=$?

# Endzeitpunkt berechnen
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECS=$((DURATION % 60))

cd ..

if [ $BUILD_RESULT -ne 0 ]; then
  echo ""
  echo "❌ BUILD FEHLGESCHLAGEN nach ${MINUTES}m ${SECS}s!"
  echo "📋 Zeige die letzten Fehlerzeilen aus dem Build-Log..."
  echo "---"
  # Zeige die letzten relevanten Fehlermeldungen
  cd android && ./gradlew assembleRelease --console=plain 2>&1 | grep -E "error:|Error|FAIL" | tail -n 20
  exit 1
fi

echo ""
echo "✅ Build abgeschlossen in ${MINUTES} Minuten und ${SECS} Sekunden!"
echo "📦 Kopiere APK auf den Desktop..."
cp android/app/build/outputs/apk/release/app-release.apk ~/Desktop/test-app-release.apk

echo "🎉 Fertig. Die APK liegt auf deinem Desktop."
echo "📂 Öffne Finder..."

# Öffnet den Mac Finder und markiert direkt die fertige APK Datei
open -R ~/Desktop/test-app-release.apk

# Falls das Smartphone per USB verbunden ist, direkt installieren
ADB="/Users/davidbachmann/Library/Android/sdk/platform-tools/adb"
if [ -x "$ADB" ] && $ADB devices | grep -v "List" | grep -q "device"; then
  echo "📱 Verbundenes Smartphone erkannt! Installiere Release-APK direkt auf dein Handy..."
  $ADB install -r ~/Desktop/test-app-release.apk || echo "⚠️ ADB Installation fehlgeschlagen, Datei liegt auf Desktop."
fi

echo "📧 Öffne Google Chrome mit einem neuen Gmail-Entwurf..."
# URL-kodierter Text für Betreff und Body
SUBJECT="Neue PT Nutrition App Version"
BODY="Hier ist die neue Version der App. Einfach die Datei vom Desktop hier reinziehen!"
MAIL_URL="https://mail.google.com/mail/?view=cm&fs=1&to=davidbachmann8@gmail.com&su=${SUBJECT// /%20}&body=${BODY// /%20}"

# Google Chrome öffnen und die URL übergeben
open -a "Google Chrome" "$MAIL_URL"

