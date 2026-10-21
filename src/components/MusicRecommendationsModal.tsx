import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';
import { useMusicStore, Song } from '../store/useMusicStore';
import {
  getSmartRecommendations,
  searchOnlineTracks,
  resolveAudioStreamUrl,
  StreamSearchResult,
  RecommendationSection
} from '../services/streamingMusicService';
import { triggerLight } from '../utils/haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPlaySong?: (song: Omit<Song, 'playCount'>) => void;
}

const { width } = Dimensions.get('window');

export default function MusicRecommendationsModal({ visible, onClose, onPlaySong }: Props) {
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);

  const { playStreamSongDirectly, addToQueue, setPowerSong, currentPlaylistId, toggleFavoriteSong, isSongFavorite } = useMusicStore();

  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
  const sections = getSmartRecommendations();

  const filteredSections = activeFilter === 'all'
    ? sections
    : sections.filter(s => s.id === activeFilter);

  const handleStreamTrack = async (track: StreamSearchResult) => {
    triggerLight();
    setLoadingTrackId(track.id);

    try {
      // Resolve high quality stream URL
      const streamUrl = track.directStreamUrl || await resolveAudioStreamUrl(track);

      const songToPlay: Omit<Song, 'playCount'> = {
        id: 'stream_' + track.id,
        title: track.title,
        artist: track.artist,
        uri: streamUrl,
        streamUrl: streamUrl,
        videoId: track.id,
        coverUri: track.thumbnailUrl,
        durationMillis: track.durationSeconds * 1000,
        bpm: track.bpm,
        isStream: true
      };

      if (onPlaySong) {
        await onPlaySong(songToPlay);
      } else {
        playStreamSongDirectly(songToPlay);
      }

      onClose();
    } catch (e) {
      console.warn('Error streaming track:', e);
    } finally {
      setLoadingTrackId(null);
    }
  };

  const handleAddToQueue = async (track: StreamSearchResult) => {
    triggerLight();
    setLoadingTrackId(track.id);

    try {
      const streamUrl = track.directStreamUrl || await resolveAudioStreamUrl(track);
      addToQueue({
        id: 'stream_' + track.id,
        title: track.title,
        artist: track.artist,
        uri: streamUrl,
        streamUrl: streamUrl,
        videoId: track.id,
        coverUri: track.thumbnailUrl,
        durationMillis: track.durationSeconds * 1000,
        bpm: track.bpm,
        isStream: true,
        playCount: 0
      });
    } catch (e) {
      console.warn('Error adding to queue:', e);
    } finally {
      setLoadingTrackId(null);
    }
  };

  const handleSetAsPowerSong = (track: StreamSearchResult) => {
    triggerLight();
    setPowerSong({
      songId: 'stream_' + track.id,
      playlistId: currentPlaylistId || 'stream_queue',
      startPosition: 70
    });
    alert(`⚡ "${track.title}" wurde als dein persönlicher PR PowerSong gesetzt!`);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.sheetContainer, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          
          {/* Header Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Title Row */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, marginRight: 6 }}>✨</Text>
                <Text style={[styles.title, { color: '#FFF' }]}>Smart Vorschläge</Text>
              </View>
              <Text style={styles.subtitle}>
                Automatisch basierend auf deinem Trainings-Verlauf
              </Text>
            </View>

            <TouchableOpacity 
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
            >
              <MaterialCommunityIcons name="close" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Genre Filter Chips */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              onPress={() => { triggerLight(); setActiveFilter('all'); }}
              style={[
                styles.filterChip,
                activeFilter === 'all'
                  ? { backgroundColor: theme.accent, borderColor: theme.accent }
                  : { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }
              ]}
            >
              <Text style={[styles.filterChipText, activeFilter === 'all' ? { color: '#000', fontWeight: 'bold' } : { color: '#AAA' }]}>
                🔥 Alle
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { triggerLight(); setActiveFilter('pr_boost'); }}
              style={[
                styles.filterChip,
                activeFilter === 'pr_boost'
                  ? { backgroundColor: theme.accent, borderColor: theme.accent }
                  : { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }
              ]}
            >
              <Text style={[styles.filterChipText, activeFilter === 'pr_boost' ? { color: '#000', fontWeight: 'bold' } : { color: '#AAA' }]}>
                ⚡ Heavy PR
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { triggerLight(); setActiveFilter('push_day_rap'); }}
              style={[
                styles.filterChip,
                activeFilter === 'push_day_rap'
                  ? { backgroundColor: theme.accent, borderColor: theme.accent }
                  : { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }
              ]}
            >
              <Text style={[styles.filterChipText, activeFilter === 'push_day_rap' ? { color: '#000', fontWeight: 'bold' } : { color: '#AAA' }]}>
                🎧 Deutschrap
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { triggerLight(); setActiveFilter('cardio_pace'); }}
              style={[
                styles.filterChip,
                activeFilter === 'cardio_pace'
                  ? { backgroundColor: theme.accent, borderColor: theme.accent }
                  : { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }
              ]}
            >
              <Text style={[styles.filterChipText, activeFilter === 'cardio_pace' ? { color: '#000', fontWeight: 'bold' } : { color: '#AAA' }]}>
                🏃 Cardio BPM
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content List */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            {filteredSections.map(section => (
              <View key={section.id} style={styles.sectionContainer}>
                
                {/* Section Header */}
                <View style={styles.sectionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorder }]}>
                    <Text style={[styles.badgeText, { color: theme.accent }]}>{section.badge}</Text>
                  </View>
                </View>

                {/* Track List in Section */}
                <View style={styles.trackList}>
                  {section.tracks.map(track => {
                    const isLoading = loadingTrackId === track.id;
                    return (
                      <View 
                        key={track.id} 
                        style={[styles.trackCard, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                      >
                        <Image source={{ uri: track.thumbnailUrl }} style={styles.thumbnail} />

                        {track.bpm && (
                          <View style={[styles.bpmBadge, { backgroundColor: theme.accent }]}>
                            <Text style={styles.bpmText}>{track.bpm}</Text>
                          </View>
                        )}

                        <View style={styles.metaContainer}>
                          <Text style={styles.songTitle} numberOfLines={1}>{track.title}</Text>
                          <Text style={styles.artistName} numberOfLines={1}>{track.artist}</Text>
                        </View>

                        {/* Actions */}
                        <View style={styles.actionsRow}>
                          <TouchableOpacity
                            onPress={() => handleStreamTrack(track)}
                            disabled={isLoading}
                            style={[styles.playButton, { backgroundColor: theme.accent }]}
                          >
                            {isLoading ? (
                              <ActivityIndicator size="small" color="#000" />
                            ) : (
                              <>
                                <MaterialCommunityIcons name="play" size={16} color="#000" />
                                <Text style={styles.playButtonText}>Stream</Text>
                              </>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleAddToQueue(track)}
                            style={[styles.iconButton, { borderColor: theme.subtleBorder }]}
                            accessibilityLabel="Zur Warteschlange hinzufügen"
                          >
                            <MaterialCommunityIcons name="playlist-plus" size={18} color="#AAA" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              triggerLight();
                              toggleFavoriteSong({
                                id: track.id,
                                title: track.title,
                                artist: track.artist,
                                uri: track.directStreamUrl || track.id,
                                streamUrl: track.directStreamUrl,
                                coverUri: track.thumbnailUrl,
                                durationMillis: track.durationSeconds * 1000,
                                bpm: track.bpm,
                                isStream: true,
                              });
                            }}
                            style={[styles.iconButton, { borderColor: theme.subtleBorder }]}
                            accessibilityLabel="Als Favorit speichern"
                          >
                            <MaterialCommunityIcons 
                              name={isSongFavorite(track.id) ? "heart" : "heart-outline"} 
                              size={16} 
                              color={isSongFavorite(track.id) ? "#FF2A6D" : "#AAA"} 
                            />
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleSetAsPowerSong(track)}
                            style={[styles.iconButton, { borderColor: theme.subtleBorder }]}
                            accessibilityLabel="Als PowerSong setzen"
                          >
                            <MaterialCommunityIcons name="lightning-bolt" size={16} color="#FF9500" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '85%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1.5,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#444',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  trackList: {
    gap: 8,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    position: 'relative',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  bpmBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  bpmText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000',
  },
  metaContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  songTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFF',
  },
  artistName: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 3,
  },
  playButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
});
