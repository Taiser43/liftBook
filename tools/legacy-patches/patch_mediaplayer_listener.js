const fs = require('fs');
let content = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

const oldListener = `    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
       if (event.index !== undefined) {
          const state = useMusicStore.getState();
          const currentPlaylist = state.playlists.find(p => p.id === state.currentPlaylistId);
          if (currentPlaylist && event.index < currentPlaylist.songs.length) {
             const newSongId = currentPlaylist.songs[event.index].id;
             if (state.currentSongId !== newSongId) {
                useMusicStore.setState({ currentSongId: newSongId });
             }
          }
       }
    });`;

const newListener = `    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
       if (event.track && event.track.id) {
          const state = useMusicStore.getState();
          // Find if we are currently playing a queue song
          if (state.currentQueueSong && state.currentQueueSong.id === event.track.id) {
             return; // Already correct
          }
          if (state.currentSongId !== event.track.id) {
             useMusicStore.setState({ currentSongId: event.track.id });
          }
       }
    });`;

content = content.replace(oldListener, newListener);
fs.writeFileSync('src/components/MediaPlayerWidget.tsx', content);
