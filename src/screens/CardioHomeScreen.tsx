import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useCardioStore,
  CardioActivityType,
  CardioSession,
  generateMockCardioSessions,
} from '../store/useCardioStore';
import { useAppStore, showCustomAlert } from '../store/store';
import BluetoothManager from '../components/BluetoothManager';
import { useBottomSpacing } from '../hooks/useBottomSpacing';
import { getAppTheme } from '../utils/theme';
import AccentThemePickerModal from '../components/AccentThemePickerModal';
import { getCardioLevelData } from '../utils/gamification';

const ACTIVITIES: {
  type: CardioActivityType;
  icon: any;
  label: string;
  labelDe: string;
  color: string;
}[] = [
  { type: 'Running', icon: 'run', label: 'Run', labelDe: 'Laufen', color: '#00D2FF' },
  { type: 'Cycling', icon: 'bike', label: 'Cycle', labelDe: 'Radfahren', color: '#30D158' },
  { type: 'Walking', icon: 'walk', label: 'Walk', labelDe: 'Gehen', color: '#FFD60A' },
  { type: 'Swimming', icon: 'swim', label: 'Swim', labelDe: 'Schwimmen', color: '#3B82F6' },
  { type: 'Boxing', icon: 'boxing-glove', label: 'Box', labelDe: 'Boxen', color: '#FF453A' },
  { type: 'Football', icon: 'soccer', label: 'Soccer', labelDe: 'Fußball', color: '#10B981' },
  { type: 'Paddle', icon: 'tennis', label: 'Paddle', labelDe: 'Padel / Tennis', color: '#BF5AF2' },
];

type CardioSubTab = 'overview' | 'tests' | 'history';

