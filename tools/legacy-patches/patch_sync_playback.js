const fs = require('fs');
let code = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

const oldSync = `  useEffect(() => {
    const syncPlayback = async () => {
      try {
        if (isPlaying && playbackState.state !== State.Playing) {
          await TrackPlayer.play();
        } else if (!isPlaying && playbackState.state === State.Playing) {
          await TrackPlayer.pause();
        }
      } catch (e) {}
    };
    syncPlayback();
  }, [isPlaying]);`;

const newSync = `  useEffect(() => {
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

code = code.replace(oldSync, newSync);
fs.writeFileSync('src/components/MediaPlayerWidget.tsx', code);
console.log("Patched syncPlayback");
