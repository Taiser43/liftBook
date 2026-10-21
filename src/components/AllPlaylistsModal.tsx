import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMusicStore, Playlist } from '../store/useMusicStore';
import { useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';
import { triggerLight, triggerSuccess } from '../utils/haptics';
import { getResolvedUri } from '../utils/uriResolver';

interface AllPlaylistsModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenPlaylist: (playlist: Playlist) => void;
  onPlayPlaylist?: (playlist: Playlist) => void;
}

export default function AllPlaylistsModal({
  visible,
  onClose,
  onOpenPlaylist,
  onPlayPlaylist
}: AllPlaylistsModalProps) {
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);

  const {
    playlists,
    deletePlaylist,
    pinnedPlaylistIds,
    pinPlaylist,
    unpinPlaylist,
    isPlaylistPinned,
    setCurrentSong,
    setIsPlaying
  } = useMusicStore();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlaylists = playlists.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedCount = playlists.filter(p => isPlaylistPinned(p.id)).length;

  const handleTogglePin = (playlist: Playlist) => {
    triggerLight();
    const isCurrentlyPinned = isPlaylistPinned(playlist.id);
    if (isCurrentlyPinned) {
      unpinPlaylist(playlist.id);
    } else {
      pinPlaylist(playlist.id);
    }
  };

  const handleDelete = (playlist: Playlist) => {
    Alert.alert(
      'Playlist löschen?',
      `Möchtest du "${playlist.name}" (${playlist.songs.length} Songs) endgültig aus deiner Mediathek löschen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            triggerLight();
            deletePlaylist(playlist.id);
          }
        }
      ]
    );
  };

  const handlePlayFirst = (playlist: Playlist) => {
    triggerSuccess();
    if (playlist.songs.length > 0) {
      setCurrentSong(playlist.id, playlist.songs[0].id);
      setIsPlaying(true);
      onClose();
    } else {
      Alert.alert('Leere Playlist', 'Diese Playlist enthält noch keine Lieder.');
    }
  };

  const renderItem = ({ item }: { item: Playlist }) => {
    const isPinned = isPlaylistPinned(item.id);
    const resolvedCover = item.coverUri ? getResolvedUri(item.coverUri) : null;
    const offlineSongs = item.songs.filter(s =>
      Boolean(s.cachedUri || (s.uri && (s.uri.startsWith('file://') || s.uri.startsWith('/'))))
    ).length;
    const isAllOffline = item.songs.length > 0 && offlineSongs === item.songs.length;

    return (
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => {
            onClose();
            onOpenPlaylist(item);
          }}
          activeOpacity={0.7}
        >
          {/* Cover Artwork */}
          <View style={styles.thumbWrapper}>
            {resolvedCover ? (
              <Image source={{ uri: resolvedCover }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, { backgroundColor: theme.subCardBg, justifyContent: 'center', alignItems: 'center' }]}>
                <MaterialCommunityIcons name="playlist-music" size={28} color={theme.accent} />
              </View>
            )}
            {isAllOffline && (
              <View style={styles.offlineBadge}>
                <MaterialCommunityIcons name="check-circle" size={10} color="#FFF" />
                <Text style={styles.offlineBadgeText}>OFFLINE</Text>
              </View>
            )}
          </View>

          {/* Playlist Info */}
          <View style={styles.metaContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.playlistTitle} numberOfLines={1}>
                {item.name}
              </Text>
              {isPinned && (
                <MaterialCommunityIcons name="pin" size={14} color={theme.accent} />
              )}
            </View>

            <Text style={styles.playlistSubtitle}>
              {item.songs.length} {item.songs.length === 1 ? 'Song' : 'Songs'}
              {item.songs.length > 0 && ` • ${offlineSongs} offline`}
            </Text>

            <View style={styles.badgesRow}>
              <View style={[styles.tagBadge, { backgroundColor: isPinned ? theme.accentSoftBg : '#222', borderColor: isPinned ? theme.accentBorder : '#333' }]}>
                <MaterialCommunityIcons name={isPinned ? "pin" : "pin-outline"} size={11} color={isPinned ? theme.accent : "#888"} />
                <Text style={[styles.tagBadgeText, { color: isPinned ? theme.accent : "#888" }]}>
                  {isPinned ? 'Im Schnellzugriff' : 'Nicht angeheftet'}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: theme.accent }]}
            onPress={() => handlePlayFirst(item)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="play" size={16} color="#000" />
            <Text style={styles.playBtnText}>Abspielen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: theme.subCardBg, borderColor: theme.cardBorder }]}
            onPress={() => {
              onClose();
              onOpenPlaylist(item);
            }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="folder-open-outline" size={15} color="#CCC" />
            <Text style={styles.secondaryBtnText}>Öffnen</Text>
          </TouchableOpacity>

          {/* Quick-Access Pin Toggle Button */}
          <TouchableOpacity
            style={[
              styles.pinBtn,
              isPinned
                ? { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorder }
                : { backgroundColor: '#1E1E1E', borderColor: '#444' }
            ]}
            onPress={() => handleTogglePin(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name={isPinned ? "pin-off-outline" : "pin"}
              size={14}
              color={isPinned ? theme.accent : "#FFF"}
            />
            <Text style={[styles.pinBtnText, { color: isPinned ? theme.accent : "#FFF" }]}>
              {isPinned ? 'Vom Start lösen' : 'Anheften'}
            </Text>
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: '#FF000015', borderColor: '#FF000030' }]}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={15} color="#FF4444" />
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
              <View style={[styles.headerIconCircle, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorder }]}>
                <MaterialCommunityIcons name="playlist-music" size={22} color={theme.accent} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Alle Playlists</Text>
                <Text style={styles.modalSubtitle}>
                  {playlists.length} {playlists.length === 1 ? 'Playlist' : 'Playlists'} gespeichert • {pinnedCount} im Schnellzugriff
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.subCardBg, borderColor: theme.cardBorder }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="close" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={[styles.searchBox, { backgroundColor: theme.subCardBg, borderColor: theme.cardBorder }]}>
            <MaterialCommunityIcons name="magnify" size={18} color="#888" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Playlists durchsuchen..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Playlists List */}
          <FlatList
            data={filteredPlaylists}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorder }]}>
                  <MaterialCommunityIcons name="playlist-remove" size={38} color={theme.accent} />
                </View>
                <Text style={styles.emptyTitle}>Keine Playlists gefunden</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery ? `Keine Treffer für "${searchQuery}".` : 'Du hast noch keine Playlists erstellt oder gespeichert.'}
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: '90%',
    minHeight: '65%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 40,
    gap: 12,
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
  offlineBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#00AA44E0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1.5,
    gap: 2,
  },
  offlineBadgeText: {
    color: '#FFF',
    fontSize: 7.5,
    fontWeight: 'bold',
  },
  metaContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  playlistTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  playlistSubtitle: {
    color: '#888',
    fontSize: 11,
    marginTop: 3,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#202020',
    paddingTop: 8,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  playBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  secondaryBtnText: {
    color: '#CCC',
    fontSize: 11,
    fontWeight: '600',
  },
  pinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  pinBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  deleteBtn: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
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
