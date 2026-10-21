import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCheckInStore } from '../store/useCheckInStore';
import { useAppStore, getLocalDateString } from '../store/store';
import { getSevenDayWeightStats, getWorkoutStats, getNutritionStats } from '../utils/checkInEngine';
import CheckInModal from './CheckInModal';
import CheckInReportModal from './CheckInReportModal';
import { getAppTheme } from '../utils/theme';

interface Props {
  containerWidth: number;
}

export default function CheckInWidget({ containerWidth }: Props) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [hubModalVisible, setHubModalVisible] = useState<boolean>(false);
  const [reportModalVisible, setReportModalVisible] = useState<boolean>(false);

  const today = getLocalDateString();
  const { phaseConfig, checkInHistory } = useCheckInStore();
  const { weightHistory, workoutHistory, nutritionHistory, targets, bodyweight, accentThemeId } = useAppStore();
  const theme = getAppTheme(accentThemeId);

  // Berechne aktuelle Wochennummer in der Phase
  const calculateCurrentWeek = () => {
    const start = new Date(phaseConfig.startDate || today);
    const now = new Date(today);
    const diffDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    return Math.max(1, Math.min(phaseConfig.targetWeeks, Math.floor(diffDays / 7) + 1));
  };

  const currentWeekNum = calculateCurrentWeek();
  const currentWeekCheckIn = checkInHistory.find((c) => c.weekNumber === currentWeekNum);
  const isCheckInDone = !!currentWeekCheckIn;

  // 7-Tage-Schnitt und Metriken
  const todayWeightEntry = (weightHistory || []).find((w) => w.date === today);
  const initialFastingWeight = todayWeightEntry ? todayWeightEntry.weight : bodyweight > 0 ? bodyweight : 80.0;
  const weightStats = getSevenDayWeightStats(today, weightHistory, initialFastingWeight);
  const workoutStats = getWorkoutStats(today, workoutHistory);
  const nutritionStats = getNutritionStats(today, nutritionHistory, targets.calories, targets.protein);

  const goalColor = phaseConfig.goal === 'Bulk' ? '#FF9500' : phaseConfig.goal === 'Cut' ? '#FF453A' : theme.accent;

  // Letztes Vorwochen-Foto für Thumbnail
  const latestWithPhoto = checkInHistory.find((c) => c.photos?.front);
  const photoUri = latestWithPhoto?.photos?.front;

  return (
    <View style={[styles.container, { width: containerWidth, backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
      {/* Widget Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.goalPill, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
            <Text style={[styles.goalPillText, { color: goalColor }]}>
              {phaseConfig.goal === 'Bulk' ? '🍗 LEAN BULK' : phaseConfig.goal === 'Cut' ? '🔥 CUT' : '⚖️ RECOMP'}
            </Text>
          </View>
          <Text style={styles.weekTag}>W{currentWeekNum}/{phaseConfig.targetWeeks}</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, isCheckInDone ? styles.statusDone : styles.statusPending]}>
            <Text style={[styles.statusBadgeText, isCheckInDone ? { color: '#00FF88' } : { color: '#FF9500' }]}>
              {isCheckInDone ? '✓ ERLEDIGT' : 'FÄLLIG'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.expandChevron}
            onPress={() => setExpanded(!expanded)}
          >
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#AAA"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Title & Fast Info */}
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.widgetTitle}>Wöchentlicher Check-In</Text>
          <Text style={styles.widgetSub}>
            {isCheckInDone
              ? `Woche ${currentWeekNum} analysiert: ${currentWeekCheckIn?.coachVerdict.headline}`
              : `Sonntags-Check bereit • 7-Tage-Schnitt: ${weightStats.thisWeekAvg} kg`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.hubOpenIconBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
          onPress={() => setHubModalVisible(true)}
        >
          <MaterialCommunityIcons name="open-in-new" size={18} color={theme.accent} />
        </TouchableOpacity>
      </View>

      {/* 3 Quick KPI Columns */}
      <View style={[styles.kpiRow, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
        {/* KPI 1: Weight */}
        <View style={styles.kpiCol}>
          <Text style={styles.kpiLabel}>7-Tage-Schnitt</Text>
          <Text style={styles.kpiVal}>{weightStats.thisWeekAvg} kg</Text>
          <Text
            style={[
              styles.kpiSub,
              { color: weightStats.deltaWeight >= 0 ? '#00FF88' : '#FF9500' },
            ]}
          >
            {weightStats.deltaWeight > 0 ? `+${weightStats.deltaWeight} kg` : `${weightStats.deltaWeight} kg`}
          </Text>
        </View>

        <View style={styles.kpiDivider} />

        {/* KPI 2: Training */}
        <View style={styles.kpiCol}>
          <Text style={styles.kpiLabel}>Workouts</Text>
          <Text style={styles.kpiVal}>{workoutStats.workoutsCompleted} / 4</Text>
          <Text style={[styles.kpiSub, { color: theme.accent }]}>
            {workoutStats.volumeDeltaPercent >= 0 ? `+${workoutStats.volumeDeltaPercent}% Vol` : `${workoutStats.volumeDeltaPercent}% Vol`}
          </Text>
        </View>

        <View style={styles.kpiDivider} />

        {/* KPI 3: Nutrition */}
        <View style={styles.kpiCol}>
          <Text style={styles.kpiLabel}>Kalorien-Treue</Text>
          <Text style={styles.kpiVal}>{nutritionStats.adherencePercent}%</Text>
          <Text style={[styles.kpiSub, { color: '#FF9500' }]}>
            Ø {nutritionStats.avgCalories} kcal
          </Text>
        </View>
      </View>

      {/* ======================================================== */}
      {/* EXPANDED INLINE VIEW */}
      {/* ======================================================== */}
      {expanded && (
        <View style={styles.expandedSection}>
          {/* Phase Progress Bar */}
          <View style={styles.progressBarWrapper}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Phasen-Fortschritt</Text>
              <Text style={styles.progressPercent}>
                {Math.round((currentWeekNum / phaseConfig.targetWeeks) * 100)}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, Math.round((currentWeekNum / phaseConfig.targetWeeks) * 100))}%`,
                    backgroundColor: goalColor,
                  },
                ]}
              />
            </View>
          </View>

          {/* Quick Details / Photos Preview */}
          <View style={styles.detailsRow}>
            {photoUri ? (
              <View style={styles.thumbWrapper}>
                <Image source={{ uri: photoUri }} style={styles.thumbImg} />
                <View style={styles.thumbBadge}>
                  <Text style={styles.thumbBadgeText}>W{latestWithPhoto?.weekNumber}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.thumbPlaceholder}>
                <MaterialCommunityIcons name="camera" size={24} color="#555" />
                <Text style={styles.thumbPlaceholderText}>Keine Fotos</Text>
              </View>
            )}

            <View style={styles.detailsTextBox}>
              <Text style={styles.detailsTitle}>Zielkorridor: +{Math.round(phaseConfig.weeklyTargetRateKg * 1000)}g / Woche</Text>
              <Text style={styles.detailsDesc}>
                {isCheckInDone
                  ? currentWeekCheckIn?.coachVerdict?.summary
                  : 'Nüchterngewicht wird automatisch erfasst. Fotos & Biofeedback eingeben, um Wochen-Urteil zu erhalten.'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Main Action Button */}
      <View style={styles.actionRow}>
        {isCheckInDone ? (
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => {
              setReportModalVisible(true);
            }}
          >
            <MaterialCommunityIcons name="file-document-check" size={16} color="#000" />
            <Text style={styles.doneBtnText}>Woche {currentWeekNum} Report ansehen</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: theme.accent }]}
            onPress={() => setHubModalVisible(true)}
          >
            <MaterialCommunityIcons name="lightning-bolt" size={16} color="#000" />
            <Text style={styles.startBtnText}>Check-In starten (Woche {currentWeekNum})</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Hub Modal */}
      <CheckInModal
        visible={hubModalVisible}
        onClose={() => setHubModalVisible(false)}
      />

      {/* Report Modal */}
      {currentWeekCheckIn && (
        <CheckInReportModal
          visible={reportModalVisible}
          entry={currentWeekCheckIn}
          onClose={() => setReportModalVisible(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161C22',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
  },
  goalPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  weekTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPending: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  statusDone: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  expandChevron: {
    padding: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  widgetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
  },
  widgetSub: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  hubOpenIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#202228',
  },
  kpiRow: {
    flexDirection: 'row',
    backgroundColor: '#121214',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#222226',
    marginBottom: 12,
  },
  kpiCol: {
    flex: 1,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 9,
    color: '#777',
    fontWeight: '600',
  },
  kpiVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  kpiDivider: {
    width: 1,
    backgroundColor: '#252528',
    marginVertical: 4,
  },
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: '#252528',
    paddingTop: 12,
    marginBottom: 12,
  },
  progressBarWrapper: {
    marginBottom: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '800',
  },
  progressBarBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#222',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141416',
    borderRadius: 12,
    padding: 10,
    gap: 12,
  },
  thumbWrapper: {
    width: 50,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#333',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  thumbBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    paddingVertical: 1,
  },
  thumbBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: '800',
  },
  thumbPlaceholder: {
    width: 50,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#1E1E22',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#282828',
  },
  thumbPlaceholderText: {
    fontSize: 7,
    color: '#666',
    marginTop: 2,
  },
  detailsTextBox: {
    flex: 1,
  },
  detailsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  detailsDesc: {
    fontSize: 10,
    color: '#888',
    lineHeight: 14,
  },
  actionRow: {
    marginTop: 2,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00D2FF',
    paddingVertical: 11,
    borderRadius: 11,
  },
  startBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00FF88',
    paddingVertical: 11,
    borderRadius: 11,
  },
  doneBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
});
