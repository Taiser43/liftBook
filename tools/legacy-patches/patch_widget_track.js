const fs = require('fs');
let code = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

const oldEffect = `  // Load new song into TrackPlayer when song changes in Zustand
  useEffect(() => {
    if (currentSong && currentSong.uri) {
      const loadTrack = async () => {
        try {
          await TrackPlayer.reset();
          
          // Build the full queue from the current playlist
          const playlist = playlists.find(p => p.id === currentPlaylistId);
          if (!playlist) return;
          
          const currentIndex = playlist.songs.findIndex(s => s.id === currentSongId);
          
          // Build queue starting from the current song
          const tracks = playlist.songs.map(song => ({
            id: song.id,
            url: song.uri,
            title: song.title,
            artist: song.artist || 'Unknown Artist',
            artwork: song.coverUri,
          }));
          
          await TrackPlayer.add(tracks);
          await TrackPlayer.skip(currentIndex >= 0 ? currentIndex : 0);
          
          if (isPlaying) {
            await TrackPlayer.play();
          }
        } catch (e) {
          console.error('TrackPlayer error loading track:', e);
        }
      };
      loadTrack();
    }
  }, [currentSongId]);`;

const newEffect = `  // Load new song into TrackPlayer when song changes in Zustand
  useEffect(() => {
    if (currentSongId || currentQueueSong) {
      const loadTrack = async () => {
        try {
          await TrackPlayer.reset();
          
          if (currentQueueSong) {
             await TrackPlayer.add([{
                id: currentQueueSong.id,
                url: currentQueueSong.uri,
                title: currentQueueSong.title,
                artist: currentQueueSong.artist || 'Unknown Artist',
                artwork: currentQueueSong.coverUri,
             }]);
             if (isPlaying) await TrackPlayer.play();
             return;
          }

          const playlist = playlists.find(p => p.id === currentPlaylistId);
          if (!playlist) return;
          
          const currentIndex = playlist.songs.findIndex(s => s.id === currentSongId);
          if (currentIndex === -1) return;
          
          const tracks = playlist.songs.map(song => ({
            id: song.id,
            url: song.uri,
            title: song.title,
            artist: song.artist || 'Unknown Artist',
            artwork: song.coverUri,
          }));
          
          await TrackPlayer.add(tracks);
          await TrackPlayer.skip(currentIndex);
          
          if (isPlaying) {
            await TrackPlayer.play();
          }
        } catch (e) {
          console.error('TrackPlayer error loading track:', e);
        }
      };
      loadTrack();
    }
  }, [currentSongId, currentQueueSong]);`;

code = code.replace(oldEffect, newEffect);

// Also fix currentSong logic
code = code.replace(
  "const currentSong = currentPlaylist?.songs.find(s => s.id === currentSongId);",
  "const currentSong = currentQueueSong || currentPlaylist?.songs.find(s => s.id === currentSongId);"
);

fs.writeFileSync('src/components/MediaPlayerWidget.tsx', code);
console.log("Patched Track Loading");
