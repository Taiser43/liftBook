#!/bin/bash

echo "🎵 YouTube Playlist to MP3 Downloader 🎵"
echo "=========================================="

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew ist nicht installiert. Bitte installiere Homebrew zuerst."
    exit 1
fi

# Check for yt-dlp
if ! command -v yt-dlp &> /dev/null; then
    echo "⏳ Installiere yt-dlp (YouTube Downloader)..."
    brew install yt-dlp
fi

# Check for ffmpeg (required for MP3 conversion and embedding cover images)
if ! command -v ffmpeg &> /dev/null; then
    echo "⏳ Installiere ffmpeg (wird für MP3s und Cover-Bilder benötigt)..."
    brew install ffmpeg
fi

echo ""
read -p "🔗 Füge den YouTube-Link (Video oder Playlist) ein: " url
read -p "📂 Zielordner (z.B. /Volumes/MeineSSD/Musik oder drücke einfach Enter für './downloads'): " dest_path

# Fallback wenn kein Pfad angegeben wurde
if [ -z "$dest_path" ]; then
    dest_path="./downloads"
fi

# Erstelle den Ordner falls er nicht existiert
mkdir -p "$dest_path"

echo ""
echo "🚀 Starte Download in: $dest_path"
echo "Je nach Länge der Playlist kann das eine Weile dauern..."
echo ""

# yt-dlp command explanation:
# -f 'ba': Best audio
# -x: Extract audio
# --audio-format mp3: Convert to mp3
# --embed-thumbnail: Embed the youtube thumbnail as the MP3 cover art
# --add-metadata: Add title/artist metadata
# -o: Output template (creates a folder with the playlist name)

yt-dlp -f 'ba' -x --audio-format mp3 \
    --embed-thumbnail --add-metadata \
    -o "$dest_path/%(playlist_title)s/%(title)s.%(ext)s" \
    "$url"

echo ""
echo "✅ Download abgeschlossen! Du findest deine MP3s in: $dest_path"
