const fs = require('fs');
let code = fs.readFileSync('src/components/PlaylistModal.tsx', 'utf8');

const target = `  const handlePlaySong = (songId: string) => {
    setCurrentSong(playlist.id, songId);
  };`;

const newTarget = `  const handlePlaySong = (songId: string) => {
    setCurrentSong(playlist.id, songId);
    useMusicStore.getState().setIsPlaying(true);
  };`;

code = code.replace(target, newTarget);
fs.writeFileSync('src/components/PlaylistModal.tsx', code);
console.log("Patched handlePlaySong");
