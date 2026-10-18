import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCardioStore, CardioActivityType } from '../store/useCardioStore';
import { useAppStore, showCustomAlert } from '../store/store';

const ACTIVITIES: { type: CardioActivityType, icon: any, label: string }[] = [
  { type: 'Running', icon: 'run', label: 'Run' },
  { type: 'Cycling', icon: 'bike', label: 'Cycle' },
  { type: 'Walking', icon: 'walk', label: 'Walk' },
  { type: 'Swimming', icon: 'swim', label: 'Swim' },
  { type: 'Boxing', icon: 'boxing-glove', label: 'Box' },
  { type: 'Football', icon: 'soccer', label: 'Soccer' },
  { type: 'Paddle', icon: 'tennis', label: 'Paddle' },
];

import BluetoothManager from '../components/BluetoothManager';
import { useBottomSpacing } from '../hooks/useBottomSpacing';

export default function CardioHomeScreen({ navigation }: any) {
  const bottomSpacing = useBottomSpacing();
  const { connectedDeviceId, currentHeartRate } = useAppStore();
  const [btModalVisible, setBtModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<CardioActivityType>('Running');
  const history = useCardioStore(state => state.history);

  const handleStart = () => {
    const store = useAppStore.getState();
    if (store.globalCardioActive) {
      if (store.globalCardioActivityType === selectedActivity) {
        store.setGlobalCardioModalVisible(true);
        return;
      }
      showCustomAlert(
        "Active Session",
        "You already have a cardio session running. Do you want to finish and save it before starting a new one?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Finish & Start New", 
            onPress: async () => {
              if (store.finishCurrentCardio) await store.finishCurrentCardio(true);
              store.setGlobalCardioSessionInfo(selectedActivity, null);
              store.setGlobalCardioModalVisible(true);
            } 
          }
        ]
      );
    } else if (store.globalActivePlan) {
      showCustomAlert(
        "Active Strength Workout",
        "You have a strength workout running. Do you want to finish and save it first?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Finish & Start New", 
            onPress: async () => {
              if (store.finishCurrentStrength) await store.finishCurrentStrength(true);
              store.setGlobalCardioSessionInfo(selectedActivity, null);
              store.setGlobalCardioModalVisible(true);
            } 
          }
        ]
      );
    } else {
      store.setGlobalCardioSessionInfo(selectedActivity, null);
      store.setGlobalCardioModalVisible(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Cardio Training</Text>
          <TouchableOpacity style={styles.btButton} onPress={() => setBtModalVisible(true)}>
            <MaterialCommunityIcons 
              name={connectedDeviceId ? "bluetooth-connect" : "bluetooth"} 
              size={24} 
              color={connectedDeviceId ? "#30D158" : "#00D2FF"} 
            />
            {currentHeartRate && <Text style={styles.hrTextMini}>{currentHeartRate}</Text>}
          </TouchableOpacity>
        </View>
        
        <Text style={styles.sectionTitle}>Select Activity</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activityScroll} contentContainerStyle={{ paddingBottom: bottomSpacing }}>
          {ACTIVITIES.map(act => (
            <TouchableOpacity 
              key={act.type}
              style={[styles.activityCard, selectedActivity === act.type && styles.activityCardSelected]}
              onPress={() => setSelectedActivity(act.type)}
            >
              <MaterialCommunityIcons 
                name={act.icon} 
                size={32} 
                color={selectedActivity === act.type ? '#121212' : '#00D2FF'} 
              />
              <Text style={[styles.activityLabel, selectedActivity === act.type && styles.activityLabelSelected]}>
                {act.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>START {selectedActivity.toUpperCase()}</Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity style={styles.halfCard} onPress={() => navigation.navigate('CardioTests')}>
            <MaterialCommunityIcons name="heart-pulse" size={32} color="#FF3B30" />
            <Text style={styles.cardTitle}>Health Tests</Text>
            <Text style={styles.cardSub}>Cooper, 1.5M, Rockport</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.halfCard} onPress={() => navigation.navigate('CardioHistory')}>
            <MaterialCommunityIcons name="history" size={32} color="#30D158" />
            <Text style={styles.cardTitle}>Workout History</Text>
            <Text style={styles.cardSub}>View past sessions</Text>
          </TouchableOpacity>
        </View>

        {history.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recent Session</Text>
            <View style={styles.recentCard}>
              <Text style={styles.recentType}>{history[0].type}</Text>
              <Text style={styles.recentStats}>
                {Math.floor(history[0].durationSeconds / 60)} min • {(history[0].distanceMeters / 1000).toFixed(2)} km
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
      <BluetoothManager visible={btModalVisible} onClose={() => setBtModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },
  container: { padding: 20, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
  },
  btButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333'
  , marginBottom: 12 },
  hrTextMini: {
    color: '#FF3B30',
    fontWeight: '700',
    marginLeft: 6
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#ccc', marginBottom: 15 },
  activityScroll: { marginBottom: 30 },
  activityCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    width: 90,
    height: 100,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  activityCardSelected: {
    backgroundColor: '#00D2FF',
    borderColor: '#00D2FF'
  },
  activityLabel: { color: 'white', marginTop: 8, fontWeight: 'bold' },
  activityLabelSelected: { color: '#121212' },
  startButton: {
    backgroundColor: '#30D158',
    paddingVertical: 18,
    borderRadius: 100,
    alignItems: 'center',
    marginBottom: 30,
    elevation: 4,
    shadowColor: '#30D158',
    shadowOpacity: 0.4,
    shadowRadius: 10
  },
  startButtonText: { color: '#121212', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  halfCard: {
    backgroundColor: '#1E1E1E',
    width: '48%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'flex-start'
  },
  cardTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 12 },
  cardSub: { color: '#888', fontSize: 14, marginTop: 4 },
  recentSection: { marginTop: 10 },
  recentCard: { backgroundColor: '#1E1E1E', padding: 20, borderRadius: 16 },
  recentType: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  recentStats: { color: '#00D2FF', fontSize: 16, marginTop: 5 }
});
