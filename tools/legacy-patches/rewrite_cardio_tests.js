const fs = require('fs');

let code = `import { useAppStore, showCustomAlert } from "../store/store";
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CardioTestsScreen({ navigation }: any) {
  const startTest = (testType: string) => {
    const store = useAppStore.getState();
    if (store.globalCardioActive) {
      showCustomAlert(
        "Active Session",
        "You already have a cardio session running. Do you want to finish and save it before starting a new test?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Finish & Start New", 
            onPress: async () => {
              if (store.finishCurrentCardio) await store.finishCurrentCardio(true);
              store.setGlobalCardioSessionInfo('Running', testType);
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
              store.setGlobalCardioSessionInfo('Running', testType);
              store.setGlobalCardioModalVisible(true);
            } 
          }
        ]
      );
    } else {
      store.setGlobalCardioSessionInfo('Running', testType);
      store.setGlobalCardioModalVisible(true);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Health Tests</Text>
        <View style={{ width: 28 }} />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        
        <TouchableOpacity style={styles.testCard} onPress={() => startTest('Cooper')}>
          <View style={styles.testHeader}>
            <MaterialCommunityIcons name="timer" size={32} color="#FF9F0A" />
            <Text style={styles.testTitle}>Cooper Test (12 Min)</Text>
          </View>
          <Text style={styles.testDesc}>
            Run as far as you can in exactly 12 minutes. This is a standard test to estimate your VO2 max and overall cardiovascular fitness.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testCard} onPress={() => startTest('1.5Mile')}>
          <View style={styles.testHeader}>
            <MaterialCommunityIcons name="map-marker-distance" size={32} color="#30D158" />
            <Text style={styles.testTitle}>1.5 Mile Run</Text>
          </View>
          <Text style={styles.testDesc}>
            Run 1.5 miles (2.4 km) as fast as possible. The time it takes is an excellent indicator of aerobic capacity.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testCard} onPress={() => startTest('Rockport')}>
          <View style={styles.testHeader}>
            <MaterialCommunityIcons name="walk" size={32} color="#00D2FF" />
            <Text style={styles.testTitle}>Rockport Walk Test</Text>
          </View>
          <Text style={styles.testDesc}>
            Walk 1 mile as fast as possible. Your heart rate at the end determines your fitness level. Great for beginners.
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  container: { padding: 20 },
  testCard: { backgroundColor: '#1E1E1E', padding: 20, borderRadius: 16, marginBottom: 20 },
  testHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  testTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 12 },
  testDesc: { color: '#aaa', fontSize: 14, lineHeight: 20 }
});
`;
fs.writeFileSync('src/screens/CardioTestsScreen.tsx', code);
