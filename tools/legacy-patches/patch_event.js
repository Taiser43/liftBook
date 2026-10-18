const fs = require('fs');
let content = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

// Add Event to imports
content = content.replace(
  "import TrackPlayer, { usePlaybackState, useProgress, State, Capability } from 'react-native-track-player';",
  "import TrackPlayer, { usePlaybackState, useProgress, State, Capability, Event } from 'react-native-track-player';"
);

// Add event listener to setupPlayer
const setupListener = `    isPlayerSetup = true;

    // Keep Zustand in sync if track changes natively (e.g. from lockscreen)
    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
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
    });
`;

content = content.replace("    isPlayerSetup = true;", setupListener);

fs.writeFileSync('src/components/MediaPlayerWidget.tsx', content);
