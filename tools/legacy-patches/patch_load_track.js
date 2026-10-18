const fs = require('fs');
let code = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

const targetRegex = /const loadTrack = async \(\) => \{[\s\S]*?console\.error\('TrackPlayer error loading track:', e\);\n        \}\n      \};/g;

const newTarget = `const loadTrack = async () => {
        try {
          if (currentQueueSong) {
             await TrackPlayer.reset();
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
          
          // Check if the current queue already matches the playlist to avoid resetting
          const queue = await TrackPlayer.getQueue();
          let needsFullLoad = true;
          if (queue && queue.length === playlist.songs.length && queue.length > 0) {
              if (queue[0].id === playlist.songs[0].id) {
                  needsFullLoad = false;
              }
          }
          
          if (needsFullLoad) {
            await TrackPlayer.reset();
            const tracks = playlist.songs.map(song => ({
              id: song.id,
              url: song.uri,
              title: song.title,
              artist: song.artist || 'Unknown Artist',
              artwork: song.coverUri,
            }));
            await TrackPlayer.add(tracks);
          }
          
          const currentTrackIndex = await TrackPlayer.getCurrentTrack();
          if (currentTrackIndex !== currentIndex) {
            await TrackPlayer.skip(currentIndex);
          }
          
          if (isPlaying) {
            await TrackPlayer.play();
          }
        } catch (e) {
          console.error('TrackPlayer error loading track:', e);
          // If skip fails, we can force a full reload next time
          try {
             await TrackPlayer.reset();
          } catch(e2) {}
        }
      };`;

code = code.replace(targetRegex, newTarget);
fs.writeFileSync('src/components/MediaPlayerWidget.tsx', code);
console.log("Patched loadTrack logic to avoid unnecessary resets");
