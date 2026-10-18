const fs = require('fs');
let code = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

// We need to bring in crossfadeSeconds from the store
if (!code.includes('crossfadeSeconds')) {
  code = code.replace(
    "const { powerSong } = useMusicStore();",
    "const { powerSong, crossfadeSeconds } = useMusicStore();"
  );
}

// Add the fade logic into the progress useEffect
const oldEffect = `  useEffect(() => {
     if (!hasCountedRef.current && progress.position > 30) {
        hasCountedRef.current = true;
        if (currentQueueSong) {
           // Find playlist id for queue song (it might be tricky, we can pass null or find it)
           // If we don't have playlistId, we can just find it
           const plist = playlists.find(p => p.songs.some(s => s.id === currentQueueSong.id));
           if (plist) incrementPlayCount(plist.id, currentQueueSong.id);
        } else if (currentPlaylistId && currentSongId) {
           incrementPlayCount(currentPlaylistId, currentSongId);
        }
     }
  }, [progress.position, currentSongId, currentQueueSong]);`;

const newEffect = `  useEffect(() => {
     if (!hasCountedRef.current && progress.position > 30) {
        hasCountedRef.current = true;
        if (currentQueueSong) {
           const plist = playlists.find(p => p.songs.some(s => s.id === currentQueueSong.id));
           if (plist) incrementPlayCount(plist.id, currentQueueSong.id);
        } else if (currentPlaylistId && currentSongId) {
           incrementPlayCount(currentPlaylistId, currentSongId);
        }
     }

     // Crossfade Logic (Simulated by Volume fading)
     if (crossfadeSeconds > 0 && progress.duration > 0) {
        const timeLeft = progress.duration - progress.position;
        if (timeLeft <= crossfadeSeconds && timeLeft > 0) {
           // Fade out
           const volume = Math.max(0, timeLeft / crossfadeSeconds);
           TrackPlayer.setVolume(volume).catch(() => {});
           
           // If we are at the very end of the crossfade, skip to next manually to ensure gapless
           if (timeLeft < 0.5 && isPlaying) {
             playNext();
           }
        } else if (progress.position <= crossfadeSeconds && progress.position > 0) {
           // Fade in
           const volume = Math.min(1, progress.position / crossfadeSeconds);
           TrackPlayer.setVolume(volume).catch(() => {});
        } else {
           TrackPlayer.setVolume(1).catch(() => {});
        }
     } else {
        TrackPlayer.setVolume(1).catch(() => {});
     }
  }, [progress.position, progress.duration, currentSongId, currentQueueSong, crossfadeSeconds]);`;

code = code.replace(oldEffect, newEffect);
fs.writeFileSync('src/components/MediaPlayerWidget.tsx', code);
console.log("Patched Crossfade Logic");
