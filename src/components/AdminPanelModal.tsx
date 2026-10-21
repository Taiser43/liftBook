import React, { useState, useEffect } from 'react';
import { KeyboardAwareScrollView as ScrollView } from 'react-native-keyboard-aware-scroll-view';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';
import { useCardioStore } from '../store/useCardioStore';
import { useAutoChessStore } from '../store/useAutoChessStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const AdminPanelModal: React.FC<Props> = ({ visible, onClose }) => {
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);
  const { 
    adminStreakOverride, setAdminStreakOverride,
    totalXP
  } = useAppStore();
  
  const cardioXP = useCardioStore(state => state.cardioXP) || {};
  const autochessTrophies = useAutoChessStore(state => state.trophies);

  const [streakVal, setStreakVal] = useState(adminStreakOverride ? adminStreakOverride.toString() : '');
  const [totXp, setTotXp] = useState(totalXP.toString());
  
  const [runXp, setRunXp] = useState((cardioXP['Running'] || 0).toString());
  const [cycXp, setCycXp] = useState((cardioXP['Cycling'] || 0).toString());
  const [trophiesVal, setTrophiesVal] = useState((autochessTrophies || 0).toString());

  useEffect(() => {
    if (visible) {
      setStreakVal(adminStreakOverride ? adminStreakOverride.toString() : '');
      setTotXp(totalXP.toString());
      setRunXp((cardioXP['Running'] || 0).toString());
      setCycXp((cardioXP['Cycling'] || 0).toString());
      setTrophiesVal((autochessTrophies || 0).toString());
    }
  }, [visible, adminStreakOverride, totalXP, cardioXP, autochessTrophies]);

  const handleSave = () => {
    const s = streakVal.trim() === '' ? null : parseInt(streakVal, 10);
    setAdminStreakOverride(isNaN(s as any) ? null : s);
    
    useAppStore.setState({
      totalXP: parseInt(totXp) || 0,
    });
    
    useCardioStore.setState({
      cardioXP: {
        ...cardioXP,
        'Running': parseInt(runXp) || 0,
        'Cycling': parseInt(cycXp) || 0,
      }
    });

    useAutoChessStore.setState({
      trophies: Math.max(0, parseInt(trophiesVal, 10) || 0),
    });

    Alert.alert('Success', 'Admin overrides applied!');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Admin Panel</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={styles.content}>
          <Text style={[styles.sectionTitle, { color: theme.accent }]}>Iron Tactics Trophäen</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Trophäen (0: Gym, 100: Bronze, 500: Silber, 1000: Gold, 2500: Challenger, 3750: God)</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="number-pad" 
              value={trophiesVal} 
              onChangeText={setTrophiesVal} 
              placeholder="e.g. 100"
              placeholderTextColor="#555"
            />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.accent }]}>Streak Override</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Master Streak (Leave empty for auto)</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="number-pad"
              value={streakVal}
              onChangeText={setStreakVal}
              placeholder="e.g. 100"
              placeholderTextColor="#555"
            />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.accent }]}>Master Profile</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Total XP (Changes Master Level)</Text>
            <TextInput style={styles.input} keyboardType="number-pad" value={totXp} onChangeText={setTotXp} />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.accent }]}>Cardio XP</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputHalf}>
              <Text style={styles.label}>Running</Text>
              <TextInput style={styles.input} keyboardType="number-pad" value={runXp} onChangeText={setRunXp} />
            </View>
            <View style={styles.inputHalf}>
              <Text style={styles.label}>Cycling</Text>
              <TextInput style={styles.input} keyboardType="number-pad" value={cycXp} onChangeText={setCycXp} />
            </View>
          </View>

          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accent }]} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Apply Overrides</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: '#222' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  closeBtn: { padding: 4, backgroundColor: '#333', borderRadius: 20 },
  content: { padding: 20 },
  sectionTitle: { color: '#00D2FF', fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  inputGroup: { marginBottom: 16 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  inputHalf: { width: '48%' },
  label: { color: '#888', fontSize: 12, marginBottom: 4, fontWeight: 'bold' },
  input: { backgroundColor: '#1E1E1E', borderWidth: 1, borderColor: '#333', borderRadius: 8, color: '#FFF', padding: 12, fontSize: 16 },
  saveBtn: { backgroundColor: '#00D2FF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 32, marginBottom: 40 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '800' }
});
