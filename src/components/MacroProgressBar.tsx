import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore, LoggedMeal } from '../store/store';
import SwipeableModal from './SwipeableModal';

interface MacroProgressBarProps {
  label: string;
  current: number;
  target: number;
  color: string;
  macroKey: 'calories' | 'protein' | 'carbs' | 'fat';
}

export default function MacroProgressBar({ label, current, target, color, macroKey }: MacroProgressBarProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const { loggedMealsToday } = useAppStore();

  const progressPercent = target > 0 ? (current / target) * 100 : 0;
  const clampedProgress = Math.min(progressPercent, 100);
  const overfill = progressPercent > 100;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: clampedProgress,
      duration: 500,
      useNativeDriver: false, // width/flex animation requires false
    }).start();
  }, [clampedProgress]);

  // Determine top contributors
  const getTopContributors = () => {
    if (!loggedMealsToday || loggedMealsToday.length === 0) return [];
    const sorted = [...loggedMealsToday].sort((a, b) => (b[macroKey] || 0) - (a[macroKey] || 0));
    return sorted.filter(m => (m[macroKey] || 0) > 0).slice(0, 3);
  };

  const topContributors = getTopContributors();

  // Adjust color based on overfill
  const barColor = overfill && macroKey !== 'protein' ? '#FF453A' : color;
  
  const widthInterpolation = animation.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity activeOpacity={0.7} onPress={() => setModalVisible(true)}>
        <View style={styles.macroLabelRow}>
          <Text style={styles.macroLabel}>{label}</Text>
          <Text style={[styles.macroValues, overfill && macroKey !== 'protein' && { color: '#FF453A' }]}>
            {Math.round(current)} / {target}
            {label === 'Calories' ? ' kcal' : 'g'}
          </Text>
        </View>
        
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, { width: widthInterpolation, backgroundColor: barColor }]} />
          {overfill && macroKey !== 'protein' && (
             <View style={[StyleSheet.absoluteFill, styles.overfillIndicator]}>
                <MaterialCommunityIcons name="alert-circle" size={12} color="#FFF" />
             </View>
          )}
        </View>
      </TouchableOpacity>

      <SwipeableModal visible={modalVisible} onClose={() => setModalVisible(false)}>
        <Text style={styles.modalTitle}>{label} Contributors</Text>
        <Text style={styles.modalSubtitle}>Top meals contributing to your daily {label.toLowerCase()} intake.</Text>
        
        <View style={{ marginTop: 16 }}>
          {topContributors.length === 0 ? (
            <Text style={styles.emptyText}>No data yet. Log some meals!</Text>
          ) : (
            topContributors.map((meal) => (
              <View key={meal.id} style={styles.contributorItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealTime}>{meal.time}</Text>
                  <Text style={styles.mealName}>{meal.name}</Text>
                </View>
                <View style={styles.macroPill}>
                  <Text style={styles.macroPillText}>{Math.round(meal[macroKey] || 0)} {label === 'Calories' ? 'kcal' : 'g'}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </SwipeableModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  macroLabel: { color: '#DDD', fontWeight: '700', fontSize: 14 },
  macroValues: { color: '#888', fontSize: 14, fontWeight: '600' },
  progressBarBg: { height: 12, backgroundColor: '#333', borderRadius: 6, overflow: 'hidden', position: 'relative' },
  progressBarFill: { height: 12, borderRadius: 6 },
  overfillIndicator: { justifyContent: 'center', alignItems: 'flex-end', paddingRight: 4 },
  
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  modalSubtitle: { color: '#888', fontSize: 14, marginTop: 4 },
  emptyText: { color: '#888', fontStyle: 'italic', marginTop: 12 },
  
  contributorItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#333' },
  mealTime: { color: '#00D2FF', fontSize: 12, fontWeight: '800', marginBottom: 2 },
  mealName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  macroPill: { backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  macroPillText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});
