import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions, Image, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useAppStore } from '../store/store';
import { PRELOADED_EXERCISES } from '../data/exercises';
import { getLevelData } from '../utils/gamification';
import { getAppTheme } from '../utils/theme';

const { width, height } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
}

export const ExerciseTCGCard = ({ visible, onClose, exerciseName }: Props) => {
  const { workoutHistory, customExercises, accentThemeId } = useAppStore();
  const theme = getAppTheme(accentThemeId);
  const allExercises = [...PRELOADED_EXERCISES, ...(customExercises || [])];
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Reset flip when opening
  useEffect(() => {
    if (visible) {
      setFlipped(false);
      flipAnim.setValue(0);
    }
  }, [visible]);

  const flipCard = () => {
    Animated.timing(flipAnim, {
      toValue: flipped ? 0 : 180,
      duration: 600,
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg']
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg']
  });

  // Calculate stats
  let totalSets = 0;
  let maxWeight = 0;
  let totalVolume = 0;
  
  // Collect history data points for the chart: [Date, MaxWeightThatDay]
  const historyDataPoints: { date: string, weight: number }[] = [];

  workoutHistory.forEach(w => {
    const ex = w.exercises.find(e => e.name === exerciseName);
    if (ex && ex.sets.length > 0) {
      let dailyMaxWeight = 0;
      ex.sets.forEach(s => {
        const repsCount = s.repsRight !== undefined ? ((s.reps || 0) + (s.repsRight || 0)) : (s.reps || 0);
        totalVolume += (s.weight || 0) * repsCount;
        if ((s.weight || 0) > dailyMaxWeight) dailyMaxWeight = s.weight || 0;
        if ((s.weight || 0) > maxWeight) maxWeight = s.weight || 0;
      });
      historyDataPoints.push({
        date: w.formattedDate.split(' - ')[0] || w.date, // e.g. "Sep 4, 2026"
        weight: dailyMaxWeight
      });
    }
  });

  // Sort by date ascending
  historyDataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Aggregate by day if multiple workouts same day
  const aggregatedHistory: { label: string, weight: number }[] = [];
  historyDataPoints.forEach(pt => {
    const dateLabel = pt.date.substring(0, 6); // "Sep 4"
    const existing = aggregatedHistory.find(x => x.label === dateLabel);
    if (existing) {
      existing.weight = Math.max(existing.weight, pt.weight);
    } else {
      aggregatedHistory.push({ label: dateLabel, weight: pt.weight });
    }
  });

  // Chart data
  const chartLabels = aggregatedHistory.slice(-5).map(x => x.label);
  const chartData = aggregatedHistory.slice(-5).map(x => x.weight);

  // Gamification (Level, Colors)
  const xp = totalSets * 10;
  const levelData = getLevelData(xp);
  const borderColor = levelData.rankColor;

  const exData = allExercises.find(e => e.name === exerciseName);
  const equipment = exData?.equipmentType || 'Freie Übung';
  const brand = exData?.brand && exData.brand !== 'Keine' ? exData.brand : '';

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        
        {/* Close Button */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <MaterialCommunityIcons name="close" size={32} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={1} onPress={flipCard} style={styles.cardContainer}>
          
          {/* FRONT OF CARD */}
          <Animated.View style={[
            styles.cardWrapper, 
            { borderColor: borderColor, transform: [{ rotateY: frontInterpolate }] }
          ]}>
            <View style={styles.cardInner}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardName} numberOfLines={1}>{exerciseName}</Text>
                  <Text style={styles.cardType}>{brand ? `${brand} • ` : ''}{equipment}</Text>
                </View>
                <View style={[styles.levelBadge, { backgroundColor: borderColor }]}>
                  <Text style={styles.levelText}>LVL {levelData.level}</Text>
                </View>
              </View>

              {/* Image Area */}
              <View style={styles.imageContainer}>
                <MaterialCommunityIcons name="dumbbell" size={100} color={borderColor} style={{ opacity: 0.5 }} />
                <Text style={{ color: '#888', marginTop: 16 }}>Image Placeholder</Text>
              </View>

              {/* Stats Preview */}
              <View style={styles.statsPreview}>
                <Text style={styles.statsPreviewText}>Rank: <Text style={{ color: borderColor, fontWeight: 'bold' }}>{levelData.rank}</Text></Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <MaterialCommunityIcons name="rotate-3d-variant" size={16} color="#DDD" style={{ marginRight: 6 }} />
                  <Text style={styles.statsPreviewText}>Tap to Flip for Stats</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* BACK OF CARD */}
          <Animated.View style={[
            styles.cardWrapper, 
            styles.cardBack, 
            { borderColor: borderColor, transform: [{ rotateY: backInterpolate }] }
          ]}>
            <View style={styles.cardInner}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardName} numberOfLines={1}>{exerciseName} - Stats</Text>
              </View>

              <ScrollView style={styles.backScroll} showsVerticalScrollIndicator={false}>
                
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Max Weight</Text>
                    <Text style={[styles.statValue, { color: borderColor }]}>{maxWeight} kg</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total Sets</Text>
                    <Text style={[styles.statValue, { color: borderColor }]}>{totalSets}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Volume</Text>
                    <Text style={[styles.statValue, { color: borderColor }]}>{totalVolume} kg</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Total XP</Text>
                    <Text style={[styles.statValue, { color: borderColor }]}>{xp}</Text>
                  </View>
                </View>

                {chartData.length > 0 ? (
                  <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Weight Progression</Text>
                    <LineChart
                      data={{
                        labels: chartLabels.length > 0 ? chartLabels : [''],
                        datasets: [{ data: chartData.length > 0 ? chartData : [0] }]
                      }}
                      width={width * 0.75}
                      height={200}
                      chartConfig={{
                        backgroundColor: theme.cardBg || '#1E1E1E',
                        backgroundGradientFrom: theme.cardBg || '#1E1E1E',
                        backgroundGradientTo: theme.cardBg || '#1E1E1E',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(${theme.accentRgb || '0, 210, 255'}, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                        style: { borderRadius: 16 },
                        propsForDots: { r: "6", strokeWidth: "2", stroke: borderColor }
                      }}
                      bezier
                      style={{ marginVertical: 8, borderRadius: 16 }}
                    />
                  </View>
                ) : (
                  <View style={styles.noDataContainer}>
                    <MaterialCommunityIcons name="chart-line-variant" size={40} color="#555" />
                    <Text style={styles.noDataText}>No history found to generate chart.</Text>
                  </View>
                )}

              </ScrollView>
            </View>
          </Animated.View>

        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  cardContainer: {
    width: width * 0.85,
    height: height * 0.65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    borderWidth: 6,
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  cardBack: {
    backgroundColor: '#1A1A1A',
  },
  cardInner: {
    flex: 1,
    padding: 16,
    borderRadius: 14, // slightly less than outer radius
    backgroundColor: '#1A1A1C',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 12,
    marginBottom: 16,
  },
  cardName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    maxWidth: width * 0.55,
  },
  cardType: {
    color: '#AAA',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  levelText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#121212',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsPreview: {
    backgroundColor: '#2C2C2E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statsPreviewText: {
    color: '#DDD',
    fontSize: 16,
    marginBottom: 4,
  },
  backScroll: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#2C2C2E',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  chartContainer: {
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  chartTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: 10,
    marginLeft: 8,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
  },
  noDataText: {
    color: '#888',
    marginTop: 12,
    textAlign: 'center',
  }
});
