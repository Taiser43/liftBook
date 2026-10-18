const fs = require('fs');
let code = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

const regex = /\}, \[currentSongId, currentQueueSong\]\);/g;
code = code.replace(regex, "}, [currentSongId, currentQueueSong, isReady]);");

fs.writeFileSync('src/components/MediaPlayerWidget.tsx', code);
console.log("Fixed dependencies!");
