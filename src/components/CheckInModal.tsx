import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { KeyboardAwareScrollView as ScrollView } from 'react-native-keyboard-aware-scroll-view';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  useCheckInStore,
  CheckInEntry,
  CheckInGoal,
  CheckInPhaseConfig,
} from '../store/useCheckInStore';
import { useAppStore, getLocalDateString } from '../store/store';
import { evaluateCheckIn, getSevenDayWeightStats } from '../utils/checkInEngine';
import { getAppTheme } from '../utils/theme';
import BeforeAfterSlider from './BeforeAfterSlider';
import CheckInReportModal from './CheckInReportModal';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function CheckInModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const today = getLocalDateString();
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);

  const {
    phaseConfig,
    setPhaseConfig,
    checkInHistory,
    addCheckInEntry,
  } = useCheckInStore();

  const {
    weightHistory,
    workoutHistory,
    nutritionHistory,
    targets,
    bodyweight,
  } = useAppStore();

  // Mode: 'hub' | 'flow' | 'setup'
  const [currentMode, setCurrentMode] = useState<'hub' | 'flow' | 'setup'>('hub');
  const [flowStep, setFlowStep] = useState<number>(1);

  // Selected report modal
  const [selectedEntryForReport, setSelectedEntryForReport] = useState<CheckInEntry | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState<boolean>(false);

  // Check-In Form State
  const todayWeightEntry = (weightHistory || []).find((w) => w.date === today);
  const initialFastingWeight = todayWeightEntry ? todayWeightEntry.weight : bodyweight > 0 ? bodyweight : 80.0;

  const [fastingWeight, setFastingWeight] = useState<string>(initialFastingWeight.toString());
  const [waist, setWaist] = useState<string>('');
  const [chest, setChest] = useState<string>('');
  const [arm, setArm] = useState<string>('');
  const [thigh, setThigh] = useState<string>('');

  const [photos, setPhotos] = useState<{
    front?: string;
    side?: string;
    back?: string;
    detail?: string;
  }>({});

  const [biofeedback, setBiofeedback] = useState({
    sleep: 8,
    energy: 8,
    appetite: 7,
    digestion: 8,
  });

  const [notes, setNotes] = useState<string>('');

  // Setup Form State
  const [setupGoal, setSetupGoal] = useState<CheckInGoal>(phaseConfig.goal || 'Bulk');
  const [setupWeeks, setSetupWeeks] = useState<number>(phaseConfig.targetWeeks || 16);
  const [setupRateGrams, setSetupRateGrams] = useState<number>(
    Math.round((phaseConfig.weeklyTargetRateKg || 0.3) * 1000)
  );
  const [setupDay, setSetupDay] = useState<number>(phaseConfig.checkInDayOfWeek ?? 0);

  // Berechne aktuelle Wochennummer in der Phase
  const calculateCurrentWeek = () => {
    const start = new Date(phaseConfig.startDate || today);
    const now = new Date(today);
    const diffDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    return Math.max(1, Math.min(phaseConfig.targetWeeks, Math.floor(diffDays / 7) + 1));
  };

  const currentWeekNum = calculateCurrentWeek();
  const currentWeekCheckIn = checkInHistory.find((c) => c.weekNumber === currentWeekNum);

  // 7-Tage-Schnitt berechnen
  const parsedFastingWeight = parseFloat(fastingWeight) || initialFastingWeight;
  const weightStats = getSevenDayWeightStats(today, weightHistory, parsedFastingWeight);

  // Foto-Auswahl mit expo-image-picker
  const pickPhoto = async (poseKey: 'front' | 'side' | 'back' | 'detail') => {
    Alert.alert(
      'Foto aufnehmen oder wählen',
      'Wähle ein klares Ganzkörper-Foto unter gleichbleibenden Lichtverhältnissen.',
      [
        {
          text: 'Kamera öffnen',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Berechtigung fehlt', 'Kamerazugriff wurde nicht erlaubt.');
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [3, 4],
              quality: 0.8,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
              await saveLocalImage(poseKey, res.assets[0].uri);
            }
          },
        },
        {
          text: 'Aus Galerie wählen',
          onPress: async () => {
            const res = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [3, 4],
              quality: 0.8,
            });
            if (!res.canceled && res.assets && res.assets.length > 0) {
              await saveLocalImage(poseKey, res.assets[0].uri);
            }
          },
        },
        { text: 'Abbrechen', style: 'cancel' },
      ]
    );
  };

  const saveLocalImage = async (poseKey: 'front' | 'side' | 'back' | 'detail', sourceUri: string) => {
    try {
      const FileSystem = require('expo-file-system');
      const filename = `checkin_w${currentWeekNum}_${poseKey}_${Date.now()}.jpg`;
      const docDir = FileSystem.documentDirectory || '';
      const destUri = docDir + filename;
      await FileSystem.copyAsync({ from: sourceUri, to: destUri });
      setPhotos((prev) => ({ ...prev, [poseKey]: destUri }));
    } catch (e) {
      setPhotos((prev) => ({ ...prev, [poseKey]: sourceUri }));
    }
  };

  // Submit Check-In
  const handleFinishCheckIn = () => {
    const verdict = evaluateCheckIn({
      checkInDate: today,
      fastingWeight: parsedFastingWeight,
      measurements: {
        waist: waist ? parseFloat(waist) : undefined,
        chest: chest ? parseFloat(chest) : undefined,
        rightArm: arm ? parseFloat(arm) : undefined,
        thigh: thigh ? parseFloat(thigh) : undefined,
      },
      biofeedback,
      phaseConfig,
      weightHistory,
      workoutHistory,
      nutritionHistory,
      targetCalories: targets.calories,
      targetProtein: targets.protein,
    });

    const newEntry: CheckInEntry = {
      id: `checkin_${phaseConfig.id}_w${currentWeekNum}_${Date.now()}`,
      date: today,
      weekNumber: currentWeekNum,
      phaseId: phaseConfig.id,
      fastingWeight: parsedFastingWeight,
      sevenDayAvgWeight: weightStats.thisWeekAvg,
      measurements: {
        waist: waist ? parseFloat(waist) : undefined,
        chest: chest ? parseFloat(chest) : undefined,
        rightArm: arm ? parseFloat(arm) : undefined,
        thigh: thigh ? parseFloat(thigh) : undefined,
      },
      photos,
      biofeedback,
      notes,
      coachVerdict: verdict,
      createdAt: new Date().toISOString(),
    };

    addCheckInEntry(newEntry);
    setSelectedEntryForReport(newEntry);
    setCurrentMode('hub');
    setReportModalVisible(true);
  };

  const savePhaseSetup = () => {
    setPhaseConfig({
      goal: setupGoal,
      targetWeeks: setupWeeks,
      weeklyTargetRateKg: parseFloat((setupRateGrams / 1000).toFixed(2)),
      checkInDayOfWeek: setupDay,
    });
    setCurrentMode('hub');
  };

  const getDayName = (dayNum: number) => {
    switch (dayNum) {
      case 0: return 'Sonntag';
      case 1: return 'Montag';
      case 5: return 'Freitag';
      case 6: return 'Samstag';
      default: return 'Wochentag';
    }
  };

  // Get previous week's check-in for comparison
  const prevEntry = checkInHistory.find((c) => c.weekNumber === currentWeekNum - 1) || checkInHistory[checkInHistory.length - 1];

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={[styles.container, { paddingTop: Math.max(16, insets.top) }]}>
        
        {/* ======================================================== */}
        {/* MODE 1: CHECK-IN HUB OVERVIEW */}
        {/* ======================================================== */}
        {currentMode === 'hub' && (
          <>
            {/* Hub Header */}
            <View style={styles.hubHeader}>
              <View>
                <View style={styles.phaseBadgeRow}>
                  <Text style={styles.phaseGoalText}>
                    {phaseConfig.goal === 'Bulk' ? '🍗 LEAN BULK' : phaseConfig.goal === 'Cut' ? '🔥 CUT' : '⚖️ RECOMP'}
                  </Text>
                  <View style={styles.phasePill}>
                    <Text style={styles.phasePillText}>
                      Woche {currentWeekNum} / {phaseConfig.targetWeeks}
                    </Text>
                  </View>
                </View>
                <Text style={styles.hubTitle}>{phaseConfig.phaseName || 'Wöchentlicher Check-In'}</Text>
              </View>
              <View style={styles.headerRightActions}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => setCurrentMode('setup')}
                >
                  <MaterialCommunityIcons name="cog" size={20} color="#AAA" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
                  <MaterialCommunityIcons name="close" size={22} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={{ paddingBottom: Math.max(30, insets.bottom + 20) }}
            >
              {/* Horizontal Week Timeline Selector */}
              <View style={styles.timelineRow}>
                {Array.from({ length: phaseConfig.targetWeeks }, (_, i) => i + 1).map((week) => {
                  const entry = checkInHistory.find((c) => c.weekNumber === week);
                  const isCurrent = week === currentWeekNum;
                  const isDone = !!entry;

                  return (
                    <TouchableOpacity
                      key={week}
                      onPress={() => {
                        if (entry) {
                          setSelectedEntryForReport(entry);
                          setReportModalVisible(true);
                        } else if (isCurrent) {
                          setCurrentMode('flow');
                          setFlowStep(1);
                        }
                      }}
                      style={[
                        styles.weekPill,
                        isCurrent && { borderColor: theme.accent || '#00D2FF', backgroundColor: theme.accentSoftBg || 'rgba(0, 210, 255, 0.15)' },
                        isDone && styles.weekPillDone,
                      ]}
                    >
                      <Text
                        style={[
                          styles.weekPillNum,
                          isCurrent && { color: theme.accent || '#00D2FF', fontWeight: '800' },
                        ]}
                      >
                        W{week}
                      </Text>
                      <Text
                        style={[
                          styles.weekPillStatus,
                          isDone && { color: '#00FF88' },
                          isCurrent && !isDone && { color: '#FF9500' },
                        ]}
                      >
                        {isDone ? '✓' : isCurrent ? 'Fällig' : '—'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Main Action Banner */}
              {currentWeekCheckIn ? (
                <View style={styles.doneBanner}>
                  <View style={styles.doneBannerLeft}>
                    <MaterialCommunityIcons name="check-circle" size={26} color="#00FF88" />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.doneBannerTitle}>Woche {currentWeekNum} abgeschlossen</Text>
                      <Text style={styles.doneBannerSub}>
                        7-Tage-Schnitt: {currentWeekCheckIn.sevenDayAvgWeight} kg ({currentWeekCheckIn.coachVerdict.headline})
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.viewReportBtn}
                    onPress={() => {
                      setSelectedEntryForReport(currentWeekCheckIn);
                      setReportModalVisible(true);
                    }}
                  >
                    <Text style={styles.viewReportBtnText}>Report ansehen</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.pendingCard, { backgroundColor: theme.cardBg || '#161920', borderColor: theme.accentBorder || '#00D2FF55' }]}>
                  <View style={styles.pendingHeader}>
                    <View>
                      <View style={styles.pendingTag}>
                        <View style={[styles.pulseDot, { backgroundColor: theme.accent || '#00D2FF' }]} />
                        <Text style={[styles.pendingTagText, { color: theme.accent || '#00D2FF' }]}>CHECK-IN BEREIT</Text>
                      </View>
                      <Text style={styles.pendingTitle}>Woche {currentWeekNum} Check-In</Text>
                      <Text style={styles.pendingSub}>
                        {getDayName(phaseConfig.checkInDayOfWeek)} Routine • Fotos & Feedback
                      </Text>
                    </View>
                    <View style={[styles.cameraIconBox, { backgroundColor: theme.accentSoftBg || 'rgba(0, 210, 255, 0.15)' }]}>
                      <MaterialCommunityIcons name="camera" size={24} color={theme.accent || "#00D2FF"} />
                    </View>
                  </View>

                  <View style={styles.pendingGrid}>
                    <View style={styles.pendingGridItem}>
                      <Text style={styles.pendingGridLabel}>Nüchterngewicht</Text>
                      <Text style={styles.pendingGridVal}>
                        {todayWeightEntry ? `${todayWeightEntry.weight} kg` : `${parsedFastingWeight} kg`}
                      </Text>
                    </View>
                    <View style={styles.pendingGridItem}>
                      <Text style={styles.pendingGridLabel}>7-Tage-Schnitt</Text>
                      <Text style={styles.pendingGridVal}>{weightStats.thisWeekAvg} kg</Text>
                    </View>
                    <View style={styles.pendingGridItem}>
                      <Text style={styles.pendingGridLabel}>Wochen-Ziel</Text>
                      <Text style={styles.pendingGridVal}>
                        {phaseConfig.goal === 'Bulk' ? `+${setupRateGrams}g` : `-${setupRateGrams}g`}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.startFlowBtn, { backgroundColor: theme.accent || '#00D2FF' }]}
                    onPress={() => {
                      setCurrentMode('flow');
                      setFlowStep(1);
                    }}
                  >
                    <Text style={styles.startFlowBtnText}>Jetzt Check-In starten</Text>
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#000" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Before / After Slider Preview */}
              <View style={styles.sectionHeaderBox}>
                <Text style={styles.sectionTitle}>Form-Vergleich</Text>
                <Text style={styles.sectionSub}>Ausgangsform vs. Aktuelle Woche</Text>
              </View>

              <BeforeAfterSlider
                beforeEntry={checkInHistory[checkInHistory.length - 1]}
                afterEntry={currentWeekCheckIn || checkInHistory[0]}
              />

              {/* Check-In History List */}
              <View style={[styles.sectionHeaderBox, { marginTop: 12 }]}>
                <Text style={styles.sectionTitle}>Bisherige Check-Ins</Text>
              </View>

              {checkInHistory.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <MaterialCommunityIcons name="clipboard-text-outline" size={36} color="#444" />
                  <Text style={styles.emptyHistoryText}>Noch keine Check-Ins durchgeführt.</Text>
                  <Text style={styles.emptyHistorySub}>
                    Starte deinen ersten wöchentlichen Check-In oben!
                  </Text>
                </View>
              ) : (
                checkInHistory.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.historyRow}
                    onPress={() => {
                      setSelectedEntryForReport(item);
                      setReportModalVisible(true);
                    }}
                  >
                    <View style={styles.historyWeekCircle}>
                      <Text style={styles.historyWeekText}>W{item.weekNumber}</Text>
                    </View>
                    <View style={styles.historyCenter}>
                      <Text style={styles.historyTitle}>
                        {item.coachVerdict?.headline || `Check-In Woche ${item.weekNumber}`}
                      </Text>
                      <Text style={styles.historyDate}>
                        {item.date} • {item.sevenDayAvgWeight} kg (Ø)
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#666" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </>
        )}

        {/* ======================================================== */}
        {/* MODE 2: 4-STEP CHECK-IN FLOW */}
        {/* ======================================================== */}
        {currentMode === 'flow' && (
          <>
            {/* Flow Header */}
            <View style={styles.flowHeader}>
              <TouchableOpacity
                onPress={() => {
                  if (flowStep > 1) setFlowStep(flowStep - 1);
                  else setCurrentMode('hub');
                }}
                style={styles.flowBackBtn}
              >
                <MaterialCommunityIcons name="arrow-left" size={20} color="#AAA" />
                <Text style={styles.flowBackText}>Zurück</Text>
              </TouchableOpacity>
              <Text style={styles.flowHeaderTitle}>Woche {currentWeekNum} Check-In</Text>
              <Text style={styles.flowStepIndicator}>Schritt {flowStep}/4</Text>
            </View>

            {/* Stepper Dots */}
            <View style={styles.stepperBar}>
              {[1, 2, 3, 4].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.stepperSegment,
                    s <= flowStep && { backgroundColor: theme.accent || '#00D2FF' },
                  ]}
                />
              ))}
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={{ paddingBottom: Math.max(40, insets.bottom + 20) }}
            >
              {/* STEP 1: WEIGHT & MEASUREMENTS */}
              {flowStep === 1 && (
                <View style={styles.stepContainer}>
                  <View style={styles.stepTitleBox}>
                    <Text style={styles.stepEmoji}>⚖️</Text>
                    <Text style={styles.stepTitle}>Gewicht & Umfänge</Text>
                    <Text style={styles.stepDesc}>
                      Dein Nüchterngewicht wurde automatisch aus der Historie von heute übernommen.
                    </Text>
                  </View>

                  {/* Fasting Weight Card */}
                  <View style={styles.weightCard}>
                    <Text style={styles.inputLabel}>Heutiges Nüchterngewicht (kg)</Text>
                    <View style={styles.weightInputRow}>
                      <TextInput
                        style={styles.weightInputBig}
                        keyboardType="decimal-pad"
                        value={fastingWeight}
                        onChangeText={setFastingWeight}
                      />
                      <Text style={styles.weightUnitBig}>kg</Text>
                    </View>
                    <View style={styles.autoFetchedPill}>
                      <MaterialCommunityIcons name="check-circle" size={14} color="#00FF88" />
                      <Text style={styles.autoFetchedText}>
                        {todayWeightEntry
                          ? 'Automatisch aus Morgengewicht geladen'
                          : 'Aus letztem bekanntem Gewicht übernommen'}
                      </Text>
                    </View>
                    <Text style={styles.avgWeightText}>
                      📊 7-Tage-Durchschnitt: <Text style={{ color: '#00D2FF', fontWeight: '800' }}>{weightStats.thisWeekAvg} kg</Text>
                    </Text>
                  </View>

                  {/* Measurements */}
                  <View style={styles.measurementsBox}>
                    <Text style={styles.measurementsTitle}>Körpermaße (cm)</Text>
                    <Text style={styles.measurementsSub}>
                      Besonders die Taille ist entscheidend, um Muskel- vs. Fettaufbau zu steuern.
                    </Text>
                    <View style={styles.measurementsGrid}>
                      <View style={styles.measurementItem}>
                        <Text style={styles.measLabel}>Taille (Bauchnabel)</Text>
                        <TextInput
                          style={styles.measInput}
                          placeholder="z.B. 84.5"
                          placeholderTextColor="#555"
                          keyboardType="decimal-pad"
                          value={waist}
                          onChangeText={setWaist}
                        />
                      </View>
                      <View style={styles.measurementItem}>
                        <Text style={styles.measLabel}>Brustumfang</Text>
                        <TextInput
                          style={styles.measInput}
                          placeholder="z.B. 108"
                          placeholderTextColor="#555"
                          keyboardType="decimal-pad"
                          value={chest}
                          onChangeText={setChest}
                        />
                      </View>
                      <View style={styles.measurementItem}>
                        <Text style={styles.measLabel}>Oberarm</Text>
                        <TextInput
                          style={styles.measInput}
                          placeholder="z.B. 39.5"
                          placeholderTextColor="#555"
                          keyboardType="decimal-pad"
                          value={arm}
                          onChangeText={setArm}
                        />
                      </View>
                      <View style={styles.measurementItem}>
                        <Text style={styles.measLabel}>Oberschenkel</Text>
                        <TextInput
                          style={styles.measInput}
                          placeholder="z.B. 62.0"
                          placeholderTextColor="#555"
                          keyboardType="decimal-pad"
                          value={thigh}
                          onChangeText={setThigh}
                        />
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.nextStepBtn, { backgroundColor: theme.accent || '#00D2FF' }]}
                    onPress={() => setFlowStep(2)}
                  >
                    <Text style={styles.nextStepBtnText}>Weiter zu Schritt 2: Fotos →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 2: 4-POSE PHOTO UPLOAD */}
              {flowStep === 2 && (
                <View style={styles.stepContainer}>
                  <View style={styles.stepTitleBox}>
                    <Text style={styles.stepEmoji}>📸</Text>
                    <Text style={styles.stepTitle}>Progress Fotos</Text>
                    <Text style={styles.stepDesc}>
                      Standard-Winkel für verlässliche Vergleiche unter gleichem Licht.
                    </Text>
                  </View>

                  {/* Ghost hint */}
                  <View style={styles.ghostHintBox}>
                    <Text style={{ fontSize: 16 }}>👻</Text>
                    <Text style={styles.ghostHintText}>
                      Tipp: Behalte den gleichen Abstand zur Kamera und gleiche Ausleuchtung bei!
                    </Text>
                  </View>

                  <View style={styles.photosGrid}>
                    {(['front', 'side', 'back', 'detail'] as const).map((pose) => {
                      const uri = photos[pose];
                      const title =
                        pose === 'front'
                          ? 'Front Relaxed'
                          : pose === 'side'
                          ? 'Side Profile'
                          : pose === 'back'
                          ? 'Back Pose'
                          : 'Detail / Beine';

                      return (
                        <TouchableOpacity
                          key={pose}
                          style={[styles.photoCard, uri && styles.photoCardFilled]}
                          onPress={() => pickPhoto(pose)}
                        >
                          {uri ? (
                            <Image source={{ uri }} style={styles.photoImg} />
                          ) : (
                            <View style={styles.photoPlaceholder}>
                              <MaterialCommunityIcons name="camera-plus" size={28} color="#666" />
                              <Text style={styles.photoAddText}>+ Foto</Text>
                            </View>
                          )}
                          <View style={styles.photoCardLabelBox}>
                            <Text style={styles.photoCardLabel}>{title}</Text>
                            {uri && (
                              <MaterialCommunityIcons name="check-circle" size={14} color="#00FF88" />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity
                    style={[styles.nextStepBtn, { backgroundColor: theme.accent || '#00D2FF' }]}
                    onPress={() => setFlowStep(3)}
                  >
                    <Text style={styles.nextStepBtnText}>Weiter zu Schritt 3: Befinden →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 3: BIOFEEDBACK */}
              {flowStep === 3 && (
                <View style={styles.stepContainer}>
                  <View style={styles.stepTitleBox}>
                    <Text style={styles.stepEmoji}>🧠</Text>
                    <Text style={styles.stepTitle}>Biofeedback & Befinden</Text>
                    <Text style={styles.stepDesc}>
                      Steuert die Kalorien- und Ermüdungs-Bewertung des Coaches.
                    </Text>
                  </View>

                  <View style={styles.sliderList}>
                    {/* Sleep */}
                    <View style={styles.sliderItem}>
                      <View style={styles.sliderHeader}>
                        <Text style={styles.sliderLabel}>Schlaf & Erholung</Text>
                        <Text style={[styles.sliderVal, { color: '#00FF88' }]}>
                          {biofeedback.sleep} / 10
                        </Text>
                      </View>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <TouchableOpacity
                            key={num}
                            onPress={() => setBiofeedback({ ...biofeedback, sleep: num })}
                            style={[
                              styles.numberPill,
                              biofeedback.sleep === num && styles.numberPillActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.numberPillText,
                                biofeedback.sleep === num && { color: '#000' },
                              ]}
                            >
                              {num}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Energy */}
                    <View style={styles.sliderItem}>
                      <View style={styles.sliderHeader}>
                        <Text style={styles.sliderLabel}>Trainings-Energie</Text>
                        <Text style={[styles.sliderVal, { color: '#00D2FF' }]}>
                          {biofeedback.energy} / 10
                        </Text>
                      </View>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <TouchableOpacity
                            key={num}
                            onPress={() => setBiofeedback({ ...biofeedback, energy: num })}
                            style={[
                              styles.numberPill,
                              biofeedback.energy === num && styles.numberPillActiveCyan,
                            ]}
                          >
                            <Text
                              style={[
                                styles.numberPillText,
                                biofeedback.energy === num && { color: '#000' },
                              ]}
                            >
                              {num}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Appetite */}
                    <View style={styles.sliderItem}>
                      <View style={styles.sliderHeader}>
                        <Text style={styles.sliderLabel}>Appetit (Fällt Essen leicht?)</Text>
                        <Text style={[styles.sliderVal, { color: '#FF9500' }]}>
                          {biofeedback.appetite} / 10
                        </Text>
                      </View>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <TouchableOpacity
                            key={num}
                            onPress={() => setBiofeedback({ ...biofeedback, appetite: num })}
                            style={[
                              styles.numberPill,
                              biofeedback.appetite === num && styles.numberPillActiveOrange,
                            ]}
                          >
                            <Text
                              style={[
                                styles.numberPillText,
                                biofeedback.appetite === num && { color: '#000' },
                              ]}
                            >
                              {num}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Digestion */}
                    <View style={styles.sliderItem}>
                      <View style={styles.sliderHeader}>
                        <Text style={styles.sliderLabel}>Verdauung & Völlegefühl</Text>
                        <Text style={[styles.sliderVal, { color: '#00FF88' }]}>
                          {biofeedback.digestion} / 10
                        </Text>
                      </View>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <TouchableOpacity
                            key={num}
                            onPress={() => setBiofeedback({ ...biofeedback, digestion: num })}
                            style={[
                              styles.numberPill,
                              biofeedback.digestion === num && styles.numberPillActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.numberPillText,
                                biofeedback.digestion === num && { color: '#000' },
                              ]}
                            >
                              {num}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.nextStepBtn, { backgroundColor: theme.accent || '#00D2FF' }]}
                    onPress={() => setFlowStep(4)}
                  >
                    <Text style={styles.nextStepBtnText}>Weiter zu Schritt 4: Notizen →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* STEP 4: NOTES & SUBMIT */}
              {flowStep === 4 && (
                <View style={styles.stepContainer}>
                  <View style={styles.stepTitleBox}>
                    <Text style={styles.stepEmoji}>📝</Text>
                    <Text style={styles.stepTitle}>Wochen-Fazit & Notizen</Text>
                    <Text style={styles.stepDesc}>
                      Besondere Ereignisse (Cheatmeal, Stress, Zipperlein)?
                    </Text>
                  </View>

                  <TextInput
                    style={styles.notesInput}
                    multiline
                    placeholder="z.B. Starker Pump im Push-Training, Donnerstag Dienstreise aber Kalorien voll getroffen..."
                    placeholderTextColor="#666"
                    value={notes}
                    onChangeText={setNotes}
                  />

                  {/* Summary Check */}
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryTitle}>Bereit für den Coach-Algorithmus:</Text>
                    <Text style={styles.summaryItem}>✓ Nüchterngewicht: {parsedFastingWeight} kg</Text>
                    <Text style={styles.summaryItem}>✓ 7-Tage-Schnitt: {weightStats.thisWeekAvg} kg</Text>
                    <Text style={styles.summaryItem}>
                      ✓ {Object.keys(photos).length} von 4 Fotos hochgeladen
                    </Text>
                    <Text style={styles.summaryItem}>✓ Biofeedback & Befinden erfasst</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleFinishCheckIn}
                  >
                    <MaterialCommunityIcons name="lightning-bolt" size={20} color="#000" />
                    <Text style={styles.submitBtnText}>Check-In abschließen & auswerten ⚡</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </>
        )}

        {/* ======================================================== */}
        {/* MODE 3: PHASE & GOAL SETUP */}
        {/* ======================================================== */}
        {currentMode === 'setup' && (
          <>
            <View style={styles.flowHeader}>
              <TouchableOpacity
                onPress={() => setCurrentMode('hub')}
                style={styles.flowBackBtn}
              >
                <MaterialCommunityIcons name="arrow-left" size={20} color="#AAA" />
                <Text style={styles.flowBackText}>Zurück</Text>
              </TouchableOpacity>
              <Text style={styles.flowHeaderTitle}>Phasen-Konfiguration</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={{ paddingBottom: Math.max(40, insets.bottom + 20) }}
            >
              <View style={styles.setupCard}>
                <Text style={styles.setupLabel}>1. Ziel der aktuellen Phase</Text>
                <View style={styles.goalGrid}>
                  <TouchableOpacity
                    style={[styles.goalBtn, setupGoal === 'Bulk' && styles.goalBtnActiveBulk]}
                    onPress={() => setSetupGoal('Bulk')}
                  >
                    <Text style={{ fontSize: 20 }}>🍗</Text>
                    <Text style={styles.goalBtnTitle}>Lean Bulk</Text>
                    <Text style={styles.goalBtnSub}>Aufbau</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.goalBtn, setupGoal === 'Cut' && styles.goalBtnActiveCut]}
                    onPress={() => setSetupGoal('Cut')}
                  >
                    <Text style={{ fontSize: 20 }}>🔥</Text>
                    <Text style={styles.goalBtnTitle}>Cut</Text>
                    <Text style={styles.goalBtnSub}>Diät</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.goalBtn, setupGoal === 'Maintain' && styles.goalBtnActiveRecomp]}
                    onPress={() => setSetupGoal('Maintain')}
                  >
                    <Text style={{ fontSize: 20 }}>⚖️</Text>
                    <Text style={styles.goalBtnTitle}>Recomp</Text>
                    <Text style={styles.goalBtnSub}>Erhalt</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.setupCard}>
                <Text style={styles.setupLabel}>2. Geplante Dauer (Wochen)</Text>
                <View style={styles.weeksGrid}>
                  {[8, 12, 16, 20, 24].map((w) => (
                    <TouchableOpacity
                      key={w}
                      style={[styles.weekBtn, setupWeeks === w && styles.weekBtnActive]}
                      onPress={() => setSetupWeeks(w)}
                    >
                      <Text
                        style={[
                          styles.weekBtnText,
                          setupWeeks === w && { color: '#000', fontWeight: '800' },
                        ]}
                      >
                        {w} W.
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.setupCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.setupLabel}>3. Wöchentliche Zielrate</Text>
                  <Text style={styles.rateHighlight}>
                    {setupGoal === 'Bulk' ? `+${setupRateGrams}g` : setupGoal === 'Cut' ? `-${setupRateGrams}g` : '±0g'} / Woche
                  </Text>
                </View>
                <Text style={styles.setupHelpText}>
                  {setupGoal === 'Bulk'
                    ? 'Empfehlung: 200g bis 400g / Woche für minimalen Fettansatz.'
                    : 'Empfehlung: 400g bis 800g / Woche für optimalen Fettabbau.'}
                </Text>
                <View style={styles.ratePillsRow}>
                  {[150, 250, 300, 400, 500].map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      style={[styles.ratePill, setupRateGrams === rate && styles.ratePillActive]}
                      onPress={() => setSetupRateGrams(rate)}
                    >
                      <Text
                        style={[
                          styles.ratePillText,
                          setupRateGrams === rate && { color: '#000', fontWeight: '800' },
                        ]}
                      >
                        {rate}g
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.setupCard}>
                <Text style={styles.setupLabel}>4. Check-In Wochentag</Text>
                <View style={styles.daysRow}>
                  {[
                    { id: 0, name: 'Sonntag' },
                    { id: 1, name: 'Montag' },
                    { id: 6, name: 'Samstag' },
                  ].map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.dayBtn, setupDay === d.id && styles.dayBtnActive]}
                      onPress={() => setSetupDay(d.id)}
                    >
                      <Text
                        style={[
                          styles.dayBtnText,
                          setupDay === d.id && { color: '#000', fontWeight: '800' },
                        ]}
                      >
                        {d.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={[styles.saveSetupBtn, { backgroundColor: theme.accent || '#00D2FF' }]} onPress={savePhaseSetup}>
                <Text style={styles.saveSetupBtnText}>Phase speichern & anwenden ✓</Text>
              </TouchableOpacity>
            </ScrollView>
          </>
        )}

        {/* Sub-Modal: Coach Report Modal */}
        <CheckInReportModal
          visible={reportModalVisible}
          entry={selectedEntryForReport}
          onClose={() => setReportModalVisible(false)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  hubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#252528',
  },
  phaseBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  phaseGoalText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF9500',
    letterSpacing: 0.5,
  },
  phasePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.3)',
  },
  phasePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF9500',
  },
  hubTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#1E1E22',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  weekPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#18181A',
    borderWidth: 1,
    borderColor: '#282828',
    alignItems: 'center',
  },
  weekPillCurrent: {
    borderColor: '#00D2FF',
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
  },
  weekPillDone: {
    borderColor: '#00FF8855',
  },
  weekPillNum: {
    fontSize: 11,
    color: '#888',
    fontWeight: '700',
  },
  weekPillStatus: {
    fontSize: 9,
    fontWeight: '800',
    color: '#555',
    marginTop: 2,
  },
  doneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#142018',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#00FF8844',
    marginBottom: 16,
  },
  doneBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  doneBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  doneBannerSub: {
    fontSize: 11,
    color: '#00FF88',
    marginTop: 2,
  },
  viewReportBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#00FF88',
    borderRadius: 10,
  },
  viewReportBtnText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '800',
  },
  pendingCard: {
    backgroundColor: '#161920',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#00D2FF55',
    marginBottom: 16,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pendingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D2FF',
  },
  pendingTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00D2FF',
  },
  pendingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF',
  },
  pendingSub: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  cameraIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 14,
  },
  pendingGridItem: {
    flex: 1,
    backgroundColor: '#121316',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#252830',
  },
  pendingGridLabel: {
    fontSize: 9,
    color: '#777',
    fontWeight: '600',
  },
  pendingGridVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 2,
  },
  startFlowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00D2FF',
    paddingVertical: 12,
    borderRadius: 12,
  },
  startFlowBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeaderBox: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  sectionSub: {
    fontSize: 11,
    color: '#777',
    marginTop: 1,
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#18181A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#252528',
    marginVertical: 8,
  },
  emptyHistoryText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyHistorySub: {
    color: '#777',
    fontSize: 11,
    marginTop: 2,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#252528',
    marginBottom: 8,
  },
  historyWeekCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#222226',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyWeekText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00D2FF',
  },
  historyCenter: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  historyDate: {
    fontSize: 11,
    color: '#777',
    marginTop: 2,
  },

  // Flow Mode Styles
  flowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#252528',
  },
  flowBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flowBackText: {
    color: '#AAA',
    fontSize: 12,
  },
  flowHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
  },
  flowStepIndicator: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00D2FF',
  },
  stepperBar: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  stepperSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#252528',
  },
  stepperSegmentActive: {
    backgroundColor: '#00D2FF',
  },
  stepContainer: {
    paddingTop: 8,
  },
  stepTitleBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  stepEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  stepDesc: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  weightCard: {
    backgroundColor: '#18181A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#282828',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    marginBottom: 10,
  },
  weightInputBig: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFF',
    borderBottomWidth: 2,
    borderBottomColor: '#00D2FF',
    textAlign: 'center',
    width: 120,
    paddingBottom: 2,
  },
  weightUnitBig: {
    fontSize: 16,
    fontWeight: '700',
    color: '#888',
    marginLeft: 6,
  },
  autoFetchedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  autoFetchedText: {
    color: '#00FF88',
    fontSize: 10,
    fontWeight: '700',
  },
  avgWeightText: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 4,
  },
  measurementsBox: {
    backgroundColor: '#18181A',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#282828',
    marginBottom: 16,
  },
  measurementsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  measurementsSub: {
    fontSize: 10,
    color: '#777',
    marginTop: 2,
    marginBottom: 12,
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  measurementItem: {
    width: (Dimensions.get('window').width - 32 - 32 - 8) / 2,
  },
  measLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
  },
  measInput: {
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#282828',
    borderRadius: 10,
    padding: 10,
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  nextStepBtn: {
    backgroundColor: '#00D2FF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  nextStepBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
  ghostHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  ghostHintText: {
    color: '#CCC',
    fontSize: 11,
    flex: 1,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  photoCard: {
    width: (Dimensions.get('window').width - 32 - 8) / 2,
    height: 180,
    borderRadius: 14,
    backgroundColor: '#18181A',
    borderWidth: 1,
    borderColor: '#282828',
    overflow: 'hidden',
    position: 'relative',
  },
  photoCardFilled: {
    borderColor: '#00D2FF',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAddText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontWeight: '600',
  },
  photoCardLabelBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  sliderList: {
    gap: 12,
    marginBottom: 16,
  },
  sliderItem: {
    backgroundColor: '#18181A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#282828',
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CCC',
  },
  sliderVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  numberPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#121214',
    alignItems: 'center',
  },
  numberPillActive: {
    backgroundColor: '#00FF88',
  },
  numberPillActiveCyan: {
    backgroundColor: '#00D2FF',
  },
  numberPillActiveOrange: {
    backgroundColor: '#FF9500',
  },
  numberPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888',
  },
  notesInput: {
    backgroundColor: '#18181A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#282828',
    padding: 14,
    color: '#FFF',
    fontSize: 12,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  summaryBox: {
    backgroundColor: '#161920',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    marginBottom: 16,
    gap: 4,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00D2FF',
    marginBottom: 4,
  },
  summaryItem: {
    fontSize: 11,
    color: '#CCC',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00FF88',
    paddingVertical: 14,
    borderRadius: 14,
  },
  submitBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },

  // Setup Mode Styles
  setupCard: {
    backgroundColor: '#18181A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#282828',
    marginBottom: 12,
  },
  setupLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 10,
  },
  setupHelpText: {
    fontSize: 10,
    color: '#777',
    marginBottom: 10,
  },
  rateHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00FF88',
  },
  goalGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  goalBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#252528',
    alignItems: 'center',
  },
  goalBtnActiveBulk: {
    borderColor: '#FF9500',
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
  },
  goalBtnActiveCut: {
    borderColor: '#FF453A',
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  goalBtnActiveRecomp: {
    borderColor: '#00D2FF',
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
  },
  goalBtnTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 4,
  },
  goalBtnSub: {
    fontSize: 9,
    color: '#777',
  },
  weeksGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  weekBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#121214',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252528',
  },
  weekBtnActive: {
    backgroundColor: '#00D2FF',
    borderColor: '#00D2FF',
  },
  weekBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
  },
  ratePillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  ratePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#121214',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252528',
  },
  ratePillActive: {
    backgroundColor: '#00FF88',
    borderColor: '#00FF88',
  },
  ratePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#121214',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252528',
  },
  dayBtnActive: {
    backgroundColor: '#00D2FF',
    borderColor: '#00D2FF',
  },
  dayBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
  },
  saveSetupBtn: {
    backgroundColor: '#00D2FF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  saveSetupBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '800',
  },
});
