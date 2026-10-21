import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useIronTacticsMetaStore } from '../../store/useIronTacticsMetaStore';
import { useAppStore, getLocalDateString } from '../../store/store';

export const IronTacticsFitnessFuelCard: React.FC = () => {
  const { claimedFitness, claimFitnessAction } = useIronTacticsMetaStore();
  const { workoutHistory, consumedToday, targets } = useAppStore();

  const today = getLocalDateString();
  const claimedList = claimedFitness[today] || [];

  // Check fitness status from app store
  const workoutDoneToday = (workoutHistory || []).some(w => w.date && w.date.startsWith(today));
  const targetCal = targets?.calories || 2200;
  const targetProt = targets?.protein || 140;
  const nutritionDoneToday = consumedToday.calories >= targetCal * 0.85 && consumedToday.protein >= targetProt * 0.85;
  const isWorkoutClaimed = claimedList.includes('workout_completed');
  const isNutritionClaimed = claimedList.includes('nutrition_hit');

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name="lightning-bolt" size={18} color="#FFD700" />
          <Text style={styles.title}>FITNESS-TREIBSTOFF</Text>
        </View>
        <Text style={styles.subtext}>Training belohnt dein Game</Text>
      </View>

      <View style={styles.fuelRows}>
        {/* Workout */}
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: '#F43F5E25' }]}>
            <MaterialCommunityIcons name="dumbbell" size={18} color="#F43F5E" />
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.actionName}>Workout abgeschlossen</Text>
            <Text style={styles.rewardDesc}>+3 Pump (Überpump) & 3 Shakes</Text>
          </View>
          {isWorkoutClaimed ? (
            <View style={styles.claimedBadge}>
              <MaterialCommunityIcons name="check" size={14} color="#30D158" />
              <Text style={styles.claimedText}>Eingelöst</Text>
            </View>
          ) : workoutDoneToday ? (
            <TouchableOpacity
              style={styles.claimBtn}
              onPress={() => claimFitnessAction('workout_completed', { sets: 12 })}
            >
              <Text style={styles.claimBtnText}>Abholen</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.pendingText}>Offen</Text>
          )}
        </View>

        {/* Nutrition */}
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: '#30D15825' }]}>
            <MaterialCommunityIcons name="food-apple" size={18} color="#30D158" />
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.actionName}>Ernährungsziel getroffen</Text>
            <Text style={styles.rewardDesc}>+1 Protein-Shake & +40 Saison-XP</Text>
          </View>
          {isNutritionClaimed ? (
            <View style={styles.claimedBadge}>
              <MaterialCommunityIcons name="check" size={14} color="#30D158" />
              <Text style={styles.claimedText}>Eingelöst</Text>
            </View>
          ) : nutritionDoneToday ? (
            <TouchableOpacity
              style={styles.claimBtn}
              onPress={() => claimFitnessAction('nutrition_hit')}
            >
              <Text style={styles.claimBtnText}>Abholen</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.pendingText}>Offen</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 14,
    marginVertical: 8,
    backgroundColor: '#13131D',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262638',
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtext: {
    color: '#8E8E9F',
    fontSize: 10.5,
    fontWeight: '600',
  },
  fuelRows: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181826',
    borderRadius: 12,
    padding: 9,
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
  },
  actionName: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  rewardDesc: {
    color: '#A0A0B5',
    fontSize: 10,
    marginTop: 1,
  },
  claimBtn: {
    backgroundColor: '#30D158',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  claimBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '900',
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  claimedText: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: '800',
  },
  pendingText: {
    color: '#666',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
  },
});
