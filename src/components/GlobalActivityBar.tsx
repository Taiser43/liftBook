import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';

import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, Animated, Easing, PanResponder, UIManager, LayoutAnimation, ActivityIndicator, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/store';
import { useLiveWorkoutStore } from '../store/useLiveWorkoutStore';

import { useCardioStore } from '../store/useCardioStore';
import { useMusicStore, Song } from '../store/useMusicStore';
import { getHeartRateZoneColor } from '../utils/heartRate';
import { hideActiveWorkoutNotification } from '../services/notificationService';
import TrackPlayer, { State, usePlaybackState, useProgress, useActiveTrack, Event } from 'react-native-track-player';
import Slider from '@react-native-community/slider';
import Svg, { Path } from 'react-native-svg';
import { getAppTheme } from '../utils/theme';


if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const { width } = Dimensions.get('window');

const getCardioIcon = (type: string) => {
  if (type === 'Cycling') return 'bike';
  if (type === 'Swimming') return 'swim';
  if (type === 'Rowing') return 'rowing';
  return 'run';
};

const PATH_DEEP = 'M 0 42 C 50.9 27.3, 69.1 27.3, 120.0 42 C 170.9 56.7, 189.1 56.7, 240.0 42 C 290.9 27.3, 309.1 27.3, 360.0 42 C 410.9 56.7, 429.1 56.7, 480.0 42 C 530.9 27.3, 549.1 27.3, 600.0 42 C 650.9 56.7, 669.1 56.7, 720.0 42 C 770.9 27.3, 789.1 27.3, 840.0 42 C 890.9 56.7, 909.1 56.7, 960.0 42 C 1010.9 27.3, 1029.1 27.3, 1080.0 42 C 1130.9 56.7, 1149.1 56.7, 1200.0 42 C 1250.9 27.3, 1269.1 27.3, 1320.0 42 C 1370.9 56.7, 1389.1 56.7, 1440.0 42 C 1490.9 27.3, 1509.1 27.3, 1560.0 42 C 1610.9 56.7, 1629.1 56.7, 1680.0 42 C 1730.9 27.3, 1749.1 27.3, 1800.0 42 C 1850.9 56.7, 1869.1 56.7, 1920.0 42 C 1970.9 27.3, 1989.1 27.3, 2040.0 42 C 2090.9 56.7, 2109.1 56.7, 2160.0 42 C 2210.9 27.3, 2229.1 27.3, 2280.0 42 C 2330.9 56.7, 2349.1 56.7, 2400.0 42 L 2400.0 68 L 0 68 Z';
const PATH_MID = 'M 0 38 C 38.2 19.3, 51.8 19.3, 90.0 38 C 128.2 56.7, 141.8 56.7, 180.0 38 C 218.2 19.3, 231.8 19.3, 270.0 38 C 308.2 56.7, 321.8 56.7, 360.0 38 C 398.2 19.3, 411.8 19.3, 450.0 38 C 488.2 56.7, 501.8 56.7, 540.0 38 C 578.2 19.3, 591.8 19.3, 630.0 38 C 668.2 56.7, 681.8 56.7, 720.0 38 C 758.2 19.3, 771.8 19.3, 810.0 38 C 848.2 56.7, 861.8 56.7, 900.0 38 C 938.2 19.3, 951.8 19.3, 990.0 38 C 1028.2 56.7, 1041.8 56.7, 1080.0 38 C 1118.2 19.3, 1131.8 19.3, 1170.0 38 C 1208.2 56.7, 1221.8 56.7, 1260.0 38 C 1298.2 19.3, 1311.8 19.3, 1350.0 38 C 1388.2 56.7, 1401.8 56.7, 1440.0 38 C 1478.2 19.3, 1491.8 19.3, 1530.0 38 C 1568.2 56.7, 1581.8 56.7, 1620.0 38 C 1658.2 19.3, 1671.8 19.3, 1710.0 38 C 1748.2 56.7, 1761.8 56.7, 1800.0 38 C 1838.2 19.3, 1851.8 19.3, 1890.0 38 C 1928.2 56.7, 1941.8 56.7, 1980.0 38 C 2018.2 19.3, 2031.8 19.3, 2070.0 38 C 2108.2 56.7, 2121.8 56.7, 2160.0 38 C 2198.2 19.3, 2211.8 19.3, 2250.0 38 C 2288.2 56.7, 2301.8 56.7, 2340.0 38 L 2340.0 68 L 0 68 Z';
const PATH_CREST = 'M 0 36 C 29.7 20.0, 40.3 20.0, 70.0 36 C 99.7 52.0, 110.3 52.0, 140.0 36 C 169.7 20.0, 180.3 20.0, 210.0 36 C 239.7 52.0, 250.3 52.0, 280.0 36 C 309.7 20.0, 320.3 20.0, 350.0 36 C 379.7 52.0, 390.3 52.0, 420.0 36 C 449.7 20.0, 460.3 20.0, 490.0 36 C 519.7 52.0, 530.3 52.0, 560.0 36 C 589.7 20.0, 600.3 20.0, 630.0 36 C 659.7 52.0, 670.3 52.0, 700.0 36 C 729.7 20.0, 740.3 20.0, 770.0 36 C 799.7 52.0, 810.3 52.0, 840.0 36 C 869.7 20.0, 880.3 20.0, 910.0 36 C 939.7 52.0, 950.3 52.0, 980.0 36 C 1009.7 20.0, 1020.3 20.0, 1050.0 36 C 1079.7 52.0, 1090.3 52.0, 1120.0 36 C 1149.7 20.0, 1160.3 20.0, 1190.0 36 C 1219.7 52.0, 1230.3 52.0, 1260.0 36 C 1289.7 20.0, 1300.3 20.0, 1330.0 36 C 1359.7 52.0, 1370.3 52.0, 1400.0 36 C 1429.7 20.0, 1440.3 20.0, 1470.0 36 C 1499.7 52.0, 1510.3 52.0, 1540.0 36 C 1569.7 20.0, 1580.3 20.0, 1610.0 36 C 1639.7 52.0, 1650.3 52.0, 1680.0 36 C 1709.7 20.0, 1720.3 20.0, 1750.0 36 C 1779.7 52.0, 1790.3 52.0, 1820.0 36 C 1849.7 20.0, 1860.3 20.0, 1890.0 36 C 1919.7 52.0, 1930.3 52.0, 1960.0 36 C 1989.7 20.0, 2000.3 20.0, 2030.0 36 C 2059.7 52.0, 2070.3 52.0, 2100.0 36 C 2129.7 20.0, 2140.3 20.0, 2170.0 36 C 2199.7 52.0, 2210.3 52.0, 2240.0 36 C 2269.7 20.0, 2280.3 20.0, 2310.0 36 C 2339.7 52.0, 2350.3 52.0, 2380.0 36';

