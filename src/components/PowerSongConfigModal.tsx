import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMusicStore, Song } from '../store/useMusicStore';

interface Props {
  visible: boolean;
  song: Song | null;
  playlistId: string;
  onClose: () => void;
}

export default function PowerSongConfigModal({ visible, song, playlistId, onClose }: Props) {
  const { setPowerSong } = useMusicStore();
  const [startSecs, setStartSecs] = useState('0');

  const handleSave = () => {
    if (!song) return;
    setPowerSong({
      songId: song.id,
      playlistId: playlistId,
      startPosition: parseInt(startSecs) || 0
    });
    onClose();
  };

  if (!song) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Configure Power Song</Text>
          <Text style={styles.sub}>{song.title}</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Start playing at (seconds):</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={startSecs}
              onChangeText={setStartSecs}
              placeholder="e.g. 45"
              placeholderTextColor="#666"
            />
            <Text style={styles.hint}>Skip the intro and start right at the drop.</Text>
          </View>

          <View style={styles.row}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, { backgroundColor: '#333' }]}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[styles.btn, { backgroundColor: '#FFD60A' }]}>
              <Text style={[styles.btnText, { color: '#000' }]}>Set Power Song</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: '#1A1A1A', borderRadius: 20, padding: 24, width: '100%' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  sub: { fontSize: 14, color: '#888', marginBottom: 24, marginTop: 4 },
  inputContainer: { marginBottom: 32 },
  label: { color: '#FFF', fontSize: 16, marginBottom: 12 },
  input: { backgroundColor: '#2A2A2A', color: '#FFF', fontSize: 20, padding: 16, borderRadius: 12, textAlign: 'center' },
  hint: { color: '#888', fontSize: 12, marginTop: 12, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
