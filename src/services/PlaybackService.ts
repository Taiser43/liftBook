// [AGENT CONTEXT] This service runs in a background thread even when the app is minimized.
// It handles remote control events from the lock screen (Play/Pause/Next/Previous).
// It MUST be a separate module and MUST be registered at the very top of index.ts.
import TrackPlayer, { Event } from 'react-native-track-player';
import { useMusicStore } from '../store/useMusicStore';

export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    try {
      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      if (queue && activeIndex !== null && activeIndex !== undefined && activeIndex + 1 < queue.length) {
        const nextTrack = queue[activeIndex + 1];
        if (nextTrack && nextTrack.id) {
          useMusicStore.setState({ currentSongId: nextTrack.id, currentQueueSong: null, isPlaying: true });
        }
        await TrackPlayer.skipToNext();
        return;
      }
    } catch (e) {}
    useMusicStore.getState().playNext();
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try {
      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      if (queue && activeIndex !== null && activeIndex !== undefined && activeIndex > 0) {
        const prevTrack = queue[activeIndex - 1];
        if (prevTrack && prevTrack.id) {
          useMusicStore.setState({ currentSongId: prevTrack.id, currentQueueSong: null, isPlaying: true });
        }
        await TrackPlayer.skipToPrevious();
        return;
      }
    } catch (e) {}
    useMusicStore.getState().playPrevious();
  });
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());

  // Background active track synchronizer
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
    if (event.track && event.track.id) {
      const state = useMusicStore.getState();
      if (state.currentSongId !== event.track.id) {
        useMusicStore.setState({ currentSongId: event.track.id, currentQueueSong: null, isPlaying: true });
      }
    }
  });
}
