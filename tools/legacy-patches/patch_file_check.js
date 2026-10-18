const fs = require('fs');
let content = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

// Ensure FileSystem is imported at the top if not already
if (!content.includes("import * as FileSystem from 'expo-file-system';")) {
  content = content.replace("import TrackPlayer", "import * as FileSystem from 'expo-file-system';\nimport TrackPlayer");
}

const checkLogic = `          if (needsFullLoad) {
            // Check if the current song file actually exists on device
            const currentSongObj = playlist.songs[currentIndex];
            if (currentSongObj) {
               const fileInfo = await FileSystem.getInfoAsync(currentSongObj.uri);
               if (!fileInfo.exists) {
                  Alert.alert(
                    "Song nicht gefunden",
                    "Die Audiodatei existiert nicht mehr. Dies passiert, wenn alte Lieder aus dem temporären Cache gelöscht wurden. Bitte importiere deine Lieder neu, das neue System speichert sie nun dauerhaft!"
                  );
                  setIsPlaying(false);
                  return;
               }
            }
            await TrackPlayer.reset();`;

content = content.replace("          if (needsFullLoad) {\n            // Debug check for the first song\n            if (playlist.songs.length > 0) {\n               const fileInfo = await FileSystem.getInfoAsync(playlist.songs[0].uri);\n               if (!fileInfo.exists) {\n                  Alert.alert(\"Dateifehler\", \"Die Musikdatei existiert nicht mehr auf dem Gerät. Sie wurde vermutlich vom System gelöscht, da sie im Cache lag. Bitte importiere die Lieder neu!\");\n               }\n            }\n\n            await TrackPlayer.reset();", checkLogic);

// Also check for currentQueueSong
const queueCheckLogic = `          if (currentQueueSong) {
             const fileInfo = await FileSystem.getInfoAsync(currentQueueSong.uri);
             if (!fileInfo.exists) {
                Alert.alert("Song nicht gefunden", "Die Audiodatei existiert nicht mehr.");
                setIsPlaying(false);
                return;
             }
             await TrackPlayer.reset();`;
content = content.replace("          if (currentQueueSong) {\n             await TrackPlayer.reset();", queueCheckLogic);

fs.writeFileSync('src/components/MediaPlayerWidget.tsx', content);
