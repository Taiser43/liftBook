const fs = require('fs');
let content = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

content = content.replace(
  "source={{ uri: currentSong?.coverUri || currentPlaylist?.coverUri }}",
  "source={{ uri: getResolvedUri(currentSong?.coverUri || currentPlaylist?.coverUri) }}"
);

fs.writeFileSync('src/components/MediaPlayerWidget.tsx', content);
