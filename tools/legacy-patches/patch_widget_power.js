const fs = require('fs');
let content = fs.readFileSync('src/components/InWorkoutMusicWidget.tsx', 'utf8');

const target = `  const handleTriggerPowerSong = () => {
    if (powerSong) setCurrentSong(powerSong.playlistId, powerSong.songId);
  };`;

const replacement = `  const handleTriggerPowerSong = () => {
    if (!powerSong) return;
    
    // Fallback checks
    const playlist = playlists.find(p => p.id === powerSong.playlistId);
    if (!playlist) return;
    const song = playlist.songs.find(s => s.id === powerSong.songId);
    if (!song) return;

    setCurrentSong(powerSong.playlistId, powerSong.songId);
    
    setTimeout(async () => {
      try {
        await TrackPlayer.seekTo(powerSong.startPosition || 0);
      } catch (e) {
        console.warn(e);
      }
    }, 1000);
  };`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/InWorkoutMusicWidget.tsx', content);
