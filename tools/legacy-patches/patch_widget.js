const fs = require('fs');

let code = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

// We need to import useMusicStore properly to get currentQueueSong
code = code.replace(
  "playlists, currentPlaylistId, currentSongId, isPlaying, isShuffle",
  "playlists, currentPlaylistId, currentSongId, currentQueueSong, isPlaying, isShuffle"
);

// We need to modify the useEffect that loads the track
const oldEffect = `  // Load new song into TrackPlayer when song changes in Zustand
  useEffect(() => {
    if (currentSongId) {
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
             // Play queue song exclusively
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

          // Build the full queue from the current playlist
          const playlist = playlists.find(p => p.id === currentPlaylistId);
          if (!playlist) return;
          
          const currentIndex = playlist.songs.findIndex(s => s.id === currentSongId);
          
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
  }, [currentSongId, currentQueueSong]);`;

code = code.replace(oldEffect, newEffect);

// Add Play Count logic! We can track play counts locally using a ref inside MediaPlayerWidget!
// We need to import useRef and useEffect from React
code = code.replace("import React, { useState, useEffect, useRef }", "import React, { useState, useEffect, useRef }"); // Just to ensure, wait, let's just add the hook

const playCountHook = `
  const hasCountedRef = useRef(false);
  const { incrementPlayCount, powerSong } = useMusicStore();
  
  useEffect(() => {
     hasCountedRef.current = false;
  }, [currentSongId, currentQueueSong]);

  useEffect(() => {
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
  }, [progress.position, currentSongId, currentQueueSong]);
`;

// Insert playCountHook right before `const handlePlayPause = ...`
code = code.replace("const handlePlayPause =", playCountHook + "\\n  const handlePlayPause =");

fs.writeFileSync('src/components/MediaPlayerWidget.tsx', code);
console.log("Patched MediaPlayerWidget.tsx");
