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
import { getResolvedUri } from '../utils/uriResolver';

interface DownloadedSongsModalProps {
  visible: boolean;
  onClose: () => void;
  onPlaySong: (song: Omit<Song, 'playCount'>) => void;
  onOpenSearch?: () => void;
}

export default function DownloadedSongsModal({
  visible,
  onClose,
  onPlaySong,
  onOpenSearch
}: DownloadedSongsModalProps) {
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);
  const {
    getAllDownloadedSongs,
    removeDownloadedSong,
    addToQueue,
    setPowerSong,
    toggleFavoriteSong,
    isSongFavorite
  } = useMusicStore();

  const [queuedId, setQueuedId] = useState<string | null>(null);

  // Subscribe to store arrays so newly downloaded songs trigger instant UI updates
  const storeDownloaded = useMusicStore(state => state.downloadedSongs);
  const storePlaylists = useMusicStore(state => state.playlists);

  // Retrieve all downloaded songs across standalone downloads, playlists, and favorites
  const downloadedSongs = getAllDownloadedSongs();

  const formatDuration = (millis?: number) => {
    if (!millis || millis <= 0) return '';
    const totalSecs = Math.floor(millis / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlaySingle = (song: Song) => {
    triggerLight();
    useMusicStore.getState().playPlaylist('downloaded', { startSongId: song.id, shuffle: false });
    onClose();
  };

  const handlePlayAll = (shuffle: boolean = false) => {
    if (downloadedSongs.length === 0) return;
    triggerSuccess();
    useMusicStore.getState().playPlaylist('downloaded', { shuffle });
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
      playlistId: 'downloaded',
      startPosition: 0
    });
    Alert.alert('⚡ PowerSong gesetzt', `"${song.title}" ist jetzt dein PR-PowerSong!`);
  };

  const handleDeleteDownloaded = (song: Song) => {
    Alert.alert(
      'Download löschen?',
      `Möchtest du "${song.title}" vom lokalen Speicher entfernen? Der Speicherplatz wird sofort freigegeben.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            triggerLight();
            await removeDownloadedSong(song.id);
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Song }) => {
    const parentPl = storePlaylists.find(p => p.coverUri && p.songs.some(s => s.id === item.id || s.title === item.title));
    const rawCover = item.coverUri || parentPl?.coverUri;
    const coverUri = getResolvedUri(rawCover);
    const isFav = isSongFavorite(item.id);
    const isJustQueued = queuedId === item.id;

    return (
      <View style={[styles.songCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <View style={styles.topInfoRow}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.cover} />
          ) : (
            <View style={[styles.coverFallback, { backgroundColor: theme.subCardBg }]}>
              <MaterialCommunityIcons name="download" size={24} color={theme.accent} />
            </View>
          )}

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {item.artist || 'Unbekannter Künstler'}
            </Text>

            <View style={styles.badgesRow}>
              <View style={[styles.offlineBadge, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorder }]}>
                <MaterialCommunityIcons name="check-circle" size={10} color={theme.accent} />
                <Text style={[styles.offlineBadgeText, { color: theme.accent }]}>OFFLINE BEREIT</Text>
              </View>
              {item.durationMillis && item.durationMillis > 0 ? (
                <Text style={styles.durationText}>{formatDuration(item.durationMillis)}</Text>
              ) : null}
            </View>
          </View>

          {/* Favorite Toggle */}
          <TouchableOpacity
            onPress={() => {
              triggerLight();
              toggleFavoriteSong(item);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ padding: 6 }}
          >
            <MaterialCommunityIcons
              name={isFav ? "heart" : "heart-outline"}
              size={22}
              color={isFav ? "#FF2A6D" : "#666"}
            />
          </TouchableOpacity>
        </View>

        {/* Action Controls Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.streamBtn, { backgroundColor: theme.accent }]}
            onPress={() => handlePlaySingle(item)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="play" size={16} color="#000" />
            <Text style={styles.streamBtnText}>Abspielen</Text>
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
            style={[styles.secondaryBtn, { borderColor: '#FF000030', backgroundColor: '#FF000010' }]}
            onPress={() => handleDeleteDownloaded(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="delete-outline" size={15} color="#FF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={[styles.headerIconBadge, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorder }]}>
              <MaterialCommunityIcons name="download" size={20} color={theme.accent} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Heruntergeladen</Text>
              <Text style={styles.headerSub}>
                {downloadedSongs.length} {downloadedSongs.length === 1 ? 'Titel' : 'Titel'} lokal auf deinem Gerät
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.subCardBg, borderColor: theme.cardBorder }]}>
            <MaterialCommunityIcons name="close" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Global Quick Action Bar */}
        {downloadedSongs.length > 0 && (
          <View style={[styles.actionBar, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <TouchableOpacity
              style={[styles.mainActionBtn, { backgroundColor: theme.accent }]}
              onPress={() => handlePlayAll(false)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="play" size={18} color="#000" />
              <Text style={styles.mainActionBtnText}>Alle abspielen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mainActionBtn, { backgroundColor: theme.subCardBg, borderWidth: 1, borderColor: theme.cardBorder }]}
              onPress={() => handlePlayAll(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="shuffle-variant" size={18} color="#FFF" />
              <Text style={[styles.mainActionBtnText, { color: '#FFF' }]}>Shuffeln</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content List */}
        {downloadedSongs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <MaterialCommunityIcons name="download-off" size={48} color={theme.accent} />
            </View>
            <Text style={styles.emptyTitle}>Keine heruntergeladenen Titel</Text>
            <Text style={styles.emptySub}>
              Lade beliebige Songs aus der Suche, deinen Playlists oder über YouTube herunter, um sie offline ohne Internet im Gym abzuspielen.
            </Text>
            {onOpenSearch && (
              <TouchableOpacity
                style={[styles.exploreBtn, { backgroundColor: theme.accent }]}
                onPress={() => {
                  onClose();
                  onOpenSearch();
                }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="magnify" size={18} color="#000" />
                <Text style={styles.exploreBtnText}>Jetzt Songs suchen</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={downloadedSongs}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222'
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  headerSub: {
    color: '#888',
    fontSize: 12,
    marginTop: 2
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionBar: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10
  },
  mainActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6
  },
  mainActionBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: 'bold'
  },
  listContent: {
    padding: 16,
    gap: 12
  },
  songCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12
  },
  topInfoRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  cover: {
    width: 50,
    height: 50,
    borderRadius: 8
  },
  coverFallback: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold'
  },
  artist: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 2
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 3
  },
  offlineBadgeText: {
    fontSize: 9,
    fontWeight: 'bold'
  },
  durationText: {
    color: '#777',
    fontSize: 10
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#222'
  },
  streamBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4
  },
  streamBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold'
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3
  },
  secondaryBtnText: {
    color: '#CCC',
    fontSize: 11,
    fontWeight: '600'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center'
  },
  emptySub: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8
  },
  exploreBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold'
  }
});
