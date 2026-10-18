const fs = require('fs');
let code = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

code = code.replace(/TrackPlayer\.getCurrentTrack\(\)/g, "TrackPlayer.getActiveTrackIndex()");
fs.writeFileSync('src/components/MediaPlayerWidget.tsx', code);
console.log("Fixed getCurrentTrack error");
