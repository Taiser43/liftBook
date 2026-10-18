const fs = require('fs');
let content = fs.readFileSync('src/components/InWorkoutMusicWidget.tsx', 'utf8');

content = content.replace(
  "  if (!currentSong) return null;",
  "  if (!currentSong) return <View style={{ display: 'none' }} />;"
);

fs.writeFileSync('src/components/InWorkoutMusicWidget.tsx', content);
