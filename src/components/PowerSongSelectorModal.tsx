import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMusicStore, Song } from '../store/useMusicStore';
import { useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';
import PowerSongConfigModal from './PowerSongConfigModal';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function PowerSongSelectorModal({ visible, onClose }: Props) {
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);
  const { playlists } = useMusicStore();
  const [selectedSong, setSelectedSong] = useState<{song: Song, playlistId: string} | null>(null);

  if (!visible) return null;

  if (selectedSong) {
    return (
      <PowerSongConfigModal
        visible={true}
        song={selectedSong.song}
        playlistId={selectedSong.playlistId}
        onClose={() => {
          setSelectedSong(null);
          onClose();
        }}
      />
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hype Song auswählen</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={28} color={theme.accent} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 40 }}>
          {playlists.map(playlist => (
            <View key={playlist.id} style={{ marginBottom: 20 }}>
              <Text style={[styles.playlistTitle, { color: theme.accent }]}>{playlist.name}</Text>
              {playlist.songs.map(song => (
                <TouchableOpacity 
                  key={song.id} 
                  style={styles.songRow}
                  onPress={() => setSelectedSong({song, playlistId: playlist.id})}
                >
                  <View style={styles.artworkPlaceholder}>
                    <MaterialCommunityIcons name="music-note" size={20} color="#FFD700" />
                  </View>
                  <View style={styles.songInfo}>
                    <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
                    <Text style={styles.songArtist} numberOfLines={1}>{song.artist || 'Unknown Artist'}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#555" />
                </TouchableOpacity>
              ))}
            </View>
          ))}
          {playlists.length === 0 && (
            <Text style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>Keine Playlists gefunden.</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  playlistTitle: {
    color: '#00D2FF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 10,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  artworkPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  songArtist: {
    color: '#AAA',
    fontSize: 14,
    marginTop: 2,
  },
});