interface LiquidSineWavesProps {
  isPlaying: boolean;
  isBuffering: boolean;
  accentRgb: string;
}

const LiquidSineWaves = React.memo(({ isPlaying, isBuffering, accentRgb }: LiquidSineWavesProps) => {
  // 🌊 Loops 0 -> 1 for Left-to-Right wave swimming (continuous flow)
  const loopDeep = React.useRef(new Animated.Value(0)).current;
  const loopMid = React.useRef(new Animated.Value(0)).current;
  const loopCrest = React.useRef(new Animated.Value(0)).current;
  const loopBeat = React.useRef(new Animated.Value(0)).current;
  const playStateAnim = React.useRef(new Animated.Value(isPlaying ? 1 : 0)).current;

  useEffect(() => {
    // Left-to-Right translation: from -wavelength to 0 moves the wave towards +X (Left -> Right!)
    const animDeep = Animated.loop(
      Animated.timing(loopDeep, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const animMid = Animated.loop(
      Animated.timing(loopMid, {
        toValue: 1,
        duration: 2100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const animCrest = Animated.loop(
      Animated.timing(loopCrest, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    // Subtle rhythmic vertical beat pulse (smooth breathing swell)
    const animBeat = Animated.loop(
      Animated.timing(loopBeat, {
        toValue: 1,
        duration: 580,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animDeep.start();
    animMid.start();
    animCrest.start();
    animBeat.start();

    return () => {
      animDeep.stop();
      animMid.stop();
      animCrest.stop();
      animBeat.stop();
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      Animated.timing(playStateAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(playStateAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start();
    }
  }, [isPlaying]);

  // Interpolations:
  // Layer 1: -240 -> 0 (swims Left to Right at steady speed)
  const transDeep = loopDeep.interpolate({
    inputRange: [0, 1],
    outputRange: [-240, 0],
  });
  // Layer 2: -180 -> 0 (swims Left to Right at medium speed)
  const transMid = loopMid.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 0],
  });
  // Layer 3: -140 -> 0 (swims Left to Right at fastest speed for crest flow)
  const transCrest = loopCrest.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 0],
  });
  // Gentle Beat pulse on the crest line: 0 -> -2.2px -> 0
  const beatBounce = loopBeat.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -2.2, 0],
  });

  // Smooth flatten (scaleY) and sink (translateY)
  const scaleY = playStateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.02, 1],
  });

  const translateY = playStateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [38, 0],
  });

  // Smooth disappear to 0 opacity when paused / no music
  const overallOpacity = playStateAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.15, 0.95],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          overflow: 'hidden',
          opacity: overallOpacity,
          transform: [
            { translateY },
            { scaleY },
          ],
        },
      ]}
    >
      {/* Layer 1: Deep Slow Background Wave (Swimming Left -> Right) */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: -300,
          width: 2400,
          height: 68,
          transform: [{ translateX: transDeep }],
        }}
      >
        <Svg width="2400" height="68" viewBox="0 0 2400 68">
          <Path d={PATH_DEEP} fill={`rgba(${accentRgb}, 0.22)`} />
        </Svg>
      </Animated.View>

      {/* Layer 2: Middle Harmonic Fluid Wave (Swimming Left -> Right) */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: -300,
          width: 2340,
          height: 68,
          transform: [{ translateX: transMid }],
        }}
      >
        <Svg width="2340" height="68" viewBox="0 0 2340 68">
          <Path d={PATH_MID} fill={`rgba(${accentRgb}, 0.38)`} />
        </Svg>
      </Animated.View>

      {/* Layer 3: Foreground Crest with Subtle Beat Pulse & Neon Aura (Swimming Left -> Right) */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 0,
          left: -300,
          width: 2380,
          height: 68,
          transform: [
            { translateX: transCrest },
            { translateY: beatBounce },
          ],
        }}
      >
        <Svg width="2380" height="68" viewBox="0 0 2380 68">
          {/* Subtle neon glow under crest */}
          <Path
            d={PATH_CREST}
            fill="none"
            stroke={`rgba(${accentRgb}, 0.45)`}
            strokeWidth={4.5}
            strokeLinecap="round"
          />
          {/* Sharp glowing crest line */}
          <Path
            d={PATH_CREST}
            fill="none"
            stroke={`rgba(${accentRgb}, 0.95)`}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
});

