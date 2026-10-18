import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Dimensions, ScrollView } from 'react-native';
import { useCardioStore, CardioSession, CardioActivityType, generateMockCardioSessions } from '../store/useCardioStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBottomSpacing } from '../hooks/useBottomSpacing';

export default function CardioHistoryScreen({ navigation }: any) {
  const bottomSpacing = useBottomSpacing();
  const history = useCardioStore(state => state.history);
  const addSession = useCardioStore(state => state.addSession);
  const maxHR = useCardioStore(state => state.maxHeartRateSetting);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  
  const toggleType = (type: string) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };
  
  const filteredHistory = selectedTypes.length > 0 
    ? history.filter(s => selectedTypes.includes(s.type))
    : history;
    
  const ALL_TYPES = ['Running', 'Cycling', 'Boxing', 'Swimming', 'Paddle', 'Football', 'Walking'];

  const importFromHealthConnect = async () => {
    try {
      // [AGENT CONTEXT]: Dynamic require used instead of top-level import.
      // react-native-health-connect lacks native code in Expo Go, and a top-level import
      // will cause an instant fatal crash on app startup.
      const HealthConnect = require('react-native-health-connect');
      const isInitialized = await HealthConnect.initialize();
      if (!isInitialized) return;
      
      // Request permissions before reading
      await HealthConnect.requestPermission([
        { accessType: 'read', recordType: 'ExerciseSession' }
      ]);
      
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // last 7 days
        endTime: new Date().toISOString(),
      };
      
      const records = await HealthConnect.readRecords('ExerciseSession', { timeRangeFilter });
      const { ExerciseType } = HealthConnect;
      
      let importedCount = 0;
      records.records.forEach((record: any) => {
        const duration = (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 1000;
        
        let mappedType: CardioActivityType = 'Running';
        const type = record.exerciseType;
        if (type === ExerciseType.BIKING || type === ExerciseType.BIKING_STATIONARY) mappedType = 'Cycling';
        else if (type === ExerciseType.SWIMMING_OPEN_WATER || type === ExerciseType.SWIMMING_POOL) mappedType = 'Swimming';
        else if (type === ExerciseType.WALKING) mappedType = 'Walking';
        else if (type === ExerciseType.BOXING) mappedType = 'Boxing';
        else if (type === ExerciseType.FOOTBALL_AMERICAN || type === ExerciseType.FOOTBALL_AUSTRALIAN || type === ExerciseType.SOCCER) mappedType = 'Football';
        else if (type === ExerciseType.TENNIS || type === ExerciseType.SQUASH || type === ExerciseType.TABLE_TENNIS) mappedType = 'Paddle';
        
        const session: CardioSession = {
          id: `hc-${record.metadata?.id || Date.now() + Math.random()}`,
          type: mappedType,
          date: record.startTime,
          durationSeconds: duration,
          distanceMeters: record.distance?.inMeters || 0,
          caloriesBurned: record.energy?.inKilocalories || 0,
          averageHeartRate: record.averageHeartRate || 0,
          maxHeartRate: record.maxHeartRate || 0,
          routeCoordinates: [],
          source: 'health-connect',
        };
        addSession(session);
        importedCount++;
      });

      alert(`Successfully imported ${importedCount} sessions from Health Connect.`);
    } catch(e) {
      console.warn("Health Connect Error", e);
      alert('Could not import from Health Connect. Ensure permissions are granted and you are not in Expo Go.');
    }
  };

  const renderHRZones = (session: CardioSession) => {
    // Simplified zone calculation assuming evenly distributed HR for demo
    // Zone 1: 50-60%, Zone 2: 60-70%, Zone 3: 70-80%, Zone 4: 80-90%, Zone 5: 90-100%
    const z1 = maxHR * 0.5;
    const z2 = maxHR * 0.6;
    const z3 = maxHR * 0.7;
    const z4 = maxHR * 0.8;
    const z5 = maxHR * 0.9;
    
    // Fake percentages for visual demo based on average HR
    let zones = [10, 40, 30, 15, 5]; 
    if (session.averageHeartRate > z4) zones = [5, 10, 20, 40, 25];
    else if (session.averageHeartRate < z2) zones = [60, 30, 10, 0, 0];

    return (
      <View style={styles.zonesWidget}>
        <Text style={styles.zoneTitle}>Heart Rate Zones</Text>
        <View style={styles.zoneBarsRow}>
          {['Z1', 'Z2', 'Z3', 'Z4', 'Z5'].map((z, i) => (
            <View key={z} style={styles.zoneBarContainer}>
              <View style={[styles.zoneBar, { height: `${zones[i]}%`, backgroundColor: getZoneColor(i) }]} />
              <Text style={styles.zoneLabel}>{z}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const getZoneColor = (index: number) => {
    const colors = ['#00D2FF', '#30D158', '#FFD700', '#FF9500', '#FF3B30'];
    return colors[index];
  };

  const renderItem = ({ item }: { item: CardioSession }) => {
    const isExpanded = expandedId === item.id;
    return (
      <TouchableOpacity 
        style={styles.sessionCard} 
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
      >
        <View style={styles.sessionHeader}>
          <View>
            <Text style={styles.sessionType}>{item.type} {item.testType ? `(${item.testType})` : ''}</Text>
            <Text style={styles.sessionDate}>{new Date(item.date).toLocaleDateString('de-DE')} • {item.source}</Text>
          </View>
          <Text style={styles.sessionDistance}>{(item.distanceMeters / 1000).toFixed(2)} km</Text>
        </View>
        
        <View style={styles.sessionQuickStats}>
          <Text style={styles.qStat}><MaterialCommunityIcons name="clock-outline" /> {Math.floor(item.durationSeconds / 60)} min</Text>
          <Text style={styles.qStat}><MaterialCommunityIcons name="fire" /> {Math.floor(item.caloriesBurned)} kcal</Text>
          <Text style={styles.qStat}><MaterialCommunityIcons name="heart" /> {Math.floor(item.averageHeartRate)} avg</Text>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />
            {renderHRZones(item)}
            <TouchableOpacity 
              style={{ backgroundColor: '#00D2FF', padding: 12, borderRadius: 8, marginTop: 15, alignItems: 'center' }}
              onPress={() => navigation.navigate('CardioSessionDetail', { sessionId: item.id })}
            >
              <Text style={{ color: '#121212', fontWeight: 'bold' }}>View Full Details</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.title} onPress={() => generateMockCardioSessions()}>History (Tap for Mock)</Text>
        <TouchableOpacity onPress={importFromHealthConnect}>
          <MaterialCommunityIcons name="sync" size={28} color="#00D2FF" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {ALL_TYPES.map(type => (
            <TouchableOpacity 
              key={type} 
              style={[styles.filterPill, selectedTypes.includes(type) && styles.filterPillActive]}
              onPress={() => toggleType(type)}
            >
              <Text style={[styles.filterPillText, selectedTypes.includes(type) && styles.filterPillTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {filteredHistory.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No cardio sessions yet.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 },
  title: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 16 },
  filterContainer: { marginBottom: 10 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1E1E1E', marginRight: 10, borderWidth: 1, borderColor: '#333' },
  filterPillActive: { backgroundColor: '#00D2FF', borderColor: '#00D2FF' },
  filterPillText: { color: '#888', fontWeight: 'bold' },
  filterPillTextActive: { color: 'black' },
  sessionCard: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 20, marginBottom: 15 },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sessionType: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  sessionDate: { color: '#888', fontSize: 12, marginTop: 4 },
  sessionDistance: { color: '#00D2FF', fontSize: 24, fontWeight: '900' },
  sessionQuickStats: { flexDirection: 'row', justifyContent: 'space-between' },
  qStat: { color: '#ccc', fontSize: 14, fontWeight: '600' },
  expandedContent: { marginTop: 15 },
  divider: { height: 1, backgroundColor: '#333', marginBottom: 15 },
  zonesWidget: { backgroundColor: '#121212', borderRadius: 12, padding: 15 },
  zoneTitle: { color: 'white', fontSize: 14, fontWeight: 'bold', marginBottom: 15 },
  zoneBarsRow: { flexDirection: 'row', justifyContent: 'space-between', height: 100, alignItems: 'flex-end' },
  zoneBarContainer: { alignItems: 'center', width: 40 },
  zoneBar: { width: 20, borderRadius: 4, minHeight: 4 },
  zoneLabel: { color: '#888', fontSize: 10, marginTop: 8 }
});
