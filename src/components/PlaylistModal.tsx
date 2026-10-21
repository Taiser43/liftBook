import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Playlist, Song, useMusicStore } from '../store/useMusicStore';
import { useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import PowerSongConfigModal from './PowerSongConfigModal';
import { cacheStreamTrackForOffline } from '../services/streamingMusicService';
import { triggerLight, triggerSuccess } from '../utils/haptics';
import { getResolvedUri } from '../utils/uriResolver';

interface Props {
  visible: boolean;
  playlist: Playlist | null;
  onClose: () => void;
  onOpenSearch?: (query?: string) => void;
}

const { width } = Dimensions.get('window');

export default function PlaylistModal({ visible, playlist, onClose, onOpenSearch }: Props) {
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);

  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCoverUri, setEditCoverUri] = useState<string | undefined>(undefined);
  const [powerSongConfigVisible, setPowerSongConfigVisible] = useState(false);
  const [selectedPowerSong, setSelectedPowerSong] = useState<Song | null>(null);
  const [queuedId, setQueuedId] = useState<string | null>(null);
  const [isDownloadingPlaylist, setIsDownloadingPlaylist] = useState(false);
  const [downloadProgressText, setDownloadProgressText] = useState('');

  const {
    setCurrentSong,
    toggleShuffle,
    isShuffle,
    currentSongId,
    isPlaying,
    updatePlaylist,
    deletePlaylist,
    toggleFavoriteSong,
    isSongFavorite,
    addToQueue,
    setPowerSong
  } = useMusicStore();

  const storePlaylist = useMusicStore(state => state.playlists.find(p => p.id === playlist?.id));
  const activeStream = useMusicStore(state => state.activeStreamPlaylist?.id === playlist?.id ? state.activeStreamPlaylist : null);
  const activePlaylist = storePlaylist || activeStream || playlist;

  useEffect(() => {
    if (activePlaylist) {
      setEditName(activePlaylist.name);
      setEditCoverUri(activePlaylist.coverUri);
    }
  }, [activePlaylist?.id, activePlaylist?.name, activePlaylist?.coverUri]);

  if (!activePlaylist) return null;

  const filteredSongs = activePlaylist.songs.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.artist && s.artist.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDuration = (millis?: number) => {
    if (!millis || millis <= 0) return '';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const offlineSongsCount = activePlaylist.songs.filter(s => {
    return Boolean(s.cachedUri || (s.uri && (s.uri.startsWith('file://') || s.uri.startsWith('/'))));
  }).length;
  const isFullyOffline = activePlaylist.songs.length > 0 && offlineSongsCount === activePlaylist.songs.length;

  const handlePlaySong = (songId: string) => {
    triggerLight();
    useMusicStore.getState().playPlaylist(activePlaylist.id, { startSongId: songId, shuffle: isShuffle });
  };

  const handleMix = () => {
    triggerLight();
    useMusicStore.getState().playPlaylist(activePlaylist.id, { shuffle: true });
  };

  const handlePlayAll = () => {
    triggerSuccess();
    useMusicStore.getState().playPlaylist(activePlaylist.id, { startSongId: activePlaylist.songs[0]?.id, shuffle: false });
  };

  const handleAddToQueue = (song: Song) => {
    triggerSuccess();
    addToQueue(song);
    setQueuedId(song.id);
    setTimeout(() => setQueuedId(null), 2000);
  };

  const handleSetPowerSong = (song: Song) => {
    triggerSuccess();
    setSelectedPowerSong(song);
    setPowerSongConfigVisible(true);
  };

  const handleRemoveSong = (song: Song) => {
    Alert.alert(
      'Song entfernen?',
      `Möchtest du "${song.title}" aus der Playlist "${activePlaylist.name}" entfernen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entfernen',
          style: 'destructive',
          onPress: () => {
            triggerLight();
            useMusicStore.getState().removeSongFromPlaylist(activePlaylist.id, song.id);
          }
        }
      ]
    );
  };

  const handleDownloadEntirePlaylist = async () => {
    if (activePlaylist.songs.length === 0) return;
    try {
      setIsDownloadingPlaylist(true);
      triggerLight();
      const songsToDownload = [...activePlaylist.songs];
      let completed = 0;

      for (let i = 0; i < songsToDownload.length; i++) {
        const s = songsToDownload[i];
        const isAlreadyOffline = Boolean(s.cachedUri || (s.uri && (s.uri.startsWith('file://') || s.uri.startsWith('/'))));
        if (isAlreadyOffline) {
          completed++;
          continue;
        }

        setDownloadProgressText(`${i + 1}/${songsToDownload.length}`);
        try {
          const localUri = await cacheStreamTrackForOffline(s);
          const fi = await FileSystem.getInfoAsync(localUri);
          if (fi.exists && (fi.size === undefined || fi.size > 10000)) {
            const updatedSong: Song = {
              ...s,
              uri: localUri,
              cachedUri: localUri,
              streamUrl: localUri,
              isStream: false
            };
            useMusicStore.getState().addDownloadedSong(updatedSong);
            useMusicStore.getState().cacheSongLocally(s.id, localUri);
            completed++;
          }
        } catch (e) {
          console.warn(`Fehler beim Herunterladen von "${s.title}":`, e);
        }
      }

      triggerSuccess();
      Alert.alert(
        '🎉 Playlist offline verfügbar',
        `${completed} von ${songsToDownload.length} Liedern sind nun vollständig auf deinem Smartphone gespeichert und in der Offline-Playlist verfügbar.`
      );
    } catch (err: any) {
      Alert.alert('Download-Fehler', err.message || 'Die Playlist konnte nicht vollständig heruntergeladen werden.');
    } finally {
      setIsDownloadingPlaylist(false);
      setDownloadProgressText('');
    }
  };

  const handlePickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const sourceUri = result.assets[0].uri;
      try {
        const filename = sourceUri.split('/').pop() || `cover_${Date.now()}.jpg`;
        const newUri = (FileSystem as any).documentDirectory + filename;
        await FileSystem.copyAsync({ from: sourceUri, to: newUri });
        setEditCoverUri(newUri);
      } catch (e) {
        setEditCoverUri(sourceUri);
      }
    }
  };

  const handleSaveEdit = () => {
    triggerLight();
    updatePlaylist(activePlaylist.id, editName, editCoverUri);
    setIsEditing(false);
  };

  const handleDeletePlaylist = () => {
    Alert.alert(
      'Playlist löschen?',
      `Möchtest du "${activePlaylist.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            triggerLight();
            deletePlaylist(activePlaylist.id);
            onClose();
          }
        }
      ]
    );
  };

  const renderSong = ({ item }: { item: Song }) => {
    const isCurrentlyPlaying = currentSongId === item.id;
    const isFav = isSongFavorite(item.id);
    const isJustQueued = queuedId === item.id;
    const coverUri = getResolvedUri(item.coverUri || activePlaylist.coverUri);
    const isOffline = Boolean(item.cachedUri || (item.uri && (item.uri.startsWith('file://') || item.uri.startsWith('/'))));
    const isYt = item.isStream && (item.videoId || item.id.length === 11);

    return (
      <View style={[
        styles.card,
        { backgroundColor: theme.cardBg, borderColor: isCurrentlyPlaying ? theme.accent : theme.cardBorder },
        isCurrentlyPlaying && { borderWidth: 1.5 }
      ]}>
        <View style={styles.cardHeader}>
          {/* Cover Artwork */}
          <View style={styles.thumbWrapper}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, { backgroundColor: theme.subCardBg, justifyContent: 'center', alignItems: 'center' }]}>
                <MaterialCommunityIcons name="music" size={24} color={theme.accent} />
              </View>
            )}

            {/* Source Badge */}
            <View style={[
              styles.sourceBadge,
              { backgroundColor: isOffline ? '#00AA44E0' : (isYt ? '#FF0000E0' : theme.accent) }
            ]}>
              <MaterialCommunityIcons
                name={isOffline ? 'check-circle' : (isYt ? 'youtube' : 'music-circle')}
                size={9}
                color="#FFF"
              />
              <Text style={styles.sourceBadgeText}>
                {isOffline ? 'OFFLINE' : (isYt ? 'YouTube' : 'HQ Stream')}
              </Text>
            </View>
          </View>

          {/* Meta Info */}
          <View style={styles.metaContainer}>
            <Text style={[styles.trackTitle, isCurrentlyPlaying && { color: theme.accent }]} numberOfLines={2}>
              {item.title}
            </Text>

            {item.artist ? (
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
                  {item.artist}
                </Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.badgesRow}>
              {item.durationMillis && item.durationMillis > 0 ? (
                <View style={styles.durationBadge}>
                  <MaterialCommunityIcons name="clock-outline" size={10} color="#888" />
                  <Text style={styles.durationText}>{formatDuration(item.durationMillis)}</Text>
                </View>
              ) : null}

              {isCurrentlyPlaying && isPlaying && (
                <View style={[styles.playingBadge, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorder }]}>
                  <MaterialCommunityIcons name="volume-high" size={10} color={theme.accent} />
                  <Text style={[styles.playingBadgeText, { color: theme.accent }]}>SPIELT GERADE</Text>
                </View>
              )}
            </View>
          </View>

          {/* Favorite Toggle Heart Icon */}
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => {
              triggerLight();
              toggleFavoriteSong(item);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name={isFav ? "heart" : "heart-outline"}
              size={22}
              color={isFav ? "#FF2A6D" : "#777"}
            />
          </TouchableOpacity>
        </View>

        {/* Action Controls Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.streamBtn, { backgroundColor: theme.accent }]}
            onPress={() => handlePlaySong(item.id)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name={isCurrentlyPlaying && isPlaying ? "pause" : "play"} size={16} color="#000" />
            <Text style={styles.streamBtnText}>{isCurrentlyPlaying && isPlaying ? "Pausieren" : "Abspielen"}</Text>
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
            onPress={() => handleRemoveSong(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={15} color="#FF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const resolvedPlaylistCover = activePlaylist.coverUri ? getResolvedUri(activePlaylist.coverUri) : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {isEditing ? (
          <View style={styles.editHeader}>
            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.closeBtn}>
              <Text style={styles.cancelText}>Abbrechen</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Playlist bearbeiten</Text>
            <TouchableOpacity onPress={handleSaveEdit} style={styles.saveBtn}>
              <Text style={[styles.saveText, { color: theme.accent }]}>Speichern</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="chevron-down" size={30} color={theme.accent} />
            </TouchableOpacity>

            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{activePlaylist.name}</Text>
              <Text style={styles.headerSubtitle}>
                {activePlaylist.songs.length} {activePlaylist.songs.length === 1 ? 'Song' : 'Songs'} • {offlineSongsCount} offline
              </Text>
            </View>

            <TouchableOpacity onPress={() => setIsEditing(true)} style={{ padding: 8 }}>
              <MaterialCommunityIcons name="pencil" size={22} color={theme.accent} />
            </TouchableOpacity>
          </View>
        )}

        {isEditing ? (
          <View style={styles.editBody}>
            <TouchableOpacity style={styles.coverEditContainer} onPress={handlePickCover}>
              {editCoverUri ? (
                <Image source={{ uri: getResolvedUri(editCoverUri) }} style={styles.coverEditImage} />
              ) : (
                <View style={[styles.coverEditImage, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                  <MaterialCommunityIcons name="camera-plus" size={40} color="#888" />
                </View>
              )}
              <Text style={[styles.coverEditText, { color: theme.accent }]}>Tippen um Cover zu ändern</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Playlist Name</Text>
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Meine Workout Playlist"
              placeholderTextColor="#888"
            />

            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: '#222', borderColor: '#444', borderWidth: 1, marginBottom: 14 }]}
              onPress={async () => {
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
                    useMusicStore.getState().addSongsToPlaylist(activePlaylist.id, rawSongs);
                    Alert.alert("Hinzugefügt", `${rawSongs.length} Songs zur Playlist hinzugefügt.`);
                  }
                } catch(e: any) { 
                  console.warn(e); 
                  Alert.alert("Fehler", String(e.message || e));
                }
              }}
            >
              <MaterialCommunityIcons name="plus-box-multiple" size={22} color="#FFF" />
              <Text style={styles.deleteBtnText}>Audiodateien importieren</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeletePlaylist}>
              <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FFF" />
              <Text style={styles.deleteBtnText}>Playlist löschen</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Playlist Hero Quick-Actions */}
            <View style={styles.heroRow}>
              <View style={styles.heroCoverWrapper}>
                {resolvedPlaylistCover ? (
                  <Image source={{ uri: resolvedPlaylistCover }} style={styles.heroCover} />
                ) : (
                  <View style={[styles.heroCover, { backgroundColor: theme.subCardBg, justifyContent: 'center', alignItems: 'center' }]}>
                    <MaterialCommunityIcons name="playlist-music" size={36} color={theme.accent} />
                  </View>
                )}
              </View>

              <View style={styles.heroActions}>
                <View style={styles.heroButtonsGrid}>
                  <TouchableOpacity
                    style={[styles.heroBtn, { backgroundColor: theme.accent }]}
                    onPress={handlePlayAll}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="play" size={20} color="#000" />
                    <Text style={styles.heroBtnText}>Play</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.heroBtn, { backgroundColor: theme.subCardBg, borderColor: theme.cardBorder, borderWidth: 1 }]}
                    onPress={handleMix}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="shuffle-variant" size={18} color="#FFF" />
                    <Text style={[styles.heroBtnText, { color: '#FFF' }]}>Mix</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.heroBtn,
                      isFullyOffline
                        ? { backgroundColor: '#1A3320', borderColor: '#4CD964', borderWidth: 1 }
                        : { backgroundColor: theme.subCardBg, borderColor: theme.cardBorder, borderWidth: 1 }
                    ]}
                    disabled={isDownloadingPlaylist || isFullyOffline}
                    onPress={handleDownloadEntirePlaylist}
                    activeOpacity={0.8}
                  >
                    {isDownloadingPlaylist ? (
                      <ActivityIndicator size="small" color={theme.accent} />
                    ) : (
                      <MaterialCommunityIcons
                        name={isFullyOffline ? "check-circle" : "download"}
                        size={18}
                        color={isFullyOffline ? "#4CD964" : theme.accent}
                      />
                    )}
                    <Text style={[styles.heroBtnText, { color: isFullyOffline ? "#4CD964" : theme.accent, fontSize: 12 }]}>
                      {isDownloadingPlaylist ? (downloadProgressText || "Lädt...") : isFullyOffline ? "Offline" : "Laden"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* In-Playlist Search Input */}
            <View style={[styles.searchBox, { backgroundColor: theme.subCardBg, borderColor: theme.cardBorder }]}>
              <MaterialCommunityIcons name="magnify" size={18} color="#888" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="In dieser Playlist suchen..."
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
            </View>

            {/* Song Cards List */}
            <FlatList
              data={filteredSongs}
              keyExtractor={(item) => item.id}
              renderItem={renderSong}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorder }]}>
                    <MaterialCommunityIcons name="music-off" size={38} color={theme.accent} />
                  </View>
                  <Text style={styles.emptyTitle}>Keine Songs gefunden</Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery ? `Keine Treffer für "${searchQuery}".` : 'Diese Playlist hat noch keine Lieder. Nutze die Musiksuche, um Songs hinzuzufügen.'}
                  </Text>
                </View>
              }
            />
          </View>
        )}
      </SafeAreaView>

      <PowerSongConfigModal
        visible={powerSongConfigVisible}
        song={selectedPowerSong}
        playlistId={activePlaylist.id}
        onClose={() => {
          setPowerSongConfigVisible(false);
          setSelectedPowerSong(null);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#202020',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#202020',
  },
  cancelText: {
    color: '#888',
    fontSize: 15,
  },
  saveBtn: {
    padding: 4,
  },
  saveText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  editBody: {
    padding: 20,
    alignItems: 'center',
  },
  coverEditContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  coverEditImage: {
    width: 140,
    height: 140,
    borderRadius: 16,
    marginBottom: 12,
  },
  coverEditText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputLabel: {
    color: '#888',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginLeft: 4,
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  nameInput: {
    backgroundColor: '#1E1E1E',
    width: '100%',
    color: '#FFF',
    fontSize: 16,
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  deleteBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF453A',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  deleteBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  heroCoverWrapper: {
    width: 74,
    height: 74,
    borderRadius: 12,
    overflow: 'hidden',
  },
  heroCover: {
    width: '100%',
    height: '100%',
  },
  heroActions: {
    flex: 1,
    justifyContent: 'center',
  },
  heroButtonsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  heroBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 5,
  },
  heroBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: 'bold',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
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
  playingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  playingBadgeText: {
    fontSize: 8.5,
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
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});
