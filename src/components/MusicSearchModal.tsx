import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';
import { triggerLight, triggerSuccess } from '../utils/haptics';
import {
  StreamSearchResult,
  StreamPlaylistResult,
  searchOnlineTracks,
  searchOnlinePlaylists,
  fetchOnlinePlaylistTracks,
  getCuratedWorkoutPlaylists,
  resolveAudioStreamUrl,
  cacheStreamTrackForOffline,
  downloadPlaylistForOffline,
  cleanArtistName,
  getSmartRecommendations,
  RecommendationSection
} from '../services/streamingMusicService';
import { getResolvedUri } from '../utils/uriResolver';
import { Song, Playlist, useMusicStore } from '../store/useMusicStore';
import { parseYouTubeUrl } from '../services/youtubeDownloadService';

interface MusicSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onPlaySong: (song: Omit<Song, 'playCount'>) => void;
  initialQuery?: string;
}

type SourceFilter = 'all' | 'youtube' | 'audius';
type ContentType = 'tracks' | 'playlists';

const WORKOUT_SUGGESTIONS = [
  '🔥 Heavy PR Trap',
  '🥊 Till I Collapse',
  '🎧 Gym Hardstyle',
  '🦁 Deutschrap Focus',
  '⚡ 160 BPM Techno',
  '🎸 Rock Workout',
  '🔥 Can\'t Be Touched',
  '💣 Teufel Bass',
  '👑 Eminem Workout',
  '🚀 High Energy EDM'
];

