import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image, ScrollView, Easing, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMusicStore, Playlist } from '../store/useMusicStore';
import * as FileSystem from 'expo-file-system/legacy';
import { getResolvedUri } from '../utils/uriResolver';
import TrackPlayer, { usePlaybackState, useProgress, State, Capability, Event } from 'react-native-track-player';

import PlaylistModal from './PlaylistModal';
import MusicSettingsModal from './MusicSettingsModal';
import YouTubeDownloaderModal from './YouTubeDownloaderModal';

// Initialize TrackPlayer once when the module loads
let isPlayerSetup = false;
const setupPlayer = async () => {
  if (isPlayerSetup) return;
  try {
    await TrackPlayer.setupPlayer({
      maxCacheSize: 1024 * 5,
      autoHandleInterruptions: false,
    });
    await TrackPlayer.updateOptions({
      android: {
        alwaysPauseOnInterruption: false,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.Stop,
        Capability.SeekTo,
      ],
    });
    isPlayerSetup = true;

    // Keep Zustand in sync if track changes natively (e.g. from lockscreen)
    TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
      if (event.paused) {
        if (event.permanent) {
          await TrackPlayer.pause();
        } else {
          await TrackPlayer.setVolume(0.1);
        }
      } else {
        await TrackPlayer.setVolume(1.0);
      }
    });


    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
       if (event.track && event.track.id) {
          const state = useMusicStore.getState();
          // Find if we are currently playing a queue song
          if (state.currentQueueSong && state.currentQueueSong.id === event.track.id) {
             return; // Already correct
          }
          if (state.currentSongId !== event.track.id) {
             useMusicStore.setState({ currentSongId: event.track.id });
          }
       }
    });

  } catch (e) {
    isPlayerSetup = true;
  }
};

