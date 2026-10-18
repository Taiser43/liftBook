const fs = require('fs');
let content = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

// Import getResolvedUri
if (!content.includes("getResolvedUri")) {
  content = content.replace("import TrackPlayer", "import { getResolvedUri } from '../utils/uriResolver';\nimport TrackPlayer");
}

// Replace currentQueueSong usages
content = content.replace(
  "const fileInfo = await FileSystem.getInfoAsync(currentQueueSong.uri);",
  "const resolvedQueueUri = getResolvedUri(currentQueueSong.uri);\n             const fileInfo = await FileSystem.getInfoAsync(resolvedQueueUri || '');"
);

content = content.replace(
  "url: currentQueueSong.uri,",
  "url: resolvedQueueUri || currentQueueSong.uri,"
);

content = content.replace(
  "artwork: currentQueueSong.coverUri,",
  "artwork: getResolvedUri(currentQueueSong.coverUri),"
);

// Replace playlist.songs[currentIndex] usages
content = content.replace(
  "const fileInfo = await FileSystem.getInfoAsync(currentSongObj.uri);",
  "const resolvedSongUri = getResolvedUri(currentSongObj.uri);\n             const fileInfo = await FileSystem.getInfoAsync(resolvedSongUri || '');"
);

// Replace tracks mapping
const oldMapping = `            const tracks = playlist.songs.map(song => ({
              id: song.id,
              url: song.uri,
              title: song.title,
              artist: song.artist || 'Unknown Artist',
              artwork: song.coverUri,
            }));`;

const newMapping = `            const tracks = playlist.songs.map(song => ({
              id: song.id,
              url: getResolvedUri(song.uri) || song.uri,
              title: song.title,
              artist: song.artist || 'Unknown Artist',
              artwork: getResolvedUri(song.coverUri),
            }));`;

content = content.replace(oldMapping, newMapping);

fs.writeFileSync('src/components/MediaPlayerWidget.tsx', content);
