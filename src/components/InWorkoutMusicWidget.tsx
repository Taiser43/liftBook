import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  LayoutAnimation, 
  Platform, 
  UIManager, 
  Vibration,
  Animated,
  PanResponder
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import TrackPlayer, { useProgress, usePlaybackState, useActiveTrack, State } from 'react-native-track-player';
import { useMusicStore, Song } from '../store/useMusicStore';
import { useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';
import PowerSongSelectorModal from './PowerSongSelectorModal';
import { getResolvedUri } from '../utils/uriResolver';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export interface InWorkoutMusicWidgetProps {
  onExpandChange?: (expanded: boolean) => void;
}

export default function InWorkoutMusicWidget({ onExpandChange }: InWorkoutMusicWidgetProps = {}) {
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);
  const { 
    currentSongId, 
    currentPlaylistId, 
    playlists, 
    playNext, 
    playPrevious, 
    setIsPlaying, 
    powerSong, 
    setCurrentSong, 
    currentQueueSong 
  } = useMusicStore();
  const progress = useProgress();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;
  
  const [expanded, setExpanded] = useState(false);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [slidingPos, setSlidingPos] = useState<number | null>(null);

  const panX = useRef(new Animated.Value(0)).current;
  const expandedRef = useRef(expanded);
  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = !expanded;
    setExpanded(next);
    onExpandChange?.(next);
  };

  const activeTrack = useActiveTrack();
  const currentPlaylist = useMusicStore(state => state.getCurrentPlaylist?.() || null);
  const currentSong = useMusicStore(state => state.getCurrentSong?.() || null);

  const effectiveSong: Song | null = currentSong || (activeTrack ? {
    id: activeTrack.id,
    title: activeTrack.title || 'Unknown Title',
    artist: activeTrack.artist || 'Unknown Artist',
    coverUri: activeTrack.artwork as string,
    durationMillis: activeTrack.duration ? activeTrack.duration * 1000 : 180000,
    uri: activeTrack.url,
    playCount: 1,
    playHistory: [],
  } as Song : null);

  const togglePlayPause = async (e?: any) => {
    e?.stopPropagation?.();
    try {
      if (isPlaying) {
        await TrackPlayer.pause();
        setIsPlaying(false);
      } else {
        if (!effectiveSong && playlists.length > 0 && playlists[0].songs.length > 0) {
          setCurrentSong(playlists[0].id, playlists[0].songs[0].id);
        }
        await TrackPlayer.play();
        setIsPlaying(true);
      }
    } catch(err) {
      console.warn(err);
    }
  };

  const skipNext = async (e?: any) => {
    e?.stopPropagation?.();
    Vibration.vibrate(30);
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
    } catch (err) {}
    playNext();
  };

  const skipPrevious = async (e?: any) => {
    e?.stopPropagation?.();
    Vibration.vibrate(30);
    try {
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      if (activeIndex !== null && activeIndex !== undefined && activeIndex > 0) {
        const queue = await TrackPlayer.getQueue();
        const prevTrack = queue[activeIndex - 1];
        if (prevTrack && prevTrack.id) {
          useMusicStore.setState({ currentSongId: prevTrack.id, currentQueueSong: null, isPlaying: true });
        }
        await TrackPlayer.skipToPrevious();
        return;
      }
    } catch (err) {}
    playPrevious();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (_, gestureState) => 
        !expandedRef.current && 
        Math.abs(gestureState.dx) > 15 && 
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onMoveShouldSetPanResponder: (_, gestureState) => 
        !expandedRef.current && 
        Math.abs(gestureState.dx) > 15 && 
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderMove: (_, gestureState) => {
        if (!expandedRef.current) {
          panX.setValue(gestureState.dx * 0.4);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!expandedRef.current) {
          if (gestureState.dx < -50) {
            skipNext();
          } else if (gestureState.dx > 50) {
            skipPrevious();
          }
        }
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 12,
          speed: 20,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 12,
          speed: 20,
        }).start();
      },
    })
  ).current;

  const handleSeekBackward = async (e?: any) => {
    e?.stopPropagation?.();
    const newPos = Math.max(0, progress.position - 15);
    setSlidingPos(newPos);
    await TrackPlayer.seekTo(newPos);
    setTimeout(() => setSlidingPos(null), 300);
  };

  const handleSeekForward = async (e?: any) => {
    e?.stopPropagation?.();
    const newPos = Math.min(progress.duration, progress.position + 30);
    setSlidingPos(newPos);
    await TrackPlayer.seekTo(newPos);
    setTimeout(() => setSlidingPos(null), 300);
  };

  const handleTriggerPowerSong = async (e?: any) => {
    e?.stopPropagation?.();
    if (!powerSong) {
      setSelectorVisible(true);
      return;
    }
    try {
      Vibration.vibrate([0, 100, 50, 100]);
      setCurrentSong(powerSong.playlistId, powerSong.songId);
      setIsPlaying(true);
      setTimeout(async () => {
        try {
          await TrackPlayer.seekTo(powerSong.startPosition);
        } catch (err) {}
      }, 700);
    } catch (err) {
      console.warn(err);
    }
  };

  const handlePlaylistSelect = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist && playlist.songs.length > 0) {
      setCurrentSong(playlistId, playlist.songs[0].id);
      setIsPlaying(true);
      TrackPlayer.play();
    }
  };

  const coverUrl = effectiveSong?.coverUri || currentPlaylist?.coverUri;

  return (
    <Animated.View 
      {...panResponder.panHandlers}
      style={[
        styles.container, 
        { 
          backgroundColor: theme.subCardBg, 
          borderColor: isPlaying ? theme.accentBorder : theme.subtleBorder,
          borderWidth: 1.5,
          transform: [{ translateX: panX }],
        }
      ]}
    >
      <PowerSongSelectorModal visible={selectorVisible} onClose={() => setSelectorVisible(false)} />
      
      {/* Top Header Row: Cover, Info, Controls */}
      <View style={styles.topRow}>
        {/* Left: Thumbnail & Song Info */}
        <TouchableOpacity 
          style={styles.songInfoContainer}
          activeOpacity={0.7}
          onPress={toggleExpand}
        >
          <View style={[styles.musicIconBg, { borderColor: theme.accentBorderSoft, borderWidth: 1 }]}>
            {coverUrl ? (
              <Image source={{ uri: getResolvedUri(coverUrl) }} style={styles.coverImage} />
            ) : (
              <MaterialCommunityIcons name="music-note" size={18} color={theme.accent} />
            )}
          </View>

          <View style={styles.textColumn}>
            <Text style={styles.musicTitle} numberOfLines={1}>
              {effectiveSong?.title || currentPlaylist?.name || 'Workout Musik'}
            </Text>
            <Text style={styles.musicArtist} numberOfLines={1}>
              {effectiveSong?.artist || (playlists.length > 0 ? `${playlists.length} Playlists verfügbar` : 'Tippen zum Abspielen')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right: Quick Action Controls */}
        <View style={styles.quickControls}>
          {/* 15s Seek Backward */}
          <TouchableOpacity 
            style={[styles.miniControlBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]} 
            onPress={handleSeekBackward}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="rewind-15" size={18} color="#FFF" />
          </TouchableOpacity>

          {/* Previous Track (Expanded only) */}
          {expanded && (
            <TouchableOpacity 
              style={[styles.miniControlBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]} 
              onPress={skipPrevious}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="skip-previous" size={18} color="#FFF" />
            </TouchableOpacity>
          )}

          {/* Play / Pause Main Button */}
          <TouchableOpacity 
            style={[styles.mainPlayBtn, { backgroundColor: theme.accent }]} 
            onPress={togglePlayPause}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name={isPlaying ? "pause" : "play"} size={20} color="#000" />
          </TouchableOpacity>

          {/* Next Track (Expanded only) */}
          {expanded && (
            <TouchableOpacity 
              style={[styles.miniControlBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]} 
              onPress={skipNext}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="skip-next" size={18} color="#FFF" />
            </TouchableOpacity>
          )}

          {/* 30s Seek Forward */}
          <TouchableOpacity 
            style={[styles.miniControlBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]} 
            onPress={handleSeekForward}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="fast-forward-30" size={18} color="#FFF" />
          </TouchableOpacity>

          {/* PowerSong Quick Button */}
          <TouchableOpacity 
            style={[
              styles.powerSongBtn, 
              { 
                backgroundColor: 'rgba(255, 214, 10, 0.16)', 
                borderColor: 'rgba(255, 214, 10, 0.45)',
                borderWidth: 1,
              }
            ]} 
            onPress={handleTriggerPowerSong}
            onLongPress={() => setSelectorVisible(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="lightning-bolt" size={19} color="#FFD60A" />
          </TouchableOpacity>

          {/* Expand / Collapse Chevron */}
          <TouchableOpacity 
            style={[styles.expandToggleBtn, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorderSoft, borderWidth: 1 }]} 
            onPress={toggleExpand}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name={expanded ? "chevron-up" : "chevron-down"} 
              size={18} 
              color={theme.accent} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Middle Row: Spulen / Scrubbing Slider & Time Row */}
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={progress.duration && progress.duration > 0 ? progress.duration : 1}
          value={slidingPos !== null ? slidingPos : progress.position}
          minimumTrackTintColor={theme.accent}
          maximumTrackTintColor="rgba(255,255,255,0.15)"
          thumbTintColor={theme.accent}
          onSlidingStart={() => setSlidingPos(progress.position)}
          onValueChange={(val) => setSlidingPos(val)}
          onSlidingComplete={async (val) => {
            setSlidingPos(val);
            await TrackPlayer.seekTo(val);
            setTimeout(() => setSlidingPos(null), 300);
          }}
        />
        <View style={styles.timeRow}>
          <Text style={[styles.timeText, { color: theme.accent }]}>
            {formatTime(slidingPos !== null ? slidingPos : progress.position)}
          </Text>
          <Text style={styles.timeText}>
            {formatTime(progress.duration)}
          </Text>
        </View>
      </View>

      {/* Expanded Section: Playlist Switcher */}
      {expanded && playlists && playlists.length > 0 && (
        <View style={[styles.playlistSection, { borderTopColor: theme.subtleBorder }]}>
          <View style={styles.playlistHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="playlist-music-outline" size={15} color={theme.accent} style={{ marginRight: 5 }} />
              <Text style={styles.playlistSectionTitle}>PLAYLIST WECHSELN</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectorVisible(true)} style={{ padding: 4 }}>
              <Text style={[styles.powerSongConfigText, { color: '#FFD60A' }]}>⚡ PowerSong wählen</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.playlistScrollContent}
          >
            {playlists.map(pl => {
              const isActive = currentPlaylistId === pl.id;
              return (
                <TouchableOpacity 
                  key={pl.id} 
                  style={[
                    styles.playlistChip, 
                    { 
                      backgroundColor: isActive ? theme.accentSoftBg : '#1E1E26',
                      borderColor: isActive ? theme.accent : theme.subtleBorder,
                      borderWidth: 1.5,
                    }
                  ]}
                  onPress={() => handlePlaylistSelect(pl.id)}
                  activeOpacity={0.7}
                >
                  {pl.coverUri ? (
                    <Image source={{ uri: getResolvedUri(pl.coverUri) }} style={styles.playlistCover} />
                  ) : (
                    <MaterialCommunityIcons 
                      name="playlist-music" 
                      size={15} 
                      color={isActive ? theme.accent : "#888"} 
                      style={{ marginRight: 5 }} 
                    />
                  )}
                  <Text style={[
                    styles.playlistName, 
                    { color: isActive ? '#FFFFFF' : '#AAA', fontWeight: isActive ? '800' : '600' }
                  ]}>
                    {pl.name}
                  </Text>
                  {isActive && (
                    <View style={[styles.activeDot, { backgroundColor: theme.accent }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    marginHorizontal: 10,
    marginTop: 6,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  songInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  musicIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  textColumn: {
    marginLeft: 9,
    flex: 1,
    justifyContent: 'center',
  },
  musicTitle: {
    color: '#FFF',
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  musicArtist: {
    color: '#8E8E93',
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '600',
  },
  quickControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  miniControlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  powerSongBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandToggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  sliderContainer: {
    marginTop: 4,
    width: '100%',
  },
  slider: {
    width: '100%',
    height: 20,
    marginVertical: -2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -2,
  },
  timeText: {
    color: '#888892',
    fontSize: 10.5,
    fontWeight: '700',
  },
  playlistSection: {
    marginTop: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  playlistHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  playlistSectionTitle: {
    color: '#888892',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  powerSongConfigText: {
    fontSize: 11,
    fontWeight: '800',
  },
  playlistScrollContent: {
    paddingRight: 10,
    gap: 8,
  },
  playlistChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  playlistCover: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 6,
  },
  playlistName: {
    fontSize: 12.5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
});
