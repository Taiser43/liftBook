const fs = require('fs');
let content = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

// 1. Replace the problematic state sync effect
const oldStateSync = `  // Sync the zustand isPlaying state with actual player state
  useEffect(() => {
    if (isCurrentlyPlaying !== isPlaying) {
      setIsPlaying(isCurrentlyPlaying);
    }
  }, [isCurrentlyPlaying]);`;

const newStateSync = `  // Sync the zustand isPlaying state with actual player state, but ONLY for definitive states
  useEffect(() => {
    if (playbackState.state === State.Playing && !isPlaying) {
      setIsPlaying(true);
    } else if ((playbackState.state === State.Paused || playbackState.state === State.Stopped) && isPlaying) {
      setIsPlaying(false);
    }
  }, [playbackState.state, isPlaying, setIsPlaying]);`;

content = content.replace(oldStateSync, newStateSync);

// 2. Remove the destructive syncPlayback effect
const oldSyncPlayback = `  // Handle play/pause toggle from Zustand
  useEffect(() => {
    const syncPlayback = async () => {
      if (!isReady) return;
      try {
        if (isPlaying && playbackState.state !== State.Playing) {
          await TrackPlayer.play();
        } else if (!isPlaying && playbackState.state === State.Playing) {
          await TrackPlayer.pause();
        }
      } catch (e) {}
    };
    syncPlayback();
  }, [isPlaying, isReady]);`;

content = content.replace(oldSyncPlayback, "");

fs.writeFileSync('src/components/MediaPlayerWidget.tsx', content);
