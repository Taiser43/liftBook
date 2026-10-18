const fs = require('fs');
let code = fs.readFileSync('src/components/PlaylistModal.tsx', 'utf8');

const oldMix = `  const handleMix = () => {
    if (!isShuffle) toggleShuffle();
    if (playlist.songs.length > 0) {
      const randomIndex = Math.floor(Math.random() * playlist.songs.length);
      setCurrentSong(playlist.id, playlist.songs[randomIndex].id);
    }
  };`;

const newMix = `  const handleMix = () => {
    if (!isShuffle) toggleShuffle();
    if (playlist.songs.length > 0) {
      const randomIndex = Math.floor(Math.random() * playlist.songs.length);
      setCurrentSong(playlist.id, playlist.songs[randomIndex].id);
      useMusicStore.getState().setIsPlaying(true);
    }
  };`;

const oldPlayAll = `  const handlePlayAll = () => {
    if (isShuffle) toggleShuffle();
    if (playlist.songs.length > 0) {
      setCurrentSong(playlist.id, playlist.songs[0].id);
    }
  };`;

const newPlayAll = `  const handlePlayAll = () => {
    if (isShuffle) toggleShuffle();
    if (playlist.songs.length > 0) {
      setCurrentSong(playlist.id, playlist.songs[0].id);
      useMusicStore.getState().setIsPlaying(true);
    }
  };`;

code = code.replace(oldMix, newMix).replace(oldPlayAll, newPlayAll);
fs.writeFileSync('src/components/PlaylistModal.tsx', code);
console.log("Patched Play All and Mix");
