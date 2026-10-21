import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TrackPlayer, {
  State,
  usePlaybackState,
  useProgress,
  useActiveTrack,
} from 'react-native-track-player';
import Slider from '@react-native-community/slider';
import { useMusicStore, Song } from '../../store/useMusicStore';
import { getResolvedUri } from '../../utils/uriResolver';
import { triggerLight } from '../../utils/haptics';

interface IronTacticsTopMusicBarProps {
  visible: boolean;
  onClose: () => void;
}

export const IronTacticsTopMusicBar: React.FC<IronTacticsTopMusicBarProps> = ({
  visible,
  onClose,
}) => {
  const { isPlaying: storeIsPlaying, setIsPlaying, playNext, playPrevious } = useMusicStore();
  const playbackState = usePlaybackState();
  const progress = useProgress(500);
  const activeTrack = useActiveTrack();
  const currentSong = useMusicStore(state => state.getCurrentSong?.() || null);
  const currentPlaylist = useMusicStore(state => state.getCurrentPlaylist?.() || null);

  const [slidingPos, setSlidingPos] = useState<number | null>(null);

  // Animation for drop-down from top
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        setRendered(false);
      });
    }
  }, [visible]);

  const isPlaying = playbackState.state === State.Playing;

  // Resolve current song data smoothly
  const effectiveSong: Song | null = (() => {
    if (activeTrack && activeTrack.id && (!currentSong || currentSong.id !== activeTrack.id)) {
      const store = useMusicStore.getState();
      const match =
        store.getCurrentPlaylist()?.songs.find(s => s.id === activeTrack.id) ||
        store.activeStreamPlaylist?.songs.find(s => s.id === activeTrack.id) ||
        store.playlists.flatMap(p => p.songs).find(s => s.id === activeTrack.id) ||
        store.favoriteSongs?.find(s => s.id === activeTrack.id);
      if (match) return match;

      return {
        id: activeTrack.id,
        title: activeTrack.title || 'Unknown Title',
        artist: activeTrack.artist || 'Unknown Artist',
        coverUri: activeTrack.artwork as string,
        durationMillis: activeTrack.duration ? activeTrack.duration * 1000 : 180000,
        uri: activeTrack.url,
        playCount: 1,
        playHistory: [],
      } as Song;
    }
    return (
      currentSong ||
      (activeTrack
        ? ({
            id: activeTrack.id,
            title: activeTrack.title || 'Unknown Title',
            artist: activeTrack.artist || 'Unknown Artist',
            coverUri: activeTrack.artwork as string,
            durationMillis: activeTrack.duration ? activeTrack.duration * 1000 : 180000,
            uri: activeTrack.url,
            playCount: 1,
            playHistory: [],
          } as Song)
        : null)
    );
  })();

  const togglePlayPause = async () => {
    triggerLight();
    if (isPlaying) {
      setIsPlaying(false);
      await TrackPlayer.pause();
    } else {
      setIsPlaying(true);
      await TrackPlayer.play();
    }
  };

  const handleSkipNext = async () => {
    triggerLight();
    try {
      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      if (
        queue &&
        activeIndex !== null &&
        activeIndex !== undefined &&
        activeIndex + 1 < queue.length
      ) {
        const nextTrack = queue[activeIndex + 1];
        if (nextTrack && nextTrack.id) {
          useMusicStore.setState({ currentSongId: nextTrack.id, currentQueueSong: null, isPlaying: true });
        }
        await TrackPlayer.skipToNext();
        return;
      }
    } catch (e) {}
    playNext();
  };

  const handleSkipPrevious = async () => {
    triggerLight();
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
    playPrevious();
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!rendered) {
    return null;
  }

  const coverUri = effectiveSong?.coverUri || currentPlaylist?.coverUri;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.topContainer,
        {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-150, 0],
              }),
            },
          ],
          opacity: slideAnim,
        },
      ]}
    >
      <View style={styles.contentCard}>
        {/* Top row: Artwork, title/artist, play controls, close button */}
        <View style={styles.mainRow}>
          <View style={styles.artworkContainer}>
            {coverUri ? (
              <Image source={{ uri: getResolvedUri(coverUri) }} style={styles.artworkImage} />
            ) : (
              <View style={styles.artworkFallback}>
                <MaterialCommunityIcons name="music-note" size={20} color="#00D2FF" />
              </View>
            )}
          </View>

          <View style={styles.metaContainer}>
            <Text style={styles.titleText} numberOfLines={1}>
              {effectiveSong?.title || 'Keine Wiedergabe'}
            </Text>
            <Text style={styles.artistText} numberOfLines={1}>
              {effectiveSong?.artist || 'Wähle einen Track aus'}
            </Text>
          </View>

          {/* Quick Controls */}
          <View style={styles.controlsGroup}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleSkipPrevious}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <MaterialCommunityIcons name="skip-previous" size={20} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playPauseBtn}
              onPress={togglePlayPause}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={isPlaying ? 'pause' : 'play'}
                size={20}
                color="#000"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleSkipNext}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <MaterialCommunityIcons name="skip-next" size={20} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => {
                triggerLight();
                onClose();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <MaterialCommunityIcons name="chevron-up" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom row: Mini Slider & Times */}
        <View style={styles.sliderRow}>
          <Text style={styles.timeLabel}>
            {formatTime(slidingPos !== null ? slidingPos : progress.position)}
          </Text>
          <View style={styles.sliderWrapper}>
            <Slider
              style={{ width: '100%', height: 20 }}
              minimumValue={0}
              maximumValue={progress.duration || (effectiveSong ? (effectiveSong.durationMillis || 180000) / 1000 : 180)}
              value={slidingPos !== null ? slidingPos : progress.position}
              minimumTrackTintColor="#00D2FF"
              maximumTrackTintColor="rgba(255, 255, 255, 0.15)"
              thumbTintColor="#00D2FF"
              onSlidingStart={() => setSlidingPos(progress.position)}
              onValueChange={val => setSlidingPos(val)}
              onSlidingComplete={async val => {
                setSlidingPos(val);
                try {
                  await TrackPlayer.seekTo(val);
                } catch (e) {}
                setSlidingPos(null);
              }}
            />
          </View>
          <Text style={styles.timeLabel}>
            {formatTime(progress.duration || (effectiveSong ? (effectiveSong.durationMillis || 180000) / 1000 : 0))}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  topContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  contentCard: {
    backgroundColor: '#161622',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 12,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artworkContainer: {
    width: 38,
    height: 38,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  artworkFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaContainer: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
    justifyContent: 'center',
  },
  titleText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  artistText: {
    color: '#8E8E9F',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  controlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlBtn: {
    padding: 4,
  },
  playPauseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#00D2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 2,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    paddingHorizontal: 2,
  },
  sliderWrapper: {
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  timeLabel: {
    color: '#777',
    fontSize: 10,
    fontWeight: '600',
    minWidth: 26,
    textAlign: 'center',
  },
});
