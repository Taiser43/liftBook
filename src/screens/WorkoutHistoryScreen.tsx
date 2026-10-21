import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, TextInput, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore, WorkoutPlan, Exercise } from '../store/store';
import { CompletedWorkout } from '../store/store';
import { useBottomSpacing } from '../hooks/useBottomSpacing';
import { getAppTheme } from '../utils/theme';

export default function WorkoutHistoryScreen({ navigation }: any) {
  const bottomSpacing = useBottomSpacing();
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);
  const workoutHistory = useAppStore(state => state.workoutHistory);
  const workoutPrograms = useAppStore(state => state.workoutPrograms);
  const updateWorkoutProgram = useAppStore(state => state.updateWorkoutProgram);
  const addSpontaneousWorkout = useAppStore(state => state.addSpontaneousWorkout);
  const updateCompletedWorkout = useAppStore(state => state.updateCompletedWorkout);
  const toggleFavoriteWorkout = useAppStore(state => state.toggleFavoriteWorkout);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPartner, setEditPartner] = useState('');

  // Sort newest first
  const sortedHistory = [...workoutHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSaveAsPlan = (item: CompletedWorkout) => {
    const activeProgram = workoutPrograms?.find(p => p.isActive);
    
    const reconstructPlan = (): WorkoutPlan => {
      const exercises: Exercise[] = item.exercises.map(ex => {
        const topWeight = ex.sets?.reduce((max, s) => Math.max(max, s.weight || 0), 0) || 0;
        const totalReps = ex.sets?.reduce((sum, s) => sum + (s.reps || 0), 0) || 0;
        const avgReps = ex.sets?.length ? Math.round(totalReps / ex.sets.length) : 10;
        const setsData = ex.sets?.map(s => ({ weight: s.weight || 0, reps: s.reps || 0, repsRight: s.repsRight })) || [];
        return {
          id: Date.now().toString() + Math.random().toString(),
          name: ex.name,
          sets: ex.sets?.length || 3,
          reps: avgReps || 10,
          weight: topWeight,
          isUnilateral: ex.isUnilateral,
          lastCompletedSets: setsData.length > 0 ? setsData : undefined,
        };
      });
      return {
        id: Date.now().toString(),
        name: item.planName || 'Saved Workout',
        daysOfWeek: [],
        exercises
      };
    };

    Alert.alert(
      "Save Workout",
      "Where would you like to save this workout?",
      [
        {
          text: "As Freestyle Workout",
          onPress: () => {
            addSpontaneousWorkout(reconstructPlan());
            Alert.alert("Saved!", "Workout saved to Freestyle Workouts.");
          }
        },
        {
          text: "To Active Program",
          onPress: () => {
            if (!activeProgram) {
              Alert.alert("Error", "No active program found.");
              return;
            }
            const updatedProgram = {
              ...activeProgram,
              workouts: [...(activeProgram.workouts || []), reconstructPlan()]
            };
            updateWorkoutProgram(updatedProgram);
            Alert.alert("Saved!", "Workout saved to your active program.");
          }
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
  };

  const handleSaveMetadata = (item: CompletedWorkout) => {
    updateCompletedWorkout({
      ...item,
      customName: editName.trim() || item.planName,
      trainingPartner: editPartner.trim() || undefined,
    });
    setEditingId(null);
  };

  const renderItem = ({ item }: { item: CompletedWorkout }) => {
    const isExpanded = expandedId === item.id;
    const isEditing = editingId === item.id;
    const displayName = item.customName || item.planName;

    return (
      <TouchableOpacity 
        style={[
          styles.sessionCard, 
          { backgroundColor: theme.cardBg || '#1E1E1E', borderColor: theme.cardBorder || '#333' },
          item.isFavorite && styles.sessionCardFavorite
        ]} 
        onPress={() => {
          if (editingId === item.id) return;
          setExpandedId(isExpanded ? null : item.id);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.sessionHeader}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => toggleFavoriteWorkout(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginRight: 6 }}
              >
                <MaterialCommunityIcons 
                  name={item.isFavorite ? "star" : "star-outline"} 
                  size={20} 
                  color={item.isFavorite ? "#FFD700" : "#555"} 
                />
              </TouchableOpacity>
              <Text style={styles.sessionType} numberOfLines={1}>{displayName}</Text>
            </View>
            {item.customName && item.customName !== item.planName && (
              <Text style={styles.sessionSubPlan}>{item.planName}</Text>
            )}
            <Text style={styles.sessionDate}>{item.formattedDate}</Text>
            {item.trainingPartner && (
              <View style={styles.partnerBadge}>
                <MaterialCommunityIcons name="account-multiple" size={12} color="#30D158" style={{ marginRight: 4 }} />
                <Text style={styles.partnerBadgeText}>mit {item.trainingPartner}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.sessionVolume, { color: theme.accent || '#00D2FF' }]}>
            {item.exercises.length} <Text style={{fontSize: 14, color: '#888'}}>Exs</Text>
          </Text>
        </View>
        
        <View style={styles.sessionQuickStats}>
          <Text style={styles.qStat}><MaterialCommunityIcons name="clock-outline" /> {Math.floor(item.durationSeconds / 60)} min</Text>
          <Text style={styles.qStat}><MaterialCommunityIcons name="fire" /> {Math.floor(item.caloriesBurned)} kcal</Text>
          {item.avgHeartRate ? (
            <Text style={styles.qStat}><MaterialCommunityIcons name="heart" /> {item.avgHeartRate} avg</Text>
          ) : null}
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={[styles.divider, { backgroundColor: theme.subtleBorder || '#333' }]} />
            
            {/* Inline Editor for Name and Partner */}
            {isEditing ? (
              <View style={[styles.editSection, { backgroundColor: theme.subCardBg || '#18181A', borderColor: theme.cardBorder || '#333' }]}>
                <Text style={styles.editLabel}>WORKOUT NAME</Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Workout Name"
                  placeholderTextColor="#666"
                />

                <Text style={[styles.editLabel, { marginTop: 10 }]}>TRAININGSPARTNER</Text>
                <TextInput
                  style={styles.editInput}
                  value={editPartner}
                  onChangeText={setEditPartner}
                  placeholder="z.B. Marc (optional)"
                  placeholderTextColor="#666"
                />

                <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end', gap: 10 }}>
                  <TouchableOpacity 
                    style={[styles.smallBtn, { backgroundColor: '#333' }]}
                    onPress={() => setEditingId(null)}
                  >
                    <Text style={{ color: '#888', fontWeight: 'bold' }}>Abbrechen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.smallBtn, { backgroundColor: theme.accent || '#00D2FF' }]}
                    onPress={() => handleSaveMetadata(item)}
                  >
                    <Text style={{ color: '#000', fontWeight: 'bold' }}>Speichern</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.exercisesTitle}>Exercises</Text>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2E', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                  onPress={() => {
                    setEditingId(item.id);
                    setEditName(item.customName || item.planName);
                    setEditPartner(item.trainingPartner || '');
                  }}
                >
                  <MaterialCommunityIcons name="pencil" size={14} color={theme.accent || "#00D2FF"} style={{ marginRight: 4 }} />
                  <Text style={{ color: theme.accent || '#00D2FF', fontSize: 12, fontWeight: '700' }}>Edit Info</Text>
                </TouchableOpacity>
              </View>
            )}

            {item.exercises.map((ex, index) => {
              const setsCount = ex.sets?.length || 0;
              const topWeight = ex.sets?.reduce((max: number, s: any) => Math.max(max, s.weight), 0) || 0;
              return (
                <View key={index} style={styles.exerciseRow}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  <Text style={[styles.exerciseDetails, { color: theme.accent || '#00D2FF' }]}>
                    {setsCount} sets • Top: {topWeight}kg
                  </Text>
                </View>
              );
            })}
            
            <TouchableOpacity 
              style={{ marginTop: 20, backgroundColor: theme.accentSoftBg || '#333', borderColor: theme.accentBorder || '#444', borderWidth: 1, padding: 12, borderRadius: 8, alignItems: 'center' }}
              onPress={() => handleSaveAsPlan(item)}
            >
              <Text style={{ color: theme.accent || '#FFF', fontWeight: 'bold' }}>Save as Workout Routine</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.subCardBg || '#121212' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Strength History</Text>
        <View style={{ width: 28 }} />
      </View>
      
      {sortedHistory.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="dumbbell" size={64} color="#333" />
          <Text style={styles.emptyText}>No workouts logged yet.</Text>
        </View>
      ) : (
        <FlatList
          data={sortedHistory}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: bottomSpacing + 30 }}
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
  emptyText: { color: '#888', fontSize: 16, marginTop: 10 },
  sessionCard: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 20, marginBottom: 15 },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sessionType: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  sessionDate: { color: '#888', fontSize: 12, marginTop: 4 },
  sessionVolume: { color: '#00D2FF', fontSize: 24, fontWeight: '900' },
  sessionQuickStats: { flexDirection: 'row', justifyContent: 'space-between' },
  qStat: { color: '#ccc', fontSize: 14, fontWeight: '600' },
  expandedContent: { marginTop: 15 },
  divider: { height: 1, backgroundColor: '#333', marginBottom: 15 },
  exercisesTitle: { color: 'white', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  exerciseName: { color: '#E0E0E0', fontSize: 14, flex: 1 },
  exerciseDetails: { color: '#00D2FF', fontSize: 14, fontWeight: '600' },
  sessionCardFavorite: {
    borderColor: '#FFD700',
    borderWidth: 1.5,
  },
  sessionSubPlan: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  partnerBadgeText: {
    color: '#30D158',
    fontSize: 12,
    fontWeight: '600',
  },
  editSection: {
    backgroundColor: '#18181A',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  editLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  editInput: {
    backgroundColor: '#26262A',
    color: '#FFF',
    fontSize: 14,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3A3A3E',
  },
  smallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