export default function CardioHomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomSpacing = useBottomSpacing();
  const connectedDeviceId = useAppStore((s) => s.connectedDeviceId);
  const currentHeartRate = useAppStore((s) => s.currentHeartRate);
  const globalCardioActive = useAppStore((s) => s.globalCardioActive);
  const globalCardioActivityType = useAppStore((s) => s.globalCardioActivityType);
  const globalCardioDuration = useAppStore((s) => s.globalCardioDuration);
  const globalCardioDistance = useAppStore((s) => s.globalCardioDistance);
  const accentThemeId = useAppStore((s) => s.accentThemeId);
  const theme = getAppTheme(accentThemeId);

  const history = useCardioStore((s) => s.history);
  const cardioXP = useCardioStore((s) => s.cardioXP) || {};
  const maxHR = useCardioStore((s) => s.maxHeartRateSetting) || 190;
  const addSession = useCardioStore((s) => s.addSession);

  const [btModalVisible, setBtModalVisible] = useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<CardioActivityType>('Running');
  const [subTab, setSubTab] = useState<CardioSubTab>('overview');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [historyFilterType, setHistoryFilterType] = useState<string>('ALL');

  const selectedActivityMeta = useMemo(
    () => ACTIVITIES.find((a) => a.type === selectedActivity) || ACTIVITIES[0],
    [selectedActivity]
  );

  const selectedLevelData = useMemo(
    () => getCardioLevelData(cardioXP[selectedActivity] || 0),
    [cardioXP, selectedActivity]
  );

  // Weekly & career summary stats
  const { weeklyMinutes, totalDistanceKm, totalCalories, weeklySessionsCount } = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    let wSeconds = 0;
    let wCount = 0;
    let distMeters = 0;
    let kcal = 0;

    (history || []).forEach((s) => {
      const ts = new Date(s.date).getTime();
      if (ts >= weekAgo) {
        wSeconds += s.durationSeconds || 0;
        wCount += 1;
      }
      distMeters += s.distanceMeters || 0;
      kcal += s.caloriesBurned || 0;
    });

    return {
      weeklyMinutes: Math.round(wSeconds / 60),
      weeklySessionsCount: wCount,
      totalDistanceKm: (distMeters / 1000).toFixed(1),
      totalCalories: Math.round(kcal),
    };
  }, [history]);

  // Start normal activity or fitness test
  const launchCardioSession = (activity: CardioActivityType, testType: string | null = null) => {
    const store = useAppStore.getState();
    if (store.globalCardioActive) {
      if (store.globalCardioActivityType === activity && !testType) {
        store.setGlobalCardioModalVisible(true);
        return;
      }
      showCustomAlert(
        'Aktive Session läuft',
        'Du hast bereits eine laufende Cardio-Session. Möchtest du diese zuerst beenden und speichern?',
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Beenden & Neu starten',
            onPress: async () => {
              if (store.finishCurrentCardio) await store.finishCurrentCardio(true);
              store.setGlobalCardioSessionInfo(activity, testType as any);
              store.setGlobalCardioModalVisible(true);
            },
          },
        ]
      );
    } else if (store.globalActivePlan) {
      showCustomAlert(
        'Aktives Kraft-Workout',
        'Es läuft gerade ein Krafttraining. Möchtest du es beenden und speichern, bevor du Cardio startest?',
        [
          { text: 'Abbrechen', style: 'cancel' },
          {
            text: 'Beenden & Starten',
            onPress: async () => {
              if (store.finishCurrentStrength) await store.finishCurrentStrength(true);
              store.setGlobalCardioSessionInfo(activity, testType as any);
              store.setGlobalCardioModalVisible(true);
            },
          },
        ]
      );
    } else {
      store.setGlobalCardioSessionInfo(activity, testType as any);
      store.setGlobalCardioModalVisible(true);
    }
  };

  const handleStart = () => launchCardioSession(selectedActivity, null);

  const importFromHealthConnect = async () => {
    try {
      const HealthConnect = require('react-native-health-connect');
      const isInitialized = await HealthConnect.initialize();
      if (!isInitialized) return;

      await HealthConnect.requestPermission([
        { accessType: 'read', recordType: 'ExerciseSession' },
      ]);

      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
      };

      const records = await HealthConnect.readRecords('ExerciseSession', { timeRangeFilter });
      const { ExerciseType } = HealthConnect;

      let importedCount = 0;
      records.records.forEach((record: any) => {
        const duration =
          (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / 1000;

        let mappedType: CardioActivityType = 'Running';
        const type = record.exerciseType;
        if (type === ExerciseType.BIKING || type === ExerciseType.BIKING_STATIONARY)
          mappedType = 'Cycling';
        else if (
          type === ExerciseType.SWIMMING_OPEN_WATER ||
          type === ExerciseType.SWIMMING_POOL
        )
          mappedType = 'Swimming';
        else if (type === ExerciseType.WALKING) mappedType = 'Walking';
        else if (type === ExerciseType.BOXING) mappedType = 'Boxing';
        else if (
          type === ExerciseType.FOOTBALL_AMERICAN ||
          type === ExerciseType.FOOTBALL_AUSTRALIAN ||
          type === ExerciseType.SOCCER
        )
          mappedType = 'Football';
        else if (
          type === ExerciseType.TENNIS ||
          type === ExerciseType.SQUASH ||
          type === ExerciseType.TABLE_TENNIS
        )
          mappedType = 'Paddle';

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

      showCustomAlert(
        'Health Connect Sync',
        `${importedCount} Cardio-Einheiten der letzten 7 Tage importiert.`
      );
    } catch (e) {
      showCustomAlert(
        'Health Connect Hinweis',
        'Import fehlgeschlagen. Stelle sicher, dass Health Connect Berechtigungen aktiv sind (nicht in Expo Go).'
      );
    }
  };

  const renderHRZones = (session: CardioSession) => {
    const z2 = maxHR * 0.6;
    const z4 = maxHR * 0.8;
    let zones = [10, 40, 30, 15, 5];
    if (session.averageHeartRate > z4) zones = [5, 10, 20, 40, 25];
    else if (session.averageHeartRate < z2) zones = [60, 30, 10, 0, 0];
    const zoneColors = ['#00D2FF', '#30D158', '#FFD700', '#FF9500', '#FF3B30'];

    return (
      <View
        style={[
          styles.zonesWidget,
          { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder },
        ]}
      >
        <Text style={styles.zoneTitle}>Herzfrequenz-Zonen (Ø {Math.round(session.averageHeartRate)} BPM)</Text>
        <View style={styles.zoneBarsRow}>
          {['Z1', 'Z2', 'Z3', 'Z4', 'Z5'].map((z, i) => (
            <View key={z} style={styles.zoneBarContainer}>
              <View
                style={[
                  styles.zoneBar,
                  { height: `${Math.max(8, zones[i])}%`, backgroundColor: zoneColors[i] },
                ]}
              />
              <Text style={styles.zoneLabel}>{z}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const filteredHistory = useMemo(() => {
    if (historyFilterType === 'ALL') return history || [];
    return (history || []).filter((s) => s.type === historyFilterType);
  }, [history, historyFilterType]);

  const lvlPct = Math.min(
    100,
    selectedLevelData.neededXP > 0
      ? Math.round((selectedLevelData.progressXP / selectedLevelData.neededXP) * 100)
      : 0
  );

  return (
    <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 44) + 12 }]}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomSpacing + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= HEADER (Matches Nutrition, Training, Supplements, Stats) ================= */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ausdauer</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
              onPress={() => setThemePickerVisible(true)}
            >
              <MaterialCommunityIcons name="palette-outline" size={20} color={theme.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconButton,
                {
                  backgroundColor: connectedDeviceId ? 'rgba(48, 209, 88, 0.15)' : theme.cardBg,
                  borderColor: connectedDeviceId ? '#30D158' : theme.cardBorder,
                },
              ]}
              onPress={() => setBtModalVisible(true)}
            >
              <MaterialCommunityIcons
                name={connectedDeviceId ? 'bluetooth-connect' : 'bluetooth'}
                size={20}
                color={connectedDeviceId ? '#30D158' : '#FFF'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
              onPress={() => navigation.navigate('CardioTests')}
            >
              <MaterialCommunityIcons name="heart-pulse" size={20} color="#FF453A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
              onPress={() => navigation.navigate('CardioHistory')}
            >
              <MaterialCommunityIcons name="history" size={20} color={theme.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= TOP PILL BAR ================= */}
        <View style={styles.topPillRow}>
          <View
            style={[
              styles.activeDisciplinePill,
              { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
            ]}
          >
            <MaterialCommunityIcons
              name={selectedActivityMeta.icon}
              size={18}
              color={theme.accent}
            />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={styles.pillLabel}>GEWÄHLTE DISZIPLIN</Text>
              <Text style={styles.pillValue} numberOfLines={1}>
                {selectedActivityMeta.labelDe} ({selectedActivityMeta.label}) • Lv.{' '}
                {selectedLevelData.level}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.hrStatusPill,
              connectedDeviceId
                ? {
                    backgroundColor: 'rgba(255, 69, 58, 0.14)',
                    borderColor: 'rgba(255, 69, 58, 0.45)',
                  }
                : { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
            ]}
            onPress={() => setBtModalVisible(true)}
          >
            <MaterialCommunityIcons
              name="heart-pulse"
              size={16}
              color={connectedDeviceId ? '#FF453A' : '#8E96A0'}
            />
            <Text
              style={[
                styles.hrStatusText,
                { color: connectedDeviceId ? '#FF453A' : '#CCC' },
              ]}
            >
              {currentHeartRate ? `${currentHeartRate} BPM` : 'HR Sensor'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= ALL-IN-ONE AUSDAUER HERO CARD ================= */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.heroEyebrow, { color: theme.accent }]}>
                {globalCardioActive ? '🔴 LIVE SESSION LÄUFT' : 'CARDIO & KONDITION'}
              </Text>
              <Text style={styles.heroHeadline}>
                {globalCardioActive
                  ? `${globalCardioActivityType} aktiv`
                  : `${selectedActivityMeta.labelDe} starten`}
              </Text>
              <Text style={styles.heroSubline}>
                {globalCardioActive
                  ? `${Math.floor((globalCardioDuration || 0) / 60)} Min • ${(
                      (globalCardioDistance || 0) / 1000
                    ).toFixed(2)} km bisher`
                  : `${selectedLevelData.rank} • Noch ${
                      selectedLevelData.neededXP - selectedLevelData.progressXP
                    } XP bis Level ${selectedLevelData.level + 1}`}
              </Text>
            </View>

            <View
              style={[
                styles.levelBadgeCircle,
                {
                  borderColor: selectedLevelData.rankColor || theme.accent,
                  backgroundColor: 'rgba(0,0,0,0.22)',
                },
              ]}
            >
              <MaterialCommunityIcons
                name={selectedActivityMeta.icon}
                size={22}
                color={theme.accent}
              />
              <Text style={styles.levelBadgeText}>Lv.{selectedLevelData.level}</Text>
            </View>
          </View>

          {/* Discipline Level Progress Bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${lvlPct}%`,
                  backgroundColor: selectedLevelData.rankColor || theme.accent,
                },
              ]}
            />
          </View>

          {/* 3 KPI Sub-Pills */}
          <View style={styles.heroKpiGrid}>
            <View
              style={[
                styles.heroKpiPill,
                { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
              ]}
            >
              <View style={styles.heroKpiValRow}>
                <MaterialCommunityIcons name="clock-fast" size={16} color={theme.accent} />
                <Text style={styles.heroKpiVal}>{weeklyMinutes} Min</Text>
              </View>
              <Text style={styles.heroKpiLbl}>Diese Woche ({weeklySessionsCount}x)</Text>
            </View>

            <View
              style={[
                styles.heroKpiPill,
                { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
              ]}
            >
              <View style={styles.heroKpiValRow}>
                <MaterialCommunityIcons name="map-marker-distance" size={16} color="#30D158" />
                <Text style={styles.heroKpiVal}>{totalDistanceKm} km</Text>
              </View>
              <Text style={styles.heroKpiLbl}>Gesamt-Distanz</Text>
            </View>

            <View
              style={[
                styles.heroKpiPill,
                { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
              ]}
            >
              <View style={styles.heroKpiValRow}>
                <MaterialCommunityIcons name="fire" size={16} color="#FF9F0A" />
                <Text style={styles.heroKpiVal}>{totalCalories}</Text>
              </View>
              <Text style={styles.heroKpiLbl}>Cardio kcal</Text>
            </View>
          </View>

          {/* Primary Start / Resume Session Button */}
          <TouchableOpacity
            style={[
              styles.startHeroButton,
              { backgroundColor: globalCardioActive ? '#30D158' : theme.accent },
            ]}
            activeOpacity={0.85}
            onPress={handleStart}
          >
            <MaterialCommunityIcons
              name={globalCardioActive ? 'play-circle' : 'play'}
              size={20}
              color="#000"
            />
            <Text style={styles.startHeroButtonText}>
              {globalCardioActive
                ? `LIVE ${globalCardioActivityType?.toUpperCase()} ÖFFNEN`
                : `${selectedActivityMeta.labelDe.toUpperCase()} STARTEN`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= 3-WAY SUB-NAVIGATION ================= */}
        <View
          style={[
            styles.subNavContainer,
            { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.subNavBtn,
              subTab === 'overview' && {
                backgroundColor: theme.accentBgSoft,
                borderColor: theme.accentBorderSoft,
              },
            ]}
            onPress={() => setSubTab('overview')}
          >
            <MaterialCommunityIcons
              name="run-fast"
              size={16}
              color={subTab === 'overview' ? theme.accent : '#8E96A0'}
            />
            <Text style={[styles.subNavText, subTab === 'overview' && { color: theme.accent }]}>
              Disziplinen
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subNavBtn,
              subTab === 'tests' && {
                backgroundColor: theme.accentBgSoft,
                borderColor: theme.accentBorderSoft,
              },
            ]}
            onPress={() => setSubTab('tests')}
          >
            <MaterialCommunityIcons
              name="heart-pulse"
              size={16}
              color={subTab === 'tests' ? theme.accent : '#8E96A0'}
            />
            <Text style={[styles.subNavText, subTab === 'tests' && { color: theme.accent }]}>
              Fitness-Tests
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subNavBtn,
              subTab === 'history' && {
                backgroundColor: theme.accentBgSoft,
                borderColor: theme.accentBorderSoft,
              },
            ]}
            onPress={() => setSubTab('history')}
          >
            <MaterialCommunityIcons
              name="history"
              size={16}
              color={subTab === 'history' ? theme.accent : '#8E96A0'}
            />
            <Text style={[styles.subNavText, subTab === 'history' && { color: theme.accent }]}>
              Verlauf ({history.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* =======================================================================
            SUB-TAB 1: DISZIPLINEN & LETZTE EINHEITEN
           ======================================================================= */}
        {subTab === 'overview' && (
          <View>
            <Text style={styles.sectionHeaderLabel}>AKTIVITÄT WÄHLEN</Text>
            <View style={styles.activityGrid}>
              {ACTIVITIES.map((act) => {
                const isSelected = selectedActivity === act.type;
                const actLvl = getCardioLevelData(cardioXP[act.type] || 0);
                return (
                  <TouchableOpacity
                    key={act.type}
                    style={[
                      styles.activityGridCard,
                      {
                        backgroundColor: isSelected ? theme.accentBgSoft : theme.cardBg,
                        borderColor: isSelected ? theme.accent : theme.cardBorder,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setSelectedActivity(act.type)}
                  >
                    <View style={styles.activityCardTopRow}>
                      <View
                        style={[
                          styles.activityIconCircle,
                          {
                            backgroundColor: isSelected
                              ? theme.accent
                              : `${act.color}1F`,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={act.icon}
                          size={22}
                          color={isSelected ? '#000' : act.color}
                        />
                      </View>
                      <View
                        style={[
                          styles.lvlMiniPill,
                          {
                            backgroundColor: theme.subCardBg,
                            borderColor: theme.subtleBorder,
                          },
                        ]}
                      >
                        <Text style={{ color: actLvl.rankColor, fontSize: 10, fontWeight: '800' }}>
                          Lv.{actLvl.level}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.activityGridTitle,
                        isSelected && { color: theme.accent },
                      ]}
                      numberOfLines={1}
                    >
                      {act.labelDe}
                    </Text>
                    <Text style={styles.activityGridSub}>{actLvl.rank}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Navigation Cards (Tests & Full History) */}
            <View style={styles.quickNavRow}>
              <TouchableOpacity
                style={[
                  styles.quickNavCard,
                  { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                ]}
                activeOpacity={0.85}
                onPress={() => setSubTab('tests')}
              >
                <View
                  style={[
                    styles.quickNavIcon,
                    { backgroundColor: 'rgba(255, 69, 58, 0.15)' },
                  ]}
                >
                  <MaterialCommunityIcons name="heart-pulse" size={22} color="#FF453A" />
                </View>
                <Text style={styles.quickNavTitle}>VO2max & Tests</Text>
                <Text style={styles.quickNavSub}>Cooper, 1.5M & Rockport</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickNavCard,
                  { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                ]}
                activeOpacity={0.85}
                onPress={() => setSubTab('history')}
              >
                <View
                  style={[
                    styles.quickNavIcon,
                    { backgroundColor: 'rgba(48, 209, 88, 0.15)' },
                  ]}
                >
                  <MaterialCommunityIcons name="map-check-outline" size={22} color="#30D158" />
                </View>
                <Text style={styles.quickNavTitle}>Alle Sessions</Text>
                <Text style={styles.quickNavSub}>GPS-Routen & Puls-Zonen</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Sessions Preview */}
            <View style={styles.recentHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>LETZTE EINHEITEN</Text>
              {history.length > 0 && (
                <TouchableOpacity onPress={() => setSubTab('history')}>
                  <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '800' }}>
                    Alle ansehen ({history.length}) →
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {history.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                ]}
              >
                <MaterialCommunityIcons name="run" size={28} color="#666" />
                <Text style={styles.emptyCardTitle}>Noch keine Cardio-Einheiten</Text>
                <Text style={styles.emptyCardSub}>
                  Wähle oben eine Disziplin und starte den GPS- & Herzfrequenz-Tracker oder synchronisiere über Health Connect.
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[
                      styles.smallActionPill,
                      { backgroundColor: theme.accentBgSoft, borderColor: theme.accentBorderSoft },
                    ]}
                    onPress={importFromHealthConnect}
                  >
                    <MaterialCommunityIcons name="sync" size={14} color={theme.accent} />
                    <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '800' }}>
                      Health Connect Sync
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.smallActionPill,
                      { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                    ]}
                    onPress={() => generateMockCardioSessions()}
                  >
                    <MaterialCommunityIcons name="database-plus" size={14} color="#AAA" />
                    <Text style={{ color: '#AAA', fontSize: 11, fontWeight: '700' }}>
                      Demo-Daten laden
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              history.slice(0, 3).map((session) => {
                const actMeta =
                  ACTIVITIES.find((a) => a.type === session.type) || ACTIVITIES[0];
                return (
                  <TouchableOpacity
                    key={session.id}
                    style={[
                      styles.sessionRowCard,
                      { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                    ]}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate('CardioSessionDetail', { sessionId: session.id })
                    }
                  >
                    <View
                      style={[
                        styles.sessionIconBox,
                        { backgroundColor: `${actMeta.color}1F` },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={actMeta.icon}
                        size={20}
                        color={actMeta.color}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.sessionRowTitle}>
                        {actMeta.labelDe}
                        {session.testType ? ` • ${session.testType} Test` : ''}
                      </Text>
                      <Text style={styles.sessionRowSub}>
                        {new Date(session.date).toLocaleDateString('de-DE')} •{' '}
                        {Math.floor(session.durationSeconds / 60)} Min •{' '}
                        {Math.round(session.caloriesBurned)} kcal • Ø{' '}
                        {Math.round(session.averageHeartRate)} BPM
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.sessionRowDist, { color: theme.accent }]}>
                        {(session.distanceMeters / 1000).toFixed(2)} km
                      </Text>
                      <MaterialCommunityIcons name="chevron-right" size={18} color="#777" />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* =======================================================================
            SUB-TAB 2: FITNESS-TESTS (COOPER, 1.5 MILE, ROCKPORT)
           ======================================================================= */}
        {subTab === 'tests' && (
          <View>
            <Text style={styles.sectionHeaderLabel}>STANDARDISIERTE AUSDAUER-TESTS</Text>

            <TouchableOpacity
              style={[
                styles.testCard,
                { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
              ]}
              activeOpacity={0.85}
              onPress={() => launchCardioSession('Running', 'Cooper')}
            >
              <View style={styles.testCardTop}>
                <View
                  style={[
                    styles.testIconBox,
                    { backgroundColor: 'rgba(255, 159, 10, 0.15)' },
                  ]}
                >
                  <MaterialCommunityIcons name="timer-outline" size={24} color="#FF9F0A" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.testTitle}>Cooper Test (12 Minuten)</Text>
                  <Text style={styles.testSub}>VO2max & Aerobe Kapazität • Laufen</Text>
                </View>
                <View style={[styles.testStartBadge, { backgroundColor: theme.accent }]}>
                  <Text style={styles.testStartBadgeText}>Start</Text>
                </View>
              </View>
              <Text style={styles.testDesc}>
                Laufe in exakt 12 Minuten so weit wie möglich. Der Klassiker zur Bestimmung deiner maximalen Sauerstoffaufnahme (VO2max).
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.testCard,
                { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
              ]}
              activeOpacity={0.85}
              onPress={() => launchCardioSession('Running', '1.5Mile')}
            >
              <View style={styles.testCardTop}>
                <View
                  style={[
                    styles.testIconBox,
                    { backgroundColor: 'rgba(48, 209, 88, 0.15)' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="map-marker-distance"
                    size={24}
                    color="#30D158"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.testTitle}>1.5 Meilen Lauf (2,4 km)</Text>
                  <Text style={styles.testSub}>Tempohärte & Ausdauer-Zeitmessung</Text>
                </View>
                <View style={[styles.testStartBadge, { backgroundColor: '#30D158' }]}>
                  <Text style={styles.testStartBadgeText}>Start</Text>
                </View>
              </View>
              <Text style={styles.testDesc}>
                Absolviere 2,4 Kilometer so schnell wie möglich. Ideal zum Vergleichen deiner Laufzeit über mehrere Monate.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.testCard,
                { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
              ]}
              activeOpacity={0.85}
              onPress={() => launchCardioSession('Walking', 'Rockport')}
            >
              <View style={styles.testCardTop}>
                <View
                  style={[
                    styles.testIconBox,
                    { backgroundColor: 'rgba(0, 210, 255, 0.15)' },
                  ]}
                >
                  <MaterialCommunityIcons name="walk" size={24} color="#00D2FF" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.testTitle}>Rockport Walk Test (1 Meile)</Text>
                  <Text style={styles.testSub}>Gelenkschonender Puls-Belastungstest</Text>
                </View>
                <View style={[styles.testStartBadge, { backgroundColor: '#00D2FF' }]}>
                  <Text style={styles.testStartBadgeText}>Start</Text>
                </View>
              </View>
              <Text style={styles.testDesc}>
                Gehe 1,6 km so zügig wie möglich. Anhand deiner Zeit und deines Endpulses wird dein kardiovaskuläres Level berechnet.
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* =======================================================================
            SUB-TAB 3: VERLAUF & PULS-ZONEN
           ======================================================================= */}
        {subTab === 'history' && (
          <View>
            {/* Sync & Demo Actions Row */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TouchableOpacity
                style={[
                  styles.historyActionBtn,
                  {
                    backgroundColor: theme.accentBgSoft,
                    borderColor: theme.accentBorderSoft,
                    flex: 1,
                  },
                ]}
                onPress={importFromHealthConnect}
              >
                <MaterialCommunityIcons name="sync" size={16} color={theme.accent} />
                <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '800' }}>
                  Health Connect Sync
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.historyActionBtn,
                  { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                ]}
                onPress={() => generateMockCardioSessions()}
              >
                <MaterialCommunityIcons name="database-plus" size={16} color="#AAA" />
                <Text style={{ color: '#CCC', fontSize: 12, fontWeight: '700' }}>
                  Demo-Daten
                </Text>
              </TouchableOpacity>
            </View>

            {/* Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {(['ALL', ...ACTIVITIES.map((a) => a.type)] as const).map((t) => {
                const active = historyFilterType === t;
                const actMeta = ACTIVITIES.find((a) => a.type === t);
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: active ? theme.accentBgSoft : theme.cardBg,
                        borderColor: active ? theme.accent : theme.cardBorder,
                      },
                    ]}
                    onPress={() => setHistoryFilterType(t)}
                  >
                    <Text style={[styles.filterChipText, active && { color: theme.accent }]}>
                      {t === 'ALL' ? `Alle (${history.length})` : actMeta?.labelDe || t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {filteredHistory.length === 0 ? (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                ]}
              >
                <Text style={styles.emptyCardTitle}>Keine Einträge für diesen Filter</Text>
                <Text style={styles.emptyCardSub}>
                  Starte eine Session oder importiere deine Trainings aus Health Connect.
                </Text>
              </View>
            ) : (
              filteredHistory.map((item) => {
                const isExpanded = expandedSessionId === item.id;
                const actMeta =
                  ACTIVITIES.find((a) => a.type === item.type) || ACTIVITIES[0];
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.historyCard,
                      { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setExpandedSessionId(isExpanded ? null : item.id)}
                  >
                    <View style={styles.historyCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View
                          style={[
                            styles.sessionIconBox,
                            { backgroundColor: `${actMeta.color}1F` },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={actMeta.icon}
                            size={20}
                            color={actMeta.color}
                          />
                        </View>
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={styles.sessionRowTitle}>
                            {actMeta.labelDe}
                            {item.testType ? ` (${item.testType})` : ''}
                          </Text>
                          <Text style={styles.sessionRowSub}>
                            {new Date(item.date).toLocaleDateString('de-DE')} • {item.source}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.sessionRowDist, { color: theme.accent }]}>
                        {(item.distanceMeters / 1000).toFixed(2)} km
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.historyQuickStats,
                        { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                      ]}
                    >
                      <Text style={styles.qStatText}>
                        ⏱️ {Math.floor(item.durationSeconds / 60)} Min
                      </Text>
                      <Text style={styles.qStatText}>
                        🔥 {Math.floor(item.caloriesBurned)} kcal
                      </Text>
                      <Text style={styles.qStatText}>
                        ❤️ Ø {Math.floor(item.averageHeartRate)} BPM
                      </Text>
                    </View>

                    {isExpanded && (
                      <View style={{ marginTop: 12 }}>
                        {renderHRZones(item)}
                        <TouchableOpacity
                          style={[
                            styles.detailRouteBtn,
                            { backgroundColor: theme.accent },
                          ]}
                          onPress={() =>
                            navigation.navigate('CardioSessionDetail', {
                              sessionId: item.id,
                            })
                          }
                        >
                          <MaterialCommunityIcons name="map-search-outline" size={16} color="#000" />
                          <Text style={styles.detailRouteBtnText}>
                            Vollständige Details & GPS-Route öffnen
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <BluetoothManager visible={btModalVisible} onClose={() => setBtModalVisible(false)} />
      <AccentThemePickerModal
        visible={themePickerVisible}
        onClose={() => setThemePickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D0F12',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  activeDisciplinePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pillLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8E96A0',
    letterSpacing: 0.6,
  },
  pillValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  hrStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  hrStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroHeadline: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroSubline: {
    fontSize: 12,
    color: '#8E96A0',
    marginTop: 3,
  },
  levelBadgeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  progressTrack: {
    width: '100%',
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  heroKpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  heroKpiPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 13,
    paddingVertical: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  heroKpiValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroKpiVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  heroKpiLbl: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E96A0',
    marginTop: 2,
  },
  startHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  startHeroButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.6,
  },
  subNavContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  subNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subNavText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E96A0',
  },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#8E96A0',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  activityGridCard: {
    width: '31.5%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 11,
  },
  activityCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lvlMiniPill: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  activityGridTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  activityGridSub: {
    fontSize: 10,
    color: '#8E96A0',
    fontWeight: '600',
    marginTop: 1,
  },
  quickNavRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickNavCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  quickNavIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickNavTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  quickNavSub: {
    fontSize: 11,
    color: '#8E96A0',
    marginTop: 2,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
  },
  emptyCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  emptyCardSub: {
    fontSize: 12,
    color: '#8E96A0',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  smallActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sessionRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  sessionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionRowTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sessionRowSub: {
    fontSize: 11,
    color: '#8E96A0',
    marginTop: 2,
  },
  sessionRowDist: {
    fontSize: 15,
    fontWeight: '900',
  },
  testCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
  },
  testCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  testIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  testSub: {
    fontSize: 11,
    color: '#8E96A0',
    marginTop: 2,
  },
  testStartBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  testStartBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
  },
  testDesc: {
    fontSize: 12,
    color: '#AAA',
    lineHeight: 17,
  },
  historyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E96A0',
  },
  historyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyQuickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 11,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  qStatText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DDD',
  },
  zonesWidget: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  zoneTitle: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
  },
  zoneBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 80,
    alignItems: 'flex-end',
  },
  zoneBarContainer: {
    alignItems: 'center',
    width: 40,
  },
  zoneBar: {
    width: 18,
    borderRadius: 4,
    minHeight: 4,
  },
  zoneLabel: {
    color: '#8E96A0',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  detailRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 11,
    paddingVertical: 11,
  },
  detailRouteBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '900',
  },
});