export default function MusicSearchModal({
  visible,
  onClose,
  onPlaySong,
  initialQuery = ''
}: MusicSearchModalProps) {
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);
  const { 
    addToQueue, 
    clearQueue, 
    addPlaylist, 
    setPowerSong, 
    favoriteSongs, 
    toggleFavoriteSong, 
    isSongFavorite,
    playlists: savedPlaylists 
  } = useMusicStore();

  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<SourceFilter>('all');
  const [activeTab, setActiveTab] = useState<ContentType>('tracks');
  
  // Tracks state
  const [results, setResults] = useState<StreamSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolvingStatus, setResolvingStatus] = useState<string>('Lädt...');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [queuedId, setQueuedId] = useState<string | null>(null);

  // Playlists state
  const [playlists, setPlaylists] = useState<StreamPlaylistResult[]>(() => getCuratedWorkoutPlaylists());
  const [playingPlaylistId, setPlayingPlaylistId] = useState<string | null>(null);
  const [playingPlaylistStatus, setPlayingPlaylistStatus] = useState<string>('Lädt...');
  const [savingPlaylistId, setSavingPlaylistId] = useState<string | null>(null);
  const [savingProgress, setSavingProgress] = useState<{
    completed: number;
    total: number;
    currentSongTitle: string;
    percent: number;
  } | null>(null);
  const [savedPlaylistIds, setSavedPlaylistIds] = useState<Set<string>>(new Set());
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [previewPlayingKey, setPreviewPlayingKey] = useState<string | null>(null);
  const [previewTracksMap, setPreviewTracksMap] = useState<Record<string, Omit<Song, 'id' | 'playCount'>[]>>({});

  // Direct YouTube Link Detection
  const [detectedYtId, setDetectedYtId] = useState<string | null>(null);
  const [detectedYtPlaylistId, setDetectedYtPlaylistId] = useState<string | null>(null);

  // Smart Recommendations
  const [recCategory, setRecCategory] = useState<string>('all');
  const allSections = getSmartRecommendations();
  const visibleSections = recCategory === 'all'
    ? allSections
    : allSections.filter(s => s.id === recCategory);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible && initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery, filter);
    }
  }, [visible, initialQuery]);

  // Detect YouTube URL (video or playlist)
  useEffect(() => {
    const parsed = parseYouTubeUrl(query);
    if (parsed.type === 'playlist' && parsed.id) {
      setDetectedYtPlaylistId(parsed.id);
      setDetectedYtId(parsed.videoIdFallback || null);
      setActiveTab('playlists');
    } else if (parsed.type === 'video' && parsed.id) {
      setDetectedYtId(parsed.id);
      setDetectedYtPlaylistId(null);
    } else {
      setDetectedYtId(null);
      setDetectedYtPlaylistId(null);
    }
  }, [query]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!text.trim()) {
      setResults([]);
      setPlaylists(getCuratedWorkoutPlaylists());
      setLoading(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(text, filter);
    }, 500);
  };

  const handleFilterChange = (newFilter: SourceFilter) => {
    setFilter(newFilter);
    if (query.trim()) {
      performSearch(query, newFilter);
    }
  };

  const performSearch = async (searchQuery: string, sourceFilter: SourceFilter) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setPlaylists(getCuratedWorkoutPlaylists());
      return;
    }
    setLoading(true);
    try {
      const [tracksRes, playlistsRes] = await Promise.allSettled([
        searchOnlineTracks(searchQuery, sourceFilter),
        searchOnlinePlaylists(searchQuery, sourceFilter)
      ]);

      if (tracksRes.status === 'fulfilled') {
        setResults(tracksRes.value);
      } else {
        setResults([]);
      }

      if (playlistsRes.status === 'fulfilled') {
        setPlaylists(playlistsRes.value);
      } else {
        setPlaylists(getCuratedWorkoutPlaylists());
      }
    } catch (e) {
      console.warn('Search failed:', e);
      setResults([]);
      setPlaylists(getCuratedWorkoutPlaylists());
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuickTag = (tag: string) => {
    triggerLight();
    const cleanTag = tag.replace(/^[^\w\s]+/, '').trim();
    setQuery(cleanTag);
    performSearch(cleanTag, filter);
  };

  const buildSongObject = (item: StreamSearchResult): Omit<Song, 'playCount'> => {
    return {
      id: item.id,
      title: item.title,
      artist: item.artist,
      durationMillis: item.durationSeconds * 1000,
      uri: item.directStreamUrl || item.id,
      coverUri: item.thumbnailUrl,
      isStream: true,
      streamUrl: item.directStreamUrl,
      videoId: item.id.length === 11 ? item.id : undefined,
      bpm: item.bpm
    };
  };

  const handleArtistPress = (rawArtist: string) => {
    triggerLight();
    const clean = cleanArtistName(rawArtist);
    if (!clean) return;
    setQuery(clean);
    performSearch(clean, filter);
  };

  const handlePlay = async (item: StreamSearchResult) => {
    try {
      triggerLight();

      // Check if already downloaded / cached locally
      const allDownloaded = useMusicStore.getState().getAllDownloadedSongs();
      const existing = allDownloaded.find(s => s.id === item.id || s.id === `stream_${item.id}` || s.videoId === item.id);
      if (existing && existing.cachedUri) {
        const resolved = getResolvedUri(existing.cachedUri);
        onPlaySong({
          ...existing,
          uri: resolved || existing.cachedUri,
          streamUrl: resolved || existing.cachedUri,
          cachedUri: resolved || existing.cachedUri,
          isStream: false
        });
        onClose();
        return;
      }

      setResolvingId(item.id);
      setResolvingStatus('Verbinde...');

      let streamUrl = item.directStreamUrl;
      if (!streamUrl || (!streamUrl.startsWith('http://') && !streamUrl.startsWith('https://'))) {
        streamUrl = await resolveAudioStreamUrl(item, (status) => setResolvingStatus(status));
      }

      const song = buildSongObject({ ...item, directStreamUrl: streamUrl });
      song.uri = streamUrl;
      song.streamUrl = streamUrl;

      onPlaySong(song);
      onClose();
    } catch (e: any) {
      console.warn('Playback error:', e);
      Alert.alert('Stream nicht verfügbar', e.message || 'Der Song konnte nicht gestreamt werden.');
    } finally {
      setResolvingId(null);
    }
  };

  const handleAddToQueue = (item: StreamSearchResult) => {
    triggerSuccess();
    const song = buildSongObject(item) as Song;
    song.playCount = 0;
    addToQueue(song);
    setQueuedId(item.id);
    setTimeout(() => setQueuedId(null), 2500);
  };

  const handleSetPowerSong = (item: StreamSearchResult) => {
    triggerSuccess();
    setPowerSong({
      songId: item.id,
      playlistId: 'stream',
      startPosition: 0
    });
    Alert.alert('⚡ PowerSong gesetzt', `"${item.title}" ist jetzt dein PR-PowerSong!`);
  };

  const handleCacheOffline = async (item: StreamSearchResult) => {
    try {
      triggerLight();
      setDownloadingId(item.id);
      setDownloadProgress(0);
      const song = buildSongObject(item) as Song;
      song.playCount = 0;
      await cacheStreamTrackForOffline(song, (pct) => setDownloadProgress(pct));
      triggerSuccess();
      Alert.alert('Erfolg', `"${item.title}" wurde für Offline-Nutzung gespeichert!`);
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Offline-Speicherung fehlgeschlagen.');
    } finally {
      setDownloadingId(null);
    }
  };

  // --- Playlist Actions ---

  const handlePlayPlaylist = async (playlist: StreamPlaylistResult) => {
    try {
      triggerLight();
      setPlayingPlaylistId(playlist.id);
      setPlayingPlaylistStatus('Lade Tracks...');

      let tracks = previewTracksMap[playlist.id] || playlist.tracks;
      if (!tracks || tracks.length === 0) {
        tracks = await fetchOnlinePlaylistTracks(playlist);
        setPreviewTracksMap(prev => ({ ...prev, [playlist.id]: tracks! }));
      }

      if (!tracks || tracks.length === 0) {
        Alert.alert('Keine Tracks', 'Diese Playlist enthält leider keine abspielbaren Titel.');
        return;
      }

      setPlayingPlaylistStatus('Starte Song 1...');

      // Convert tracks to full songs with unique IDs
      const songs: Song[] = tracks.map((t, idx) => ({
        ...t,
        id: `${playlist.id}_track_${idx}_${Date.now()}`,
        playCount: 0,
        playHistory: []
      }));

      // ⚡ Pre-resolve first track's stream URL so it starts instantly with 0ms delay!
      let firstStreamUrl = songs[0].streamUrl;
      if (!firstStreamUrl || (!firstStreamUrl.startsWith('http://') && !firstStreamUrl.startsWith('https://'))) {
        try {
          firstStreamUrl = await resolveAudioStreamUrl(songs[0] as any);
          if (firstStreamUrl) {
            songs[0].streamUrl = firstStreamUrl;
            songs[0].uri = firstStreamUrl;
          }
        } catch (e) {
          console.warn('First track pre-resolve fallback:', e);
        }
      }

      const streamPlaylist: Playlist = {
        id: `stream_${playlist.id}`,
        name: playlist.title,
        coverUri: playlist.thumbnailUrl,
        songs
      };

      const store = useMusicStore.getState();
      store.setStreamPlaylist(streamPlaylist);
      store.playPlaylist(streamPlaylist.id, { startSongId: songs[0].id, shuffle: false });
      triggerSuccess();
      onClose();
    } catch (e: any) {
      console.warn('Play playlist error:', e);
      Alert.alert('Fehler beim Abspielen', e.message || 'Die Playlist konnte nicht abgespielt werden.');
    } finally {
      setPlayingPlaylistId(null);
      setPlayingPlaylistStatus('Lädt...');
    }
  };

  const handleSavePlaylist = async (playlist: StreamPlaylistResult) => {
    try {
      triggerLight();
      setSavingPlaylistId(playlist.id);
      setSavingProgress({
        completed: 0,
        total: playlist.trackCount || 10,
        currentSongTitle: 'Starte Download...',
        percent: 0
      });

      const downloaded = await downloadPlaylistForOffline(playlist, (prog) => {
        setSavingProgress(prog);
      });

      setSavedPlaylistIds(prev => new Set([...prev, playlist.id]));
      triggerSuccess();
      const offlineCount = downloaded.filter(s => !s.isStream && s.cachedUri).length;
      if (offlineCount === downloaded.length) {
        Alert.alert(
          '🎉 Playlist offline gespeichert!',
          `Alle ${downloaded.length} Lieder von "${playlist.title}" wurden vollständig auf dein Smartphone heruntergeladen und sind ab sofort im "Offline / Heruntergeladen"-Reiter und unter deinen Playlists verfügbar.`
        );
      } else if (offlineCount > 0) {
        Alert.alert(
          'Playlist gespeichert',
          `"${playlist.title}": ${offlineCount} von ${downloaded.length} Liedern wurden komplett auf dein Handy heruntergeladen und in die Offline-Playlist aufgenommen.`
        );
      } else {
        Alert.alert(
          'Playlist gespeichert',
          `"${playlist.title}" (${downloaded.length} Songs) wurde zu deinen Playlists hinzugefügt und kann jederzeit abgespielt werden.`
        );
      }
    } catch (e: any) {
      console.warn('Save playlist error:', e);
      Alert.alert('Fehler beim Herunterladen', e.message || 'Die Playlist konnte nicht heruntergeladen werden.');
    } finally {
      setSavingPlaylistId(null);
      setSavingProgress(null);
    }
  };

  const handleToggleExpandPlaylist = async (playlist: StreamPlaylistResult) => {
    triggerLight();
    if (expandedPlaylistId === playlist.id) {
      setExpandedPlaylistId(null);
      return;
    }
    setExpandedPlaylistId(playlist.id);

    // If tracks not yet cached, fetch them
    if (!previewTracksMap[playlist.id] && (!playlist.tracks || playlist.tracks.length === 0)) {
      setPreviewLoadingId(playlist.id);
      try {
        const tracks = await fetchOnlinePlaylistTracks(playlist);
        setPreviewTracksMap(prev => ({ ...prev, [playlist.id]: tracks }));
      } catch (e) {
        console.warn('Failed preview tracks fetch:', e);
      } finally {
        setPreviewLoadingId(null);
      }
    }
  };

  const handlePlayPreviewTrack = async (
    track: Omit<Song, 'id' | 'playCount'>,
    playlist: StreamPlaylistResult,
    startIndex: number,
    allTracks: Omit<Song, 'id' | 'playCount'>[]
  ) => {
    const trackKey = `${playlist.id}_${startIndex}`;
    setPreviewPlayingKey(trackKey);
    try {
      triggerLight();
      const allSongs: Song[] = allTracks.map((t, idx) => ({
        ...t,
        id: `${playlist.id}_prev_${idx}_${Date.now()}`,
        playCount: 0,
        playHistory: []
      }));

      // ⚡ Pre-resolve selected preview track's stream URL so it starts instantly with 0ms delay!
      let targetStreamUrl = allSongs[startIndex].streamUrl;
      if (!targetStreamUrl || (!targetStreamUrl.startsWith('http://') && !targetStreamUrl.startsWith('https://'))) {
        try {
          targetStreamUrl = await resolveAudioStreamUrl(allSongs[startIndex] as any);
          if (targetStreamUrl) {
            allSongs[startIndex].streamUrl = targetStreamUrl;
            allSongs[startIndex].uri = targetStreamUrl;
          }
        } catch (e) {
          console.warn('Preview track pre-resolve fallback:', e);
        }
      }

      const streamPlaylist: Playlist = {
        id: `stream_${playlist.id}`,
        name: playlist.title,
        coverUri: playlist.thumbnailUrl,
        songs: allSongs
      };

      const store = useMusicStore.getState();
      store.setStreamPlaylist(streamPlaylist);
      store.playPlaylist(streamPlaylist.id, { startSongId: allSongs[startIndex].id, shuffle: false });
      triggerSuccess();
      onClose();
    } catch (e: any) {
      console.warn('Play preview track error:', e);
    } finally {
      setPreviewPlayingKey(null);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- Render Items ---

  const renderItem = ({ item }: { item: StreamSearchResult }) => {
    const isYt = item.source === 'youtube' || item.id.length === 11;
    const isResolving = resolvingId === item.id;
    const isDownloading = downloadingId === item.id;
    const isJustQueued = queuedId === item.id;
    const isFav = isSongFavorite(item.id);

    return (
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <View style={styles.cardHeader}>
          {/* Thumbnail with Source Badge */}
          <View style={styles.thumbWrapper}>
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
            <View style={[
              styles.sourceBadge,
              { backgroundColor: isYt ? '#FF0000E0' : theme.accent }
            ]}>
              <MaterialCommunityIcons 
                name={isYt ? 'youtube' : 'music-circle'} 
                size={11} 
                color="#FFF" 
              />
              <Text style={styles.sourceBadgeText}>
                {isYt ? 'YouTube' : 'Audius HQ'}
              </Text>
            </View>
          </View>

          {/* Title & Artist */}
          <View style={styles.metaContainer}>
            <Text style={styles.trackTitle} numberOfLines={2}>
              {item.title}
            </Text>
            
            {/* Clickable Artist Name to show all songs of this artist */}
            <TouchableOpacity
              onPress={() => handleArtistPress(item.artist)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}
            >
              <MaterialCommunityIcons name="account-music-outline" size={13} color={theme.accent} />
              <Text style={[styles.trackArtist, { color: theme.accent, textDecorationLine: 'underline' }]} numberOfLines={1}>
                {item.artist}
              </Text>
              <Text style={{ fontSize: 9, color: '#777' }}>• Alle Songs</Text>
            </TouchableOpacity>

            <View style={styles.badgesRow}>
              {item.durationSeconds > 0 && (
                <View style={styles.durationBadge}>
                  <MaterialCommunityIcons name="clock-outline" size={10} color="#888" />
                  <Text style={styles.durationText}>{formatDuration(item.durationSeconds)}</Text>
                </View>
              )}
              {item.bpm ? (
                <View style={[styles.bpmBadge, { borderColor: theme.accentBorder, backgroundColor: theme.accentSoftBg }]}>
                  <Text style={[styles.bpmText, { color: theme.accent }]}>{item.bpm} BPM</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Favorite Heart Button */}
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => {
              triggerLight();
              const song = buildSongObject(item);
              toggleFavoriteSong(song);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons 
              name={isFav ? "heart" : "heart-outline"} 
              size={22} 
              color={isFav ? "#FF2A6D" : "#666"} 
            />
          </TouchableOpacity>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          {/* Stream Now */}
          <TouchableOpacity
            style={[styles.streamBtn, { backgroundColor: theme.accent }]}
            onPress={() => handlePlay(item)}
            disabled={isResolving}
            activeOpacity={0.8}
          >
            {isResolving ? (
              <ActivityIndicator size={14} color="#000" />
            ) : (
              <MaterialCommunityIcons name="play" size={16} color="#000" />
            )}
            <Text style={styles.streamBtnText}>{isResolving ? resolvingStatus : 'Streamen'}</Text>
          </TouchableOpacity>

          {/* Add to Queue */}
          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              {
                borderColor: isJustQueued ? '#00FF6680' : theme.cardBorder,
                backgroundColor: isJustQueued ? '#00FF6620' : theme.subCardBg
              }
            ]}
            onPress={() => handleAddToQueue(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name={isJustQueued ? 'check' : 'playlist-plus'} 
              size={15} 
              color={isJustQueued ? '#00FF66' : '#CCC'} 
            />
            <Text style={[styles.secondaryBtnText, isJustQueued && { color: '#00FF66' }]}>
              {isJustQueued ? 'In Queue' : '+ Queue'}
            </Text>
          </TouchableOpacity>

          {/* Set as PowerSong */}
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: '#FF550040', backgroundColor: '#FF550015' }]}
            onPress={() => handleSetPowerSong(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="lightning-bolt" size={14} color="#FF5500" />
            <Text style={[styles.secondaryBtnText, { color: '#FF7700' }]}>PR</Text>
          </TouchableOpacity>

          {/* Offline Cache */}
          {(() => {
            const allDownloaded = useMusicStore.getState().getAllDownloadedSongs();
            const isAlreadyDownloaded = allDownloaded.some(s => s.id === item.id || s.id === `stream_${item.id}` || s.videoId === item.id);

            return (
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  {
                    borderColor: isAlreadyDownloaded ? theme.accent : theme.cardBorder,
                    backgroundColor: isAlreadyDownloaded ? theme.accentSoftBg : theme.subCardBg
                  }
                ]}
                onPress={() => isAlreadyDownloaded ? Alert.alert('Bereits offline', `"${item.title}" ist bereits lokal gespeichert.`) : handleCacheOffline(item)}
                disabled={isDownloading}
                activeOpacity={0.7}
              >
                {isDownloading ? (
                  <ActivityIndicator size={12} color={theme.accent} />
                ) : (
                  <MaterialCommunityIcons
                    name={isAlreadyDownloaded ? "check-circle" : "download-outline"}
                    size={15}
                    color={isAlreadyDownloaded ? theme.accent : "#AAA"}
                  />
                )}
                <Text style={[styles.secondaryBtnText, isAlreadyDownloaded && { color: theme.accent, fontWeight: 'bold' }]}>
                  {isDownloading ? `${downloadProgress}%` : (isAlreadyDownloaded ? 'Gecacht' : 'Offline')}
                </Text>
              </TouchableOpacity>
            );
          })()}
        </View>
      </View>
    );
  };

  const renderPlaylistItem = ({ item }: { item: StreamPlaylistResult }) => {
    const isYt = item.source === 'youtube';
    const isCurated = item.source === 'curated';
    const isPlayingThis = playingPlaylistId === item.id;
    const isSavingThis = savingPlaylistId === item.id;
    const isExpanded = expandedPlaylistId === item.id;
    const isAlreadySaved =
      savedPlaylistIds.has(item.id) ||
      savedPlaylists.some(p => p.name.trim().toLowerCase() === item.title.trim().toLowerCase());
    const tracksList = previewTracksMap[item.id] || item.tracks || [];

    return (
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <View style={styles.cardHeader}>
          {/* Cover & Source Badge */}
          <View style={styles.playlistThumbWrapper}>
            <Image 
              source={{ uri: item.thumbnailUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400' }} 
              style={styles.thumbnail} 
            />
            <View style={[
              styles.sourceBadge,
              { backgroundColor: isYt ? '#FF0000E0' : (isCurated ? '#FF8800E0' : theme.accent) }
            ]}>
              <MaterialCommunityIcons 
                name={isYt ? 'youtube' : (isCurated ? 'fire' : 'music-circle')} 
                size={11} 
                color="#FFF" 
              />
              <Text style={styles.sourceBadgeText}>
                {isYt ? 'YouTube' : (isCurated ? 'Workout Mix' : 'Audius')}
              </Text>
            </View>
          </View>

          {/* Meta Info */}
          <View style={styles.metaContainer}>
            <Text style={styles.trackTitle} numberOfLines={2}>
              {item.title}
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <MaterialCommunityIcons name="account-circle-outline" size={13} color="#888" />
              <Text style={styles.trackArtist} numberOfLines={1}>
                {item.author}
              </Text>
            </View>

            <View style={styles.badgesRow}>
              <View style={styles.durationBadge}>
                <MaterialCommunityIcons name="playlist-music-outline" size={11} color="#888" />
                <Text style={styles.durationText}>
                  {item.trackCount ? `${item.trackCount} Tracks` : 'Playlist'}
                </Text>
              </View>
              {isCurated && (
                <View style={[styles.bpmBadge, { borderColor: '#FF550050', backgroundColor: '#FF550015' }]}>
                  <Text style={[styles.bpmText, { color: '#FF7700' }]}>Gym Curated</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          {/* Play entire playlist */}
          <TouchableOpacity
            style={[styles.streamBtn, { backgroundColor: theme.accent, flex: 1.2 }]}
            onPress={() => handlePlayPlaylist(item)}
            disabled={isPlayingThis}
            activeOpacity={0.8}
          >
            {isPlayingThis ? (
              <ActivityIndicator size={14} color="#000" />
            ) : (
              <MaterialCommunityIcons name="play" size={16} color="#000" />
            )}
            <Text style={styles.streamBtnText} numberOfLines={1}>
              {isPlayingThis ? playingPlaylistStatus : '▶ Abspielen'}
            </Text>
          </TouchableOpacity>

          {/* Save to user library */}
          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              {
                flex: 1.2,
                borderColor: isAlreadySaved ? theme.accent : theme.cardBorder,
                backgroundColor: isAlreadySaved ? theme.accentSoftBg : theme.subCardBg
              }
            ]}
            onPress={() => isAlreadySaved ? Alert.alert('Bereits gespeichert', `"${item.title}" ist bereits in deiner Bibliothek.`) : handleSavePlaylist(item)}
            disabled={isSavingThis}
            activeOpacity={0.7}
          >
            {isSavingThis ? (
              <ActivityIndicator size={12} color={theme.accent} />
            ) : (
              <MaterialCommunityIcons 
                name={isAlreadySaved ? "check-circle" : "download-outline"} 
                size={15} 
                color={isAlreadySaved ? theme.accent : "#CCC"} 
              />
            )}
            <Text style={[
              styles.secondaryBtnText,
              isAlreadySaved && { color: theme.accent, fontWeight: 'bold' }
            ]} numberOfLines={1}>
              {isSavingThis
                ? (savingProgress ? `${savingProgress.completed}/${savingProgress.total} (${savingProgress.percent}%)` : 'Lade...')
                : (isAlreadySaved ? '✓ Offline' : '⬇️ Speichern')}
            </Text>
          </TouchableOpacity>

          {/* Preview / Accordion toggle */}
          <TouchableOpacity
            style={[styles.secondaryBtn, { paddingHorizontal: 10 }]}
            onPress={() => handleToggleExpandPlaylist(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={16} 
              color="#AAA" 
            />
          </TouchableOpacity>
        </View>

        {/* Preview Accordion */}
        {isExpanded && (
          <View style={[styles.expandedTracksContainer, { borderLeftColor: theme.accent }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.expandedTracksTitle}>Playlist Inhalt:</Text>
              <Text style={{ color: '#777', fontSize: 10 }}>Tippe auf Song zum Direkt-Start</Text>
            </View>

            {previewLoadingId === item.id ? (
              <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.accent} />
                <Text style={{ color: '#888', fontSize: 11, marginTop: 4 }}>Lade Playlist-Tracks...</Text>
              </View>
            ) : tracksList.length > 0 ? (
              tracksList.slice(0, 10).map((track, idx) => (
                <TouchableOpacity
                  key={`${track.title}-${idx}`}
                  style={styles.previewTrackRow}
                  onPress={() => handlePlayPreviewTrack(track, item, idx, tracksList)}
                  disabled={previewPlayingKey === `${item.id}_${idx}`}
                  activeOpacity={0.7}
                >
                  <Text style={styles.previewTrackIndex}>{idx + 1}</Text>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.previewTrackTitle} numberOfLines={1}>{track.title}</Text>
                    <Text style={styles.previewTrackArtist} numberOfLines={1}>{track.artist}</Text>
                  </View>
                  {previewPlayingKey === `${item.id}_${idx}` ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                  ) : (
                    <MaterialCommunityIcons name="play-circle-outline" size={18} color={theme.accent} />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <Text style={{ color: '#777', fontSize: 11, fontStyle: 'italic', paddingVertical: 6 }}>
                Keine Vorschau-Tracks verfügbar.
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalContent}>
          {/* Header Bar */}
          <View style={styles.topBar}>
            <View>
              <Text style={styles.modalTitle}>Musik & Playlist Suche</Text>
              <Text style={styles.modalSubtitle}>YouTube & Audius HQ Streaming</Text>
            </View>
            <TouchableOpacity 
              onPress={() => { triggerLight(); onClose(); }}
              style={[styles.closeBtn, { backgroundColor: theme.subCardBg, borderColor: theme.cardBorder }]}
            >
              <MaterialCommunityIcons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Search Input Bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.subCardBg, borderColor: theme.cardBorder }]}>
            <MaterialCommunityIcons name="magnify" size={22} color={theme.accent} style={{ marginLeft: 12 }} />
            <TextInput
              style={styles.input}
              placeholder="Song, Artist, Playlist oder YouTube-Link..."
              placeholderTextColor="#666"
              value={query}
              onChangeText={handleQueryChange}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => performSearch(query, filter)}
              clearButtonMode="while-editing"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => handleQueryChange('')} style={{ padding: 8 }}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#888" />
              </TouchableOpacity>
            )}
          </View>

          {/* Source Filter Chips */}
          <View style={styles.filterRow}>
            {(['all', 'youtube', 'audius'] as SourceFilter[]).map((f) => {
              const active = filter === f;
              const label = f === 'all' ? '🌐 Alle' : (f === 'youtube' ? '🔴 YouTube' : '🎵 Audius HQ');
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => { triggerLight(); handleFilterChange(f); }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? theme.accentSoftBg : '#1A1A1A',
                      borderColor: active ? theme.accent : '#2C2C2C'
                    }
                  ]}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: active ? theme.accent : '#999', fontWeight: active ? 'bold' : 'normal' }
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab Switcher: Songs vs Playlists */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'tracks' && [styles.activeTabBtn, { borderBottomColor: theme.accent }]
              ]}
              onPress={() => { triggerLight(); setActiveTab('tracks'); }}
            >
              <MaterialCommunityIcons 
                name="music-note" 
                size={16} 
                color={activeTab === 'tracks' ? theme.accent : '#888'} 
              />
              <Text style={[
                styles.tabBtnText, 
                activeTab === 'tracks' && { color: theme.accent, fontWeight: 'bold' }
              ]}>
                Songs {results.length > 0 ? `(${results.length})` : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'playlists' && [styles.activeTabBtn, { borderBottomColor: theme.accent }]
              ]}
              onPress={() => { triggerLight(); setActiveTab('playlists'); }}
            >
              <MaterialCommunityIcons 
                name="playlist-play" 
                size={18} 
                color={activeTab === 'playlists' ? theme.accent : '#888'} 
              />
              <Text style={[
                styles.tabBtnText, 
                activeTab === 'playlists' && { color: theme.accent, fontWeight: 'bold' }
              ]}>
                Playlists {playlists.length > 0 ? `(${playlists.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Detected YouTube URL Alert Box */}
          {detectedYtPlaylistId && (
            <View style={[styles.detectedBanner, { borderColor: '#FF000080', backgroundColor: '#FF000020' }]}>
              <MaterialCommunityIcons name="playlist-music" size={22} color="#FF0000" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.detectedTitle}>YouTube Playlist-Link erkannt</Text>
                <Text style={styles.detectedSub}>Playlist-ID: {detectedYtPlaylistId}</Text>
              </View>
              <TouchableOpacity
                style={[styles.streamBtn, { backgroundColor: '#FF0000', paddingHorizontal: 10 }]}
                onPress={() => {
                  setActiveTab('playlists');
                  performSearch(query, 'youtube');
                }}
              >
                <Text style={styles.streamBtnText}>Laden</Text>
              </TouchableOpacity>
            </View>
          )}

          {detectedYtId && !detectedYtPlaylistId && (
            <View style={styles.detectedBanner}>
              <MaterialCommunityIcons name="youtube" size={20} color="#FF0000" />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.detectedTitle}>Direkter YouTube-Link erkannt</Text>
                <Text style={styles.detectedSub}>Video-ID: {detectedYtId}</Text>
              </View>
              <TouchableOpacity
                style={[styles.streamBtn, { backgroundColor: '#FF0000', paddingHorizontal: 10 }]}
                onPress={() => {
                  setActiveTab('tracks');
                  performSearch(query, 'youtube');
                }}
              >
                <Text style={styles.streamBtnText}>Laden</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading Indicator */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={[styles.loadingText, { color: theme.accent }]}>
                {activeTab === 'tracks'
                  ? 'Durchsuche Millionen Songs auf YouTube & Audius...'
                  : 'Durchsuche Playlists auf YouTube & Audius...'}
              </Text>
            </View>
          ) : activeTab === 'playlists' ? (
            /* --- PLAYLISTS TAB VIEW --- */
            playlists.length > 0 ? (
              <FlatList
                data={playlists}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={renderPlaylistItem}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={query.trim().length === 0 ? (
                  <View style={styles.sectionHeaderBanner}>
                    <MaterialCommunityIcons name="fire" size={16} color={theme.accent} />
                    <Text style={[styles.sectionHeaderText, { color: theme.accent }]}>
                      Beliebte Workout Playlists (1-Klick Stream & Speichern)
                    </Text>
                  </View>
                ) : null}
              />
            ) : (
              <View style={styles.noResultsBox}>
                <MaterialCommunityIcons name="playlist-remove" size={48} color="#444" />
                <Text style={styles.noResultsText}>Keine Playlists gefunden</Text>
                <Text style={styles.noResultsSub}>
                  Versuche eine Suche nach "Workout", "Gym PR" oder füge direkt einen YouTube-Playlist-Link ein.
                </Text>
                <TouchableOpacity
                  style={[styles.streamBtn, { backgroundColor: theme.accent, marginTop: 16, paddingHorizontal: 16 }]}
                  onPress={() => {
                    setQuery('');
                    setPlaylists(getCuratedWorkoutPlaylists());
                  }}
                >
                  <Text style={styles.streamBtnText}>Zu den Workout Playlists</Text>
                </TouchableOpacity>
              </View>
            )
          ) : results.length > 0 ? (
            /* --- SONGS TAB VIEW: RESULTS --- */
            <FlatList
              data={results}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          ) : (
            /* --- SONGS TAB VIEW: SUGGESTIONS --- */
            <View style={styles.emptyContainer}>
              {query.trim().length > 0 ? (
                <View style={styles.noResultsBox}>
                  <MaterialCommunityIcons name="music-off" size={48} color="#444" />
                  <Text style={styles.noResultsText}>Keine passenden Titel gefunden</Text>
                  <Text style={styles.noResultsSub}>
                    Versuche einen anderen Begriff oder wechsle zum "Playlists"-Tab.
                  </Text>
                  <TouchableOpacity
                    style={[styles.streamBtn, { backgroundColor: theme.accent, marginTop: 16, paddingHorizontal: 16 }]}
                    onPress={() => handleQueryChange('')}
                  >
                    <Text style={styles.streamBtnText}>Zu den Vorschlägen</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView
                  style={{ flex: 1, width: '100%' }}
                  contentContainerStyle={{ paddingBottom: 40 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Workout Quick Search Tags */}
                  <View style={styles.suggestionsWrapper}>
                    <View style={styles.suggestionsHeader}>
                      <MaterialCommunityIcons name="lightning-bolt" size={16} color={theme.accent} />
                      <Text style={styles.suggestionsTitle}>Schnellsuche für dein Workout</Text>
                    </View>
                    <View style={styles.suggestionsGrid}>
                      {WORKOUT_SUGGESTIONS.map((tag, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.suggestionPill,
                            { backgroundColor: theme.subCardBg, borderColor: theme.cardBorder }
                          ]}
                          onPress={() => handleSelectQuickTag(tag)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.suggestionPillText}>{tag}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Smart Recommendations Section */}
                  <View style={{ marginTop: 18 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 16 }}>✨</Text>
                        <Text style={{ color: '#FFF', fontSize: 15, fontWeight: 'bold' }}>Automatische Vorschläge</Text>
                      </View>
                      <View style={{
                        backgroundColor: theme.accentSoftBg,
                        borderWidth: 1,
                        borderColor: theme.accentBorder,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10
                      }}>
                        <Text style={{ color: theme.accent, fontSize: 9, fontWeight: 'bold' }}>HQ STREAM</Text>
                      </View>
                    </View>

                    {/* Recommendation Category Filter Pills */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[
                          { id: 'all', label: 'Alle Vorschläge' },
                          { id: 'pr_boost', label: '🔥 Heavy PR' },
                          { id: 'push_day_rap', label: '🏋️ Deutschrap & Trap' },
                          { id: 'cardio_pace', label: '⚡ Cardio Pace' }
                        ].map((cat) => {
                          const active = recCategory === cat.id;
                          return (
                            <TouchableOpacity
                              key={cat.id}
                              onPress={() => { triggerLight(); setRecCategory(cat.id); }}
                              style={{
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 16,
                                backgroundColor: active ? theme.accent : theme.subCardBg,
                                borderWidth: 1,
                                borderColor: active ? theme.accent : theme.cardBorder
                              }}
                            >
                              <Text style={{
                                color: active ? '#000' : '#AAA',
                                fontSize: 11,
                                fontWeight: active ? 'bold' : '600'
                              }}>
                                {cat.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>

                    {/* Render Recommendation Sections */}
                    {visibleSections.map((section) => (
                      <View key={section.id} style={{ marginBottom: 16 }}>
                        <View style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                          paddingBottom: 4,
                          borderBottomWidth: 1,
                          borderBottomColor: '#222'
                        }}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <MaterialCommunityIcons
                                name={(section.icon as any) || 'fire'}
                                size={16}
                                color={theme.accent}
                              />
                              <Text style={{ color: '#FFF', fontSize: 13, fontWeight: 'bold' }}>{section.title}</Text>
                            </View>
                            <Text style={{ color: '#888', fontSize: 10, marginTop: 1 }}>{section.subtitle}</Text>
                          </View>
                          <View style={{
                            backgroundColor: '#281118',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#FF2A6D50'
                          }}>
                            <Text style={{ color: '#FF2A6D', fontSize: 9, fontWeight: 'bold' }}>{section.badge}</Text>
                          </View>
                        </View>

                        {section.tracks.map((track) => (
                          <View key={track.id} style={{ marginBottom: 10 }}>
                            {renderItem({ item: track })}
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    paddingTop: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    height: 46,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    paddingHorizontal: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#282828',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
    gap: 6,
  },
  activeTabBtn: {
    backgroundColor: '#242424',
  },
  tabBtnText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  detectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF000015',
    borderWidth: 1,
    borderColor: '#FF000040',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  detectedTitle: {
    color: '#FF5555',
    fontSize: 12,
    fontWeight: 'bold',
  },
  detectedSub: {
    color: '#AAA',
    fontSize: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 40,
    gap: 10,
  },
  sectionHeaderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    marginBottom: 4,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbWrapper: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
  },
  playlistThumbWrapper: {
    position: 'relative',
    width: 68,
    height: 68,
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
  },
  sourceBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    gap: 2,
  },
  sourceBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  metaContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  trackTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  trackArtist: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationText: {
    color: '#888',
    fontSize: 9,
    fontWeight: '600',
  },
  bpmBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  bpmText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#202020',
    paddingTop: 8,
  },
  streamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  streamBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  secondaryBtnText: {
    color: '#CCC',
    fontSize: 10,
    fontWeight: '600',
  },
  expandedTracksContainer: {
    backgroundColor: '#161616',
    borderRadius: 10,
    borderLeftWidth: 3,
    padding: 10,
    marginTop: 10,
  },
  expandedTracksTitle: {
    color: '#DDD',
    fontSize: 11,
    fontWeight: 'bold',
  },
  previewTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#202020',
  },
  previewTrackIndex: {
    color: '#777',
    fontSize: 11,
    width: 22,
    fontWeight: 'bold',
  },
  previewTrackTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  previewTrackArtist: {
    color: '#888',
    fontSize: 10,
    marginTop: 1,
  },
  emptyContainer: {
    flex: 1,
    paddingTop: 10,
  },
  noResultsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  noResultsText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
  },
  noResultsSub: {
    color: '#777',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 30,
  },
  suggestionsWrapper: {
    paddingTop: 8,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  suggestionsTitle: {
    color: '#AAA',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestionPillText: {
    color: '#DDD',
    fontSize: 12,
    fontWeight: '500',
  },
});
