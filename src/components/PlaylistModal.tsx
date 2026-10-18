import { getResolvedUri } from '../utils/uriResolver';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, TextInput, Image, Dimensions, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Playlist, Song, useMusicStore } from '../store/useMusicStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import PowerSongConfigModal from './PowerSongConfigModal';

interface Props {
  visible: boolean;
  playlist: Playlist | null;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export default function PlaylistModal({ visible, playlist, onClose }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCoverUri, setEditCoverUri] = useState<string | undefined>(undefined);
  const [powerSongConfigVisible, setPowerSongConfigVisible] = useState(false);
  const [selectedPowerSong, setSelectedPowerSong] = useState<Song | null>(null);

  const { setCurrentSong, toggleShuffle, isShuffle, currentSongId, isPlaying, updatePlaylist, deletePlaylist } = useMusicStore();
  const storePlaylist = useMusicStore(state => state.playlists.find(p => p.id === playlist?.id));
  const activePlaylist = storePlaylist || playlist;

  useEffect(() => {
    if (activePlaylist) {
      setEditName(activePlaylist.name);
      setEditCoverUri(activePlaylist.coverUri);
    }
  }, [activePlaylist?.id]);

  if (!activePlaylist) return null;

  const filteredSongs = activePlaylist.songs.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.artist && s.artist.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDuration = (millis?: number) => {
    if (!millis) return '--:--';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handlePlaySong = (songId: string) => {
    setCurrentSong(activePlaylist.id, songId);
    useMusicStore.getState().setIsPlaying(true);
  };

  const handleMix = () => {
    if (!isShuffle) toggleShuffle();
    if (activePlaylist.songs.length > 0) {
      const randomIndex = Math.floor(Math.random() * activePlaylist.songs.length);
      setCurrentSong(activePlaylist.id, activePlaylist.songs[randomIndex].id);
      useMusicStore.getState().setIsPlaying(true);
    }
  };

  const handlePlayAll = () => {
    if (isShuffle) toggleShuffle();
    if (activePlaylist.songs.length > 0) {
      setCurrentSong(activePlaylist.id, activePlaylist.songs[0].id);
      useMusicStore.getState().setIsPlaying(true);
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
        const FileSystem = require('expo-file-system/legacy');
        const filename = sourceUri.split('/').pop() || `cover_${Date.now()}.jpg`;
        const newUri = FileSystem.documentDirectory + filename;
        await FileSystem.copyAsync({ from: sourceUri, to: newUri });
        setEditCoverUri(newUri);
      } catch (e) {
        setEditCoverUri(sourceUri); // Fallback
      }
    }
  };

  const handleSaveEdit = () => {
    updatePlaylist(activePlaylist.id, editName, editCoverUri);
    setIsEditing(false);
  };

