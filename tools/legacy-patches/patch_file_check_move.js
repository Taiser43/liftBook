const fs = require('fs');
let content = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

const oldCheck = `          if (needsFullLoad) {
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

const newCheck = `          // Check if the current song file actually exists on device BEFORE attempting to play
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

          if (needsFullLoad) {
            await TrackPlayer.reset();`;

content = content.replace(oldCheck, newCheck);
fs.writeFileSync('src/components/MediaPlayerWidget.tsx', content);