export const GlobalActivityBar = ({ navigationRef }: { navigationRef: any }) => {
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);

  const { 
    globalActivePlan, globalWorkoutDuration, globalWorkoutStartTime, globalRestTimeLeft, globalLiveWorkoutModalVisible,
    setGlobalLiveWorkoutModalVisible, setGlobalActivePlan, setGlobalWorkoutStartTime, setGlobalWorkoutDuration,
    currentHeartRate, connectedDeviceId,
    globalCardioActive, globalCardioModalVisible, setGlobalCardioModalVisible,
    globalCardioActivityType, globalCardioDuration, globalCardioDistance, globalCardioSpeed
  } = useAppStore();

  const { currentSongId, currentPlaylistId, queue, currentQueueSong, playlists, playNext, playPrevious, setIsPlaying } = useMusicStore();
  const storeIsPlaying = useMusicStore(state => state.isPlaying);
  const playbackState = usePlaybackState();
  const isWatchConnected = !!connectedDeviceId;
  const maxHeartRateSetting = useCardioStore(state => state.maxHeartRateSetting) || 190;
  const isPlaying = playbackState.state === State.Playing;
  const isBuffering = playbackState.state === State.Buffering || playbackState.state === State.Loading;
  const isWaveActive = isPlaying && storeIsPlaying;

  // Track navigation route to hide GlobalActivityBar when inside Iron Tactics
  const [currentRouteName, setCurrentRouteName] = useState<string | null>(null);

  useEffect(() => {
    if (!navigationRef) return;
    const updateRoute = () => {
      if (navigationRef.isReady && navigationRef.isReady()) {
        const route = navigationRef.getCurrentRoute();
        setCurrentRouteName(route?.name || null);
      }
    };
    updateRoute();
    const unsubscribe = navigationRef.addListener?.('state', updateRoute);
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [navigationRef]);

  // Derive current song and native active track for 0ms immediate UI sync
  const activeTrack = useActiveTrack();
  const currentPlaylist = useMusicStore(state => state.getCurrentPlaylist?.() || null);
  const currentSong = useMusicStore(state => state.getCurrentSong?.() || null);
  const activeStreamPlaylist = useMusicStore(state => state.activeStreamPlaylist);
  const favoriteSongs = useMusicStore(state => state.favoriteSongs);

  // ⚡ Instant Hybrid Resolution (Memoized to prevent render loops):
  const effectiveSong: Song | null = React.useMemo(() => {
    if (activeTrack && activeTrack.id && (!currentSong || currentSong.id !== activeTrack.id)) {
      const match = currentPlaylist?.songs.find(s => s.id === activeTrack.id) ||
                    activeStreamPlaylist?.songs.find(s => s.id === activeTrack.id) ||
                    playlists.flatMap(p => p.songs).find(s => s.id === activeTrack.id) ||
                    favoriteSongs?.find(s => s.id === activeTrack.id);
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
    return currentSong || (activeTrack ? {
      id: activeTrack.id,
      title: activeTrack.title || 'Unknown Title',
      artist: activeTrack.artist || 'Unknown Artist',
      coverUri: activeTrack.artwork as string,
      durationMillis: activeTrack.duration ? activeTrack.duration * 1000 : 180000,
      uri: activeTrack.url,
      playCount: 1,
      playHistory: [],
    } as Song : null);
  }, [activeTrack?.id, activeTrack?.title, activeTrack?.artist, activeTrack?.artwork, currentSong, currentPlaylist, activeStreamPlaylist, playlists, favoriteSongs]);

  const hasMusic = !!effectiveSong;
  const hasWorkout = !globalLiveWorkoutModalVisible && globalActivePlan !== null && globalWorkoutStartTime !== null;
  const hasCardio = globalCardioActive && !globalCardioModalVisible;

  const isActive = hasMusic || hasWorkout || hasCardio;

  const togglePlayPause = async () => {
    if (isPlaying) {
      setIsPlaying(false);
      await TrackPlayer.pause();
    } else {
      setIsPlaying(true);
      await TrackPlayer.play();
    }
  };

  const [slidingPos, setSlidingPos] = useState<number | null>(null);

  const skipNext = async () => {
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
    playNext();
  };

  const skipPrevious = async () => {
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

  // Marquee Animation for long titles (with threshold check to prevent layout feedback loop)
  const scrollAnim = React.useRef(new Animated.Value(0)).current;
  const textWidthRef = React.useRef(0);
  const [textWidth, setTextWidth] = useState(0);
  const [isMusicExpanded, setIsMusicExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const isMinimizedRef = React.useRef(false);
  const minimizeAnim = React.useRef(new Animated.Value(0)).current;
  const progress = useProgress();

  const handleTitleLayout = React.useCallback((e: any) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (Math.abs(w - textWidthRef.current) > 4) {
      textWidthRef.current = w;
      setTextWidth(w);
    }
  }, []);

  const minimizeBar = () => {
    isMinimizedRef.current = true;
    setIsMinimized(true);
    Animated.spring(minimizeAnim, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 14,
      speed: 16,
    }).start();
  };

  const expandBar = () => {
    isMinimizedRef.current = false;
    setIsMinimized(false);
    Animated.spring(minimizeAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 14,
      speed: 16,
    }).start();
  };

  // ⚡ Reset marquee instantly on track change to prevent old title offset hiding new song!
  useEffect(() => {
    scrollAnim.stopAnimation();
    scrollAnim.setValue(0);
  }, [effectiveSong?.id]);

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (textWidth > width * 0.4) {
      anim = Animated.loop(
        Animated.sequence([
          Animated.delay(2000),
          Animated.timing(scrollAnim, {
            toValue: -textWidth + width * 0.4,
            duration: textWidth * 30, // speed
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.delay(1000),
          Animated.timing(scrollAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      );
      anim.start();
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [textWidth, effectiveSong?.id]);


  const panX = React.useRef(new Animated.Value(0)).current;
  const panY = React.useRef(new Animated.Value(0)).current;

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => 
        (Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) ||
        (gestureState.dy > 20 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)),
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return (Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) ||
               (gestureState.dy > 20 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx));
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isMinimizedRef.current) {
          if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
            panX.setValue(gestureState.dx * 0.4);
          } else if (gestureState.dy > 0) {
            panY.setValue(gestureState.dy * 0.4);
          }
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (!isMinimizedRef.current) {
          if (gestureState.dy > 50 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)) {
            minimizeBar();
          } else if (hasMusic) {
            if (gestureState.dx > 50) {
              skipPrevious();
            } else if (gestureState.dx < -50) {
              skipNext();
            }
          }
        }
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 12,
          speed: 20
        }).start();
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 12,
          speed: 20
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 12,
          speed: 20
        }).start();
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 12,
          speed: 20
        }).start();
      }
    })
  ).current;

  if (!isActive) return null;
  if (currentRouteName === 'IronTactics') return null;


  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View 
        pointerEvents={isMinimized ? 'none' : 'auto'}
        {...panResponder.panHandlers}
        style={[
          { transform: [
              { translateX: panX },
              { translateY: panY },
              { scale: minimizeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] }) },
              { translateY: minimizeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 40] }) },
              { translateX: minimizeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -width/2 + 46] }) }
            ] 
          },
          { opacity: minimizeAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [1, 0, 0] }) },
          styles.container,
          hasMusic && !hasWorkout && !hasCardio && {
            backgroundColor: theme.cardBg || '#1E1E1E',
            borderColor: theme.cardBorder || '#333',
            shadowColor: theme.accent || '#000',
          },
          hasWorkout && isWatchConnected && (currentHeartRate || 0) > 0 && {
            borderColor: getHeartRateZoneColor(currentHeartRate || 0, maxHeartRateSetting) || '#2C2C2E',
            shadowColor: getHeartRateZoneColor(currentHeartRate || 0, maxHeartRateSetting) || 'transparent',
          },
          hasCardio && !hasWorkout && { borderColor: '#30D158' }
        ]}
      >
        <View style={styles.swipeIndicator}>
           <View style={styles.swipeNotch} />
        </View>
          {/* MUSIC SECTION */}
      {hasMusic && (
        <TouchableOpacity 
          style={[styles.musicSection, (hasWorkout || hasCardio) && styles.musicSectionBorder]}
          activeOpacity={0.9}
          onPress={() => {
             LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
             setIsMusicExpanded(!isMusicExpanded);
          }}
        >
          {/* 🌊 Liquid Sine Beat Wave Background Animation */}
          <LiquidSineWaves
            isPlaying={isWaveActive}
            isBuffering={isBuffering}
            accentRgb={theme.accentRgb || '0, 210, 255'}
          />

          <View style={styles.musicRow}>
            <View style={styles.musicLeft}>
              <View style={[styles.musicIconBg, { backgroundColor: theme.accentSoftBg || 'rgba(0, 210, 255, 0.15)' }, (effectiveSong?.coverUri || currentPlaylist?.coverUri) && { padding: 0, backgroundColor: 'transparent' }]}>
                {(effectiveSong?.coverUri || currentPlaylist?.coverUri) ? (
                  <Image source={{ uri: require('../utils/uriResolver').getResolvedUri(effectiveSong.coverUri || currentPlaylist?.coverUri) }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                ) : (
                  <MaterialCommunityIcons name="music-note" size={20} color={theme.accent || "#00D2FF"} />
                )}
              </View>
              <View style={{ marginLeft: 12, width: width * 0.4, overflow: 'hidden' }}>
                <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: scrollAnim }] }}>
                  <Text 
                    style={styles.musicTitle} 
                    numberOfLines={1}
                    onLayout={handleTitleLayout}
                  >
                    {effectiveSong?.title || 'Unknown Title'}
                  </Text>
                </Animated.View>
                <Text style={styles.musicArtist} numberOfLines={1}>
                  {isBuffering ? '⚡ Lädt Stream...' : (effectiveSong?.artist || 'Unknown Artist')}
                </Text>
              </View>
            </View>

            <View style={styles.musicControls}>
              <TouchableOpacity style={styles.controlBtn} onPress={togglePlayPause}>
                {isBuffering ? (
                  <ActivityIndicator size={20} color={theme.accent || "#00D2FF"} />
                ) : (
                  <MaterialCommunityIcons name={isPlaying ? "pause" : "play"} size={26} color="#FFF" />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlBtn} onPress={skipNext}>
                <MaterialCommunityIcons name="skip-next" size={26} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {isMusicExpanded && (
            <View style={styles.expandedSliderArea}>
              <Slider
                style={{ width: '100%', height: 30, marginTop: 8 }}
                minimumValue={0}
                maximumValue={progress.duration || 1}
                value={slidingPos !== null ? slidingPos : progress.position}
                minimumTrackTintColor={theme.accent || "#00D2FF"}
                maximumTrackTintColor="#555"
                thumbTintColor={theme.accent || "#00D2FF"}
                onSlidingStart={() => setSlidingPos(progress.position)}
                onValueChange={(val) => setSlidingPos(val)}
                onSlidingComplete={async (val) => {
                  setSlidingPos(val);
                  await TrackPlayer.seekTo(val);
                  setTimeout(() => setSlidingPos(null), 300);
                }}
              />
              <View style={styles.expandedTimeRow}>
                <Text style={styles.expandedTimeText}>{formatTime(slidingPos !== null ? slidingPos : progress.position)}</Text>
                <Text style={styles.expandedTimeText}>{formatTime(progress.duration)}</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* WORKOUT SECTION */}
      {hasWorkout && (
        <TouchableOpacity 
          style={styles.workoutSection}
          activeOpacity={0.9} 
          onPress={() => {
            if (navigationRef && navigationRef.isReady && navigationRef.isReady()) {
              (navigationRef as any).navigate('MainTabs', { screen: 'Training' });
            }
            setGlobalLiveWorkoutModalVisible(true);
          }}
        >
          <View style={styles.workoutLeft}>
            {!hasMusic && (
              <View style={styles.workoutIconBg}>
                <MaterialCommunityIcons name="dumbbell" size={18} color="#00D2FF" />
              </View>
            )}
            <View style={{ marginLeft: hasMusic ? 4 : 12, flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.pulsingDot, { width: 6, height: 6, borderRadius: 3, marginRight: 6 }]} />
              <Text style={styles.workoutTitle} numberOfLines={1}>{globalActivePlan.name}</Text>
              <Text style={styles.workoutTime}>
                {' • '}{Math.floor(globalWorkoutDuration / 60)}:{(globalWorkoutDuration % 60) < 10 ? '0' : ''}{globalWorkoutDuration % 60}
              </Text>
            </View>
          </View>

          {!hasMusic ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="chevron-up" size={24} color="#888" style={{ marginRight: 16 }} />
              <TouchableOpacity 
                style={{ padding: 4 }}
                onPress={(e) => {
                  e.stopPropagation();
                  useLiveWorkoutStore.getState().setActivePlan(null);
                  useLiveWorkoutStore.getState().setWorkoutStartTime(null);
                  useLiveWorkoutStore.getState().setLiveExercises([]);
                  useLiveWorkoutStore.getState().setSetLogs({});
                  useLiveWorkoutStore.getState().setRestEndTime(null);
                  setGlobalActivePlan(null);
                  setGlobalWorkoutStartTime(null);
                  setGlobalWorkoutDuration(0);
                  setGlobalLiveWorkoutModalVisible(false);
                  hideActiveWorkoutNotification();
                }}
              >
                <MaterialCommunityIcons name="close-circle" size={24} color="#FF453A" />
              </TouchableOpacity>
            </View>
          ) : (
            <MaterialCommunityIcons name="chevron-up" size={20} color="#888" style={{ marginRight: 4 }} />
          )}
        </TouchableOpacity>
      )}

      {/* REST TIMER SUB-BAR (Workout) */}
      {hasWorkout && globalRestTimeLeft !== null && (
        <View style={styles.restBar}>
          <Text style={styles.restText}>
            Rest: {Math.floor(globalRestTimeLeft / 60)}:{(globalRestTimeLeft % 60) < 10 ? '0' : ''}{globalRestTimeLeft % 60}
          </Text>
        </View>
      )}

      {/* CARDIO SECTION */}
      {hasCardio && !hasWorkout && (
        <TouchableOpacity
          style={styles.workoutSection}
          activeOpacity={0.9}
          onPress={() => setGlobalCardioModalVisible(true)}
        >
          <View style={styles.workoutLeft}>
            {!hasMusic && (
              <View style={[styles.workoutIconBg, { backgroundColor: '#0A2A0A' }]}>
                <MaterialCommunityIcons name={getCardioIcon(globalCardioActivityType || 'Running')} size={18} color="#30D158" />
              </View>
            )}
            <View style={{ marginLeft: hasMusic ? 4 : 12, flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.pulsingDot, { width: 6, height: 6, borderRadius: 3, marginRight: 6, backgroundColor: '#30D158' }]} />
              <Text style={[styles.workoutTitle, { color: '#30D158' }]}>{globalCardioActivityType || 'Cardio'}</Text>
              <Text style={styles.workoutTime}>
                {' • '}{Math.floor(globalCardioDuration / 60)}:{globalCardioDuration % 60 < 10 ? '0' : ''}{globalCardioDuration % 60}
                {'  ·  '}
                {(globalCardioDistance / 1000).toFixed(2)} km
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-up" size={hasMusic ? 20 : 24} color="#888" />
        </TouchableOpacity>
      )}
      </Animated.View>
      
      <Animated.View
        pointerEvents={isMinimized ? 'auto' : 'none'}
        style={[
          styles.minimizedContainerStyle,
          hasMusic && !hasWorkout && !hasCardio && {
            backgroundColor: theme.cardBg || '#1E1E1E',
            borderColor: theme.cardBorder || '#333',
            shadowColor: theme.accent || '#000',
          },
          isWatchConnected && hasWorkout && (currentHeartRate || 0) > 0 && {
            borderColor: getHeartRateZoneColor(currentHeartRate || 0, maxHeartRateSetting) || '#2C2C2E',
            shadowColor: getHeartRateZoneColor(currentHeartRate || 0, maxHeartRateSetting) || 'transparent',
          },
          hasCardio && !hasWorkout && { borderColor: '#30D158' },
          { transform: [
              { scale: minimizeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
            ]
          },
          { opacity: minimizeAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] }) }
        ]}
      >
        <TouchableOpacity style={styles.minimizedContent} onPress={expandBar}>
          {hasWorkout ? (
            <MaterialCommunityIcons name="dumbbell" size={24} color="#00D2FF" />
          ) : hasCardio ? (
            <MaterialCommunityIcons name={getCardioIcon(globalCardioActivityType || 'Running')} size={24} color="#30D158" />
          ) : (
            <MaterialCommunityIcons name="music-note" size={24} color={theme.accent || "#00D2FF"} />
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 74,
    left: 16,
    right: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  minimizedContainerStyle: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 74,
    left: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  minimizedContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeIndicator: {
    width: '100%',
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  swipeNotch: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  musicSection: {
    padding: 12,
    flexDirection: 'column',
    alignItems: 'stretch',
    position: 'relative',
    overflow: 'hidden',
  },
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandedSliderArea: {
    marginTop: 4,
    paddingHorizontal: 4,
  },
  expandedTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: -4,
  },
  expandedTimeText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
  },
  musicSectionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  musicLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  musicIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  musicArtist: {
    color: '#AAA',
    fontSize: 12,
  },
  musicControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlBtn: {
    padding: 6,
    marginLeft: 8,
  },
  workoutSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  workoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workoutIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  workoutTime: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  restBar: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  restText: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pulsingDot: {
    backgroundColor: '#FF453A',
  },
});
