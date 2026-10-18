const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalActivityBar.tsx', 'utf8');

content = content.replace(
  "import TrackPlayer, { State, usePlaybackState, useActiveTrack } from 'react-native-track-player';",
  "import TrackPlayer, { State, usePlaybackState } from 'react-native-track-player';"
);

content = content.replace(
  "const activeTrack = useActiveTrack();\n  const currentPlaylist = playlists.find(p => p.id === currentPlaylistId);\n  const zustandSong = currentQueueSong || currentPlaylist?.songs.find(s => s.id === currentSongId);\n  const currentSong = activeTrack ? { ...activeTrack, coverUri: activeTrack.artwork } : zustandSong;",
  "const currentPlaylist = playlists.find(p => p.id === currentPlaylistId);\n  const currentSong = currentQueueSong || currentPlaylist?.songs.find(s => s.id === currentSongId);"
);

fs.writeFileSync('src/components/GlobalActivityBar.tsx', content);
