import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image, ScrollView, Easing, Alert, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMusicStore, Playlist, Song } from '../store/useMusicStore';
import * as FileSystem from 'expo-file-system/legacy';
import { getResolvedUri } from '../utils/uriResolver';
import TrackPlayer, { usePlaybackState, useProgress, useActiveTrack, State, Capability, Event } from 'react-native-track-player';

import PlaylistModal from './PlaylistModal';
import MusicSettingsModal from './MusicSettingsModal';
import YouTubeDownloaderModal from './YouTubeDownloaderModal';
import MusicRecommendationsModal from './MusicRecommendationsModal';
import MusicSearchModal from './MusicSearchModal';
import FavoritesModal from './FavoritesModal';
import DownloadedSongsModal from './DownloadedSongsModal';
import NowPlayingModal from './NowPlayingModal';
import AllPlaylistsModal from './AllPlaylistsModal';
import { resolveAudioStreamUrl } from '../services/streamingMusicService';
import { useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';
import { triggerLight } from '../utils/haptics';

let isProgrammaticChange = false;

// Initialize TrackPlayer once when the module loads
let isPlayerSetup = false;
const setupPlayer = async () => {
  if (isPlayerSetup) return;
  try {
    await TrackPlayer.setupPlayer({
      maxCacheSize: 1024 * 100, // 100 MB cache for lookahead buffering
      minBuffer: 15,            // 15 seconds min buffer
      maxBuffer: 50,            // 50 seconds max buffer
      playBuffer: 0.5,          // 0.5s playback resume on seek (reduces seek latency by ~80%)
      backBuffer: 30,           // Keep 30s buffer behind playhead for instant backwards scrubbing
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
          // Avoid transient track 0 during initial load
          if (isProgrammaticChange && state.currentSongId && state.currentSongId !== event.track.id) {
             return;
          }
          // Find if we are currently playing a queue song
          if (state.currentQueueSong) {
             if (state.currentQueueSong.id === event.track.id) {
                return; // Already correct
             }
             useMusicStore.setState({ currentSongId: event.track.id, currentQueueSong: null });
             return;
          }
          if (state.currentSongId !== event.track.id) {
             useMusicStore.setState({ currentSongId: event.track.id });
          }
       }
    });

    TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
       if (isProgrammaticChange) return;
       const state = useMusicStore.getState();
       if (state.isPlaying) {
          state.playNext();
       }
    });

  } catch (e) {
    isPlayerSetup = true;
  }
};

