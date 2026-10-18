import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/store';
import {
  calculateMonthlyReview,
  getAvailableMonths,
  formatMonthLabel,
  MonthlyReviewData
} from '../utils/monthlyReviewEngine';
import { triggerLight, triggerSuccess, triggerWarning } from '../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  initialMonth?: string;
}

export const MonthlyReviewModal: React.FC<Props> = ({ visible, onClose, initialMonth }) => {
  const insets = useSafeAreaInsets();

  const {
    workoutHistory,
    nutritionHistory,
    weightHistory,
    workoutPrograms,
    flawlessMonths,
    recordFlawlessMonth,
    setLastViewedMonthlyReview,
  } = useAppStore();

  // Available months list
  const availableMonths = useMemo(() => {
    return getAvailableMonths(workoutHistory, nutritionHistory, weightHistory);
  }, [workoutHistory, nutritionHistory, weightHistory]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (initialMonth && availableMonths.includes(initialMonth)) return initialMonth;
    // Default to latest month
    return availableMonths[0] || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  });

  const [viewMode, setViewMode] = useState<'story' | 'dashboard'>('story');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  // Animations
  const slideFadeAnim = useRef(new Animated.Value(1)).current;
  const slideScaleAnim = useRef(new Animated.Value(1)).current;

  // Calculate review data for selected month
  const review: MonthlyReviewData = useMemo(() => {
    return calculateMonthlyReview(
      selectedMonth,
      workoutHistory,
      nutritionHistory,
      weightHistory,
      workoutPrograms
    );
  }, [selectedMonth, workoutHistory, nutritionHistory, weightHistory, workoutPrograms]);

  // If month is flawless and past, ensure it's permanently recorded in store
  useEffect(() => {
    if (review.isFlawless && !(flawlessMonths || []).includes(review.monthKey)) {
      recordFlawlessMonth(review.monthKey);
    }
    setLastViewedMonthlyReview(review.monthKey);
  }, [review.monthKey, review.isFlawless]);

  const animateSlideChange = (newSlide: number) => {
    Animated.parallel([
      Animated.timing(slideFadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(slideScaleAnim, { toValue: 0.95, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setCurrentSlide(newSlide);
      Animated.parallel([
        Animated.timing(slideFadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(slideScaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleNextSlide = () => {
    if (currentSlide < 4) {
      triggerLight();
      animateSlideChange(currentSlide + 1);
    } else {
      triggerSuccess();
      setViewMode('dashboard');
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      triggerLight();
      animateSlideChange(currentSlide - 1);
    }
  };

  const handleSelectMonth = (mKey: string) => {
    setSelectedMonth(mKey);
    setMonthPickerOpen(false);
    setCurrentSlide(0);
    triggerLight();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" />

        {/* ── TOP HEADER BAR ────────────────────────────────────── */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.monthSelectorBtn}
            activeOpacity={0.8}
            onPress={() => setMonthPickerOpen(!monthPickerOpen)}
          >
            <MaterialCommunityIcons name="calendar-month" size={18} color="#00D2FF" style={{ marginRight: 6 }} />
            <Text style={styles.monthSelectorText}>{review.monthLabel}</Text>
            <MaterialCommunityIcons
              name={monthPickerOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#00D2FF"
            />
          </TouchableOpacity>

          <View style={styles.headerRightRow}>
            {/* Mode Switch Tabs */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, viewMode === 'story' && styles.modeTabActive]}
                onPress={() => { setViewMode('story'); triggerLight(); }}
              >
                <MaterialCommunityIcons
                  name="play"
                  size={14}
                  color={viewMode === 'story' ? '#000' : '#8E8E93'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.modeTabText, viewMode === 'story' && styles.modeTabTextActive]}>Story</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, viewMode === 'dashboard' && styles.modeTabActive]}
                onPress={() => { setViewMode('dashboard'); triggerLight(); }}
              >
                <MaterialCommunityIcons
                  name="view-dashboard-outline"
                  size={14}
                  color={viewMode === 'dashboard' ? '#000' : '#8E8E93'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.modeTabText, viewMode === 'dashboard' && styles.modeTabTextActive]}>Übersicht</Text>
              </TouchableOpacity>
            </View>

            {/* Close Button */}
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── MONTH PICKER DROPDOWN ────────────────────────────── */}
        {monthPickerOpen && (
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Verfügbare Monats-Reviews:</Text>
            <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
              {availableMonths.map(mKey => {
                const isSelected = mKey === selectedMonth;
                const isPastFlawless = (flawlessMonths || []).includes(mKey);
                return (
                  <TouchableOpacity
                    key={mKey}
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                    onPress={() => handleSelectMonth(mKey)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                        {formatMonthLabel(mKey)}
                      </Text>
                      {isPastFlawless && (
                        <View style={styles.flawlessPillMini}>
                          <Text style={styles.flawlessPillMiniText}>💎 Makellos</Text>
                        </View>
                      )}
                    </View>
                    {isSelected && <MaterialCommunityIcons name="check" size={16} color="#00D2FF" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── CONTENT AREA (STORY OR DASHBOARD) ────────────────── */}
        {viewMode === 'story' ? (
          <View style={styles.storyContainer}>
            {/* Top Story Progress Bars */}
            <View style={styles.storyBarsRow}>
              {[0, 1, 2, 3, 4].map(idx => (
                <View key={idx} style={styles.storyBarTrack}>
                  <View
                    style={[
                      styles.storyBarFill,
                      { width: idx < currentSlide ? '100%' : idx === currentSlide ? '100%' : '0%' }
                    ]}
                  />
                </View>
              ))}
            </View>

            {/* Slide Sub-Header */}
            <View style={styles.slideHeader}>
              <Text style={styles.slideMonthLabel}>{review.monthLabel.toUpperCase()}</Text>
              <Text style={styles.slideIndexText}>{currentSlide + 1} / 5</Text>
            </View>

            {/* Animated Slide Box */}
            <Animated.View
              style={[
                styles.slideContentBox,
                { opacity: slideFadeAnim, transform: [{ scale: slideScaleAnim }] }
              ]}
            >
              {/* SLIDE 0: Goal Consistency */}
              {currentSlide === 0 && (
                <View style={styles.slideInner}>
                  <View style={[styles.heroIconCircle, { backgroundColor: '#30D15820', borderColor: '#30D15860' }]}>
                    <MaterialCommunityIcons name="bullseye-arrow" size={44} color="#30D158" />
                  </View>
                  <Text style={styles.slideCategoryTag}>ZIEL-DISZIPLIN & KONSISTENZ</Text>
                  <Text style={styles.slideBigTitle}>
                    {review.daysWithGoalsHit} von {review.totalDaysInMonth} Tagen
                  </Text>
                  <Text style={styles.slideSubtitle}>
                    {review.consistencyPct}% aller Tage im Monat hast du deine Trainings- und Ernährungsziele zu 100% gemeistert!
                  </Text>

                  {/* Progress Bar Card */}
                  <View style={styles.statMetricCard}>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Monats-Beständigkeit</Text>
                      <Text style={[styles.metricValue, { color: '#30D158' }]}>{review.consistencyPct}%</Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View style={[styles.progressBarFill, { width: `${review.consistencyPct}%`, backgroundColor: '#30D158' }]} />
                    </View>
                    <View style={styles.metricSubRow}>
                      <Text style={styles.metricSubText}>🏋️ {review.totalWorkouts} Workouts absolviert</Text>
                      <Text style={styles.metricSubText}>🥗 {review.daysWithGoalsHit} Tage Makros grün</Text>
                    </View>
                  </View>

                  {review.isFlawless && (
                    <View style={styles.flawlessBanner}>
                      <Text style={styles.flawlessBannerEmoji}>💎</Text>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.flawlessBannerTitle}>MAKELLOSER MONAT (100%)!</Text>
                        <Text style={styles.flawlessBannerDesc}>
                          Dauerhaft als Prestige-Siegel in deinem Spielerprofil gesichert!
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* SLIDE 1: Top 3 Improvements */}
              {currentSlide === 1 && (
                <View style={styles.slideInner}>
                  <View style={[styles.heroIconCircle, { backgroundColor: '#FFD70020', borderColor: '#FFD70060' }]}>
                    <MaterialCommunityIcons name="trophy" size={44} color="#FFD700" />
                  </View>
                  <Text style={[styles.slideCategoryTag, { color: '#FFD700' }]}>KRAFT-DURCHBRÜCHE</Text>
                  <Text style={styles.slideBigTitle}>
                    {review.topImprovements.length > 0 ? review.topImprovements[0].exerciseName : 'Progression'}
                  </Text>
                  {review.topImprovements.length > 0 && (
                    <View style={styles.highlightPill}>
                      <Text style={styles.highlightPillText}>
                        +{review.topImprovements[0].diffPct}% Kraftsteigerung (+{review.topImprovements[0].diffKg} kg)
                      </Text>
                    </View>
                  )}

                  {/* List of Top 3 */}
                  <View style={{ width: '100%', marginTop: 14, gap: 8 }}>
                    {review.topImprovements.length === 0 ? (
                      <Text style={styles.emptyNoticeText}>
                        Trainiere Übungen mindestens 2x im Monat für eine automatische Progressions-Analyse.
                      </Text>
                    ) : (
                      review.topImprovements.map((it, idx) => (
                        <View key={it.exerciseName} style={styles.rankedItemRow}>
                          <View style={styles.rankNumBadge}>
                            <Text style={styles.rankNumText}>{idx + 1}</Text>
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.rankedItemName} numberOfLines={1}>{it.exerciseName}</Text>
                            <Text style={styles.rankedItemSub}>
                              {it.firstWeight} kg ➔ {it.lastWeight} kg ({it.diffKg > 0 ? `+${it.diffKg}` : it.diffKg} kg)
                            </Text>
                          </View>
                          <View style={styles.gainPill}>
                            <Text style={styles.gainPillText}>+{it.diffPct}%</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}

              {/* SLIDE 2: Stagnation & Potential */}
              {currentSlide === 2 && (
                <View style={styles.slideInner}>
                  <View style={[styles.heroIconCircle, { backgroundColor: '#FF950020', borderColor: '#FF950060' }]}>
                    <MaterialCommunityIcons name="compass-outline" size={44} color="#FF9500" />
                  </View>
                  <Text style={[styles.slideCategoryTag, { color: '#FF9500' }]}>POTENZIAL-ANALYSE</Text>
                  <Text style={styles.slideBigTitle}>Plateaus & Fokus-Übungen</Text>
                  <Text style={styles.slideSubtitle}>
                    Diese Übungen haben im Monat stagniert – dein idealer Hebel für neue Trainingsreize im nächsten Monat!
                  </Text>

                  <View style={{ width: '100%', marginTop: 12, gap: 8 }}>
                    {review.stagnations.length === 0 ? (
                      <View style={styles.emptyNoticeCard}>
                        <MaterialCommunityIcons name="check-decagram" size={24} color="#30D158" />
                        <Text style={[styles.emptyNoticeText, { color: '#30D158', marginTop: 4 }]}>
                          Keine Stagnation gefunden! Alle Übungen wurden gesteigert! 🚀
                        </Text>
                      </View>
                    ) : (
                      review.stagnations.map(it => (
                        <View key={it.exerciseName} style={styles.rankedItemRow}>
                          <View style={[styles.rankNumBadge, { backgroundColor: '#FF950020' }]}>
                            <MaterialCommunityIcons name="pause" size={14} color="#FF9500" />
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.rankedItemName} numberOfLines={1}>{it.exerciseName}</Text>
                            <Text style={[styles.rankedItemSub, { color: '#FF9500' }]}>{it.reason}</Text>
                          </View>
                          <Text style={[styles.gainPillText, { color: '#8E8E93' }]}>{it.diffPct}%</Text>
                        </View>
                      ))
                    )}
                  </View>

                  <View style={styles.trainerTipBox}>
                    <Text style={styles.trainerTipText}>
                      💡 <Text style={{ color: '#FFF', fontWeight: '800' }}>Trainer-Tipp:</Text> Bei Plateaus helfen oft 1–2 Wochen Variation des Rep-Bereichs (z. B. 6–8 Wdh statt 10–12 Wdh) oder gezielte Kadenz-Pausen in der Dehnung.
                    </Text>
                  </View>
                </View>
              )}

              {/* SLIDE 3: Bodyweight & Favorite Exercise */}
              {currentSlide === 3 && (
                <View style={styles.slideInner}>
                  <View style={[styles.heroIconCircle, { backgroundColor: '#00D2FF20', borderColor: '#00D2FF60' }]}>
                    <MaterialCommunityIcons name="scale-bathroom" size={44} color="#00D2FF" />
                  </View>
                  <Text style={[styles.slideCategoryTag, { color: '#00D2FF' }]}>KÖRPER-TRANSFORMATION</Text>
                  <Text style={styles.slideBigTitle}>
                    {review.weightDeltaKg !== null
                      ? `${review.weightDeltaKg > 0 ? `+${review.weightDeltaKg}` : review.weightDeltaKg} kg`
                      : 'Gewichts-Trend'}
                  </Text>
                  <Text style={styles.slideSubtitle}>
                    {review.weightStart && review.weightEnd
                      ? `von ${review.weightStart} kg auf ${review.weightEnd} kg ${review.weightDeltaPct ? `(${review.weightDeltaPct > 0 ? '+' : ''}${review.weightDeltaPct}%)` : ''}`
                      : 'Regelmäßige Fasten-Wiegungen helfen dir, deinen Kurs präzise zu steuern.'}
                  </Text>

                  {/* King of the Month Card */}
                  <View style={styles.favExerciseCard}>
                    <View style={styles.favHeaderRow}>
                      <Text style={{ fontSize: 20 }}>👑</Text>
                      <Text style={styles.favHeaderTitle}>KÖNIG DES MONATS (LIEBLINGSÜBUNG)</Text>
                    </View>
                    <Text style={styles.favExerciseName}>
                      {review.favoriteExercise ? review.favoriteExercise.name : 'Keine Übung geloggt'}
                    </Text>
                    {review.favoriteExercise && (
                      <View style={styles.favStatsRow}>
                        <View style={styles.favStatCol}>
                          <Text style={styles.favStatLabel}>Sätze</Text>
                          <Text style={styles.favStatVal}>{review.favoriteExercise.totalSets}</Text>
                        </View>
                        <View style={styles.favStatDivider} />
                        <View style={styles.favStatCol}>
                          <Text style={styles.favStatLabel}>Wdh.</Text>
                          <Text style={styles.favStatVal}>{review.favoriteExercise.totalReps}</Text>
                        </View>
                        <View style={styles.favStatDivider} />
                        <View style={styles.favStatCol}>
                          <Text style={styles.favStatLabel}>Volumen</Text>
                          <Text style={[styles.favStatVal, { color: '#FFD700' }]}>
                            {Math.round(review.favoriteExercise.totalVolumeKg).toLocaleString('de-CH')} kg
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* SLIDE 4: Tonnage & Monthly Title */}
              {currentSlide === 4 && (
                <View style={styles.slideInner}>
                  <View style={[styles.heroIconCircle, { backgroundColor: '#BF5AF220', borderColor: '#BF5AF260' }]}>
                    <MaterialCommunityIcons name="crown" size={44} color="#BF5AF2" />
                  </View>
                  <Text style={[styles.slideCategoryTag, { color: '#BF5AF2' }]}>DEIN MONATS-TITEL</Text>
                  <Text style={styles.slideBigTitle}>{review.monthlyTitle}</Text>
                  <Text style={styles.slideSubtitle}>{review.monthlyTitleReason}</Text>

                  <View style={styles.tonnageHighlightCard}>
                    <MaterialCommunityIcons name="weight-lifter" size={28} color="#FFD700" />
                    <Text style={styles.tonnageBigNum}>
                      {(review.totalIronMovedKg / 1000).toFixed(1)} Tonnen Eisen
                    </Text>
                    <Text style={styles.tonnageSubComp}>{review.tonnageComparison}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.toDashboardBtn}
                    onPress={() => { triggerSuccess(); setViewMode('dashboard'); }}
                  >
                    <MaterialCommunityIcons name="table-large" size={18} color="#000" style={{ marginRight: 6 }} />
                    <Text style={styles.toDashboardBtnText}>Vollständiges Dashboard ansehen</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>

            {/* Bottom Story Controls */}
            <View style={styles.storyBottomControls}>
              <TouchableOpacity
                style={[styles.storyCtrlBtn, currentSlide === 0 && styles.storyCtrlBtnDisabled]}
                disabled={currentSlide === 0}
                onPress={handlePrevSlide}
              >
                <MaterialCommunityIcons name="chevron-left" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.storyCtrlBtnText}>Zurück</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.storyNextBtn} onPress={handleNextSlide}>
                <Text style={styles.storyNextBtnText}>
                  {currentSlide < 4 ? 'Weiter' : 'Zur Übersicht ➔'}
                </Text>
                {currentSlide < 4 && (
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#000" style={{ marginLeft: 4 }} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ── DASHBOARD MODE (FULL OVERVIEW) ─────────────────── */
          <ScrollView style={styles.dashboardScroll} showsVerticalScrollIndicator={false}>
            {/* 4 Metric Cards Grid */}
            <View style={styles.dashGrid}>
              <View style={styles.dashMetricCard}>
                <Text style={styles.dashMetricLabel}>ZIEL-DISZIPLIN</Text>
                <Text style={[styles.dashMetricVal, { color: '#30D158' }]}>
                  {review.daysWithGoalsHit} / {review.totalDaysInMonth}
                </Text>
                <Text style={styles.dashMetricSub}>{review.consistencyPct}% aller Tage erfüllt</Text>
              </View>

              <View style={styles.dashMetricCard}>
                <Text style={styles.dashMetricLabel}>GEWICHTS-DELTA</Text>
                <Text style={[styles.dashMetricVal, { color: '#00D2FF' }]}>
                  {review.weightDeltaKg !== null
                    ? `${review.weightDeltaKg > 0 ? '+' : ''}${review.weightDeltaKg} kg`
                    : '--'}
                </Text>
                <Text style={styles.dashMetricSub}>
                  {review.weightEnd ? `Aktuell: ${review.weightEnd} kg` : 'Keine Wiegungen'}
                </Text>
              </View>

              <View style={styles.dashMetricCard}>
                <Text style={styles.dashMetricLabel}>GESAMT-TONNAGE</Text>
                <Text style={[styles.dashMetricVal, { color: '#FFD700' }]}>
                  {(review.totalIronMovedKg / 1000).toFixed(1)} t
                </Text>
                <Text style={styles.dashMetricSub} numberOfLines={1}>{review.tonnageComparison}</Text>
              </View>

              <View style={styles.dashMetricCard}>
                <Text style={styles.dashMetricLabel}>MONATS-STATUS</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Text style={{ fontSize: 18, marginRight: 4 }}>{review.isFlawless ? '💎' : '⚡'}</Text>
                  <Text style={[styles.dashMetricVal, { fontSize: 14, color: review.isFlawless ? '#00D2FF' : '#FF9500' }]}>
                    {review.isFlawless ? 'Makellos!' : `${review.totalWorkouts} Workouts`}
                  </Text>
                </View>
                <Text style={styles.dashMetricSub}>
                  {review.isFlawless ? 'Im Profil gesichert' : 'Gute Leistung'}
                </Text>
              </View>
            </View>

            {/* Top Breakthroughs Card */}
            <View style={styles.dashSectionCard}>
              <View style={styles.dashSectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="arrow-top-right" size={18} color="#30D158" style={{ marginRight: 6 }} />
                  <Text style={styles.dashSectionTitle}>TOP 3 KRAFT-DURCHBRÜCHE</Text>
                </View>
                <Text style={[styles.dashSectionBadge, { color: '#30D158' }]}>Progression</Text>
              </View>

              <View style={{ gap: 8, marginTop: 10 }}>
                {review.topImprovements.length === 0 ? (
                  <Text style={styles.emptyNoticeText}>Keine ausreichenden Daten vorhanden.</Text>
                ) : (
                  review.topImprovements.map((it, idx) => (
                    <View key={it.exerciseName} style={styles.dashItemRow}>
                      <View style={styles.rankNumBadge}>
                        <Text style={styles.rankNumText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.rankedItemName}>{it.exerciseName}</Text>
                        <Text style={styles.rankedItemSub}>
                          {it.firstWeight} kg ➔ {it.lastWeight} kg ({it.diffKg > 0 ? `+${it.diffKg}` : it.diffKg} kg)
                        </Text>
                      </View>
                      <View style={styles.gainPill}>
                        <Text style={styles.gainPillText}>+{it.diffPct}%</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* Stagnations / Potential Card */}
            <View style={styles.dashSectionCard}>
              <View style={styles.dashSectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#FF9500" style={{ marginRight: 6 }} />
                  <Text style={styles.dashSectionTitle}>3 POTENZIAL-ÜBUNGEN (PLATEAUS)</Text>
                </View>
                <Text style={[styles.dashSectionBadge, { color: '#FF9500' }]}>Stagnation</Text>
              </View>

              <View style={{ gap: 8, marginTop: 10 }}>
                {review.stagnations.length === 0 ? (
                  <Text style={[styles.emptyNoticeText, { color: '#30D158' }]}>
                    Keine Stagnation festgestellt. Du machst überall Fortschritte!
                  </Text>
                ) : (
                  review.stagnations.map(it => (
                    <View key={it.exerciseName} style={styles.dashItemRow}>
                      <View style={[styles.rankNumBadge, { backgroundColor: '#FF950020' }]}>
                        <MaterialCommunityIcons name="pause" size={14} color="#FF9500" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.rankedItemName}>{it.exerciseName}</Text>
                        <Text style={[styles.rankedItemSub, { color: '#FF9500' }]}>{it.reason}</Text>
                      </View>
                      <Text style={[styles.gainPillText, { color: '#8E8E93' }]}>{it.diffPct}%</Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* King of Month & Weight Details */}
            {review.favoriteExercise && (
              <View style={styles.dashSectionCard}>
                <View style={styles.dashSectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, marginRight: 6 }}>👑</Text>
                    <Text style={styles.dashSectionTitle}>MEISTGEMACHTE ÜBUNG</Text>
                  </View>
                  <Text style={[styles.dashSectionBadge, { color: '#FFD700' }]}>König des Monats</Text>
                </View>

                <Text style={[styles.favExerciseName, { marginTop: 10 }]}>{review.favoriteExercise.name}</Text>
                <View style={[styles.favStatsRow, { marginTop: 10 }]}>
                  <View style={styles.favStatCol}>
                    <Text style={styles.favStatLabel}>Workouts</Text>
                    <Text style={styles.favStatVal}>{review.favoriteExercise.workoutsCount}x</Text>
                  </View>
                  <View style={styles.favStatDivider} />
                  <View style={styles.favStatCol}>
                    <Text style={styles.favStatLabel}>Sätze</Text>
                    <Text style={styles.favStatVal}>{review.favoriteExercise.totalSets}</Text>
                  </View>
                  <View style={styles.favStatDivider} />
                  <View style={styles.favStatCol}>
                    <Text style={styles.favStatLabel}>Tonnage</Text>
                    <Text style={[styles.favStatVal, { color: '#FFD700' }]}>
                      {Math.round(review.favoriteExercise.totalVolumeKg).toLocaleString('de-CH')} kg
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Monthly Title Card */}
            <View style={[styles.dashSectionCard, { borderColor: '#BF5AF260', backgroundColor: '#161020', marginBottom: 28 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <MaterialCommunityIcons name="seal" size={32} color="#BF5AF2" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#BF5AF2', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
                    MONATS-AUSZEICHNUNG
                  </Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900' }}>
                    {review.monthlyTitle}
                  </Text>
                  <Text style={{ color: '#A0A0B8', fontSize: 11, marginTop: 2 }}>
                    {review.monthlyTitleReason}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090D',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#1E1E2A',
    backgroundColor: '#111118',
  },
  monthSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181824',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00D2FF50',
  },
  monthSelectorText: {
    color: '#00D2FF',
    fontSize: 12.5,
    fontWeight: '800',
    marginRight: 4,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#181824',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#262638',
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  modeTabActive: {
    backgroundColor: '#00D2FF',
  },
  modeTabText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
  },
  modeTabTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#20202E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#161622',
    borderBottomWidth: 1.5,
    borderBottomColor: '#28283C',
    padding: 12,
  },
  dropdownTitle: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#1C1C2A',
  },
  dropdownItemActive: {
    borderColor: '#00D2FF',
    borderWidth: 1,
    backgroundColor: '#00D2FF15',
  },
  dropdownItemText: {
    color: '#E0E0EA',
    fontSize: 13,
    fontWeight: '700',
  },
  dropdownItemTextActive: {
    color: '#00D2FF',
    fontWeight: '800',
  },
  flawlessPillMini: {
    backgroundColor: '#00D2FF25',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  flawlessPillMiniText: {
    color: '#00D2FF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  storyContainer: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  storyBarsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10,
  },
  storyBarTrack: {
    flex: 1,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#222234',
    overflow: 'hidden',
  },
  storyBarFill: {
    height: '100%',
    backgroundColor: '#00D2FF',
  },
  slideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  slideMonthLabel: {
    color: '#00D2FF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  slideIndexText: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '700',
  },
  slideContentBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#12121A',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#26263A',
    padding: 18,
    marginVertical: 4,
  },
  slideInner: {
    width: '100%',
    alignItems: 'center',
  },
  heroIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  slideCategoryTag: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#30D158',
    marginBottom: 4,
  },
  slideBigTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  slideSubtitle: {
    color: '#A0A0B5',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 290,
    marginBottom: 14,
  },
  statMetricCard: {
    width: '100%',
    backgroundColor: '#191925',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#29293E',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#242436',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  metricSubText: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
  },
  flawlessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D2FF15',
    borderWidth: 1.5,
    borderColor: '#00D2FF',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    width: '100%',
  },
  flawlessBannerEmoji: {
    fontSize: 24,
  },
  flawlessBannerTitle: {
    color: '#00D2FF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  flawlessBannerDesc: {
    color: '#E0E0EA',
    fontSize: 9.5,
    marginTop: 1,
  },
  highlightPill: {
    backgroundColor: '#30D15825',
    borderColor: '#30D158',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 4,
  },
  highlightPillText: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: '800',
  },
  rankedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191925',
    borderRadius: 10,
    padding: 9,
    borderWidth: 1,
    borderColor: '#29293C',
  },
  rankNumBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFD70020',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNumText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '900',
  },
  rankedItemName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rankedItemSub: {
    color: '#8E8E93',
    fontSize: 10,
    marginTop: 1,
  },
  gainPill: {
    backgroundColor: '#30D15815',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30D15830',
  },
  gainPillText: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyNoticeCard: {
    alignItems: 'center',
    padding: 12,
  },
  emptyNoticeText: {
    color: '#8E8E93',
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  trainerTipBox: {
    backgroundColor: '#1C1C2A',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2C2C3E',
  },
  trainerTipText: {
    color: '#A0A0B5',
    fontSize: 10,
    lineHeight: 14,
  },
  favExerciseCard: {
    width: '100%',
    backgroundColor: '#191926',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2E2E44',
  },
  favHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  favHeaderTitle: {
    color: '#FFD700',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  favExerciseName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  favStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#28283C',
  },
  favStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  favStatLabel: {
    color: '#8E8E93',
    fontSize: 9.5,
  },
  favStatVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  favStatDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#28283C',
  },
  tonnageHighlightCard: {
    width: '100%',
    backgroundColor: '#181826',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFD70040',
    marginVertical: 10,
  },
  tonnageBigNum: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 6,
  },
  tonnageSubComp: {
    color: '#A0A0B5',
    fontSize: 11,
    marginTop: 2,
  },
  toDashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00D2FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    marginTop: 8,
  },
  toDashboardBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  storyBottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  storyCtrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A26',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A3C',
  },
  storyCtrlBtnDisabled: {
    opacity: 0.35,
  },
  storyCtrlBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  storyNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00D2FF',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  storyNextBtnText: {
    color: '#000000',
    fontSize: 11.5,
    fontWeight: '800',
  },
  dashboardScroll: {
    flex: 1,
    padding: 12,
  },
  dashGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  dashMetricCard: {
    width: '48.5%',
    backgroundColor: '#13131D',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#242436',
  },
  dashMetricLabel: {
    color: '#8E8E93',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dashMetricVal: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 2,
  },
  dashMetricSub: {
    color: '#8E8E93',
    fontSize: 9.5,
    marginTop: 2,
  },
  dashSectionCard: {
    backgroundColor: '#13131D',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#242436',
    marginBottom: 10,
  },
  dashSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashSectionTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dashSectionBadge: {
    fontSize: 10,
    fontWeight: '800',
  },
  dashItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A26',
    borderRadius: 8,
    padding: 8,
  },
});
