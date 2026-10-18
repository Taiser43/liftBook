import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMusicStore } from '../store/useMusicStore';
import Slider from '@react-native-community/slider';

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenYouTubeDownloader?: () => void;
}

export default function MusicSettingsModal({ visible, onClose, onOpenYouTubeDownloader }: Props) {
  
  const { addPlaylist } = useMusicStore();
  
  const handleImport = async () => {
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
        addPlaylist('Imported Playlist ' + new Date().toLocaleDateString('de-DE'), undefined, rawSongs);
        const { Alert } = require('react-native');
        Alert.alert("Success", "Playlist imported successfully!");
      }
    } catch(e) {
      console.warn("Import error:", e);
    }
  };

  const { crossfadeSeconds, setCrossfadeSeconds, eqSettings, setEqSettings } = useMusicStore();

  const handleEqChange = (index: number, value: number) => {
    const newEq = [...eqSettings];
    newEq[index] = value;
    setEqSettings(newEq);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Audio Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.label}>Crossfade (seconds)</Text>
              <Text style={styles.valueText}>{crossfadeSeconds}s</Text>
            </View>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={12}
              step={1}
              value={crossfadeSeconds}
              onValueChange={setCrossfadeSeconds}
              minimumTrackTintColor="#00D2FF"
              maximumTrackTintColor="#333"
              thumbTintColor="#00D2FF"
            />
            <Text style={styles.hint}>Fade between songs for gapless playback</Text>
          </View>

          
        
          <View style={styles.section}>
            <Text style={styles.label}>Music Management</Text>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', padding: 16, borderRadius: 12, marginTop: 8 }}
              onPress={handleImport}
            >
              <MaterialCommunityIcons name="folder-download" size={24} color="#00D2FF" style={{ marginRight: 12 }} />
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Import MP3s from Device</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', padding: 16, borderRadius: 12, marginTop: 10 }}
              onPress={() => {
                if (onOpenYouTubeDownloader) {
                  onOpenYouTubeDownloader();
                }
              }}
            >
              <MaterialCommunityIcons name="youtube" size={24} color="#FF0000" style={{ marginRight: 12 }} />
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>YouTube Playlist herunterladen</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#1A1A1A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  closeBtn: { padding: 4, backgroundColor: '#333', borderRadius: 16 },
  section: { marginBottom: 32 },
  label: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  valueText: { color: '#00D2FF', fontSize: 16, fontWeight: 'bold' },
  hint: { color: '#888', fontSize: 12, marginTop: 4 },
  eqContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  eqSliderContainer: { alignItems: 'center', width: 40 },
  eqValue: { color: '#FFD60A', fontSize: 10, marginBottom: 8, fontWeight: 'bold' },
  eqBand: { color: '#888', fontSize: 10, marginTop: 8 },
});