export default function MediaPlayerWidget({ width }: { width: number }) {
  const { 
    playlists, currentPlaylistId, currentSongId, currentQueueSong, isPlaying, isShuffle,
    addPlaylist, setIsPlaying, toggleShuffle, playNext, playPrevious, setCurrentSong, incrementPlayCount, playStreamSongDirectly,
    favoriteSongs, toggleFavoriteSong, isSongFavorite, getAllDownloadedSongs,
    pinnedPlaylistIds, unpinPlaylist, pinPlaylist, deletePlaylist, isPlaylistPinned,
    activeStreamPlaylist, playPlaylist
  } = useMusicStore();

  const playbackState = usePlaybackState();
  const progress = useProgress();

  const [modalVisible, setModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [ytModalVisible, setYtModalVisible] = useState(false);
  const [recModalVisible, setRecModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchPrefill, setSearchPrefill] = useState<string>('');
  const [favModalVisible, setFavModalVisible] = useState(false);
  const [downloadedModalVisible, setDownloadedModalVisible] = useState(false);
  const [allPlaylistsModalVisible, setAllPlaylistsModalVisible] = useState(false);
  const [nowPlayingModalVisible, setNowPlayingModalVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);

  const storeDownloaded = useMusicStore(state => state.downloadedSongs);
  const downloadedSongs = getAllDownloadedSongs();

  const downloadProgress = useMusicStore(state => state.downloadProgress);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const [isReady, setIsReady] = useState(false);
  const [isRestreaming, setIsRestreaming] = useState(false);
  const [slidingPos, setSlidingPos] = useState<number | null>(null);
  const preloadTokenRef = useRef(0);
  const isPreloadingRef = useRef(false);
  const isDirectlyPlayingSongIdRef = useRef<string | null>(null);

  const activeTrack = useActiveTrack();
  const currentPlaylist = playlists.find(p => p.id === currentPlaylistId) || 
    (activeStreamPlaylist && activeStreamPlaylist.id === currentPlaylistId ? activeStreamPlaylist : null);
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
    const targetSong = useMusicStore.getState().getCurrentSong();
    if (!targetSong) return;

    const loadTrack = async () => {
      try {
        if (isDirectlyPlayingSongIdRef.current === targetSong.id) {
          // Handled directly by handlePlayStreamSong, skip to avoid double TrackPlayer.reset() collision
          isDirectlyPlayingSongIdRef.current = null;
          return;
        }

        const activeTrack = await TrackPlayer.getActiveTrack();
        if (activeTrack && activeTrack.id === targetSong.id) {
          // Track is already active in TrackPlayer, avoid duplicate reload
          if (isPlaying && playbackState.state !== State.Playing) {
            await TrackPlayer.play();
          }
          // Replenish 5-song lookahead buffer ahead of the currently playing track
          preloadUpcomingTracks(targetSong.id);
          return;
        }

        let rawUri = targetSong.cachedUri || targetSong.streamUrl || targetSong.uri;
        let resolvedUri = getResolvedUri(rawUri) || rawUri;
        let isLocalValid = false;

        if (resolvedUri && (resolvedUri.startsWith('file://') || resolvedUri.startsWith('/'))) {
          try {
            let fileInfo = await FileSystem.getInfoAsync(resolvedUri);
            if (fileInfo.exists && (fileInfo.size === undefined || fileInfo.size > 10000)) {
              isLocalValid = true;
            } else {
              const filename = resolvedUri.split('/').pop();
              const docDir = (FileSystem as any).documentDirectory;
              const altPath1 = `${docDir}${filename}`;
              const altPath2 = `${docDir}music_cache/${filename}`;
              const alt1 = await FileSystem.getInfoAsync(altPath1);
              if (alt1.exists && (alt1.size === undefined || alt1.size > 10000)) {
                resolvedUri = altPath1;
                isLocalValid = true;
              } else {
                const alt2 = await FileSystem.getInfoAsync(altPath2);
                if (alt2.exists && (alt2.size === undefined || alt2.size > 10000)) {
                  resolvedUri = altPath2;
                  isLocalValid = true;
                }
              }
            }
          } catch(e) {
            isLocalValid = false;
          }
        }

        if (!isLocalValid) {
          if (!resolvedUri || (!resolvedUri.startsWith('http://') && !resolvedUri.startsWith('https://'))) {
            try {
              resolvedUri = await resolveAudioStreamUrl(targetSong as any);
            } catch (e) {
              console.warn('[MediaPlayer] Failed resolving online stream URL:', e);
              return;
            }
          }
        }

        isProgrammaticChange = true;
        await TrackPlayer.reset();
        await TrackPlayer.add([{
          id: targetSong.id,
          url: resolvedUri,
          title: targetSong.title,
          artist: targetSong.artist || 'Unknown Artist',
          artwork: getResolvedUri(targetSong.coverUri || currentPlaylist?.coverUri) || targetSong.coverUri || currentPlaylist?.coverUri,
          duration: (targetSong.durationMillis && targetSong.durationMillis > 0)
            ? Math.round(targetSong.durationMillis / 1000)
            : 180,
        }]);
        isProgrammaticChange = false;

        if (isPlaying) {
          await TrackPlayer.play();
        }

        setTimeout(() => {
          preloadUpcomingTracks(targetSong.id);
        }, 800);
      } catch (e) {
        console.error('[MediaPlayer] TrackPlayer error loading track:', e);
        try {
          await TrackPlayer.reset();
        } catch(e2) {}
      } finally {
        isProgrammaticChange = false;
      }
    };

    loadTrack();
  }, [currentSongId, currentQueueSong, currentPlaylistId, isReady]);

  const preloadUpcomingTracks = async (currentTrackId: string) => {
    const token = ++preloadTokenRef.current;

    // Yield if another preload loop is currently running
    while (isPreloadingRef.current) {
      await new Promise(r => setTimeout(r, 60));
      if (preloadTokenRef.current !== token) return;
    }

    isPreloadingRef.current = true;
    try {
      const state = useMusicStore.getState();
      const upcomingSongs = state.getNextSongs(5);
      if (upcomingSongs.length === 0) return;

      for (let i = 0; i < upcomingSongs.length; i++) {
        if (preloadTokenRef.current !== token) return;
        const nextSong = upcomingSongs[i];
        if (!nextSong || nextSong.id === currentTrackId) continue;

        // Check if this song is already in TrackPlayer queue from activeTrack onwards
        const currentQueue = await TrackPlayer.getQueue();
        const activeIndex = await TrackPlayer.getActiveTrackIndex();
        const upcomingQueue = (activeIndex !== null && activeIndex !== undefined && activeIndex >= 0)
          ? currentQueue.slice(activeIndex)
          : currentQueue;

        if (upcomingQueue.some(t => t.id === nextSong.id)) {
          continue;
        }

        // 1. Check local file if cached or downloaded
        let rawUri = nextSong.cachedUri || nextSong.streamUrl || nextSong.uri;
        let resolvedUri = getResolvedUri(rawUri) || rawUri;
        let isLocalValid = false;

        if (resolvedUri && (resolvedUri.startsWith('file://') || resolvedUri.startsWith('/'))) {
          try {
            const fileInfo = await FileSystem.getInfoAsync(resolvedUri);
            if (fileInfo.exists && (fileInfo.size === undefined || fileInfo.size > 10000)) {
              isLocalValid = true;
            }
          } catch (e) {
            isLocalValid = false;
          }
        }

        // 2. If online stream: resolve URL ahead of time
        if (!isLocalValid) {
          if (!resolvedUri || (!resolvedUri.startsWith('http://') && !resolvedUri.startsWith('https://'))) {
            try {
              resolvedUri = await resolveAudioStreamUrl(nextSong as any);
              if (resolvedUri) {
                useMusicStore.getState().updateSongStreamUrl(nextSong.id, resolvedUri);
              }
            } catch (e) {
              console.warn(`[Preloader] Konnte Stream-URL für "${nextSong.title}" nicht auflösen:`, e);
              continue;
            }
          }
        }

        if (preloadTokenRef.current !== token) return;

        // Ensure player is still active
        const activeTrack = await TrackPlayer.getActiveTrack();
        if (!activeTrack) return;

        await TrackPlayer.add([{
          id: nextSong.id,
          url: resolvedUri,
          title: nextSong.title,
          artist: nextSong.artist || 'Unknown Artist',
          artwork: getResolvedUri(nextSong.coverUri || currentPlaylist?.coverUri) || nextSong.coverUri || currentPlaylist?.coverUri,
          duration: (nextSong.durationMillis && nextSong.durationMillis > 0)
            ? Math.round(nextSong.durationMillis / 1000)
            : 180,
        }]);

        console.log(`[Preloader] ⚡ Vorab gepuffert (${i + 1}/${upcomingSongs.length}): "${nextSong.title}" (${nextSong.artist})`);

        // Small delay to yield network and JS thread
        await new Promise(r => setTimeout(r, 120));
      }
    } catch (e) {
      console.warn('[Preloader] Error preloading tracks:', e);
    } finally {
      isPreloadingRef.current = false;
    }
  };



  
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

  const handlePlayStreamSong = async (song: Omit<Song, 'playCount'>, forceFreshStream: boolean = false) => {
    try {
      setIsRestreaming(true);

      // 1. Resolve offline local file if cached
      let streamUrl = song.cachedUri || song.streamUrl || song.uri;
      const offlineUri = getResolvedUri(streamUrl);
      let isOfflineTrack = false;

      if (offlineUri && (offlineUri.startsWith('file://') || offlineUri.startsWith('/'))) {
        try {
          let fileInfo = await FileSystem.getInfoAsync(offlineUri);
          if (fileInfo.exists && (fileInfo.size === undefined || fileInfo.size > 10000)) {
            streamUrl = offlineUri;
            isOfflineTrack = true;
          } else {
            const filename = offlineUri.split('/').pop();
            const docDir = (FileSystem as any).documentDirectory;
            const altPath1 = `${docDir}${filename}`;
            const altPath2 = `${docDir}music_cache/${filename}`;
            const alt1 = await FileSystem.getInfoAsync(altPath1);
            if (alt1.exists && (alt1.size === undefined || alt1.size > 10000)) {
              streamUrl = altPath1;
              isOfflineTrack = true;
            } else {
              const alt2 = await FileSystem.getInfoAsync(altPath2);
              if (alt2.exists && (alt2.size === undefined || alt2.size > 10000)) {
                streamUrl = altPath2;
                isOfflineTrack = true;
              }
            }
          }
        } catch (e) {
          isOfflineTrack = false;
        }
      }

      // If local file is missing, reset streamUrl so we don't try to fetch a missing local file:// URI!
      if (!isOfflineTrack) {
        if (streamUrl && (streamUrl.startsWith('file://') || streamUrl.startsWith('/'))) {
          streamUrl = (song as any).videoId || song.streamUrl || song.id || '';
        }
      }

      // If online stream and (forceFreshStream OR not a valid HTTP URL):
      // Resolve a fresh, unexpired stream URL!
      if (!isOfflineTrack && (forceFreshStream || (!streamUrl.startsWith('http://') && !streamUrl.startsWith('https://')))) {
        try {
          streamUrl = await resolveAudioStreamUrl(song as any, undefined, true);
        } catch (e: any) {
          console.warn('Failed resolving fresh stream URL:', e);
          const existingHttp = song.streamUrl || song.uri;
          if (existingHttp && (existingHttp.startsWith('http://') || existingHttp.startsWith('https://'))) {
            streamUrl = existingHttp;
          } else {
            Alert.alert('Stream nicht verfügbar', e.message || 'Der Titel konnte online nicht neu gestartet werden. Bitte prüfe deine Internetverbindung.');
            return;
          }
        }
      } else if (!isOfflineTrack && (!streamUrl.startsWith('http://') && !streamUrl.startsWith('https://'))) {
        try {
          streamUrl = await resolveAudioStreamUrl(song as any);
        } catch (e: any) {
          console.warn('Failed resolving stream URL:', e);
          Alert.alert('Stream nicht verfügbar', e.message || 'Der Titel konnte online nicht geladen werden.');
          return;
        }
      }

      const fullSong: Song = {
        ...song,
        durationMillis: song.durationMillis && song.durationMillis > 0 ? song.durationMillis : 180000,
        uri: streamUrl,
        streamUrl: streamUrl,
        cachedUri: isOfflineTrack ? streamUrl : song.cachedUri,
        isStream: !isOfflineTrack,
        playCount: 1,
        playHistory: [Date.now()]
      };

      isDirectlyPlayingSongIdRef.current = fullSong.id;
      playStreamSongDirectly(fullSong);

      isProgrammaticChange = true;
      await TrackPlayer.reset();
      await TrackPlayer.add([{
        id: fullSong.id,
        url: streamUrl,
        title: fullSong.title,
        artist: fullSong.artist || 'Unknown Artist',
        artwork: getResolvedUri(fullSong.coverUri || currentPlaylist?.coverUri) || fullSong.coverUri || currentPlaylist?.coverUri,
        duration: (fullSong.durationMillis && fullSong.durationMillis > 0)
          ? Math.round(fullSong.durationMillis / 1000)
          : 180,
      }]);
      isProgrammaticChange = false;
      await TrackPlayer.play();
      setIsPlaying(true);
      setTimeout(() => {
        preloadUpcomingTracks(fullSong.id);
      }, 800);
    } catch (e) {
      console.warn('TrackPlayer play stream error:', e);
    } finally {
      setIsRestreaming(false);
      isProgrammaticChange = false;
      isDirectlyPlayingSongIdRef.current = null;
    }
  };

  const handlePlayPause = async () => {
    try {
      if (isCurrentlyPlaying) {
        await TrackPlayer.pause();
        setIsPlaying(false);
        return;
      }

      if (!currentSong) {
        return;
      }

      // Check if candidate URI actually exists on disk before deciding offline
      const candidateUri = getResolvedUri(currentSong.cachedUri || currentSong.uri);
      let isOfflineTrack = false;
      if (candidateUri && (candidateUri.startsWith('file://') || candidateUri.startsWith('/'))) {
        try {
          const fi = await FileSystem.getInfoAsync(candidateUri);
          if (fi.exists && (fi.size === undefined || fi.size > 10000)) {
            isOfflineTrack = true;
          }
        } catch (e) {}
      }

      // Check active track in TrackPlayer
      let activeTrack: any = null;
      try {
        activeTrack = await TrackPlayer.getActiveTrack();
      } catch (e) {}

      // 1. If already in TrackPlayer, resume immediately without re-resolving!
      if (activeTrack && activeTrack.id === currentSong.id) {
        try {
          await TrackPlayer.play();
          setIsPlaying(true);
          preloadUpcomingTracks(currentSong.id);
          return;
        } catch (resumeErr) {
          console.warn("TrackPlayer resume failed, falling back to reload/re-stream:", resumeErr);
        }
      }

      // 2. If it's an offline track, or if it already has a valid HTTP streamUrl:
      // Play it directly without forcing an unnecessary network resolution!
      const existingUrl = currentSong.cachedUri || currentSong.streamUrl || currentSong.uri;
      const isHttp = existingUrl && (existingUrl.startsWith('http://') || existingUrl.startsWith('https://'));

      if (isOfflineTrack || isHttp) {
        try {
          await handlePlayStreamSong(currentSong, false);
          return;
        } catch (playErr) {
          console.warn("Direct stream play failed, will try fresh resolution fallback:", playErr);
        }
      }

      // 3. Only if direct play failed or URL is missing: resolve a fresh stream
      await handlePlayStreamSong(currentSong, true);
    } catch (e) {
      console.warn("Play/Pause error:", e);
      if (currentSong) {
        try {
          await handlePlayStreamSong(currentSong, false);
        } catch (e2) {
          Alert.alert("Wiedergabefehler", "Der Song konnte nicht gestartet werden. Bitte prüfe deine Internetverbindung.");
        }
      }
    }
  };

  const handleNext = async () => {
    try {
      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      if (queue && activeIndex !== null && activeIndex !== undefined && activeIndex + 1 < queue.length) {
        console.log('[MediaPlayer] ⚡ Instant skip using preloaded track in TrackPlayer!');
        const nextTrack = queue[activeIndex + 1];
        if (nextTrack && nextTrack.id) {
          // ⚡ Immediate 0ms synchronous state update on touch
          useMusicStore.setState({ currentSongId: nextTrack.id, currentQueueSong: null, isPlaying: true });
        }
        await TrackPlayer.skipToNext();
        return;
      }
    } catch (e) {}

    playNext();
  };

  const handlePrevious = async () => {
    try {
      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      if (queue && activeIndex !== null && activeIndex !== undefined && activeIndex > 0) {
        console.log('[MediaPlayer] ⚡ Instant previous using preloaded track in TrackPlayer!');
        const prevTrack = queue[activeIndex - 1];
        if (prevTrack && prevTrack.id) {
          // ⚡ Immediate 0ms synchronous state update on touch
          useMusicStore.setState({ currentSongId: prevTrack.id, currentQueueSong: null, isPlaying: true });
        }
        await TrackPlayer.skipToPrevious();
        return;
      }
    } catch (e) {}

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

  const handleOpenCurrentPlaylist = () => {
    triggerLight();
    if (currentPlaylistId === 'favorites') {
      setFavModalVisible(true);
      return;
    }
    if (currentPlaylistId === 'downloaded') {
      setDownloadedModalVisible(true);
      return;
    }
    const activeStream = useMusicStore.getState().activeStreamPlaylist;
    if (activeStream && currentPlaylistId === activeStream.id) {
      setSelectedPlaylist(activeStream);
      setModalVisible(true);
      return;
    }
    if (currentPlaylistId) {
      const pl = playlists.find(p => p.id === currentPlaylistId);
      if (pl) {
        setSelectedPlaylist(pl);
        setModalVisible(true);
        return;
      }
    }
    if (currentSong) {
      const plWithSong = playlists.find(p => p.songs.some(s => s.id === currentSong.id));
      if (plWithSong) {
        setSelectedPlaylist(plWithSong);
        setModalVisible(true);
        return;
      }
      if (isSongFavorite(currentSong.id)) {
        setFavModalVisible(true);
        return;
      }
      const isDownloaded = downloadedSongs.some(s => s.id === currentSong.id);
      if (isDownloaded) {
        setDownloadedModalVisible(true);
        return;
      }
    }
    if (playlists.length > 0) {
      setSelectedPlaylist(playlists[0]);
      setModalVisible(true);
    } else {
      setAllPlaylistsModalVisible(true);
    }
  };

  const openPlaylist = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setModalVisible(true);
  };

  const handlePlaylistLongPress = (playlist: Playlist) => {
    triggerLight();
    Alert.alert(
      playlist.name,
      'Möchtest du diese Playlist von der Startansicht (Schnellzugriff) entfernen? Sie bleibt unter "Alle Playlists" gespeichert.',
      [
        {
          text: '📌 Vom Start entfernen',
          style: 'destructive',
          onPress: () => {
            unpinPlaylist(playlist.id);
          }
        },
        {
          text: '✏️ Öffnen',
          onPress: () => openPlaylist(playlist)
        },
        {
          text: '🗑️ Endgültig löschen',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Playlist löschen',
              `Möchtest du "${playlist.name}" wirklich komplett aus der App löschen?`,
              [
                { text: 'Abbrechen', style: 'cancel' },
                {
                  text: 'Löschen',
                  style: 'destructive',
                  onPress: () => deletePlaylist(playlist.id)
                }
              ]
            );
          }
        },
        { text: 'Abbrechen', style: 'cancel' }
      ]
    );
  };

  const displayedPlaylists = playlists.filter(p => isPlaylistPinned(p.id));

  const effectiveDurationMillis = (progress.duration && progress.duration > 0)
    ? Math.round(progress.duration * 1000)
    : (currentSong?.durationMillis && currentSong.durationMillis > 0
      ? currentSong.durationMillis
      : 180000);

  const rawPositionMillis = Math.round(progress.position * 1000);
  const positionMillis = Math.min(rawPositionMillis, effectiveDurationMillis);
  const durationMillis = effectiveDurationMillis;
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);

  return (
    <View style={[styles.container, { width, backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
      {/* Top Header Actions */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 10,
            backgroundColor: theme.accentSoftBg,
            borderWidth: 1,
            borderColor: theme.accentBorder
          }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: theme.accent }}>
              {currentSong?.cachedUri ? 'OFFLINE' : (currentSong?.isStream ? 'LIVE STREAM' : '320K HQ')}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Favoriten Quick Trigger */}
          <TouchableOpacity
            onPress={() => { triggerLight(); setFavModalVisible(true); }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FF005515',
              borderWidth: 1,
              borderColor: '#FF2A6D50',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 12,
              gap: 4
            }}
          >
            <MaterialCommunityIcons name="heart" size={12} color="#FF2A6D" />
            <Text style={{ color: '#FF2A6D', fontSize: 10, fontWeight: 'bold' }}>
              {favoriteSongs?.length > 0 ? `${favoriteSongs.length}` : 'Favs'}
            </Text>
          </TouchableOpacity>

          {/* Heruntergeladen Quick Trigger */}
          <TouchableOpacity
            onPress={() => { triggerLight(); setDownloadedModalVisible(true); }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.accentSoftBg,
              borderWidth: 1,
              borderColor: theme.accentBorder,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 12,
              gap: 4
            }}
          >
            <MaterialCommunityIcons name="download" size={12} color={theme.accent} />
            <Text style={{ color: theme.accent, fontSize: 10, fontWeight: 'bold' }}>
              {downloadedSongs?.length > 0 ? `${downloadedSongs.length}` : 'Offline'}
            </Text>
          </TouchableOpacity>

          {/* PowerSong Quick Trigger */}
          <TouchableOpacity
            onPress={() => {
              if (powerSong) {
                triggerLight();
                handlePlayPause();
                handleSeek(powerSong.startPosition);
              } else {
                setNowPlayingModalVisible(true);
              }
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FF450020',
              borderWidth: 1,
              borderColor: '#FF450050',
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderRadius: 12,
              gap: 2
            }}
          >
            <MaterialCommunityIcons name="lightning-bolt" size={12} color="#FF5500" />
            <Text style={{ color: '#FF5500', fontSize: 10, fontWeight: 'bold' }}>PR</Text>
          </TouchableOpacity>

          {/* Settings Modal */}
          <TouchableOpacity onPress={() => setSettingsModalVisible(true)}>
            <MaterialCommunityIcons name="cog" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.topSection}>
        {/* Vinyl Record - Tapping opens Current Playlist */}
        <TouchableOpacity 
          style={styles.vinylContainer}
          activeOpacity={0.8}
          onPress={handleOpenCurrentPlaylist}
        >
          <Animated.View style={[styles.vinyl, { transform: [{ rotate: spin }] }]}>
            <View style={styles.vinylHole} />
            {(effectiveSong?.coverUri || currentPlaylist?.coverUri) && (
              <Image 
                source={{ uri: getResolvedUri(effectiveSong?.coverUri || currentPlaylist?.coverUri) }} 
                style={styles.vinylCover} 
              />
            )}
          </Animated.View>
        </TouchableOpacity>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity 
              style={{ flex: 1 }} 
              activeOpacity={0.7} 
              onPress={() => { triggerLight(); setNowPlayingModalVisible(true); }}
            >
              <Text style={styles.nowPlayingTitle} numberOfLines={1}>
                {effectiveSong ? effectiveSong.title : 'Ready to Play'}
              </Text>
              <Text style={styles.nowPlayingArtist} numberOfLines={1}>
                {effectiveSong ? effectiveSong.artist || 'Unknown' : 'Select a playlist'}
              </Text>
            </TouchableOpacity>

            {effectiveSong && (
              <TouchableOpacity
                onPress={() => {
                  triggerLight();
                  toggleFavoriteSong(effectiveSong);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ padding: 4, marginLeft: 6 }}
              >
                <MaterialCommunityIcons
                  name={isSongFavorite(effectiveSong.id) ? "heart" : "heart-outline"}
                  size={20}
                  color={isSongFavorite(effectiveSong.id) ? "#FF2A6D" : "#666"}
                />
              </TouchableOpacity>
            )}
          </View>
          
          {(() => {
            const currentPos = slidingPos !== null ? slidingPos : positionMillis;
            const effectiveDur = effectiveDurationMillis > 0
              ? effectiveDurationMillis
              : (effectiveSong?.durationMillis && effectiveSong.durationMillis > 0 ? effectiveSong.durationMillis : 180000);

            return (
              <>
                <Slider
                  style={{ width: '100%', height: 20 }}
                  minimumValue={0}
                  maximumValue={effectiveDur}
                  value={Math.min(currentPos, effectiveDur)}
                  minimumTrackTintColor={theme.accent}
                  maximumTrackTintColor="#333"
                  thumbTintColor={theme.accent}
                  onSlidingStart={() => setSlidingPos(positionMillis)}
                  onValueChange={(val) => setSlidingPos(val)}
                  onSlidingComplete={async (value) => {
                    setSlidingPos(value);
                    await handleSeek(value / 1000);
                    setTimeout(() => setSlidingPos(null), 300);
                  }}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
                  <Text style={{ color: '#888', fontSize: 10 }}>
                    {Math.floor(currentPos / 60000)}:{(Math.floor((currentPos % 60000) / 1000)).toString().padStart(2, '0')}
                  </Text>
                  <Text style={{ color: '#888', fontSize: 10 }}>
                    {Math.floor(effectiveDur / 60000)}:{(Math.floor((effectiveDur % 60000) / 1000)).toString().padStart(2, '0')}
                  </Text>
                </View>
              </>
            );
          })()}
          
          <View style={styles.playbackButtons}>
            <TouchableOpacity onPress={toggleShuffle} style={styles.controlIcon}>
              <MaterialCommunityIcons name="shuffle-variant" size={24} color={isShuffle ? theme.accent : '#666'} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handlePrevious} style={styles.controlIcon}>
              <MaterialCommunityIcons name="skip-previous" size={32} color="#FFF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handlePlayPause} 
              disabled={isRestreaming}
              style={[styles.playPauseBtn, { backgroundColor: isCurrentlyPlaying ? '#FF9500' : theme.accent }]}
            >
              {isRestreaming ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <MaterialCommunityIcons name={isCurrentlyPlaying ? "pause" : "play"} size={36} color="#000" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleNext} style={styles.controlIcon}>
              <MaterialCommunityIcons name="skip-next" size={32} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Interactive Global Music Search Bar */}
      <TouchableOpacity 
        style={[styles.searchBarPill, { backgroundColor: theme.subCardBg, borderColor: theme.cardBorder }]}
        activeOpacity={0.8}
        onPress={() => { triggerLight(); setSearchModalVisible(true); }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <MaterialCommunityIcons name="magnify" size={17} color={theme.accent} />
          <Text style={styles.searchBarPlaceholder} numberOfLines={1}>
            Song, Artist oder YouTube-Link suchen...
          </Text>
        </View>
        <View style={[styles.searchPillBadge, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorder }]}>
          <MaterialCommunityIcons name="youtube" size={12} color="#FF0000" />
          <Text style={[styles.searchPillBadgeText, { color: theme.accent }]}>ONLINE</Text>
        </View>
      </TouchableOpacity>

      {/* Background Download Progress Banner */}
      {downloadProgress && downloadProgress.isDownloading && (
        <TouchableOpacity 
          style={styles.downloadProgressBanner}
          activeOpacity={0.8}
          onPress={() => setYtModalVisible(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: '#FF4444', fontSize: 11, fontWeight: 'bold' }} numberOfLines={1}>
              ⬇️ Lade Playlist: {downloadProgress.playlistName}
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
      <View style={[styles.playlistsSection, { borderTopColor: theme.subtleBorder }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.playlistsHeader}>Your Playlists</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity 
              onPress={() => { triggerLight(); setAllPlaylistsModalVisible(true); }} 
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#00D2FF18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: '#00D2FF45' }}
            >
              <MaterialCommunityIcons name="playlist-music" size={14} color={theme.accent} style={{ marginRight: 4 }} />
              <Text style={{ color: theme.accent, fontSize: 10, fontWeight: 'bold' }}>Alle ({playlists.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setYtModalVisible(true)} 
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF000020', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: '#FF000050' }}
            >
              <MaterialCommunityIcons name="youtube" size={14} color="#FF0000" style={{ marginRight: 4 }} />
              <Text style={{ color: '#FF4444', fontSize: 10, fontWeight: 'bold' }}>Import</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
          {/* Dedicated Favoriten Playlist Tile */}
          <TouchableOpacity 
            style={styles.playlistIconContainer}
            onPress={() => { triggerLight(); setFavModalVisible(true); }}
          >
            <View style={[styles.playlistCover, { backgroundColor: '#281118', borderWidth: 1.5, borderColor: '#FF2A6D70' }]}>
              <MaterialCommunityIcons name="heart" size={26} color="#FF2A6D" />
            </View>
            <Text style={[styles.playlistIconName, { color: '#FF2A6D', fontWeight: 'bold' }]} numberOfLines={1}>
              Favoriten {favoriteSongs?.length > 0 ? `(${favoriteSongs.length})` : ''}
            </Text>
          </TouchableOpacity>

          {/* Dedicated Heruntergeladen Playlist Tile */}
          <TouchableOpacity 
            style={styles.playlistIconContainer}
            onPress={() => { triggerLight(); setDownloadedModalVisible(true); }}
          >
            <View style={[styles.playlistCover, { backgroundColor: theme.subCardBg, borderWidth: 1.5, borderColor: theme.accentBorder }]}>
              <MaterialCommunityIcons name="download" size={26} color={theme.accent} />
            </View>
            <Text style={[styles.playlistIconName, { color: theme.accent, fontWeight: 'bold' }]} numberOfLines={1}>
              Offline {downloadedSongs?.length > 0 ? `(${downloadedSongs.length})` : ''}
            </Text>
          </TouchableOpacity>

          {/* Dedicated All Playlists Tile */}
          <TouchableOpacity 
            style={styles.playlistIconContainer}
            onPress={() => { triggerLight(); setAllPlaylistsModalVisible(true); }}
          >
            <View style={[styles.playlistCover, { backgroundColor: '#101B24', borderWidth: 1.5, borderColor: '#00D2FF50' }]}>
              <MaterialCommunityIcons name="playlist-play" size={28} color={theme.accent} />
            </View>
            <Text style={[styles.playlistIconName, { color: theme.accent, fontWeight: 'bold' }]} numberOfLines={1}>
              Alle Playlists
            </Text>
          </TouchableOpacity>

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

          {displayedPlaylists.map(playlist => {
            const resolvedUri = playlist.coverUri ? getResolvedUri(playlist.coverUri) : null;
            return (
              <TouchableOpacity 
                key={playlist.id} 
                style={styles.playlistIconContainer}
                onPress={() => openPlaylist(playlist)}
                onLongPress={() => handlePlaylistLongPress(playlist)}
                delayLongPress={350}
                activeOpacity={0.7}
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
        onOpenSearch={(query) => {
          setSearchPrefill(query || '');
          setSearchModalVisible(true);
        }}
      />
      <AllPlaylistsModal
        visible={allPlaylistsModalVisible}
        onClose={() => setAllPlaylistsModalVisible(false)}
        onOpenPlaylist={(p) => openPlaylist(p)}
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
      <MusicRecommendationsModal
        visible={recModalVisible}
        onClose={() => setRecModalVisible(false)}
        onPlaySong={handlePlayStreamSong}
      />
      <MusicSearchModal
        visible={searchModalVisible}
        onClose={() => { setSearchModalVisible(false); setSearchPrefill(''); }}
        onPlaySong={handlePlayStreamSong}
        initialQuery={searchPrefill}
      />
      <FavoritesModal
        visible={favModalVisible}
        onClose={() => setFavModalVisible(false)}
        onPlaySong={handlePlayStreamSong}
        onOpenSearch={(query) => {
          setSearchPrefill(query || '');
          setSearchModalVisible(true);
        }}
      />
      <DownloadedSongsModal
        visible={downloadedModalVisible}
        onClose={() => setDownloadedModalVisible(false)}
        onPlaySong={handlePlayStreamSong}
        onOpenSearch={() => setSearchModalVisible(true)}
      />
      <NowPlayingModal
        visible={nowPlayingModalVisible}
        onClose={() => setNowPlayingModalVisible(false)}
        positionMillis={positionMillis}
        durationMillis={durationMillis}
        onSeek={async (val) => handleSeek(val)}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrevious={handlePrevious}
        isCurrentlyPlaying={isCurrentlyPlaying}
        isRestreaming={isRestreaming}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161C22',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
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
  searchBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchBarPlaceholder: {
    color: '#888',
    fontSize: 12,
  },
  searchPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchPillBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
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
