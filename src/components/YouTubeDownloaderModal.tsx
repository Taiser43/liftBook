import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  parseYouTubeUrl,
  fetchPlaylistInfo,
  fetchSingleVideoInfo,
  downloadFullPlaylistInBackground,
  cancelActiveDownload,
  YouTubeTrack,
  YouTubePlaylistInfo,
  DownloadProgress
} from '../services/youtubeDownloadService';
import { useMusicStore } from '../store/useMusicStore';
import { useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const { width, height: screenHeight } = Dimensions.get('window');

export default function YouTubeDownloaderModal({ visible, onClose }: Props) {
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [playlistInfo, setPlaylistInfo] = useState<YouTubePlaylistInfo | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [progressState, setProgressState] = useState<DownloadProgress | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const storeDownloadProgress = useMusicStore(state => state.downloadProgress);
  const setStoreDownloadProgress = useMusicStore(state => state.setDownloadProgress);

  useEffect(() => {
    if (storeDownloadProgress && storeDownloadProgress.isDownloading) {
      setIsDownloading(true);
      setProgressState(storeDownloadProgress);
    }
  }, [storeDownloadProgress]);

  const resetState = () => {
    setUrl('');
    setLoading(false);
    setPlaylistInfo(null);
    setCustomTitle('');
    setIsDownloading(false);
    setProgressState(null);
    setStatusMessage('');
  };

  const handleClose = () => {
    if (isDownloading) {
      Alert.alert(
        "Download läuft im Hintergrund",
        "Der Download wird im Standby fortgesetzt. Du siehst den aktuellen Stand auf deinem Sperrbildschirm.",
        [{ text: "Alles klar", onPress: onClose }]
      );
    } else {
      resetState();
      onClose();
    }
  };

  const handleFetchPlaylist = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      Alert.alert("Link fehlt", "Bitte füge einen YouTube-Link ein.");
      return;
    }

    const parsed = parseYouTubeUrl(trimmed);
    if (!parsed.type || !parsed.id) {
      Alert.alert("Ungültiger Link", "Bitte gib einen gültigen YouTube Playlist- oder Video-Link ein.");
      return;
    }

    setLoading(true);
    setStatusMessage('Lade Informationen von YouTube...');

    try {
      if (parsed.type === 'playlist') {
        try {
          const info = await fetchPlaylistInfo(parsed.id);
          setPlaylistInfo(info);
          setCustomTitle(info.title);
        } catch (playlistErr: any) {
          if (parsed.videoIdFallback) {
            console.log("Playlist fetch failed, falling back to single video:", parsed.videoIdFallback);
            const track = await fetchSingleVideoInfo(parsed.videoIdFallback);
            setPlaylistInfo({
              id: parsed.videoIdFallback,
              title: track.title,
              author: track.author,
              thumbnailUrl: track.thumbnailUrl,
              tracks: [track]
            });
            setCustomTitle(track.title);
            Alert.alert(
              "Hinweis zum Link",
              "Die Playlist (z.B. automatischer YouTube-Mix) konnte nicht als Gesamt-Playlist geladen werden, aber das aktuelle Lied wurde erkannt und kann heruntergeladen werden."
            );
          } else {
            throw playlistErr;
          }
        }
      } else {
        // Single video
        const track = await fetchSingleVideoInfo(parsed.id);
        setPlaylistInfo({
          id: parsed.id,
          title: track.title,
          author: track.author,
          thumbnailUrl: track.thumbnailUrl,
          tracks: [track]
        });
        setCustomTitle(track.title);
      }
    } catch (err: any) {
      console.warn("Fehler beim Laden der Playlist:", err);
      Alert.alert("Fehler beim Laden", err.message || "Playlist konnte nicht abgerufen werden. Bitte überprüfe den Link.");
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const toggleTrackSelection = (index: number) => {
    if (!playlistInfo) return;
    const updatedTracks = [...playlistInfo.tracks];
    updatedTracks[index].selected = !updatedTracks[index].selected;
    setPlaylistInfo({ ...playlistInfo, tracks: updatedTracks });
  };

  const selectAll = (select: boolean) => {
    if (!playlistInfo) return;
    const updatedTracks = playlistInfo.tracks.map(t => ({ ...t, selected: select }));
    setPlaylistInfo({ ...playlistInfo, tracks: updatedTracks });
  };

  const startDownload = async () => {
    if (!playlistInfo) return;
    const selectedTracks = playlistInfo.tracks.filter(t => t.selected !== false);
    if (selectedTracks.length === 0) {
      Alert.alert("Keine Tracks", "Bitte wähle mindestens ein Lied zum Herunterladen aus.");
      return;
    }

    setIsDownloading(true);

    downloadFullPlaylistInBackground(
      customTitle.trim() || playlistInfo.title,
      selectedTracks,
      (progress) => {
        setProgressState(progress);
        setStoreDownloadProgress(progress);
      },
      (playlistName, count) => {
        setIsDownloading(false);
        setStoreDownloadProgress(null);
        Alert.alert(
          "Download abgeschlossen! 🎉",
          `Die Playlist "${playlistName}" mit ${count} Songs wurde erfolgreich zur App hinzugefügt und ist offline abspielbar!`,
          [{ text: "Super", onPress: () => { resetState(); onClose(); } }]
        );
      },
      (err) => {
        setIsDownloading(false);
        setStoreDownloadProgress(null);
        Alert.alert("Download-Fehler", err);
      },
      0,
      [],
      playlistInfo.thumbnailUrl
    );
  };

  const selectedCount = playlistInfo ? playlistInfo.tracks.filter(t => t.selected !== false).length : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.container}
      >
        <View style={[styles.card, (playlistInfo || isDownloading) && styles.cardExpanded, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, borderWidth: 1 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.ytIconBadge}>
                <MaterialCommunityIcons name="youtube" size={24} color="#FFF" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.title}>YouTube Downloader</Text>
                <Text style={styles.subTitle}>Playlist oder Video als MP3 importieren</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* ACTIVE DOWNLOADING VIEW */}
          {isDownloading && progressState ? (
            <View style={styles.downloadingContainer}>
              <ActivityIndicator size="large" color="#FF0000" style={{ marginBottom: 16 }} />
              <Text style={styles.downloadingTitle}>Lade Playlist herunter...</Text>
              <Text style={styles.downloadingSubtitle} numberOfLines={1}>
                {progressState.playlistName}
              </Text>

              {/* Progress Bar */}
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progressState.progressPercent}%`, backgroundColor: theme.accent }]} />
              </View>

              <View style={styles.progressMetaRow}>
                <Text style={styles.progressPercentText}>{progressState.progressPercent}%</Text>
                <Text style={styles.progressCountText}>
                  Song {progressState.completed + 1} von {progressState.total}
                </Text>
              </View>

              <Text style={styles.currentSongLabel} numberOfLines={2}>
                🎵 {progressState.currentSongTitle}
              </Text>

              {/* Standby & Background Info Card */}
              <View style={[styles.standbyInfoBox, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorder }]}>
                <MaterialCommunityIcons name="car-connected" size={20} color={theme.accent} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.standbyInfoTitle, { color: theme.accent }]}>Standby- & Hintergrund aktiv</Text>
                  <Text style={styles.standbyInfoText}>
                    Du kannst dein Handy sperren oder andere Apps nutzen (z.B. Navi beim Autofahren ins Gym). Der Download läuft weiter und du siehst den Fortschritt auf dem Sperrbildschirm.
                  </Text>
                </View>
              </View>

              <View style={styles.downloadActionsRow}>
                <TouchableOpacity 
                  style={styles.backgroundContinueBtn}
                  onPress={onClose}
                >
                  <MaterialCommunityIcons name="arrow-down-circle" size={16} color={theme.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.backgroundContinueBtnText, { color: theme.accent }]}>Im Hintergrund fortsetzen</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.cancelDownloadBtn}
                  onPress={() => {
                    Alert.alert(
                      "Download abbrechen?",
                      "Möchtest du das Herunterladen dieser Playlist wirklich beenden?",
                      [
                        { text: "Nein, weiterladen", style: "cancel" },
                        { 
                          text: "Abbrechen", 
                          style: "destructive", 
                          onPress: async () => {
                            await cancelActiveDownload();
                            resetState();
                            onClose();
                          }
                        }
                      ]
                    );
                  }}
                >
                  <MaterialCommunityIcons name="close-circle-outline" size={16} color="#FF453A" style={{ marginRight: 4 }} />
                  <Text style={styles.cancelDownloadBtnText}>Abbrechen</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* URL INPUT SECTION */}
              {!playlistInfo && (
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>YouTube Playlist- oder Song-Link:</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      placeholder="https://www.youtube.com/playlist?list=..."
                      placeholderTextColor="#666"
                      value={url}
                      onChangeText={setUrl}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {url.length > 0 && (
                      <TouchableOpacity onPress={() => setUrl('')} style={styles.clearInputBtn}>
                        <MaterialCommunityIcons name="close-circle" size={18} color="#888" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[styles.fetchBtn, { backgroundColor: theme.accent }, loading && { opacity: 0.7 }]}
                    onPress={handleFetchPlaylist}
                    disabled={loading}
                  >
                    {loading ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.fetchBtnText}>{statusMessage || 'Lade...'}</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="cloud-download-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.fetchBtnText}>Playlist laden</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={[styles.tipBox, { borderColor: theme.accentBorderSoft }]}>
                    <MaterialCommunityIcons name="information-outline" size={18} color={theme.accent} style={{ marginRight: 8 }} />
                    <Text style={styles.tipText}>
                      Tipp: Die Lieder werden direkt auf deinem Gerät in bester Qualität (bis zu 320 kbps MP3) gespeichert und sind offline im Gym verfügbar.
                    </Text>
                  </View>
                </View>
              )}

              {/* PREVIEW & TRACKLIST SELECTION */}
              {playlistInfo && (
                <View style={{ flex: 1 }}>
                  {/* Playlist Header Meta */}
                  <View style={styles.playlistPreviewHeader}>
                    {playlistInfo.thumbnailUrl ? (
                      <Image source={{ uri: playlistInfo.thumbnailUrl }} style={styles.previewThumb} />
                    ) : (
                      <View style={[styles.previewThumb, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                        <MaterialCommunityIcons name="music" size={24} color="#888" />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.metaLabel}>Playlist Name (anpassbar):</Text>
                      <TextInput
                        style={styles.playlistTitleInput}
                        value={customTitle}
                        onChangeText={setCustomTitle}
                        placeholder="Playlist-Titel"
                        placeholderTextColor="#777"
                      />
                      <Text style={styles.tracksCountText}>
                        {playlistInfo.tracks.length} Songs gefunden • {selectedCount} ausgewählt
                      </Text>
                    </View>
                  </View>

                  {/* Bulk Selection Actions */}
                  <View style={styles.selectActionsRow}>
                    <TouchableOpacity onPress={() => selectAll(true)} style={styles.selectActionBtn}>
                      <Text style={styles.selectActionText}>Alle auswählen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => selectAll(false)} style={styles.selectActionBtn}>
                      <Text style={styles.selectActionText}>Alle abwählen</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setPlaylistInfo(null)} style={[styles.selectActionBtn, { marginLeft: 'auto' }]}>
                      <Text style={[styles.selectActionText, { color: '#FF453A' }]}>Anderer Link</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Tracklist */}
                  {playlistInfo.tracks.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={42} color="#FF9500" style={{ marginBottom: 8 }} />
                      <Text style={styles.emptyTitle}>Keine Lieder gefunden</Text>
                      <Text style={styles.emptySub}>
                        Die Playlist enthält keine öffentlichen Videos oder ist privat.
                      </Text>
                      <TouchableOpacity onPress={() => setPlaylistInfo(null)} style={styles.retryBtn}>
                        <Text style={styles.retryBtnText}>Anderen Link eingeben</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <ScrollView style={styles.tracksList} contentContainerStyle={{ paddingBottom: 16 }}>
                      {playlistInfo.tracks.map((track, idx) => (
                        <TouchableOpacity
                          key={track.id + idx}
                          style={[styles.trackRow, track.selected !== false && styles.trackRowSelected]}
                          onPress={() => toggleTrackSelection(idx)}
                        >
                          <MaterialCommunityIcons
                            name={track.selected !== false ? "checkbox-marked" : "checkbox-blank-outline"}
                            size={22}
                            color={track.selected !== false ? theme.accent : "#666"}
                            style={{ marginRight: 10 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.trackTitle} numberOfLines={1}>{track.title}</Text>
                            <Text style={styles.trackAuthor} numberOfLines={1}>{track.author}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {/* Start Download Button */}
                  <TouchableOpacity
                    style={[styles.startDownloadBtn, { backgroundColor: theme.accent }, selectedCount === 0 && { opacity: 0.5 }]}
                    onPress={startDownload}
                    disabled={selectedCount === 0}
                  >
                    <MaterialCommunityIcons name="download" size={22} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.startDownloadBtnText}>
                      {selectedCount} Songs herunterladen
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: '#2E2E32',
  },
  cardExpanded: {
    height: Math.min(screenHeight * 0.85, 720),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  ytIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF0000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  subTitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
  },
  inputSection: {
    paddingVertical: 10,
  },
  inputLabel: {
    color: '#CCC',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#282828',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#383838',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    paddingVertical: 12,
  },
  clearInputBtn: {
    padding: 6,
  },
  fetchBtn: {
    backgroundColor: '#FF0000',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  fetchBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 210, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.25)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  tipText: {
    color: '#A0D8EF',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  playlistPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242424',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  previewThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  metaLabel: {
    color: '#888',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  playlistTitleInput: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: '#2A2A2E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3D3D42',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  tracksCountText: {
    color: '#00D2FF',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  selectActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  selectActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#282828',
  },
  selectActionText: {
    color: '#AAA',
    fontSize: 11,
    fontWeight: '600',
  },
  tracksList: {
    flex: 1,
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#2A2A2A',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  retryBtnText: {
    color: '#00D2FF',
    fontSize: 13,
    fontWeight: '600',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202020',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  trackRowSelected: {
    borderColor: 'rgba(0, 210, 255, 0.4)',
    backgroundColor: '#232529',
  },
  trackTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
  },
  trackAuthor: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  startDownloadBtn: {
    backgroundColor: '#FF0000',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startDownloadBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  downloadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  downloadingTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  downloadingSubtitle: {
    color: '#AAA',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF0000',
  },
  progressMetaRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressPercentText: {
    color: '#FF0000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressCountText: {
    color: '#888',
    fontSize: 12,
  },
  currentSongLabel: {
    color: '#DDD',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
    minHeight: 34,
  },
  backgroundContinueBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#383838',
  },
  backgroundContinueBtnText: {
    color: '#00D2FF',
    fontSize: 13,
    fontWeight: '600',
  },
  standbyInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 210, 255, 0.08)',
    borderColor: 'rgba(0, 210, 255, 0.25)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
    width: '100%',
  },
  standbyInfoTitle: {
    color: '#00D2FF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  standbyInfoText: {
    color: '#BBB',
    fontSize: 11,
    lineHeight: 15,
  },
  downloadActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    gap: 10,
  },
  cancelDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252020',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4A2525',
  },
  cancelDownloadBtnText: {
    color: '#FF453A',
    fontSize: 13,
    fontWeight: '600',
  },
});
