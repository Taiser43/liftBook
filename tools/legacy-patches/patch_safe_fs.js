const fs = require('fs');
let content = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

// Wrap currentSongObj check
content = content.replace(
  `          if (currentSongObj) {
             const resolvedSongUri = getResolvedUri(currentSongObj.uri);
             const fileInfo = await FileSystem.getInfoAsync(resolvedSongUri || '');
             if (!fileInfo.exists) {
                Alert.alert(
                  "Song nicht gefunden",
                  "Die Audiodatei existiert nicht mehr. Dies passiert, wenn alte Lieder aus dem temporären Cache gelöscht wurden. Bitte importiere deine Lieder neu, das neue System speichert sie nun dauerhaft!"
                );
                setIsPlaying(false);
                return;
             }
          }`,
  `          if (currentSongObj) {
             const resolvedSongUri = getResolvedUri(currentSongObj.uri);
             try {
               const fileInfo = await FileSystem.getInfoAsync(resolvedSongUri || '');
               if (!fileInfo.exists) {
                  Alert.alert(
                    "Song nicht gefunden",
                    "Die Audiodatei existiert nicht mehr. Dies passiert, wenn alte Lieder aus dem temporären Cache gelöscht wurden. Bitte importiere deine Lieder neu, das neue System speichert sie nun dauerhaft!"
                  );
                  setIsPlaying(false);
                  return;
               }
             } catch(e) { console.warn("FS Check failed, continuing anyway", e); }
          }`
);

// Wrap currentQueueSong check
content = content.replace(
  `          if (currentQueueSong) {
             const resolvedQueueUri = getResolvedUri(currentQueueSong.uri);
             const fileInfo = await FileSystem.getInfoAsync(resolvedQueueUri || '');
             if (!fileInfo.exists) {
                Alert.alert("Song nicht gefunden", "Die Audiodatei existiert nicht mehr.");
                setIsPlaying(false);
                return;
             }
             await TrackPlayer.reset();`,
  `          if (currentQueueSong) {
             const resolvedQueueUri = getResolvedUri(currentQueueSong.uri);
             try {
               const fileInfo = await FileSystem.getInfoAsync(resolvedQueueUri || '');
               if (!fileInfo.exists) {
                  Alert.alert("Song nicht gefunden", "Die Audiodatei existiert nicht mehr.");
                  setIsPlaying(false);
                  return;
               }
             } catch(e) { console.warn("FS Check failed, continuing anyway", e); }
             await TrackPlayer.reset();`
);

fs.writeFileSync('src/components/MediaPlayerWidget.tsx', content);
