const fs = require('fs');
let code = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

// 1. Add isReady state
code = code.replace(
  "const spinAnim = useRef(new Animated.Value(0)).current;",
  "const spinAnim = useRef(new Animated.Value(0)).current;\n  const [isReady, setIsReady] = useState(false);"
);

// 2. Await setupPlayer
code = code.replace(
  "  useEffect(() => {\n    setupPlayer();\n  }, []);",
  "  useEffect(() => {\n    setupPlayer().then(() => setIsReady(true));\n  }, []);"
);

// 3. Update loadTrack to depend on isReady
const oldLoadTrackEffect = `  useEffect(() => {
    if (currentSongId || currentQueueSong) {`;

const newLoadTrackEffect = `  useEffect(() => {
    if (!isReady) return;
    if (currentSongId || currentQueueSong) {`;

code = code.replace(oldLoadTrackEffect, newLoadTrackEffect);

// 4. Update dependencies of loadTrack
code = code.replace(
  "  }, [currentSongId, currentQueueSong, currentPlaylistId, isPlaying]);",
  "  }, [currentSongId, currentQueueSong, currentPlaylistId, isPlaying, isReady]);"
);

fs.writeFileSync('src/components/MediaPlayerWidget.tsx', code);
console.log("Patched player initialization");