export default function MediaPlayerWidget({ width }: { width: number }) {
  const { 
    playlists, currentPlaylistId, currentSongId, currentQueueSong, isPlaying, isShuffle,
    addPlaylist, setIsPlaying, toggleShuffle, playNext, playPrevious, setCurrentSong, incrementPlayCount
  } = useMusicStore();

  const playbackState = usePlaybackState();
  const progress = useProgress();

  const [modalVisible, setModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [ytModalVisible, setYtModalVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  const downloadProgress = useMusicStore(state => state.downloadProgress);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const [isReady, setIsReady] = useState(false);

  const currentPlaylist = playlists.find(p => p.id === currentPlaylistId);
  const currentSong = currentQueueSong || currentPlaylist?.songs.find(s => s.id === currentSongId);

  const isCurrentlyPlaying = playbackState.state === State.Playing;

  // Sync the zustand isPlaying state with actual player state, but ONLY for definitive states
  useEffect(() => {
    if (playbackState.state === State.Playing && !isPlaying) {
      setIsPlaying(true);
    } else if ((playbackState.state === State.Paused || playbackState.state === State.Stopped) && isPlaying) {
      setIsPlaying(false);
    }
  }, [playbackState.state, isPlaying, setIsPlaying]);

  // Setup player on mount
  useEffect(() => {
    setupPlayer().then(() => setIsReady(true));
  }, []);

  // Spinning Animation
  useEffect(() => {
    let anim: Animated.CompositeAnimation;
    if (isCurrentlyPlaying) {
      anim = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      anim.start();
    } else {
      spinAnim.stopAnimation();
    }
    return () => { if (anim) anim.stop(); };
  }, [isCurrentlyPlaying]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Load new song into TrackPlayer when song changes in Zustand
  useEffect(() => {
    if (!isReady) return;
    if (currentSongId || currentQueueSong) {
      const loadTrack = async () => {
        try {
          if (currentQueueSong) {
             const resolvedQueueUri = getResolvedUri(currentQueueSong.uri);
             try {
               const fileInfo = await FileSystem.getInfoAsync(resolvedQueueUri || '');
               if (!fileInfo.exists) {
                  Alert.alert("Song nicht gefunden", "Die Audiodatei existiert nicht mehr.");
                  setIsPlaying(false);
                  return;
               }
             } catch(e) { console.warn("FS Check failed, continuing anyway", e); }
             await TrackPlayer.reset();
             await TrackPlayer.add([{
                id: currentQueueSong.id,
                url: resolvedQueueUri || currentQueueSong.uri,
                title: currentQueueSong.title,
                artist: currentQueueSong.artist || 'Unknown Artist',
                artwork: getResolvedUri(currentQueueSong.coverUri),
             }]);
             if (isPlaying) await TrackPlayer.play();
             return;
          }

          const playlist = playlists.find(p => p.id === currentPlaylistId);
          if (!playlist) return;
          
          const currentIndex = playlist.songs.findIndex(s => s.id === currentSongId);
          if (currentIndex === -1) return;
          
          // Check if the current queue already matches the playlist to avoid resetting
          const queue = await TrackPlayer.getQueue();
          let needsFullLoad = true;
          if (queue && queue.length === playlist.songs.length && queue.length > 0) {
              if (queue[0].id === playlist.songs[0].id) {
                  needsFullLoad = false;
              }
          }
          
          // Check if the current song file actually exists on device BEFORE attempting to play
          const currentSongObj = playlist.songs[currentIndex];
          if (currentSongObj) {
             const resolvedSongUri = getResolvedUri(currentSongObj.uri);
             try {
               const fileInfo = await FileSystem.getInfoAsync(resolvedSongUri || '');
               if (!fileInfo.exists) {
                  Alert.alert(
                    "Song nicht gefunden",
                    "Die Audiodatei existiert nicht mehr. Dies passiert, wenn alte Lieder aus dem temporären Cache gelöscht wurden. Bitte importiere deine Lieder neu, das neue System speichert sie nun dauerhaft!"
                  );
                  setIsPlaying(false);
                  return;
               }
             } catch(e) { console.warn("FS Check failed, continuing anyway", e); }
          }

          if (needsFullLoad) {
            await TrackPlayer.reset();
            const tracks = playlist.songs.map(song => ({
              id: song.id,
              url: getResolvedUri(song.uri) || song.uri,
              title: song.title,
              artist: song.artist || 'Unknown Artist',
              artwork: getResolvedUri(song.coverUri),
            }));
            await TrackPlayer.add(tracks);
          }
          
          const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();
          if (currentTrackIndex !== currentIndex) {
            await TrackPlayer.skip(currentIndex);
          }
          
          if (isPlaying) {
            await TrackPlayer.play();
          }
        } catch (e) {
          console.error('TrackPlayer error loading track:', e);
          // If skip fails, we can force a full reload next time
          try {
             await TrackPlayer.reset();
          } catch(e2) {}
        }
      };
      loadTrack();
    }
  }, [currentSongId, currentQueueSong, isReady]);



  
  const hasCountedRef = useRef(false);
  const { powerSong, crossfadeSeconds } = useMusicStore();
  
  useEffect(() => {
     hasCountedRef.current = false;
  }, [currentSongId, currentQueueSong, isReady]);

  useEffect(() => {
     if (!hasCountedRef.current && progress.position > 30) {
        hasCountedRef.current = true;
        if (currentQueueSong) {
           const plist = playlists.find(p => p.songs.some(s => s.id === currentQueueSong.id));
           if (plist) incrementPlayCount(plist.id, currentQueueSong.id);
        } else if (currentPlaylistId && currentSongId) {
           incrementPlayCount(currentPlaylistId, currentSongId);
        }
     }

     // Crossfade Logic (Simulated by Volume fading)
     if (crossfadeSeconds > 0 && progress.duration > 0) {
        const timeLeft = progress.duration - progress.position;
        if (timeLeft <= crossfadeSeconds && timeLeft > 0) {
           // Fade out
           const volume = Math.max(0, timeLeft / crossfadeSeconds);
           TrackPlayer.setVolume(volume).catch(() => {});
           
           // If we are at the very end of the crossfade, skip to next manually to ensure gapless
           if (timeLeft < 0.5 && isPlaying) {
             playNext();
           }
        } else if (progress.position <= crossfadeSeconds && progress.position > 0) {
           // Fade in
           const volume = Math.min(1, progress.position / crossfadeSeconds);
           TrackPlayer.setVolume(volume).catch(() => {});
        } else {
           TrackPlayer.setVolume(1).catch(() => {});
        }
     } else {
        TrackPlayer.setVolume(1).catch(() => {});
     }
  }, [progress.position, progress.duration, currentSongId, currentQueueSong, crossfadeSeconds]);

  const handlePlayPause = async () => {
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
  };

  const handleNext = async () => {
    playNext();
  };

  const handlePrevious = async () => {
    playPrevious();
  };

  const handleSeek = async (value: number) => {
    await TrackPlayer.seekTo(value);
  };

  const handleImport = async () => {
    try {
      const DocumentPicker = require('expo-document-picker');
      const { processImportedAudioAssets } = require('../utils/id3Parser');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const rawSongs = await processImportedAudioAssets(result.assets);
        addPlaylist(`New Playlist ${new Date().toLocaleDateString('de-DE')}`, undefined, rawSongs);
        Alert.alert("Success", `Imported ${rawSongs.length} songs as a new playlist.`);
      }
    } catch (e: any) {
      console.warn("Import error", e);
      Alert.alert("Import Error", String(e.message || e));
    }
  };

  const openPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setModalVisible(true);
  };

  const positionMillis = progress.position * 1000;
  const durationMillis = progress.duration * 1000;

  return (
    <View style={[styles.container, { width }]}>
      <TouchableOpacity 
        style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
        onPress={() => setSettingsModalVisible(true)}
      >
        <MaterialCommunityIcons name="cog" size={20} color="#666" />
      </TouchableOpacity>
      <View style={styles.topSection}>
        {/* Vinyl Record */}
        <View style={styles.vinylContainer}>
          <Animated.View style={[styles.vinyl, { transform: [{ rotate: spin }] }]}>
            <View style={styles.vinylHole} />
            {(currentSong?.coverUri || currentPlaylist?.coverUri) && (
              <Image 
                source={{ uri: getResolvedUri(currentSong?.coverUri || currentPlaylist?.coverUri) }} 
                style={styles.vinylCover} 
              />
            )}
          </Animated.View>
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          <Text style={styles.nowPlayingTitle} numberOfLines={1}>
            {currentSong ? currentSong.title : 'Ready to Play'}
          </Text>
          <Text style={styles.nowPlayingArtist} numberOfLines={1}>
            {currentSong ? currentSong.artist || 'Unknown' : 'Select a playlist'}
          </Text>
          
          <Slider
            style={{ width: '100%', height: 20 }}
            minimumValue={0}
            maximumValue={durationMillis || 1}
            value={positionMillis}
            minimumTrackTintColor="#00D2FF"
            maximumTrackTintColor="#333"
            thumbTintColor="#00D2FF"
            onSlidingComplete={async (value) => handleSeek(value / 1000)}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
            <Text style={{ color: '#888', fontSize: 10 }}>
              {Math.floor(positionMillis / 60000)}:{(Math.floor((positionMillis % 60000) / 1000)).toString().padStart(2, '0')}
            </Text>
            <Text style={{ color: '#888', fontSize: 10 }}>
              {Math.floor(durationMillis / 60000)}:{(Math.floor((durationMillis % 60000) / 1000)).toString().padStart(2, '0')}
            </Text>
          </View>
          
          <View style={styles.playbackButtons}>
            <TouchableOpacity onPress={toggleShuffle} style={styles.controlIcon}>
              <MaterialCommunityIcons name="shuffle-variant" size={24} color={isShuffle ? '#00D2FF' : '#666'} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handlePrevious} style={styles.controlIcon}>
              <MaterialCommunityIcons name="skip-previous" size={32} color="#FFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handlePlayPause} 
              style={[styles.playPauseBtn, { backgroundColor: isCurrentlyPlaying ? '#FF9500' : '#00D2FF' }]}
            >
              <MaterialCommunityIcons name={isCurrentlyPlaying ? "pause" : "play"} size={36} color="#000" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleNext} style={styles.controlIcon}>
              <MaterialCommunityIcons name="skip-next" size={32} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Background Download Progress Banner */}
      {downloadProgress && downloadProgress.isDownloading && (
        <TouchableOpacity 
          style={styles.downloadProgressBanner}
          activeOpacity={0.8}
          onPress={() => setYtModalVisible(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: '#FF4444', fontSize: 11, fontWeight: 'bold' }} numberOfLines={1}>
              ⬇️ Lade YouTube Playlist: {downloadProgress.playlistName}
            </Text>
            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>
              {downloadProgress.progressPercent}%
            </Text>
          </View>
          <View style={{ height: 4, backgroundColor: '#333', borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ height: '100%', backgroundColor: '#FF0000', width: `${downloadProgress.progressPercent}%` }} />
          </View>
          <Text style={{ color: '#888', fontSize: 10, marginTop: 4 }} numberOfLines={1}>
            {downloadProgress.currentSongTitle}
          </Text>
        </TouchableOpacity>
      )}

      {/* Playlists Row */}
      <View style={styles.playlistsSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.playlistsHeader}>Your Playlists</Text>
          <TouchableOpacity 
            onPress={() => setYtModalVisible(true)} 
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF000020', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: '#FF000050' }}
          >
            <MaterialCommunityIcons name="youtube" size={14} color="#FF0000" style={{ marginRight: 4 }} />
            <Text style={{ color: '#FF4444', fontSize: 10, fontWeight: 'bold' }}>Import</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
          {/* YouTube Downloader Playlist Tile */}
          <TouchableOpacity 
            style={styles.playlistIconContainer}
            onPress={() => setYtModalVisible(true)}
          >
            <View style={[styles.playlistCover, { backgroundColor: '#281111', borderWidth: 1.5, borderColor: '#FF000099', borderStyle: 'dashed' }]}>
              <MaterialCommunityIcons name="youtube" size={32} color="#FF0000" />
            </View>
            <Text style={[styles.playlistIconName, { color: '#FF5555', fontWeight: 'bold' }]} numberOfLines={1}>+ YouTube</Text>
          </TouchableOpacity>

          {playlists.slice(0, 7).map(playlist => {
            const resolvedUri = playlist.coverUri ? getResolvedUri(playlist.coverUri) : null;
            return (
              <TouchableOpacity 
                key={playlist.id} 
                style={styles.playlistIconContainer}
                onPress={() => openPlaylist(playlist)}
              >
                <View style={[styles.playlistCover, !resolvedUri && { backgroundColor: '#333' }]}>
                  {resolvedUri ? (
                    <Image source={{ uri: resolvedUri }} style={styles.playlistCoverImg} />
                  ) : (
                    <MaterialCommunityIcons name="music" size={24} color="#666" />
                  )}
                </View>
                <Text style={styles.playlistIconName} numberOfLines={1}>{playlist.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <PlaylistModal 
        visible={modalVisible} 
        playlist={selectedPlaylist} 
        onClose={() => setModalVisible(false)} 
      />
      <MusicSettingsModal 
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        onOpenYouTubeDownloader={() => {
          setSettingsModalVisible(false);
          setYtModalVisible(true);
        }}
      />
      <YouTubeDownloaderModal
        visible={ytModalVisible}
        onClose={() => setYtModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2E2E32',
    padding: 16,
  },
  downloadProgressBanner: {
    backgroundColor: '#281111',
    borderWidth: 1,
    borderColor: '#FF000040',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  topSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  vinylContainer: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 5, elevation: 5,
  },
  vinyl: {
    width: 86, height: 86, borderRadius: 43, backgroundColor: '#111',
    borderWidth: 2, borderColor: '#222', justifyContent: 'center', alignItems: 'center',
  },
  vinylHole: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1E1E1E', position: 'absolute', zIndex: 2 },
  vinylCover: { width: 40, height: 40, borderRadius: 20, position: 'absolute', opacity: 0.7 },
  controlsContainer: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  nowPlayingTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  nowPlayingArtist: { color: '#888', fontSize: 12, marginTop: 2, marginBottom: 12 },
  playbackButtons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 10 },
  controlIcon: { padding: 4 },
  playPauseBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  playlistsSection: { borderTopWidth: 1, borderTopColor: '#282828', paddingTop: 16 },
  playlistsHeader: { color: '#CCC', fontSize: 12, fontWeight: 'bold', marginBottom: 12 },
  playlistsScroll: { flexDirection: 'row', gap: 12 },
  addPlaylistBtn: {
    width: 70, height: 90, backgroundColor: '#2A2A2A', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#333', borderStyle: 'dashed',
  },
  addPlaylistText: { color: '#00D2FF', fontSize: 10, marginTop: 8, fontWeight: '600' },
  playlistIconContainer: { width: '22%', alignItems: 'center', marginBottom: 12 },
  playlistCover: {
    aspectRatio: 1, width: '100%', height: undefined,
    borderRadius: 12, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  playlistCoverImg: { width: '100%', height: '100%' },
  playlistIconName: { color: '#FFF', fontSize: 10, textAlign: 'center', fontWeight: '500' },
});
