const fs = require('fs');

const content = `import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import TrackPlayer, { State, usePlaybackState, useProgress } from 'react-native-track-player';
import { useMusicStore } from '../store/useMusicStore';

const { width } = Dimensions.get('window');

const formatTime = (seconds: number) => {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return \`\${mins}:\${secs < 10 ? '0' : ''}\${secs}\`;
};

export default function InWorkoutMusicWidget() {
  const { currentSongId, currentQueueSong, playlists, isPlaying, setIsPlaying, playNext, playPrevious, powerSong, setCurrentSong } = useMusicStore();
  const playbackState = usePlaybackState();
  const progress = useProgress();

  const currentPlaylist = playlists.find(p => p.songs.some(s => s.id === currentSongId));
  const currentSong = currentQueueSong || currentPlaylist?.songs.find(s => s.id === currentSongId);

  // Robust Swipe Logic for Android/iOS inside ScrollView
  const panX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (evt, gestureState) => {
        panX.setValue(gestureState.dx * 0.4);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          playPrevious();
        } else if (gestureState.dx < -50) {
          playNext();
        }
        Animated.spring(panX, { 
          toValue: 0, 
          useNativeDriver: true,
          bounciness: 12,
          speed: 20
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
      }
    })
  ).current;

  const togglePlayPause = async () => {
    try {
      if (playbackState.state === State.Playing) {
        await TrackPlayer.pause();
        setIsPlaying(false);
      } else {
        await TrackPlayer.play();
        setIsPlaying(true);
      }
    } catch(e) {
      console.warn(e);
    }
  };

  const handleTriggerPowerSong = () => {
    if (powerSong) setCurrentSong(powerSong.playlistId, powerSong.songId);
  };

  if (!currentSong) return null;

  return (
    <View style={styles.container}>
      <Animated.View {...panResponder.panHandlers} style={[styles.swipeArea, { transform: [{ translateX: panX }] }]}>
        <View style={styles.musicLeft}>
          <View style={styles.musicIconBg}>
            <MaterialCommunityIcons name="music-note" size={20} color="#FFD700" />
          </View>
          <View style={{ marginLeft: 12, flex: 1, paddingRight: 8 }}>
            <Text style={styles.musicTitle} numberOfLines={1}>{currentSong.title}</Text>
            <Text style={styles.musicArtist} numberOfLines={1}>{currentSong.artist || 'Unknown Artist'}</Text>
          </View>
        </View>

        <View style={styles.musicControls}>
          {powerSong && (
            <TouchableOpacity style={[styles.controlBtn, { backgroundColor: 'rgba(255, 214, 10, 0.2)' }]} onPress={handleTriggerPowerSong}>
              <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFD60A" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.controlBtn} onPress={togglePlayPause}>
            <MaterialCommunityIcons name={isPlaying ? "pause" : "play"} size={26} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={playNext}>
            <MaterialCommunityIcons name="skip-next" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <View style={styles.sliderArea}>
        <Slider
          style={{ width: '100%', height: 30 }}
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
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(progress.position)}</Text>
          <Text style={styles.timeText}>{formatTime(progress.duration)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  swipeArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Make sure it covers the full width for easy swiping
    width: '100%',
    paddingBottom: 4,
  },
  musicLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  musicIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  musicArtist: {
    color: '#AAA',
    fontSize: 13,
    marginTop: 2,
  },
  musicControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  sliderArea: {
    marginTop: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: -8,
  },
  timeText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
});
`;

fs.writeFileSync('src/components/InWorkoutMusicWidget.tsx', content);
