import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMusicStore, Song } from '../store/useMusicStore';
import { useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';
import { triggerLight, triggerSuccess } from '../utils/haptics';
import { resolveAudioStreamUrl, cacheStreamTrackForOffline } from '../services/streamingMusicService';
import { getResolvedUri } from '../utils/uriResolver';

interface FavoritesModalProps {
  visible: boolean;
  onClose: () => void;
  onPlaySong: (song: Omit<Song, 'playCount'>) => void;
  onOpenSearch?: (query?: string) => void;
}

export default function FavoritesModal({
  visible,
  onClose,
  onPlaySong,
  onOpenSearch
}: FavoritesModalProps) {
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);
  const { favoriteSongs, toggleFavoriteSong, addToQueue, setPowerSong, playlists } = useMusicStore();

  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [queuedId, setQueuedId] = useState<string | null>(null);

  const formatDuration = (millis?: number) => {
    if (!millis || millis <= 0) return '';
    const totalSecs = Math.floor(millis / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlaySingle = (song: Song) => {
    triggerLight();
    useMusicStore.getState().playPlaylist('favorites', { startSongId: song.id, shuffle: false });
    onClose();
  };

  const handlePlayAll = (shuffle: boolean = false) => {
    if (favoriteSongs.length === 0) return;
    triggerSuccess();
    useMusicStore.getState().playPlaylist('favorites', { shuffle });
    onClose();
  };

  const handleAddToQueue = (song: Song) => {
    triggerSuccess();
    addToQueue(song);
    setQueuedId(song.id);
    setTimeout(() => setQueuedId(null), 2000);
  };

  const handleSetPowerSong = (song: Song) => {
    triggerSuccess();
    setPowerSong({
      songId: song.id,
      playlistId: 'favorites',
      startPosition: 0
    });
    Alert.alert('⚡ PowerSong gesetzt', `"${song.title}" ist jetzt dein PR-PowerSong!`);
  };

  const handleCacheOffline = async (song: Song) => {
    try {
      triggerLight();
      setDownloadingId(song.id);
      setDownloadProgress(0);
      await cacheStreamTrackForOffline(song, (pct) => setDownloadProgress(pct));
      triggerSuccess();
      Alert.alert('Erfolg', `"${song.title}" offline gespeichert!`);
    } catch (e: any) {
      Alert.alert('Fehler', e.message || 'Offline-Speicherung fehlgeschlagen.');
    } finally {
      setDownloadingId(null);
    }
  };

  const renderItem = ({ item }: { item: Song }) => {
    const isResolving = resolvingId === item.id;
    const isDownloading = downloadingId === item.id;
    const isJustQueued = queuedId === item.id;
    const parentPl = (playlists || []).find(p => p.coverUri && p.songs.some(s => s.id === item.id || s.title === item.title));
    const rawCover = item.coverUri || parentPl?.coverUri;
    const resolvedCover = rawCover ? getResolvedUri(rawCover) : undefined;
    const isYt = item.isStream && (item.videoId || item.id.length === 11);

    return (
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <View style={styles.cardHeader}>
          {/* Cover Artwork */}
          <View style={styles.thumbWrapper}>
            {resolvedCover ? (
              <Image source={{ uri: resolvedCover }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }]}>
                <MaterialCommunityIcons name="music" size={24} color="#666" />
              </View>
            )}
            <View style={[
              styles.sourceBadge,
              { backgroundColor: item.cachedUri ? '#00FF66D0' : (isYt ? '#FF0000E0' : theme.accent) }
            ]}>
              <MaterialCommunityIcons 
                name={item.cachedUri ? 'cloud-check' : (isYt ? 'youtube' : 'music-circle')} 
                size={10} 
                color="#FFF" 
              />
              <Text style={styles.sourceBadgeText}>
                {item.cachedUri ? 'OFFLINE' : (isYt ? 'YouTube' : 'HQ Stream')}
              </Text>
            </View>
          </View>

          {/* Meta Info */}
          <View style={styles.metaContainer}>
            <Text style={styles.trackTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (onOpenSearch && item.artist) {
                  onClose();
                  onOpenSearch(item.artist);
                }
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}
            >
              <MaterialCommunityIcons name="account-music-outline" size={13} color={theme.accent} />
              <Text style={[styles.trackArtist, { color: theme.accent, textDecorationLine: 'underline' }]} numberOfLines={1}>
                {item.artist || 'Unbekannter Künstler'}
              </Text>
            </TouchableOpacity>

            <View style={styles.badgesRow}>
              {item.durationMillis && item.durationMillis > 0 ? (
                <View style={styles.durationBadge}>
                  <MaterialCommunityIcons name="clock-outline" size={10} color="#888" />
                  <Text style={styles.durationText}>{formatDuration(item.durationMillis)}</Text>
                </View>
              ) : null}
              {item.bpm ? (
                <View style={[styles.bpmBadge, { borderColor: theme.accentBorder, backgroundColor: theme.accentSoftBg }]}>
                  <Text style={[styles.bpmText, { color: theme.accent }]}>{item.bpm} BPM</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Unfavorite Heart Button */}
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => {
              triggerLight();
              toggleFavoriteSong(item);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="heart" size={22} color="#FF2A6D" />
          </TouchableOpacity>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.streamBtn, { backgroundColor: theme.accent }]}
            onPress={() => handlePlaySingle(item)}
            disabled={isResolving}
            activeOpacity={0.8}
          >
            {isResolving ? (
              <ActivityIndicator size={14} color="#000" />
            ) : (
              <MaterialCommunityIcons name="play" size={16} color="#000" />
            )}
            <Text style={styles.streamBtnText}>{isResolving ? 'Lädt...' : 'Abspielen'}</Text>
          </TouchableOpacity>

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

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: '#FF550040', backgroundColor: '#FF550015' }]}
            onPress={() => handleSetPowerSong(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="lightning-bolt" size={14} color="#FF5500" />
            <Text style={[styles.secondaryBtnText, { color: '#FF7700' }]}>PR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.cardBorder, backgroundColor: theme.subCardBg }]}
            onPress={() => handleCacheOffline(item)}
            disabled={isDownloading || !!item.cachedUri}
            activeOpacity={0.7}
          >
            {isDownloading ? (
              <ActivityIndicator size={12} color={theme.accent} />
            ) : (
              <MaterialCommunityIcons 
                name={item.cachedUri ? 'check-circle' : 'download-outline'} 
                size={15} 
                color={item.cachedUri ? '#00FF66' : '#AAA'} 
              />
            )}
            <Text style={[styles.secondaryBtnText, item.cachedUri && { color: '#00FF66' }]}>
              {item.cachedUri ? 'Gecacht' : (isDownloading ? `${downloadProgress}%` : 'Offline')}
            </Text>
          </TouchableOpacity>
        </View>
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
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.topBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.heartIconCircle}>
                <MaterialCommunityIcons name="heart" size={20} color="#FF2A6D" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Deine Favoriten</Text>
                <Text style={styles.modalSubtitle}>
                  {favoriteSongs.length} {favoriteSongs.length === 1 ? 'Song' : 'Songs'} direkt gespeichert
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => { triggerLight(); onClose(); }}
              style={[styles.closeBtn, { backgroundColor: theme.subCardBg, borderColor: theme.cardBorder }]}
            >
              <MaterialCommunityIcons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Quick Play & Shuffle Buttons (if favorites exist) */}
          {favoriteSongs.length > 0 && (
            <View style={styles.quickPlayRow}>
              <TouchableOpacity
                style={[styles.quickPlayBtn, { backgroundColor: '#FF2A6D' }]}
                onPress={() => handlePlayAll(false)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="play" size={18} color="#FFF" />
                <Text style={styles.quickPlayBtnText}>Alle abspielen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickPlayBtnSecondary, { backgroundColor: theme.subCardBg, borderColor: theme.cardBorder }]}
                onPress={() => handlePlayAll(true)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="shuffle-variant" size={18} color={theme.accent} />
                <Text style={[styles.quickPlayBtnTextSecondary, { color: theme.accent }]}>Shuffeln</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Body */}
          {favoriteSongs.length > 0 ? (
            <FlatList
              data={favoriteSongs}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name="heart-outline" size={48} color="#FF2A6D" />
              </View>
              <Text style={styles.emptyTitle}>Noch keine Favoriten gespeichert</Text>
              <Text style={styles.emptySubtitle}>
                Tippe auf das ❤️ Herz bei einem beliebigen Song in der Suche, bei den Vorschlägen oder im Player, um ihn hier direkt zu sichern.
              </Text>
              {onOpenSearch && (
                <TouchableOpacity
                  style={[styles.emptySearchBtn, { backgroundColor: theme.accent }]}
                  onPress={() => {
                    onClose();
                    onOpenSearch();
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="magnify" size={16} color="#000" />
                  <Text style={styles.emptySearchBtnText}>Songs online suchen</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
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
    height: '90%',
    paddingTop: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heartIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FF005520',
    borderWidth: 1,
    borderColor: '#FF2A6D50',
    justifyContent: 'center',
    alignItems: 'center',
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
  quickPlayRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  quickPlayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  quickPlayBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickPlayBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  quickPlayBtnTextSecondary: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 40,
    gap: 10,
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
  thumbWrapper: {
    position: 'relative',
    width: 58,
    height: 58,
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  sourceBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1.5,
    gap: 2,
  },
  sourceBadgeText: {
    color: '#FFF',
    fontSize: 7.5,
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
  heartBtn: {
    padding: 8,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF005515',
    borderWidth: 1,
    borderColor: '#FF2A6D30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#777',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptySearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  emptySearchBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
