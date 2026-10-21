import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CheckInEntry, useCheckInStore } from '../store/useCheckInStore';
import { useAppStore } from '../store/store';
import { getAppTheme } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  visible: boolean;
  entry: CheckInEntry | null;
  onClose: () => void;
}

export default function CheckInReportModal({ visible, entry, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);
  const { markRecommendationApplied } = useCheckInStore();
  const { targets, setTargets, dietPlans, updateDietPlan } = useAppStore();

  if (!entry || !entry.coachVerdict) return null;

  const verdict = entry.coachVerdict;
  const rec = verdict.recommendation;

  const getStatusColor = () => {
    switch (verdict.status) {
      case 'optimal':
        return '#00FF88';
      case 'warning':
        return '#FF9500';
      case 'alert':
        return '#FF453A';
      default:
        return theme.accent || '#00D2FF';
    }
  };

  const getStatusIcon = () => {
    switch (verdict.status) {
      case 'optimal':
        return 'check-decagram';
      case 'warning':
        return 'alert-circle';
      case 'alert':
        return 'alert-octagon';
      default:
        return 'information';
    }
  };

  const handleApplyRecommendation = () => {
    if (!rec || rec.calorieDelta === 0) return;

    Alert.alert(
      'Kalorien anpassen?',
      `Möchtest du dein tägliches Kalorienziel von ${targets.calories} kcal um ${
        rec.calorieDelta > 0 ? `+${rec.calorieDelta}` : rec.calorieDelta
      } kcal auf ${targets.calories + rec.calorieDelta} kcal anpassen?`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Jetzt anpassen',
          style: 'default',
          onPress: () => {
            const newCalories = targets.calories + rec.calorieDelta;
            const carbDelta = Math.round(rec.calorieDelta / 4);
            const newCarbs = Math.max(50, targets.carbs + carbDelta);

            // App Store Targets aktualisieren
            setTargets({
              ...targets,
              calories: newCalories,
              carbs: newCarbs,
            });

            // Aktiven Diätplan aktualisieren falls vorhanden
            const activePlan = (dietPlans || []).find((p) => p.isActive);
            if (activePlan) {
              updateDietPlan({
                ...activePlan,
                targetCalories: newCalories,
                targetCarbs: newCarbs,
              });
            }

            // In Check-In Historie als angewendet markieren
            markRecommendationApplied(entry.id);

            Alert.alert(
              'Ziel aktualisiert!',
              `Dein Ernährungsziel wurde erfolgreich auf ${newCalories} kcal angepasst.`
            );
          },
        },
      ]
    );
  };

  const statusColor = getStatusColor();

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { paddingTop: Math.max(16, insets.top) }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={[styles.headerSub, { color: theme.accent }]}>CHECK-IN WOCHE {entry.weekNumber}</Text>
            <Text style={styles.headerTitle}>Coach Feedback Report</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: Math.max(30, insets.bottom + 20) }}
        >
          {/* Main Hero Verdict Card */}
          <View style={[styles.heroCard, { borderColor: `${statusColor}55` }]}>
            <View style={styles.heroTopRow}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${statusColor}22`, borderColor: `${statusColor}55` },
                ]}
              >
                <MaterialCommunityIcons name={getStatusIcon()} size={14} color={statusColor} />
                <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                  STATUS: {verdict.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.dateText}>{entry.date}</Text>
            </View>

            <Text style={styles.heroHeadline}>{verdict.headline}</Text>
            <Text style={styles.heroSummary}>{verdict.summary}</Text>
          </View>

          {/* 3 Pillars Deep-Dive Cards */}
          <Text style={styles.sectionHeader}>Detaillierte Analyse</Text>

          {/* 1. Weight Analysis */}
          <View style={styles.pillarCard}>
            <View style={styles.pillarHeaderRow}>
              <View style={styles.pillarTitleGroup}>
                <MaterialCommunityIcons name="scale-bathroom" size={20} color={theme.accent} />
                <Text style={styles.pillarTitle}>1. Gewichtsentwicklung</Text>
              </View>
              <Text
                style={[
                  styles.pillarHighlight,
                  { color: verdict.weightAnalysis.deltaWeight >= 0 ? '#00FF88' : '#FF9500' },
                ]}
              >
                {verdict.weightAnalysis.deltaWeight > 0
                  ? `+${verdict.weightAnalysis.deltaWeight} kg`
                  : `${verdict.weightAnalysis.deltaWeight} kg`}
              </Text>
            </View>
            <Text style={styles.pillarDesc}>{verdict.weightAnalysis.verdictText}</Text>
            <View style={styles.pillarStatsRow}>
              <Text style={styles.statMini}>
                7-Tage-Schnitt: <Text style={styles.statBold}>{verdict.weightAnalysis.avgWeight} kg</Text>
              </Text>
              <Text style={styles.statMini}>
                Nüchtern heute: <Text style={styles.statBold}>{entry.fastingWeight} kg</Text>
              </Text>
            </View>
          </View>

          {/* 2. Workout Performance Analysis */}
          <View style={styles.pillarCard}>
            <View style={styles.pillarHeaderRow}>
              <View style={styles.pillarTitleGroup}>
                <MaterialCommunityIcons name="dumbbell" size={20} color="#00FF88" />
                <Text style={styles.pillarTitle}>2. Trainingsperformance</Text>
              </View>
              <Text style={[styles.pillarHighlight, { color: theme.accent }]}>
                {verdict.performanceAnalysis.volumeDeltaPercent >= 0
                  ? `+${verdict.performanceAnalysis.volumeDeltaPercent}%`
                  : `${verdict.performanceAnalysis.volumeDeltaPercent}%`}
              </Text>
            </View>
            <Text style={styles.pillarDesc}>{verdict.performanceAnalysis.verdictText}</Text>
            <View style={styles.pillarStatsRow}>
              <Text style={styles.statMini}>
                Tonnage: <Text style={styles.statBold}>{verdict.performanceAnalysis.totalVolume.toLocaleString()} kg</Text>
              </Text>
              <Text style={styles.statMini}>
                Workouts: <Text style={styles.statBold}>{verdict.performanceAnalysis.workoutsCompleted} absolviert</Text>
              </Text>
            </View>
          </View>

          {/* 3. Nutrition Analysis */}
          <View style={styles.pillarCard}>
            <View style={styles.pillarHeaderRow}>
              <View style={styles.pillarTitleGroup}>
                <MaterialCommunityIcons name="food-apple" size={20} color="#FF9500" />
                <Text style={styles.pillarTitle}>3. Ernährung & Makros</Text>
              </View>
              <Text style={[styles.pillarHighlight, { color: '#FF9500' }]}>
                {verdict.nutritionAnalysis.adherencePercent}% Treue
              </Text>
            </View>
            <Text style={styles.pillarDesc}>{verdict.nutritionAnalysis.verdictText}</Text>
            <View style={styles.pillarStatsRow}>
              <Text style={styles.statMini}>
                Kalorienschnitt: <Text style={styles.statBold}>{verdict.nutritionAnalysis.avgCalories} kcal</Text>
              </Text>
              <Text style={styles.statMini}>
                Plan-Ziel: <Text style={styles.statBold}>{verdict.nutritionAnalysis.targetCalories} kcal</Text>
              </Text>
            </View>
          </View>

          {/* Biofeedback Summary */}
          {entry.biofeedback && (
            <View style={styles.pillarCard}>
              <View style={styles.pillarHeaderRow}>
                <View style={styles.pillarTitleGroup}>
                  <MaterialCommunityIcons name="heart-pulse" size={20} color="#BF5AF2" />
                  <Text style={styles.pillarTitle}>Biofeedback & Erholung</Text>
                </View>
              </View>
              <View style={styles.bioGrid}>
                <View style={styles.bioItem}>
                  <Text style={styles.bioLabel}>Schlaf</Text>
                  <Text style={styles.bioVal}>{entry.biofeedback.sleep}/10</Text>
                </View>
                <View style={styles.bioItem}>
                  <Text style={styles.bioLabel}>Energie</Text>
                  <Text style={styles.bioVal}>{entry.biofeedback.energy}/10</Text>
                </View>
                <View style={styles.bioItem}>
                  <Text style={styles.bioLabel}>Appetit</Text>
                  <Text style={styles.bioVal}>{entry.biofeedback.appetite}/10</Text>
                </View>
                <View style={styles.bioItem}>
                  <Text style={styles.bioLabel}>Verdauung</Text>
                  <Text style={styles.bioVal}>{entry.biofeedback.digestion}/10</Text>
                </View>
              </View>
            </View>
          )}

          {/* Smart Action Plan (Coach Recommendation) */}
          <View style={[styles.actionPlanCard, { borderColor: statusColor }]}>
            <View style={styles.actionPlanHeader}>
              <MaterialCommunityIcons name="robot" size={22} color={theme.accent} />
              <Text style={[styles.actionPlanTitle, { color: theme.accent }]}>SMART ACTION PLAN</Text>
            </View>
            <Text style={styles.actionPlanDesc}>{rec.explanation}</Text>

            {rec.calorieDelta !== 0 && !rec.applied && (
              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: statusColor }]}
                onPress={handleApplyRecommendation}
              >
                <MaterialCommunityIcons name="lightning-bolt" size={18} color="#000" />
                <Text style={styles.applyBtnText}>
                  Kalorien um {rec.calorieDelta > 0 ? `+${rec.calorieDelta}` : rec.calorieDelta} kcal anpassen
                </Text>
              </TouchableOpacity>
            )}

            {rec.applied && (
              <View style={styles.appliedBadge}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#00FF88" />
                <Text style={styles.appliedText}>
                  Empfehlung wurde in deinen Ernährungsplan übernommen
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#252528',
  },
  backBtn: {
    padding: 8,
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00D2FF',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroCard: {
    backgroundColor: '#181A20',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 11,
    color: '#888',
  },
  heroHeadline: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },
  heroSummary: {
    fontSize: 13,
    color: '#CCC',
    lineHeight: 19,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  pillarCard: {
    backgroundColor: '#18181A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#282828',
    marginBottom: 12,
  },
  pillarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pillarTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pillarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  pillarHighlight: {
    fontSize: 13,
    fontWeight: '800',
  },
  pillarDesc: {
    fontSize: 12,
    color: '#AAA',
    lineHeight: 17,
    marginBottom: 10,
  },
  pillarStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#252528',
    paddingTop: 8,
  },
  statMini: {
    fontSize: 11,
    color: '#777',
  },
  statBold: {
    color: '#FFF',
    fontWeight: '700',
  },
  bioGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  bioItem: {
    alignItems: 'center',
    backgroundColor: '#121214',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 3,
  },
  bioLabel: {
    fontSize: 10,
    color: '#777',
    marginBottom: 2,
  },
  bioVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  actionPlanCard: {
    backgroundColor: '#1A1E24',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    marginTop: 8,
    marginBottom: 20,
  },
  actionPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  actionPlanTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00D2FF',
    letterSpacing: 1,
  },
  actionPlanDesc: {
    fontSize: 13,
    color: '#FFF',
    lineHeight: 19,
    marginBottom: 12,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  applyBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
  appliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#00FF8815',
    borderWidth: 1,
    borderColor: '#00FF8833',
  },
  appliedText: {
    color: '#00FF88',
    fontSize: 11,
    fontWeight: '700',
  },
});
