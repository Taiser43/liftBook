import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useActiveTrack } from 'react-native-track-player';
import { useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';
import { useMusicStore, Song } from '../store/useMusicStore';
import { getResolvedUri } from '../utils/uriResolver';
import { cacheStreamTrackForOffline } from '../services/streamingMusicService';
import { triggerLight } from '../utils/haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
  positionMillis: number;
  durationMillis: number;
  onSeek: (positionSeconds: number) => void;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  isCurrentlyPlaying: boolean;
  isRestreaming?: boolean;
}

const { width, height } = Dimensions.get('window');

export default function NowPlayingModal({
  visible,
  onClose,
  positionMillis,
  durationMillis,
  onSeek,
  onPlayPause,
  onNext,
  onPrevious,
  isCurrentlyPlaying,
  isRestreaming = false
}: Props) {
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);

  const {
    currentSongId,
    currentQueueSong,
    playlists,
    currentPlaylistId,
    isShuffle,
    isRepeat,
    toggleShuffle,
    toggleRepeat,
    toggleLikeSong,
    toggleFavoriteSong,
    isSongFavorite,
    setPowerSong,
    queue
  } = useMusicStore();

  const [isCaching, setIsCaching] = useState(false);
  const [cacheProgress, setCacheProgress] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const [slidingPos, setSlidingPos] = useState<number | null>(null);

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

  const formatTime = (millis: number) => {
    const totalSecs = Math.max(0, Math.floor(millis / 1000));
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCacheOffline = async () => {
    if (!effectiveSong) return;
    if (effectiveSong.cachedUri) {
      Alert.alert('Bereits offline', 'Dieser Track ist bereits auf deinem Gerät gespeichert.');
      return;
    }
    triggerLight();
    setIsCaching(true);
    setCacheProgress(0);

    try {
      await cacheStreamTrackForOffline(effectiveSong, (pct) => setCacheProgress(pct));
      Alert.alert('Offline verfügbar', 'Song wurde erfolgreich für dein Gym-Training heruntergeladen!');
    } catch (e: any) {
      Alert.alert('Fehler', 'Konnte Track nicht offline speichern: ' + String(e.message || e));
    } finally {
      setIsCaching(false);
    }
  };

  const handleSetPowerSong = () => {
    if (!effectiveSong) return;
    triggerLight();
    setPowerSong({
      songId: effectiveSong.id,
      playlistId: currentPlaylistId || 'stream_queue',
      startPosition: Math.floor(positionMillis / 1000) || 60
    });
    Alert.alert('⚡ PowerSong gesetzt', `Startet ab Minute ${formatTime(positionMillis)} mit maximaler Lautstärke!`);
  };

  if (!effectiveSong) return null;

  const rawCover = effectiveSong.coverUri || currentPlaylist?.coverUri;
  const coverUri = getResolvedUri(rawCover);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: '#121212' }]}>
        
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onClose} style={styles.headerIconButton}>
            <MaterialCommunityIcons name="chevron-down" size={28} color="#FFF" />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerSub}>WIEDERGABE AUS</Text>
            <Text style={[styles.headerTitle, { color: theme.accent }]} numberOfLines={1}>
              {currentQueueSong ? 'Live Stream' : (currentPlaylist?.name || 'Iron Log Music')}
            </Text>
          </View>

          <TouchableOpacity onPress={() => setShowQueue(!showQueue)} style={styles.headerIconButton}>
            <MaterialCommunityIcons 
              name={showQueue ? "music-note" : "playlist-music"} 
              size={24} 
              color={showQueue ? theme.accent : "#FFF"} 
            />
          </TouchableOpacity>
        </View>

        {showQueue ? (
          /* Queue View */
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            <Text style={[styles.queueHeader, { color: theme.accent }]}>Nächste Titel in der Warteschlange</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {queue.length === 0 ? (
                <View style={styles.emptyQueue}>
                  <MaterialCommunityIcons name="playlist-remove" size={48} color="#444" />
                  <Text style={styles.emptyQueueText}>Keine Songs in der manuellen Queue.</Text>
                  <Text style={styles.emptyQueueSub}>Songs werden aus der aktiven Playlist abgespielt.</Text>
                </View>
              ) : (
                queue.map((item, idx) => (
                  <View key={item.id + '_' + idx} style={[styles.queueItem, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}>
                    <Text style={styles.queueIndex}>{idx + 1}</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.queueItemTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.queueItemArtist} numberOfLines={1}>{item.artist}</Text>
                    </View>
                    <MaterialCommunityIcons name="drag-horizontal-variant" size={20} color="#666" />
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        ) : (
          /* Main Now Playing View */
          <View style={styles.mainContent}>
            
            {/* Giant Album Artwork */}
            <View style={styles.artworkContainer}>
              <View style={[styles.artworkWrapper, { borderColor: theme.cardBorder }]}>
                {coverUri ? (
                  <Image source={{ uri: coverUri }} style={styles.artworkImage as any} />
                ) : (
                  <View style={[styles.artworkPlaceholder, { backgroundColor: theme.cardBg }]}>
                    <MaterialCommunityIcons name="music" size={80} color="#444" />
                  </View>
                )}

                {/* Quality & BPM Badges */}
                <View style={[styles.streamBadge, { backgroundColor: 'rgba(0,0,0,0.7)', borderColor: theme.accentBorder }]}>
                  <Text style={[styles.streamBadgeText, { color: theme.accent }]}>
                    {effectiveSong.cachedUri ? 'Offline Gecacht' : (effectiveSong.isStream ? '320 kbps Stream' : 'Lokale MP3')}
                  </Text>
                </View>

                {effectiveSong.bpm && (
                  <View style={[styles.bpmBadge, { backgroundColor: theme.accent }]}>
                    <Text style={styles.bpmText}>{effectiveSong.bpm} BPM</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Song Details Row */}
            <View style={styles.detailsRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {effectiveSong.title}
                </Text>
                <Text style={styles.artistName} numberOfLines={1}>
                  {effectiveSong.artist || 'Unbekannter Künstler'}
                </Text>
              </View>

              <TouchableOpacity 
                onPress={() => { 
                  triggerLight(); 
                  toggleFavoriteSong(effectiveSong); 
                }}
                style={styles.likeButton}
              >
                <MaterialCommunityIcons 
                  name={(effectiveSong?.isLiked || isSongFavorite(effectiveSong.id)) ? "heart" : "heart-outline"} 
                  size={28} 
                  color={(effectiveSong?.isLiked || isSongFavorite(effectiveSong.id)) ? "#FF2A6D" : "#888"} 
                />
              </TouchableOpacity>
            </View>

            {/* Progress Slider */}
            {(() => {
              const effectiveDuration = (durationMillis && durationMillis > 0)
                ? durationMillis
                : (effectiveSong.durationMillis && effectiveSong.durationMillis > 0
                  ? effectiveSong.durationMillis
                  : 180000);
              const currentPos = slidingPos !== null ? slidingPos : Math.min(positionMillis, effectiveDuration);

              return (
                <View style={styles.sliderContainer}>
                  <Slider
                    style={{ width: '100%', height: 32 }}
                    minimumValue={0}
                    maximumValue={effectiveDuration}
                    value={Math.min(currentPos, effectiveDuration)}
                    minimumTrackTintColor={theme.accent}
                    maximumTrackTintColor="#262626"
                    thumbTintColor={theme.accent}
                    onSlidingStart={() => setSlidingPos(positionMillis)}
                    onValueChange={(val) => setSlidingPos(val)}
                    onSlidingComplete={async (val) => {
                      setSlidingPos(val);
                      await onSeek(val / 1000);
                      setTimeout(() => setSlidingPos(null), 300);
                    }}
                  />
                  <View style={styles.timeLabelsRow}>
                    <Text style={styles.timeText}>{formatTime(currentPos)}</Text>
                    <Text style={styles.timeText}>{formatTime(effectiveDuration)}</Text>
                  </View>
                </View>
              );
            })()}

            {/* Playback Controls Panel */}
            <View style={styles.controlsRow}>
              <TouchableOpacity onPress={() => { triggerLight(); toggleShuffle(); }} style={styles.auxControl}>
                <MaterialCommunityIcons 
                  name="shuffle-variant" 
                  size={24} 
                  color={isShuffle ? theme.accent : "#666"} 
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { triggerLight(); onPrevious(); }} style={styles.skipButton}>
                <MaterialCommunityIcons name="skip-previous" size={36} color="#FFF" />
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => { triggerLight(); onPlayPause(); }}
                disabled={isRestreaming}
                style={[styles.playPauseButton, { backgroundColor: theme.accent }]}
              >
                {isRestreaming ? (
                  <ActivityIndicator size="large" color="#000" />
                ) : (
                  <MaterialCommunityIcons 
                    name={isCurrentlyPlaying ? "pause" : "play"} 
                    size={40} 
                    color="#000" 
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { triggerLight(); onNext(); }} style={styles.skipButton}>
                <MaterialCommunityIcons name="skip-next" size={36} color="#FFF" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { triggerLight(); toggleRepeat(); }} style={styles.auxControl}>
                <MaterialCommunityIcons 
                  name="repeat" 
                  size={24} 
                  color={isRepeat ? theme.accent : "#666"} 
                />
              </TouchableOpacity>
            </View>

            {/* Utility Quick Actions */}
            <View style={[styles.utilityRow, { borderTopColor: theme.subtleBorder }]}>
              <TouchableOpacity 
                onPress={handleCacheOffline}
                disabled={isCaching}
                style={[styles.utilityBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
              >
                {isCaching ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <>
                    <MaterialCommunityIcons 
                      name={effectiveSong.cachedUri ? "cloud-check" : "download"} 
                      size={18} 
                      color={effectiveSong.cachedUri ? theme.accent : "#AAA"} 
                    />
                    <Text style={[styles.utilityBtnText, effectiveSong.cachedUri ? { color: theme.accent } : {}]}>
                      {effectiveSong.cachedUri ? 'Offline Gespeichert' : 'Offline Cachen'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleSetPowerSong}
                style={[styles.utilityBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
              >
                <MaterialCommunityIcons name="lightning-bolt" size={18} color="#FF9500" />
                <Text style={styles.utilityBtnText}>Als PowerSong</Text>
              </TouchableOpacity>
            </View>

          </View>
        )}

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 16 : 24,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSub: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    maxWidth: width * 0.5,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-around',
    paddingBottom: 24,
  },
  artworkContainer: {
    alignItems: 'center',
  },
  artworkWrapper: {
    width: width * 0.78,
    height: width * 0.78,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streamBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  streamBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  bpmBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bpmText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#000',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  songTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  artistName: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  likeButton: {
    padding: 6,
  },
  sliderContainer: {
    width: '100%',
  },
  timeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#888',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  auxControl: {
    padding: 8,
  },
  skipButton: {
    padding: 8,
  },
  playPauseButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  utilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  utilityBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#CCC',
  },
  queueHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  queueIndex: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    width: 20,
  },
  queueItemTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFF',
  },
  queueItemArtist: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  emptyQueue: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyQueueText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    marginTop: 12,
  },
  emptyQueueSub: {
    fontSize: 12,
    color: '#555',
    marginTop: 4,
  },
});
