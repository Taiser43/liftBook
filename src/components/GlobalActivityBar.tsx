import React, { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';

import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, Animated, Easing, PanResponder, UIManager, LayoutAnimation, ActivityIndicator, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/store';
import { useLiveWorkoutStore } from '../store/useLiveWorkoutStore';

import { useCardioStore } from '../store/useCardioStore';
import { useMusicStore } from '../store/useMusicStore';
import { getHeartRateZoneColor } from '../utils/heartRate';
import { hideActiveWorkoutNotification } from '../services/notificationService';
import TrackPlayer, { State, usePlaybackState, useProgress } from 'react-native-track-player';
import Slider from '@react-native-community/slider';


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

export const GlobalActivityBar = ({ navigationRef }: { navigationRef: any }) => {
  const { 
    globalActivePlan, globalWorkoutDuration, globalWorkoutStartTime, globalRestTimeLeft, globalLiveWorkoutModalVisible,
    setGlobalLiveWorkoutModalVisible, setGlobalActivePlan, setGlobalWorkoutStartTime, setGlobalWorkoutDuration,
    currentHeartRate, connectedDeviceId,
    globalCardioActive, globalCardioModalVisible, setGlobalCardioModalVisible,
    globalCardioActivityType, globalCardioDuration, globalCardioDistance, globalCardioSpeed
  } = useAppStore();

  const { currentSongId, currentPlaylistId, queue, currentQueueSong, playlists, playNext, setIsPlaying } = useMusicStore();
  const playbackState = usePlaybackState();
  const isWatchConnected = !!connectedDeviceId;
  const maxHeartRateSetting = useCardioStore(state => state.maxHeartRateSetting) || 190;
  const isPlaying = playbackState.state === State.Playing;

  // Derive current song
  const currentPlaylist = playlists.find(p => p.id === currentPlaylistId);
  const currentSong = currentQueueSong || currentPlaylist?.songs.find(s => s.id === currentSongId);

  const hasMusic = !!currentSong;
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

  const skipNext = async () => {
    playNext();
  };

  // Marquee Animation for long titles
  const scrollAnim = React.useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);
  const [isMusicExpanded, setIsMusicExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const isMinimizedRef = React.useRef(false);
  const minimizeAnim = React.useRef(new Animated.Value(0)).current;
  const progress = useProgress();

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

  useEffect(() => {
    if (textWidth > width * 0.4) {
      Animated.loop(
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
      ).start();
    } else {
      scrollAnim.setValue(0);
    }
  }, [textWidth, currentSong]);


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
          } else if (useMusicStore.getState().currentSongId || useMusicStore.getState().currentQueueSong) {
            if (gestureState.dx > 50) {
              useMusicStore.getState().playPrevious();
            } else if (gestureState.dx < -50) {
              useMusicStore.getState().playNext();
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
          <View style={styles.musicRow}>
            <View style={styles.musicLeft}>
              <View style={[styles.musicIconBg, (currentSong.coverUri || currentPlaylist?.coverUri) && { padding: 0, backgroundColor: 'transparent' }]}>
                {(currentSong.coverUri || currentPlaylist?.coverUri) ? (
                  <Image source={{ uri: require('../utils/uriResolver').getResolvedUri(currentSong.coverUri || currentPlaylist?.coverUri) }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                ) : (
                  <MaterialCommunityIcons name="music-note" size={20} color="#FFD700" />
                )}
              </View>
              <View style={{ marginLeft: 12, width: width * 0.4, overflow: 'hidden' }}>
                <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: scrollAnim }] }}>
                  <Text 
                    style={styles.musicTitle} 
                    numberOfLines={1}
                    onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
                  >
                    {currentSong.title}
                  </Text>
                </Animated.View>
                <Text style={styles.musicArtist} numberOfLines={1}>{currentSong.artist || 'Unknown Artist'}</Text>
              </View>
            </View>

            <View style={styles.musicControls}>
              <TouchableOpacity style={styles.controlBtn} onPress={togglePlayPause}>
                <MaterialCommunityIcons name={isPlaying ? "pause" : "play"} size={26} color="#FFF" />
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
                value={progress.position}
                minimumTrackTintColor="#FFD700"
                maximumTrackTintColor="#555"
                thumbTintColor="#FFD700"
                onSlidingComplete={async (val) => {
                  await TrackPlayer.seekTo(val);
                }}
              />
              <View style={styles.expandedTimeRow}>
                <Text style={styles.expandedTimeText}>{formatTime(progress.position)}</Text>
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
            <MaterialCommunityIcons name="music-note" size={24} color="#FFD700" />
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