  const handleDeletePlaylist = () => {
    Alert.alert(
      "Delete Playlist",
      "Are you sure you want to delete this playlist? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => {
            deletePlaylist(activePlaylist.id);
            onClose();
          }
        }
      ]
    );
  };

  const renderSong = ({ item }: { item: Song }) => {
    const isExpanded = expandedSongId === item.id;
    const isCurrentlyPlaying = currentSongId === item.id;

    return (
      <TouchableOpacity 
        style={[styles.songItem, isCurrentlyPlaying && styles.playingSongItem]}
        onPress={() => handlePlaySong(item.id)}
        onLongPress={() => setExpandedSongId(isExpanded ? null : item.id)}
      >
        <View style={styles.songRow}>
          <View style={[styles.songIconContainer, { position: 'relative' }]}>
            {(item.coverUri || activePlaylist.coverUri) ? (
              <Image source={{ uri: getResolvedUri(item.coverUri || activePlaylist.coverUri) }} style={{ width: 40, height: 40, borderRadius: 6, opacity: isCurrentlyPlaying && isPlaying ? 0.3 : 1 }} />
            ) : (
              <View style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name="music-note" size={20} color="#888" />
              </View>
            )}
            {isCurrentlyPlaying && isPlaying && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                <MaterialCommunityIcons name="volume-high" size={20} color="#00D2FF" />
              </View>
            )}
          </View>
          <View style={styles.songInfo}>
            <Text style={[styles.songTitle, isCurrentlyPlaying && { color: '#00D2FF' }]} numberOfLines={1}>
              {item.title}
            </Text>
            {item.artist && (
              <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
            )}
          </View>
          <Text style={styles.songDuration}>{formatDuration(item.durationMillis)}</Text>
          
          <TouchableOpacity 
            style={{ padding: 8 }} 
            onPress={() => setExpandedSongId(isExpanded ? null : item.id)}
          >
            <MaterialCommunityIcons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {isExpanded && (
          <View style={styles.expandedDetails}>
            {item.coverUri || activePlaylist.coverUri ? (
              <Image source={{ uri: getResolvedUri(item.coverUri || activePlaylist.coverUri) }} style={styles.expandedCover} />
            ) : (
              <View style={[styles.expandedCover, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                <MaterialCommunityIcons name="music" size={24} color="#666" />
              </View>
            )}
            <View style={styles.expandedMeta}>
              <Text style={styles.expandedMetaText}><Text style={{fontWeight: 'bold'}}>Artist:</Text> {item.artist || 'Unknown'}</Text>
              <Text style={styles.expandedMetaText}><Text style={{fontWeight: 'bold'}}>Album:</Text> {item.album || 'Unknown'}</Text>
              <Text style={styles.expandedMetaText}><Text style={{fontWeight: 'bold'}}>Plays:</Text> {item.playCount}</Text>
            </View>
            <View style={{ justifyContent: 'space-around', alignItems: 'center', flexDirection: 'row', gap: 10, paddingLeft: 10 }}>
              <TouchableOpacity 
                style={{ padding: 8 }} 
                onPress={() => {
                  useMusicStore.getState().addToQueue(item);
                  setExpandedSongId(null);
                  Alert.alert("Queued", item.title + " added to queue.");
                }}
              >
                <MaterialCommunityIcons name="playlist-plus" size={24} color="#00D2FF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ padding: 8 }} 
                onPress={() => {
                  setSelectedPowerSong(item);
                  setPowerSongConfigVisible(true);
                  setExpandedSongId(null);
                }}
              >
                <MaterialCommunityIcons name="lightning-bolt" size={24} color="#FFD60A" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{ padding: 8 }} 
                onPress={() => useMusicStore.getState().removeSongFromPlaylist(activePlaylist.id, item.id)}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={24} color="#FF453A" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {isEditing ? (
          <View style={styles.editHeader}>
            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.closeBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Playlist</Text>
            <TouchableOpacity onPress={handleSaveEdit} style={styles.saveBtn}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="chevron-down" size={32} color="#00D2FF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{activePlaylist.name}</Text>
            <TouchableOpacity onPress={() => setIsEditing(true)} style={{ padding: 8 }}>
              <MaterialCommunityIcons name="pencil" size={24} color="#00D2FF" />
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
              <Text style={styles.coverEditText}>Tap to change cover</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Playlist Name</Text>
            <TextInput
              style={styles.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="My Awesome Playlist"
              placeholderTextColor="#888"
            />

            <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: '#333', marginBottom: 12 }]} onPress={async () => {
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
                  Alert.alert("Added", `Added ${rawSongs.length} songs to the playlist.`);
                }
              } catch(e: any) { 
                console.warn(e); 
                Alert.alert("Add Error", String(e.message || e));
              }
            }}>
              <MaterialCommunityIcons name="plus-box-multiple" size={24} color="#FFF" />
              <Text style={styles.deleteBtnText}>Add Songs</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={handleDeletePlaylist}>
              <MaterialCommunityIcons name="trash-can-outline" size={24} color="#FFF" />
              <Text style={styles.deleteBtnText}>Delete Playlist</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Playlist Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={handlePlayAll}>
                <MaterialCommunityIcons name="play" size={24} color="#000" />
                <Text style={styles.actionBtnText}>Play</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#333' }]} onPress={handleMix}>
                <MaterialCommunityIcons name="shuffle-variant" size={20} color="#FFF" />
                <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Mix</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <MaterialCommunityIcons name="magnify" size={20} color="#888" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search songs..."
                placeholderTextColor="#888"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredSongs}
              keyExtractor={(item) => item.id}
              renderItem={renderSong}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No songs found.</Text>
              }
            />
          </>
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
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#282828' },
  editHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#282828' },
  closeBtn: { padding: 4, marginRight: 12 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  cancelText: { color: '#888', fontSize: 16 },
  saveBtn: { padding: 4 },
  saveText: { color: '#00D2FF', fontSize: 16, fontWeight: 'bold' },
  editBody: { padding: 20, alignItems: 'center' },
  coverEditContainer: { alignItems: 'center', marginBottom: 24 },
  coverEditImage: { width: 150, height: 150, borderRadius: 12, marginBottom: 12 },
  coverEditText: { color: '#00D2FF', fontSize: 14, fontWeight: '500' },
  inputLabel: { color: '#888', fontSize: 12, alignSelf: 'flex-start', marginLeft: 4, marginBottom: 8, textTransform: 'uppercase', fontWeight: 'bold' },
  nameInput: { backgroundColor: '#1E1E1E', width: '100%', color: '#FFF', fontSize: 18, padding: 16, borderRadius: 12, marginBottom: 32 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF453A', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, gap: 8 },
  deleteBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  actionsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#00D2FF', borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  actionBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', marginHorizontal: 16, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 40, color: '#FFF' },
  songItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  playingSongItem: { backgroundColor: '#1A1A1A' },
  songRow: { flexDirection: 'row', alignItems: 'center' },
  songIconContainer: { width: 40, height: 40, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  songInfo: { flex: 1 },
  songTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  songArtist: { color: '#888', fontSize: 12, marginTop: 4 },
  songDuration: { color: '#888', fontSize: 12, marginRight: 8 },
  expandedDetails: { flexDirection: 'row', marginTop: 12, paddingLeft: 40, paddingRight: 16 },
  expandedCover: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  expandedMeta: { flex: 1, justifyContent: 'center' },
  expandedMetaText: { color: '#CCC', fontSize: 12, marginBottom: 4 },
  emptyText: { color: '#888', textAlign: 'center', marginTop: 40 }
});
