const fs = require('fs');
let content = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

content = content.replace(
  /const handlePlayPause = async \(\) => \{\s*if \(isCurrentlyPlaying\) \{\s*await TrackPlayer\.pause\(\);\s*setIsPlaying\(false\);\s*\} else \{\s*await TrackPlayer\.play\(\);\s*setIsPlaying\(true\);\s*\}\s*\};/g,
  `const handlePlayPause = async () => {
    try {
      if (isCurrentlyPlaying) {
        await TrackPlayer.pause();
        setIsPlaying(false);
      } else {
        await TrackPlayer.play();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn("Play/Pause error:", e);
      Alert.alert("Playback Error", "The song could not be played. It might have been deleted or corrupted.");
    }
  };`
);

fs.writeFileSync('src/components/MediaPlayerWidget.tsx', content, 'utf8');
