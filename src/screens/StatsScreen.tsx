import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Image, Dimensions, Animated, TextInput, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, showCustomAlert, CompletedWorkout } from '../store/store';
import { calculateStreaks } from '../utils/streakEngine';
import { getLevelData, calculateAchievements, getCardioLevelData, getRecipeLevelData, AchievementBadge } from '../utils/gamification';
import { useCardioStore } from '../store/useCardioStore';
import { useMusicStore } from '../store/useMusicStore';
import { PRELOADED_EXERCISES } from '../data/exercises';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AdminPanelModal } from '../components/AdminPanelModal';
import * as ImagePicker from 'expo-image-picker';
import PagerView from 'react-native-pager-view';
import { LineChart } from 'react-native-chart-kit';
import { useBottomSpacing } from '../hooks/useBottomSpacing';
import { StreakGlow } from '../components/StreakGlow';
import { EmblemIcon } from '../components/EmblemIcon';
import { LevelProgressionModal } from '../components/LevelProgressionModal';
import { ExerciseManagerModal } from '../components/ExerciseManagerModal';
import { useAutoChessStore } from '../store/useAutoChessStore';
import { TrophyRoadModal, TROPHY_MILESTONES } from '../components/tcg/TrophyRoadModal';
import { MonthlyReviewModal } from '../components/MonthlyReviewModal';
import { formatMonthLabel } from '../utils/monthlyReviewEngine';
import { getAppTheme } from '../utils/theme';
import AccentThemePickerModal from '../components/AccentThemePickerModal';

type SortMode = 'pr' | 'sets' | 'reps' | 'volume';
type FilterMode = 'In Plan' | 'All';
type MainSubTab = 'hall' | 'vault' | 'analytics';
type TonnageRange = '1w' | '1m' | '1y' | 'all';
type TonnageMode = 'per_unit' | 'cumulative';

const MUSCLE_LABELS_DE: Record<string, string> = {
  All: 'Alle',
  Chest: 'Brust',
  Back: 'Rücken',
  Shoulders: 'Schultern',
  Legs: 'Beine',
  Arms: 'Arme',
  Core: 'Core',
};

const FlippableExerciseCard = ({ 
  item, 
  imageUri, 
  stats, 
  chartLabels, 
  chartData, 
  levelData, 
  borderColor,
  collectionType,
  screenWidth,
  styles,
  exerciseTimeRange,
  setExerciseTimeRange,
  theme
}: any) => {
  const [flipped, setFlipped] = React.useState(false);
  const recipe = item.recipeData;
  const [portions, setPortions] = React.useState(recipe?.totalServings || 1);
  const flipAnim = React.useRef(new Animated.Value(0)).current;

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

  // Calculate dynamic macros
  const displayKcal = recipe ? (recipe.calories / (recipe.totalServings || 1)) * portions : 0;
  const displayPro = recipe ? (recipe.protein / (recipe.totalServings || 1)) * portions : 0;
  const displayCarb = recipe ? (recipe.carbs / (recipe.totalServings || 1)) * portions : 0;
  const displayFat = recipe ? (recipe.fat / (recipe.totalServings || 1)) * portions : 0;

  // Level progress overlay state
  const [showLevelOverlay, setShowLevelOverlay] = React.useState(false);
  const overlayAnim = React.useRef(new Animated.Value(0)).current;

  const openLevelOverlay = (e: any) => {
    e.stopPropagation();
    setShowLevelOverlay(true);
    Animated.spring(overlayAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }).start();
  };

  const closeLevelOverlay = () => {
    Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setShowLevelOverlay(false));
  };

  // Rank tiers config for the progress sheet
  const rankTiers = collectionType === 'Recipes' || collectionType === 'Supplements'
    ? [
        { name: 'Bronze',     color: '#CD7F32', label: '0–39 logs' },
        { name: 'Silver',     color: '#C0C0C0', label: '40–79 logs' },
        { name: 'Gold',       color: '#FFD700', label: '80–119 logs' },
        { name: 'Emerald',    color: '#50C878', label: '120–149 logs' },
        { name: 'Challenger', color: '#E51400', label: '150+ logs' },
      ]
    : [
        { name: 'Bronze',     color: '#CD7F32', label: 'LVL 1–10' },
        { name: 'Silver',     color: '#C0C0C0', label: 'LVL 11–20' },
        { name: 'Gold',       color: '#FFD700', label: 'LVL 21–30' },
        { name: 'Emerald',    color: '#50C878', label: 'LVL 31–40' },
        { name: 'Challenger', color: '#E51400', label: 'LVL 41+' },
      ];

  const progressPct = Math.min(1, levelData.neededXP > 0 ? levelData.progressXP / levelData.neededXP : 1);
  const xpLabel = collectionType === 'Recipes' || collectionType === 'Supplements' ? 'Logs' : 'XP';

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <TouchableOpacity activeOpacity={1} onPress={flipCard} style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* FRONT */}
        <Animated.View style={[
          styles.cardFull, 
          { borderColor: borderColor, borderWidth: 8, backgroundColor: theme?.cardBg || '#161C22', aspectRatio: 2.5/3.5, padding: 0, position: 'absolute', backfaceVisibility: 'hidden', transform: [{ rotateY: frontInterpolate }] }
        ]} pointerEvents={flipped ? 'none' : 'auto'}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingBottom: 8 }}>
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', flex: 1, textTransform: 'uppercase' }} numberOfLines={1}>{item.name}</Text>
            {/* Level badge – tap to open progress */}
            <TouchableOpacity
              onPress={openLevelOverlay}
              activeOpacity={0.75}
              style={{ backgroundColor: borderColor, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Text style={{ color: '#000', fontWeight: '900', fontSize: 14 }}>{`LVL ${levelData.level}`}</Text>
              <MaterialCommunityIcons name="information-outline" size={13} color="rgba(0,0,0,0.6)" />
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 12, flex: 1, paddingBottom: 8 }}>
            <View style={{ flex: 1, backgroundColor: '#000', borderWidth: 3, borderColor: '#555', borderRadius: 6, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 5 }}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }}>
                  <MaterialCommunityIcons name="camera-plus" size={48} color="#555" />
                </View>
              )}
            </View>
          </View>
          
          <View style={{ paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center' }}>
            {collectionType === 'Exercises' && (
              <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 12, borderRadius: 8 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.cardStatVal, { color: borderColor, fontSize: 18 }]}>{stats.pr}kg</Text>
                  <Text style={styles.cardStatLabel}>PR</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.cardStatVal, { color: borderColor, fontSize: 18 }]}>{stats.totalSets}</Text>
                  <Text style={styles.cardStatLabel}>SETS</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.cardStatVal, { color: borderColor, fontSize: 18 }]}>{stats.totalReps}</Text>
                  <Text style={styles.cardStatLabel}>REPS</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.cardStatVal, { color: borderColor, fontSize: 18 }]}>{stats.totalVolume}</Text>
                  <Text style={styles.cardStatLabel}>VOL</Text>
                </View>
              </View>
            )}
            {collectionType === 'Recipes' && recipe && (
              <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 12, borderRadius: 8 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.cardStatVal, { color: borderColor, fontSize: 18 }]}>{Math.round(displayKcal)}</Text>
                  <Text style={styles.cardStatLabel}>KCAL</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.cardStatVal, { color: theme?.accent || '#00D2FF', fontSize: 18 }]}>{Math.round(displayPro)}g</Text>
                  <Text style={styles.cardStatLabel}>PRO</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.cardStatVal, { color: '#FFD700', fontSize: 18 }]}>{Math.round(displayCarb)}g</Text>
                  <Text style={styles.cardStatLabel}>CARB</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.cardStatVal, { color: '#FF3B30', fontSize: 18 }]}>{Math.round(displayFat)}g</Text>
                  <Text style={styles.cardStatLabel}>FAT</Text>
                </View>
              </View>
            )}
            {collectionType === 'Supplements' && (item as any).supplementData && (
              <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 12, borderRadius: 8 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.cardStatVal, { color: borderColor, fontSize: 18 }]}>{(item as any).supplementData.streak || 0}</Text>
                  <Text style={styles.cardStatLabel}>STREAK</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.cardStatVal, { color: '#00E676', fontSize: 18 }]}>{(item as any).supplementData.totalTakenTimes || 0}</Text>
                  <Text style={styles.cardStatLabel}>LOGS</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={[styles.cardStatVal, { color: theme?.accent || '#00D2FF', fontSize: 18 }]}>{(item as any).supplementData.currentInventory || 0}</Text>
                  <Text style={styles.cardStatLabel}>LEFT</Text>
                </View>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <MaterialCommunityIcons name="rotate-3d-variant" size={16} color="#DDD" style={{ marginRight: 6 }} />
              <Text style={{ color: '#DDD', fontSize: 14 }}>{collectionType === 'Recipes' ? 'Tippen für Zutaten' : collectionType === 'Supplements' ? 'Tippen für Details' : 'Tippen für Gewichts-Chart'}</Text>
            </View>
          </View>

          {/* ── Level Progress Overlay (rendered inside front face) ── */}
          {showLevelOverlay && (
            <TouchableOpacity
              activeOpacity={1}
              onPress={closeLevelOverlay}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.88)', borderRadius: 4, justifyContent: 'center', padding: 20 }}
            >
              <Animated.View
                style={{ opacity: overlayAnim, transform: [{ scale: overlayAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }}
              >
                {/* Header */}
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <View style={{ backgroundColor: borderColor, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginBottom: 6 }}>
                    <Text style={{ color: '#000', fontWeight: '900', fontSize: 15 }}>{(levelData.rank || 'Bronze').toUpperCase()}</Text>
                  </View>
                  <Text style={{ color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: -1 }}>LVL {levelData.level}</Text>
                  <Text style={{ color: '#666', fontSize: 11, marginTop: 2 }}>{item.name}</Text>
                </View>

                {/* Progress bar */}
                <View style={{ marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={{ color: '#AAA', fontSize: 11 }}>{levelData.progressXP} {xpLabel}</Text>
                    <Text style={{ color: '#AAA', fontSize: 11 }}>+{levelData.neededXP - levelData.progressXP} {xpLabel} bis nächstes Level</Text>
                  </View>
                  <View style={{ height: 8, backgroundColor: '#2A2A2A', borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${Math.round(progressPct * 100)}%`, backgroundColor: borderColor, borderRadius: 4 }} />
                  </View>
                </View>
                <Text style={{ color: '#555', fontSize: 10, textAlign: 'center', marginBottom: 14 }}>
                  {levelData.totalXP} {xpLabel} gesamt
                </Text>

                {/* Rank ladder */}
                <View style={{ gap: 6 }}>
                  {rankTiers.map((tier) => {
                    const isCurrentRank = tier.name === levelData.rank;
                    return (
                      <View
                        key={tier.name}
                        style={{
                          flexDirection: 'row', alignItems: 'center',
                          backgroundColor: isCurrentRank ? 'rgba(255,255,255,0.07)' : 'transparent',
                          paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
                          borderWidth: isCurrentRank ? 1 : 0,
                          borderColor: isCurrentRank ? tier.color : 'transparent',
                        }}
                      >
                        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: tier.color, marginRight: 10 }} />
                        <Text style={{ color: isCurrentRank ? tier.color : '#555', fontWeight: isCurrentRank ? '800' : '400', fontSize: 13, flex: 1 }}>{tier.name}</Text>
                        <Text style={{ color: isCurrentRank ? '#999' : '#3A3A3A', fontSize: 11 }}>{tier.label}</Text>
                        {isCurrentRank && <MaterialCommunityIcons name="map-marker" size={12} color={tier.color} style={{ marginLeft: 6 }} />}
                      </View>
                    );
                  })}
                </View>

                <Text style={{ color: '#333', fontSize: 10, textAlign: 'center', marginTop: 12 }}>Antippen zum Schließen</Text>
              </Animated.View>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* BACK */}
        <Animated.View style={[
          styles.cardFull, 
          { borderColor: borderColor, borderWidth: 8, backgroundColor: theme?.cardBg || '#161C22', aspectRatio: 2.5/3.5, padding: 0, position: 'absolute', backfaceVisibility: 'hidden', transform: [{ rotateY: backInterpolate }] }
        ]} pointerEvents={flipped ? 'auto' : 'none'}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme?.subtleBorder || '#222C36' }}>
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', flex: 1, textTransform: 'uppercase' }} numberOfLines={1}>
              {collectionType === 'Recipes' ? 'Zutaten & Portionen' : collectionType === 'Supplements' ? 'Inventar & Dosis' : 'Gewichts-Verlauf'}
            </Text>
          </View>

          <View style={{ flex: 1, padding: 16 }}>
            {collectionType === 'Exercises' && (
              <View style={{ flex: 1, justifyContent: 'center' }}>
                {chartData.length > 0 ? (
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                      {['1w', '1m', '1y'].map(range => (
                        <TouchableOpacity
                          key={range}
                          onPress={() => setExerciseTimeRange && setExerciseTimeRange(range)}
                          style={{
                            paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
                            backgroundColor: exerciseTimeRange === range ? (theme?.accentBgSoft || '#00D2FF20') : (theme?.subCardBg || '#12171D'),
                            borderWidth: 1, borderColor: exerciseTimeRange === range ? (theme?.accent || '#00D2FF') : (theme?.subtleBorder || '#222C36')
                          }}
                        >
                          <Text style={{ color: exerciseTimeRange === range ? (theme?.accent || '#00D2FF') : '#888', fontSize: 12, fontWeight: '700' }}>
                            {range.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <LineChart
                      data={{
                        labels: chartLabels.length === 1 ? [chartLabels[0], chartLabels[0]] : chartLabels,
                        datasets: [{ data: chartData.length === 1 ? [chartData[0], chartData[0]] : chartData }]
                      }}
                      width={screenWidth - 100}
                      height={200}
                      chartConfig={{
                        backgroundColor: 'transparent',
                        backgroundGradientFrom: theme?.cardBg || '#161C22',
                        backgroundGradientFromOpacity: 0,
                        backgroundGradientTo: theme?.cardBg || '#161C22',
                        backgroundGradientToOpacity: 0,
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                        propsForDots: { r: '4', strokeWidth: '2', stroke: borderColor }
                      }}
                      bezier
                      style={{ borderRadius: 8 }}
                      withHorizontalLines={false}
                      withVerticalLines={false}
                    />
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name="chart-line-variant" size={40} color="#555" />
                    <Text style={{ color: '#888', marginTop: 12, textAlign: 'center' }}>Noch keine Trainingshistorie für diese Übung.</Text>
                  </View>
                )}
              </View>
            )}

            {collectionType === 'Recipes' && recipe && (
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8 }}>
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Portionen</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', borderRadius: 20 }}>
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); setPortions(Math.max(1, portions - 1)); }} style={{ padding: 8, paddingHorizontal: 12 }}>
                      <MaterialCommunityIcons name="minus" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '800', marginHorizontal: 8, minWidth: 20, textAlign: 'center' }}>{portions}</Text>
                    <TouchableOpacity onPress={(e) => { e.stopPropagation(); setPortions(portions + 1); }} style={{ padding: 8, paddingHorizontal: 12 }}>
                      <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  {recipe.ingredients && recipe.ingredients.length > 0 ? (
                    recipe.ingredients.map((ing: any, i: number) => {
                      const amount = (ing.amount / (recipe.totalServings || 1)) * portions;
                      return (
                        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#252528' }}>
                          <Text style={{ color: '#FFF', fontSize: 14, flex: 1, paddingRight: 8 }} numberOfLines={2}>{ing.ingredient?.name || 'Unknown'}</Text>
                          <Text style={{ color: borderColor, fontSize: 14, fontWeight: '700' }}>
                            {Math.round(amount)} {ing.ingredient?.baseAmount === 100 ? 'g/ml' : 'Stk.'}
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>Keine Zutaten hinterlegt.</Text>
                  )}
                </ScrollView>
              </View>
            )}

            {collectionType === 'Supplements' && (item as any).supplementData && (
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8 }}>
                  <Text style={{ color: '#FFF', fontWeight: '800' }}>Restbestand</Text>
                  <Text style={{ color: theme?.accent || '#00D2FF', fontWeight: '800' }}>{(item as any).supplementData.currentInventory} {(item as any).supplementData.unit}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8 }}>
                  <Text style={{ color: '#FFF', fontWeight: '800' }}>Einheitsgröße</Text>
                  <Text style={{ color: borderColor, fontWeight: '800' }}>{(item as any).supplementData.contentPerUnit}mg</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8 }}>
                  <Text style={{ color: '#FFF', fontWeight: '800' }}>Packungsgröße</Text>
                  <Text style={{ color: '#00E676', fontWeight: '800' }}>{(item as any).supplementData.unitsPerBox}</Text>
                </View>
                <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 10 }}>
                  <MaterialCommunityIcons name="pill" size={40} color={borderColor} style={{ opacity: 0.3 }} />
                </View>
              </View>
            )}

          </View>
        </Animated.View>

      </TouchableOpacity>
    </View>
  );
};


export default function StatsScreen({ navigation }: any) {
  const bottomSpacing = useBottomSpacing();
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;

  // Main 3-way sub-tab state
  const [activeSubTab, setActiveSubTab] = useState<MainSubTab>('hall');
  const [themePickerVisible, setThemePickerVisible] = useState(false);

  // Music & Analytics state
  const { playlists } = useMusicStore();
  const [musicTimeRange, setMusicTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [workoutTimeRange, setWorkoutTimeRange] = useState<'1w' | '1m' | '1y'>('1w');
  const [nutritionTimeRange, setNutritionTimeRange] = useState<'1w' | '1m' | '1y'>('1w');
  const [exerciseTimeRange, setExerciseTimeRange] = useState<'1w' | '1m' | '1y'>('1w');

  // New Total Weight Moved (Tonnage) Graph state
  const [tonnageTimeRange, setTonnageTimeRange] = useState<TonnageRange>('1w');
  const [tonnageChartMode, setTonnageChartMode] = useState<TonnageMode>('per_unit');

  // Modals state
  const [selectedTopWorkout, setSelectedTopWorkout] = useState<CompletedWorkout | null>(null);
  const [workoutDetailModalVisible, setWorkoutDetailModalVisible] = useState(false);
  const [trophyRoadModalVisible, setTrophyRoadModalVisible] = useState(false);
  const [monthlyReviewModalVisible, setMonthlyReviewModalVisible] = useState(false);
  const [flawlessMonthsModalVisible, setFlawlessMonthsModalVisible] = useState(false);
  const [selectedReviewMonth, setSelectedReviewMonth] = useState<string | undefined>(undefined);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [titleModalVisible, setTitleModalVisible] = useState(false);
  const [badgePickerVisible, setBadgePickerVisible] = useState(false);
  const [selectingBadgeSlot, setSelectingBadgeSlot] = useState<number | null>(null);

  // Achievements filter & expansion
  const [achievementFilter, setAchievementFilter] = useState<'all' | 'fitness' | 'tactics'>('all');
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);

  // Sammelalbum (Collectibles) state
  const [collectionType, setCollectionType] = useState<'Exercises' | 'Recipes' | 'Supplements'>('Exercises');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('All');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('All');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [sortMode, setSortMode] = useState<SortMode>('pr');
  const [managerVisible, setManagerVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // 3D Card Pager state
  const [pagerModalVisible, setPagerModalVisible] = useState(false);
  const [initialPage, setInitialPage] = useState(0);
  const [customPagerItems, setCustomPagerItems] = useState<any[] | null>(null);

  // Cardio & Achievement progression detail state
  const [selectedCardioType, setSelectedCardioType] = useState<string | null>(null);
  const [splitsExpanded, setSplitsExpanded] = useState(false);
  const [caloriesExpanded, setCaloriesExpanded] = useState(false);
  type DetailNode = { type: 'cardio' | 'achievement'; name: string; iconName?: string; xp: number; thresholds?: number[]; desc?: string } | null;
  const [detailNode, setDetailNode] = useState<DetailNode>(null);

  const autoChessTrophies = useAutoChessStore(state => state.trophies);
  const trophyMilestonesClaimed = useAutoChessStore(state => state.trophyMilestonesClaimed || []);

  const { 
    workoutHistory, 
    customExercises, 
    hiddenExercises, 
    hidePreloadedExercise, 
    deleteCustomExercise,
    equipmentTypes,
    equipmentBrands,
    savedMeals,
    collectibleImages,
    setCollectibleImage,
    supplementLibrary,
    workoutPrograms,
    nutritionHistory,
    consumedToday,
    targets,
    totalXP,
    unlockedAchievements,
    pinnedAchievements,
    setPinnedAchievements,
    equippedTitle,
    setEquippedTitle,
    mealLogCounts,
    toggleFavoriteWorkout,
    flawlessMonths,
    checkAndUpdateFlawlessMonths,
    accentThemeId,
  } = useAppStore();

  const theme = getAppTheme(accentThemeId);

  useEffect(() => {
    checkAndUpdateFlawlessMonths();
  }, []);

  const adminStreakOverride = useAppStore(state => state.adminStreakOverride);
  const _streaks = calculateStreaks(workoutHistory, workoutPrograms, nutritionHistory, consumedToday, targets);
  const streaks = adminStreakOverride !== null ? { ..._streaks, overall: adminStreakOverride } : _streaks;

  const cardioXP = useCardioStore(state => state.cardioXP) || {};
  const cardioHistory = useCardioStore(state => state.history) || [];

  const topCardio = useMemo(() => {
    return Object.entries(cardioXP)
      .map(([type, xp]) => ({ type, xp, ...getCardioLevelData(xp as number) }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 3);
  }, [cardioXP]);

  const cardioAggregates = useMemo(() => {
    if (!selectedCardioType) return null;
    const sessions = cardioHistory.filter(s => s.type === selectedCardioType);
    if (sessions.length === 0) return null;

    const isDistanceBased = ['Running', 'Cycling', 'Swimming', 'Walking'].includes(selectedCardioType);

    const totalCalories = sessions.reduce((acc, s) => acc + s.caloriesBurned, 0);
    const maxCalories = Math.max(...sessions.map(s => s.caloriesBurned));

    if (isDistanceBased) {
      const totalDistance = sessions.reduce((acc, s) => acc + s.distanceMeters, 0);
      const longestDistance = Math.max(...sessions.map(s => s.distanceMeters));
      
      const getFastestSplit = (meters: number) => {
        const eligible = sessions.filter(s => s.distanceMeters >= meters);
        if (eligible.length === 0) return null;
        const bestPace = Math.min(...eligible.map(s => s.durationSeconds / s.distanceMeters));
        return bestPace * meters;
      };

      return {
        type: 'distance',
        totalDistance,
        longestDistance,
        fastest10k: getFastestSplit(10000),
        fastest5k: getFastestSplit(5000),
        fastest1k: getFastestSplit(1000),
        totalCalories,
        maxCalories,
      };
    } else {
      const totalTime = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
      const longestSession = Math.max(...sessions.map(s => s.durationSeconds));
      const highestAvgHR = Math.max(...sessions.map(s => s.averageHeartRate));

      return {
        type: 'time',
        totalTime,
        longestSession,
        highestAvgHR,
        totalCalories,
        maxCalories,
      };
    }
  }, [selectedCardioType, cardioHistory]);

  // --- Music Top Songs ---
  const topSongs = useMemo(() => {
    let allSongs: any[] = [];
    playlists.forEach(p => {
      p.songs.forEach(s => {
        allSongs.push({ ...s, playlistName: p.name });
      });
    });

    const now = Date.now();
    const rangeMs = {
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000
    }[musicTimeRange];

    return allSongs.map(s => {
      const playsInRange = (s.playHistory || []).filter((timestamp: number) => (now - timestamp) <= rangeMs).length;
      return { ...s, playsInRange };
    }).filter(s => s.playsInRange > 0)
      .sort((a, b) => b.playsInRange - a.playsInRange)
      .slice(0, 10);
  }, [playlists, musicTimeRange]);

  // --- Compute RPG / Level & Achievements Data ---
  const levelData = getLevelData(totalXP || 0);
  const achievements = calculateAchievements(workoutHistory, nutritionHistory, unlockedAchievements || []);
  
  const trophyBadges: AchievementBadge[] = useMemo(() => {
    return TROPHY_MILESTONES.map(m => {
      const isUnlocked = (autoChessTrophies >= m.trophiesRequired) || (trophyMilestonesClaimed || []).includes(m.id);
      let tierColor = '#333333';
      let tier: AchievementBadge['tier'] = 'Locked';

      if (isUnlocked) {
        if (m.trophiesRequired >= 2500) {
          tier = 'Challenger';
          tierColor = m.id === 'legendary_iron_god' ? '#00F2FE' : m.id === 'diamond_boss_slayer' ? '#EC4899' : '#A855F7';
        } else if (m.trophiesRequired >= 1750) {
          tier = 'Emerald';
          tierColor = '#50C878';
        } else if (m.trophiesRequired >= 1000) {
          tier = 'Gold';
          tierColor = '#FFD700';
        } else if (m.trophiesRequired >= 250) {
          tier = 'Silver';
          tierColor = '#C0C0C0';
        } else {
          tier = 'Bronze';
          tierColor = '#CD7F32';
        }
      }

      return {
        id: m.id,
        title: m.title.replace(' Frame', '').replace(' (+1 Start-Plate)', ''),
        description: `Iron Tactics: ${m.description}`,
        tier,
        tierColor,
        icon: m.icon,
        progress: Math.min(autoChessTrophies, m.trophiesRequired),
        max: m.trophiesRequired,
      };
    });
  }, [autoChessTrophies, trophyMilestonesClaimed]);

  const allBadges = useMemo(() => {
    return [...achievements, ...trophyBadges];
  }, [achievements, trophyBadges]);

  const displayedBadges = useMemo(() => {
    if (achievementFilter === 'fitness') return achievements;
    if (achievementFilter === 'tactics') return trophyBadges;
    return allBadges;
  }, [achievementFilter, achievements, trophyBadges, allBadges]);

  // --- Career Deep Stats ---
  const { totalWorkouts, totalReps, totalSets, totalVolume, topMuscle } = useMemo(() => {
    let workoutsCount = workoutHistory.length;
    let repsCount = 0;
    let setsCount = 0;
    let volCount = 0;
    const muscleGroupsCount: Record<string, number> = {};

    workoutHistory.forEach(w => {
      (w.exercises || []).forEach(ex => {
        setsCount += (ex.sets || []).length;
        const baseEx = [...PRELOADED_EXERCISES, ...customExercises].find(e => e.name === ex.name);
        if (baseEx && baseEx.category) {
          muscleGroupsCount[baseEx.category] = (muscleGroupsCount[baseEx.category] || 0) + 1;
        }
        (ex.sets || []).forEach(set => {
          const r = (set.reps || 0) + (set.repsRight || 0);
          repsCount += r;
          volCount += r * (set.weight || 0);
        });
      });
    });

    let bestMuscle = '—';
    let mCount = 0;
    Object.entries(muscleGroupsCount).forEach(([m, c]) => {
      if (c > mCount) {
        mCount = c;
        bestMuscle = MUSCLE_LABELS_DE[m] || m;
      }
    });

    return {
      totalWorkouts: workoutsCount,
      totalReps: repsCount,
      totalSets: setsCount,
      totalVolume: volCount,
      topMuscle: bestMuscle,
    };
  }, [workoutHistory, customExercises]);

  // --- Aggregate Stats per Exercise ---
  const exerciseStats = useMemo(() => {
    const stats: Record<string, { totalSets: number; totalReps: number; totalVolume: number; pr: number; history: {date: string, maxWeight: number}[] }> = {};
    const sortedHistory = [...workoutHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedHistory.forEach(workout => {
      (workout.exercises || []).forEach(ex => {
        if (!stats[ex.name]) {
          stats[ex.name] = { totalSets: 0, totalReps: 0, totalVolume: 0, pr: 0, history: [] };
        }
        
        let dailyMax = 0;
        stats[ex.name].totalSets += (ex.sets || []).length;
        
        (ex.sets || []).forEach(set => {
          const reps = (set.reps || 0) + (set.repsRight || 0);
          const weight = set.weight || 0;
          stats[ex.name].totalReps += reps;
          stats[ex.name].totalVolume += reps * weight;
          if (weight > stats[ex.name].pr) stats[ex.name].pr = weight;
          
          if (reps > 0 && weight > dailyMax) {
            dailyMax = weight;
          }
        });

        const hadReps = (ex.sets || []).some(s => (s.reps || 0) > 0);
        if (hadReps) {
          stats[ex.name].history.push({ date: workout.date, maxWeight: dailyMax });
        }
      });
    });
    return stats;
  }, [workoutHistory]);

  // --- Top Workouts & Highlights ---
  const topWorkouts = useMemo(() => {
    if (!workoutHistory || workoutHistory.length === 0) return [];

    const getWorkoutMetrics = (w: CompletedWorkout) => {
      let totalWeightMoved = 0;
      let totalSetsCount = 0;
      let totalRepsCount = 0;

      (w.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(s => {
          totalSetsCount += 1;
          const r = (s.reps || 0) + (s.repsRight || 0);
          totalRepsCount += r;
          totalWeightMoved += (s.weight || 0) * r;
        });
      });

      const fairVolumeScore = (totalSetsCount * 12) + totalRepsCount;

      return {
        totalWeightMoved,
        totalSets: totalSetsCount,
        totalReps: totalRepsCount,
        fairVolumeScore,
      };
    };

    let longestWorkout: { workout: CompletedWorkout; duration: number } | null = null;
    let mostVolumeWorkout: { workout: CompletedWorkout; score: number } | null = null;
    let heaviestWorkout: { workout: CompletedWorkout; tonnage: number } | null = null;

    workoutHistory.forEach(w => {
      const metrics = getWorkoutMetrics(w);

      if (w.durationSeconds > 0 && (!longestWorkout || w.durationSeconds > longestWorkout.duration)) {
        longestWorkout = { workout: w, duration: w.durationSeconds };
      }

      if (metrics.fairVolumeScore > 0 && (!mostVolumeWorkout || metrics.fairVolumeScore > mostVolumeWorkout.score)) {
        mostVolumeWorkout = { workout: w, score: metrics.fairVolumeScore };
      }

      if (metrics.totalWeightMoved > 0 && (!heaviestWorkout || metrics.totalWeightMoved > heaviestWorkout.tonnage)) {
        heaviestWorkout = { workout: w, tonnage: metrics.totalWeightMoved };
      }
    });

    const map = new Map<string, { workout: CompletedWorkout; badges: { label: string; color: string; icon: string }[]; metrics: ReturnType<typeof getWorkoutMetrics> }>();

    const addBadge = (w: CompletedWorkout, badge: { label: string; color: string; icon: string }) => {
      if (!map.has(w.id)) {
        map.set(w.id, {
          workout: w,
          badges: [],
          metrics: getWorkoutMetrics(w),
        });
      }
      const item = map.get(w.id)!;
      if (!item.badges.some(b => b.label === badge.label)) {
        item.badges.push(badge);
      }
    };

    if (longestWorkout) {
      addBadge((longestWorkout as any).workout, { label: 'Dauer-Rekord', color: theme.accent, icon: 'clock-outline' });
    }
    if (mostVolumeWorkout) {
      addBadge((mostVolumeWorkout as any).workout, { label: 'Volumen-Rekord', color: '#FF9500', icon: 'lightning-bolt' });
    }
    if (heaviestWorkout) {
      addBadge((heaviestWorkout as any).workout, { label: 'Tonnage-Rekord', color: '#FF3B30', icon: 'trophy' });
    }

    workoutHistory.filter(w => w.isFavorite).forEach(w => {
      addBadge(w, { label: 'Highlight', color: '#FFD700', icon: 'star' });
    });

    return Array.from(map.values());
  }, [workoutHistory]);

  const currentSelectedWorkout = selectedTopWorkout 
    ? workoutHistory.find(w => w.id === selectedTopWorkout.id) || selectedTopWorkout
    : null;

  // --- Top 6 Exercises ---
  const topExercises = useMemo(() => {
    const scored = Object.keys(exerciseStats).map(exName => {
      const stats = exerciseStats[exName];
      const score = (stats.totalSets * 10) + (stats.history.length * 50);
      const baseEx = [...PRELOADED_EXERCISES, ...customExercises].find(e => e.name === exName);
      return { name: exName, stats, score, baseEx };
    }).filter(e => e.score > 0 && e.baseEx);
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 6);
  }, [exerciseStats, customExercises]);

  // --- Determine "In Plan" Exercises ---
  const activeProgram = workoutPrograms.find(p => p.isActive);
  const inPlanExercises = useMemo(() => {
    const set = new Set<string>();
    if (activeProgram && activeProgram.workouts) {
      activeProgram.workouts.forEach(plan => {
        plan.exercises.forEach(ex => set.add(ex.name));
      });
    }
    return set;
  }, [activeProgram]);

  // --- Collectibles Logic ---
  const baseExercises = useMemo(() => [
    ...PRELOADED_EXERCISES.map(e => ({ name: e.name, category: e.category, equipmentType: (e as any).equipmentType, brand: (e as any).brand, type: 'preloaded' })), 
    ...customExercises.map(e => ({ name: e.name, category: e.category, equipmentType: e.equipmentType, brand: e.brand, type: 'custom' }))
  ].filter(e => !hiddenExercises.includes(e.name)), [customExercises, hiddenExercises]);

  const collectionItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (collectionType === 'Exercises') {
      const filtered = baseExercises.filter(e => {
        if (filterMode === 'In Plan' && !inPlanExercises.has(e.name)) return false;
        if (selectedMuscle !== 'All' && e.category !== selectedMuscle) return false;
        if (selectedEquipment !== 'All' && e.equipmentType !== selectedEquipment) return false;
        if (selectedBrand !== 'All' && e.brand !== selectedBrand) return false;
        if (q) {
          const matchName = e.name.toLowerCase().includes(q);
          const matchCat = (e.category || '').toLowerCase().includes(q) || (MUSCLE_LABELS_DE[e.category] || '').toLowerCase().includes(q);
          const matchBrand = (e.brand || '').toLowerCase().includes(q);
          if (!matchName && !matchCat && !matchBrand) return false;
        }
        return true;
      });

      const sorted = [...filtered].sort((a, b) => {
        const statsA = exerciseStats[a.name] || { totalSets: 0, totalReps: 0, totalVolume: 0, pr: 0 };
        const statsB = exerciseStats[b.name] || { totalSets: 0, totalReps: 0, totalVolume: 0, pr: 0 };
        if (sortMode === 'sets') return statsB.totalSets - statsA.totalSets;
        if (sortMode === 'reps') return statsB.totalReps - statsA.totalReps;
        if (sortMode === 'volume') return statsB.totalVolume - statsA.totalVolume;
        return statsB.pr - statsA.pr;
      });

      return sorted.map(e => ({ id: `exercise_${e.name}`, name: e.name, type: e.type, category: e.category, equipmentType: e.equipmentType, brand: e.brand }));
    }

    if (collectionType === 'Recipes') {
      return savedMeals
        .filter(m => !q || m.name.toLowerCase().includes(q))
        .map(m => ({ id: `recipe_${m.name}`, name: m.name, type: 'recipe', category: 'Nutrition', recipeData: m }));
    }

    return (supplementLibrary || [])
      .filter(s => !q || s.name.toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q))
      .map(s => ({ id: `supp_${s.id}`, name: s.name, type: 'supplement', category: s.category, supplementData: s }));
  }, [collectionType, baseExercises, filterMode, inPlanExercises, selectedMuscle, selectedEquipment, selectedBrand, searchQuery, exerciseStats, sortMode, savedMeals, supplementLibrary]);

  const pickImage = async (id: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const sourceUri = result.assets[0].uri;
      try {
        const FileSystem = require('expo-file-system/legacy');
        const filename = sourceUri.split('/').pop() || `collectible_${Date.now()}.jpg`;
        const newUri = FileSystem.documentDirectory + filename;
        await FileSystem.copyAsync({ from: sourceUri, to: newUri });
        setCollectibleImage(id, newUri);
      } catch (e) {
        setCollectibleImage(id, sourceUri);
      }
    }
  };

  const handleDeleteItem = (item: { id: string, name: string, type: string }) => {
    if (item.type !== 'preloaded' && item.type !== 'custom') return;
    showCustomAlert(
      "Übung ausblenden / löschen",
      `Möchtest du "${item.name}" wirklich aus deiner Sammlung entfernen?`,
      [
        { text: "Abbrechen", style: "cancel" },
        { 
          text: "Entfernen", 
          style: "destructive",
          onPress: () => {
            if (item.type === 'preloaded') hidePreloadedExercise(item.name);
            else if (item.type === 'custom') deleteCustomExercise(item.name);
          }
        }
      ]
    );
  };

  const openPager = (index: number) => {
    if (collectionItems.length === 0) return;
    setCustomPagerItems(null);
    setInitialPage(index);
    setPagerModalVisible(true);
  };

  const openTopExerciseCard = (index: number) => {
    const items = topExercises.map(ex => ({
      id: `exercise_${ex.name}`,
      name: ex.name,
      type: (ex.baseEx as any)?.type || 'preloaded',
      category: ex.baseEx?.category || 'Strength',
    }));
    setCustomPagerItems(items);
    setInitialPage(index);
    setPagerModalVisible(true);
  };

  const closePagerModal = () => {
    setPagerModalVisible(false);
    setCustomPagerItems(null);
  };

  // --- NEW HERO GRAPH: Total Weight Moved (Tonnage) across all workouts & exercises ---
  const tonnageAnalytics = useMemo(() => {
    const now = new Date();
    const nowMs = now.getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    const getWorkoutTonnageAndSets = (w: CompletedWorkout) => {
      let kg = 0;
      let sets = 0;
      (w.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(s => {
          const reps = (s.reps || 0) + (s.repsRight || 0);
          kg += (s.weight || 0) * reps;
          sets += 1;
        });
      });
      return { kg, sets };
    };

    const sorted = [...workoutHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let filteredWorkouts = sorted;
    let periodLabel = 'KOMPLETT (ALL-TIME KARRIERE-TONNAGE)';
    let hintText = tonnageChartMode === 'cumulative' ? 'Kumulierter Karriere-Anstieg' : 'Bewegtes Gesamtgewicht pro Zeitraum';

    if (tonnageTimeRange === '1w') {
      filteredWorkouts = sorted.filter(w => (nowMs - new Date(w.date).getTime()) <= 7 * dayMs);
      periodLabel = 'DIESE WOCHE (LETZTE 7 TAGE — ALLE ÜBUNGEN)';
      hintText = tonnageChartMode === 'cumulative' ? 'Kumulierter Wochen-Anstieg' : 'Bewegtes Gewicht pro Tag (letzte 7 Tage)';
    } else if (tonnageTimeRange === '1m') {
      filteredWorkouts = sorted.filter(w => (nowMs - new Date(w.date).getTime()) <= 30 * dayMs);
      periodLabel = 'DIESER MONAT (LETZTE 30 TAGE — ALLE WORKOUTS)';
      hintText = tonnageChartMode === 'cumulative' ? 'Kumulierter 30-Tage-Anstieg' : 'Bewegtes Gewicht pro Woche (letzte 4 Wochen)';
    } else if (tonnageTimeRange === '1y') {
      filteredWorkouts = sorted.filter(w => (nowMs - new Date(w.date).getTime()) <= 365 * dayMs);
      periodLabel = 'DIESES JAHR (LETZTE 12 MONATE — ALLE WORKOUTS)';
      hintText = tonnageChartMode === 'cumulative' ? 'Kumulierter Jahres-Anstieg' : 'Bewegtes Gewicht pro Monat';
    }

    let periodTotalKg = 0;
    let periodSets = 0;
    filteredWorkouts.forEach(w => {
      const m = getWorkoutTonnageAndSets(w);
      periodTotalKg += m.kg;
      periodSets += m.sets;
    });

    const periodWorkouts = filteredWorkouts.length;
    const avgPerWorkoutKg = periodWorkouts > 0 ? periodTotalKg / periodWorkouts : 0;

    // Build chart buckets
    let rawLabels: string[] = [];
    let rawValuesKg: number[] = [];

    if (tonnageTimeRange === '1w') {
      const weekdayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(nowMs - i * dayMs);
        const dKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        rawLabels.push(weekdayNames[d.getDay()]);
        const dayTotal = filteredWorkouts
          .filter(w => w.date.startsWith(dKey))
          .reduce((acc, w) => acc + getWorkoutTonnageAndSets(w).kg, 0);
        rawValuesKg.push(dayTotal);
      }
    } else if (tonnageTimeRange === '1m') {
      // 4 weekly buckets over the last 28-30 days
      for (let wIdx = 3; wIdx >= 0; wIdx--) {
        const startMs = nowMs - (wIdx + 1) * 7 * dayMs;
        const endMs = nowMs - wIdx * 7 * dayMs;
        const label = wIdx === 0 ? 'Diese Wo.' : `-${wIdx} Wo.`;
        rawLabels.push(label);
        const weekTotal = filteredWorkouts
          .filter(w => {
            const t = new Date(w.date).getTime();
            return t > startMs && t <= endMs;
          })
          .reduce((acc, w) => acc + getWorkoutTonnageAndSets(w).kg, 0);
        rawValuesKg.push(weekTotal);
      }
    } else if (tonnageTimeRange === '1y') {
      const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
      for (let mIdx = 5; mIdx >= 0; mIdx--) {
        const d = new Date(now.getFullYear(), now.getMonth() - mIdx, 1);
        const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        rawLabels.push(monthNames[d.getMonth()]);
        const monthTotal = filteredWorkouts
          .filter(w => w.date.startsWith(mKey))
          .reduce((acc, w) => acc + getWorkoutTonnageAndSets(w).kg, 0);
        rawValuesKg.push(monthTotal);
      }
    } else {
      // 'all' — group by month across history (up to last 6 active months, or per workout if few)
      const monthMap = new Map<string, number>();
      const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
      filteredWorkouts.forEach(w => {
        const mKey = w.date.substring(0, 7); // YYYY-MM
        monthMap.set(mKey, (monthMap.get(mKey) || 0) + getWorkoutTonnageAndSets(w).kg);
      });
      const entries = Array.from(monthMap.entries()).slice(-6);
      if (entries.length === 0) {
        rawLabels = ['Start', 'Heute'];
        rawValuesKg = [0, 0];
      } else {
        entries.forEach(([mKey, val]) => {
          const [yr, mo] = mKey.split('-');
          const mName = monthNames[(parseInt(mo, 10) || 1) - 1] || mo;
          rawLabels.push(`${mName} '${yr.slice(2)}`);
          rawValuesKg.push(val);
        });
      }
    }

    // Apply cumulative mode if selected
    let finalValues = [...rawValuesKg];
    if (tonnageChartMode === 'cumulative') {
      let running = 0;
      finalValues = rawValuesKg.map(v => {
        running += v;
        return running;
      });
    }

    // Use tonnes (t) on the Y-axis if max value >= 10,000 kg for cleaner axis labels, otherwise kg
    const maxValKg = Math.max(...finalValues, 0);
    const useTonnesAxis = maxValKg >= 10000;
    const displayDataset = finalValues.map(v => useTonnesAxis ? Number((v / 1000).toFixed(1)) : Math.round(v));

    if (displayDataset.length === 1) {
      rawLabels = [rawLabels[0], rawLabels[0]];
      displayDataset.push(displayDataset[0]);
    }

    return {
      periodLabel,
      hintText: `${hintText} (${useTonnesAxis ? 'in Tonnen' : 'in kg'})`,
      periodTotalKg,
      periodWorkouts,
      periodSets,
      avgPerWorkoutKg,
      useTonnesAxis,
      chartData: {
        labels: rawLabels,
        datasets: [{ data: displayDataset.length > 0 ? displayDataset : [0, 0] }],
      },
    };
  }, [workoutHistory, tonnageTimeRange, tonnageChartMode]);

  // --- Session Workout Volume & Nutrition Calorie Trends ---
  const workoutChartData = useMemo(() => {
    const days = workoutTimeRange === '1w' ? 7 : workoutTimeRange === '1m' ? 30 : 365;
    const now = new Date().getTime();
    const filtered = [...workoutHistory]
      .filter(w => now - new Date(w.date).getTime() <= days * 24 * 60 * 60 * 1000)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
    if (filtered.length === 0) return null;
    
    const dataPoints = filtered.map(w => {
      let vol = 0;
      w.exercises.forEach(e => e.sets.forEach(s => vol += (s.weight || 0) * ((s.reps || 0) + (s.repsRight || 0))));
      return vol;
    });

    const labels = filtered.map((w, i) => {
      if (filtered.length > 7 && i % Math.ceil(filtered.length / 7) !== 0 && i !== filtered.length - 1) return '';
      const dateStr = w.date.substring(5, 10);
      const [month, day] = dateStr.split('-');
      return `${day}.${month}`;
    });

    return {
      labels: labels.length === 1 ? [labels[0], labels[0]] : labels,
      datasets: [{
        data: dataPoints.length === 1 ? [dataPoints[0], dataPoints[0]] : dataPoints
      }]
    };
  }, [workoutHistory, workoutTimeRange]);

  const nutritionChartData = useMemo(() => {
    const days = nutritionTimeRange === '1w' ? 7 : nutritionTimeRange === '1m' ? 30 : 365;
    const now = new Date().getTime();
    const filtered = [...nutritionHistory]
      .filter(n => now - new Date(n.date).getTime() <= days * 24 * 60 * 60 * 1000)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
    if (filtered.length === 0) return null;
    
    const labels = filtered.map((n, i) => {
      if (filtered.length > 7 && i % Math.ceil(filtered.length / 7) !== 0 && i !== filtered.length - 1) return '';
      const dateStr = n.date.substring(5, 10);
      const [month, day] = dateStr.split('-');
      return `${day}.${month}`;
    });
    const dataPoints = filtered.map(n => n.calories);

    return {
      labels: labels.length === 1 ? [labels[0], labels[0]] : labels,
      datasets: [{
        data: dataPoints.length === 1 ? [dataPoints[0], dataPoints[0]] : dataPoints
      }]
    };
  }, [nutritionHistory, nutritionTimeRange]);

  return (
    <View style={[styles.screenRoot, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 44) + 12 }]}>
      {/* STICKY HEADER + 3-WAY SUB-NAVIGATION */}
      <View style={styles.topHeader}>
        <View style={styles.headerTopRow}>
          <Text style={styles.title}>Profil & Stats</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity 
              onPress={() => setThemePickerVisible(true)} 
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              style={[styles.adminIconBtn, { backgroundColor: theme.cardBg, borderColor: theme.accentBorderSoft }]}
            >
              <MaterialCommunityIcons name="palette-outline" size={20} color={theme.accent} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setAdminModalVisible(true)} 
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              style={[styles.adminIconBtn, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}
            >
              <MaterialCommunityIcons name="shield-account" size={21} color={theme.accent} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.subNavBar, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
          <TouchableOpacity
            style={[styles.subNavBtn, activeSubTab === 'hall' && [styles.subNavBtnActive, { backgroundColor: theme.cardBg, borderColor: theme.accentBorderSoft }]]}
            onPress={() => setActiveSubTab('hall')}
            activeOpacity={0.8}
          >
            <Text style={styles.subNavEmoji}>🏆</Text>
            <Text style={[styles.subNavText, activeSubTab === 'hall' && [styles.subNavTextActive, { color: theme.accent }]]}>Ruhmeshalle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subNavBtn, activeSubTab === 'vault' && [styles.subNavBtnActive, { backgroundColor: theme.cardBg, borderColor: theme.accentBorderSoft }]]}
            onPress={() => setActiveSubTab('vault')}
            activeOpacity={0.8}
          >
            <Text style={styles.subNavEmoji}>🃏</Text>
            <Text style={[styles.subNavText, activeSubTab === 'vault' && [styles.subNavTextActive, { color: theme.accent }]]}>Sammelalbum</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subNavBtn, activeSubTab === 'analytics' && [styles.subNavBtnActive, { backgroundColor: theme.cardBg, borderColor: theme.accentBorderSoft }]]}
            onPress={() => setActiveSubTab('analytics')}
            activeOpacity={0.8}
          >
            <Text style={styles.subNavEmoji}>📊</Text>
            <Text style={[styles.subNavText, activeSubTab === 'analytics' && [styles.subNavTextActive, { color: theme.accent }]]}>Analyse</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: bottomSpacing + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ===============================================================
             TAB 1: RUHMESHALLE (PLAYER PROFILE, STREAKS, PRs, ACHIEVEMENTS)
             =============================================================== */}
        {activeSubTab === 'hall' && (
          <>
            {/* 1. ALL-IN-ONE HERO PROFILE CARD */}
            <TouchableOpacity 
              style={[styles.profileCard, { backgroundColor: theme.cardBg, borderColor: levelData.rankColor }]} 
              activeOpacity={0.92}
              onPress={() => setProfileModalVisible(true)}
            >
              <View style={styles.profileHeader}>
                <View style={[styles.rankBadge, { borderColor: levelData.rankColor, backgroundColor: levelData.rankColor + '18' }]}>
                  <MaterialCommunityIcons name="shield-star" size={28} color={levelData.rankColor} />
                  <Text style={[styles.rankBadgeLvlText, { color: levelData.rankColor }]}>LVL {levelData.level}</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.rankTierTag, { color: levelData.rankColor }]}>
                    {(levelData.rank || 'BRONZE').toUpperCase()} TIER • KARRIERE
                  </Text>
                  <Text style={styles.rankTitle} numberOfLines={1}>{levelData.title}</Text>
                  <TouchableOpacity
                    style={[styles.equippedTitlePill, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorderSoft }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      setTitleModalVisible(true);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.equippedTitlePillText, { color: theme.accent }]} numberOfLines={1}>
                      {equippedTitle ? `« ${equippedTitle} »` : '« Titel ausrüsten »'}
                    </Text>
                    <MaterialCommunityIcons name="pencil" size={11} color={theme.accent} />
                  </TouchableOpacity>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.xpText}>{Math.round(levelData.totalXP).toLocaleString('de-DE')} XP</Text>
                  <Text style={styles.xpSubtext}>Gesamt-EXP</Text>
                </View>
              </View>

              {/* XP Progress Bar */}
              <View style={styles.xpBarContainer}>
                <View style={[styles.xpBarFill, { width: `${Math.min(100, (levelData.progressXP / levelData.neededXP) * 100)}%`, backgroundColor: levelData.rankColor }]} />
              </View>
              <View style={styles.xpMetaRow}>
                <Text style={styles.xpMetaLeft}>Rang: {levelData.rank || 'Bronze'}</Text>
                <Text style={[styles.xpToNext, { color: levelData.rankColor }]}>
                  Noch {Math.round(levelData.neededXP - levelData.progressXP)} XP bis Level {levelData.level + 1}
                </Text>
              </View>

              {/* Direct Career KPI Strip (Workouts, Tonnage, Sets, Top Muscle) */}
              <View style={styles.careerKpiStrip}>
                <View style={[styles.careerKpiPill, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                  <Text style={[styles.careerKpiVal, { color: theme.accent }]}>{totalWorkouts}</Text>
                  <Text style={styles.careerKpiLbl}>Workouts</Text>
                </View>
                <View style={[styles.careerKpiPill, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                  <Text style={[styles.careerKpiVal, { color: '#FFD700' }]}>
                    {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}t` : `${totalVolume}kg`}
                  </Text>
                  <Text style={styles.careerKpiLbl}>Tonnage</Text>
                </View>
                <View style={[styles.careerKpiPill, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                  <Text style={[styles.careerKpiVal, { color: '#30D158' }]}>{totalSets}</Text>
                  <Text style={styles.careerKpiLbl}>Sätze</Text>
                </View>
                <View style={[styles.careerKpiPill, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                  <Text style={[styles.careerKpiVal, { color: '#FF9500' }]} numberOfLines={1}>{topMuscle}</Text>
                  <Text style={styles.careerKpiLbl}>Fokus</Text>
                </View>
              </View>

              {/* Master Streak & 3 Pinned Badges Showcase Row */}
              <View style={[styles.profileStreakWidget, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                <StreakGlow streak={streaks.overall}>
                  <View style={styles.profileStreakLeft}>
                    <View style={styles.streakFlameBadge}>
                      {streaks.overall >= 30 ? (
                        <Text style={{ fontSize: 20 }}>🔥</Text>
                      ) : (
                        <MaterialCommunityIcons name="crown" size={22} color="#FFD60A" />
                      )}
                    </View>
                    <View style={{ marginLeft: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                        <Text style={styles.profileStreakNum}>{streaks.overall}</Text>
                        <Text style={styles.profileStreakLabel}>Master Streak</Text>
                      </View>
                      <Text style={styles.streakSubPills}>
                        🏋️ {streaks.training} Wo. • 🥗 {streaks.nutrition} Tg.
                      </Text>
                    </View>
                  </View>
                </StreakGlow>

                <View style={styles.pinnedBadgesRow}>
                  {[0, 1, 2].map(slotIndex => {
                    const pinnedId = (pinnedAchievements || [])[slotIndex];
                    const ach = pinnedId ? allBadges.find(a => a.id === pinnedId) : null;
                    
                    return (
                      <TouchableOpacity 
                        key={slotIndex} 
                        style={[
                          styles.pinnedSlotBtn,
                          {
                            backgroundColor: ach && ach.tier !== 'Locked' ? ach.tierColor + '20' : theme.cardBg,
                            borderColor: ach && ach.tier !== 'Locked' ? ach.tierColor : theme.subtleBorder,
                          }
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectingBadgeSlot(slotIndex);
                          setBadgePickerVisible(true);
                        }}
                      >
                        {ach && ach.tier !== 'Locked' ? (
                          <EmblemIcon icon={ach.icon || 'trophy'} color={ach.tierColor} size={20} />
                        ) : (
                          <MaterialCommunityIcons name="plus" size={18} color="#777" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Makellose Monate (Clean single line!) & Monats-Review Row */}
              <View style={styles.profileReviewRow}>
                <TouchableOpacity
                  style={[styles.flawlessSealButton, { backgroundColor: theme.subCardBg, borderColor: theme.accent }]}
                  activeOpacity={0.8}
                  onPress={(e) => {
                    e.stopPropagation();
                    setFlawlessMonthsModalVisible(true);
                  }}
                >
                  <View style={[styles.flawlessSealIconCircle, { backgroundColor: theme.accentBgSoft, borderColor: theme.accent }]}>
                    <Text style={{ fontSize: 14 }}>💎</Text>
                  </View>
                  <Text style={[styles.flawlessSealCount, { color: theme.accent, marginLeft: 8, flex: 1 }]} numberOfLines={1}>
                    {(flawlessMonths || []).length} Makellose Monate
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.accent} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.monthlyReviewBtn, { backgroundColor: theme.accent }]}
                  activeOpacity={0.8}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedReviewMonth(undefined);
                    setMonthlyReviewModalVisible(true);
                  }}
                >
                  <MaterialCommunityIcons name="chart-box-outline" size={16} color="#000" style={{ marginRight: 4 }} />
                  <Text style={styles.monthlyReviewBtnText}>Review ➔</Text>
                </TouchableOpacity>
              </View>

              {/* Iron Tactics Trophäen Pfad Row */}
              <TouchableOpacity
                style={[styles.profileTrophyRow, { backgroundColor: theme.subCardBg }]}
                activeOpacity={0.8}
                onPress={(e) => {
                  e.stopPropagation();
                  setTrophyRoadModalVisible(true);
                }}
              >
                <View style={styles.profileTrophyLeft}>
                  <View style={styles.trophyIconCircle}>
                    <Text style={{ fontSize: 16 }}>🏆</Text>
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.profileTrophyNum}>{autoChessTrophies} Trophäen</Text>
                      <View style={styles.trophyLeagueBadge}>
                        <Text style={styles.trophyLeagueBadgeText}>
                          {autoChessTrophies >= 3750 ? 'LEGEND' : autoChessTrophies >= 2500 ? 'CHAMPION' : autoChessTrophies >= 1000 ? 'GOLD' : autoChessTrophies >= 250 ? 'SILBER' : 'BRONZE'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.profileTrophySub}>Iron Tactics • Trophäen-Pfad & Belohnungen ➔</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#FFD700" />
              </TouchableOpacity>
            </TouchableOpacity>

            {/* 2. TOP WORKOUTS & REKORDE */}
            {topWorkouts.length > 0 && (
              <View style={{ marginBottom: 22 }}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>🏅 Top Workouts & Rekorde</Text>
                  <Text style={styles.sectionHint}>Tippen für Details</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12, paddingRight: 8 }}
                >
                  {topWorkouts.map((item) => {
                    const { workout, badges, metrics } = item;
                    const displayName = workout.customName || workout.planName;
                    const isFav = workout.isFavorite;

                    return (
                      <TouchableOpacity
                        key={workout.id}
                        activeOpacity={0.85}
                        style={[
                          styles.topWorkoutCard,
                          { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                          isFav && styles.topWorkoutCardFav,
                        ]}
                        onPress={() => {
                          setSelectedTopWorkout(workout);
                          setWorkoutDetailModalVisible(true);
                        }}
                      >
                        <View style={styles.topWorkoutBadgesRow}>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1, marginRight: 8 }}>
                            {badges.map((b, bIdx) => (
                              <View 
                                key={bIdx} 
                                style={[styles.recordBadgePill, { backgroundColor: b.color + '22', borderColor: b.color }]}
                              >
                                <MaterialCommunityIcons name={b.icon as any} size={11} color={b.color} style={{ marginRight: 3 }} />
                                <Text style={[styles.recordBadgeText, { color: b.color }]}>{b.label}</Text>
                              </View>
                            ))}
                          </View>

                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              toggleFavoriteWorkout(workout.id);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <MaterialCommunityIcons 
                              name={isFav ? "star" : "star-outline"} 
                              size={20} 
                              color={isFav ? "#FFD700" : "#666"} 
                            />
                          </TouchableOpacity>
                        </View>

                        <Text style={styles.topWorkoutTitle} numberOfLines={1}>{displayName}</Text>

                        {workout.trainingPartner ? (
                          <View style={styles.topWorkoutPartnerRow}>
                            <MaterialCommunityIcons name="account-multiple" size={12} color="#30D158" style={{ marginRight: 4 }} />
                            <Text style={styles.topWorkoutPartnerText} numberOfLines={1}>mit {workout.trainingPartner}</Text>
                          </View>
                        ) : null}

                        <Text style={styles.topWorkoutDate}>{workout.formattedDate}</Text>

                        <View style={[styles.topWorkoutDivider, { backgroundColor: theme.subtleBorder }]} />

                        <View style={styles.topWorkoutStatsRow}>
                          <View style={styles.topWorkoutStatCol}>
                            <Text style={styles.topWorkoutStatLabel}>DAUER</Text>
                            <Text style={styles.topWorkoutStatVal}>{Math.floor(workout.durationSeconds / 60)}m</Text>
                          </View>
                          <View style={styles.topWorkoutStatCol}>
                            <Text style={styles.topWorkoutStatLabel}>VOLUMEN</Text>
                            <Text style={styles.topWorkoutStatVal}>{metrics.totalSets}S • {metrics.totalReps}W</Text>
                          </View>
                          <View style={styles.topWorkoutStatCol}>
                            <Text style={styles.topWorkoutStatLabel}>TONNAGE</Text>
                            <Text style={styles.topWorkoutStatVal}>
                              {metrics.totalWeightMoved >= 1000 
                                ? (metrics.totalWeightMoved / 1000).toFixed(1) + 't' 
                                : metrics.totalWeightMoved + 'kg'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* 3. BEST EXERCISES (TOP 6 TCG MINI-GRID) */}
            {topExercises.length > 0 && (
              <View style={{ marginBottom: 22 }}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>💪 Beste Übungen (Top 6)</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setCollectionType('Exercises');
                      setActiveSubTab('vault');
                    }}
                  >
                    <Text style={[styles.sectionActionLink, { color: theme.accent }]}>Alle {baseExercises.length} im Album ➔</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.tcgGridContainer}>
                  {topExercises.map((ex, index) => {
                    const { getResolvedUri } = require('../utils/uriResolver');
                    const imageUri = getResolvedUri(collectibleImages[`exercise_${ex.name}`]);
                    const stats = ex.stats;
                    const xp = (stats?.totalSets || 0) * 10;
                    const exLvl = getLevelData(xp);
                    const rankColor = exLvl.rankColor;
                    const catDe = MUSCLE_LABELS_DE[ex.baseEx?.category || ''] || ex.baseEx?.category || 'Kraft';

                    return (
                      <TouchableOpacity 
                        key={ex.name} 
                        activeOpacity={0.82}
                        style={[styles.tcgMiniCard, { backgroundColor: theme.cardBg, borderColor: rankColor }]}
                        onPress={() => openTopExerciseCard(index)}
                      >
                        {imageUri ? (
                          <Image source={{ uri: imageUri }} style={styles.gridImage} />
                        ) : (
                          <View style={[styles.gridPlaceholder, { backgroundColor: theme.subCardBg }]}>
                            <MaterialCommunityIcons name="dumbbell" size={30} color={rankColor} />
                          </View>
                        )}
                        <View style={styles.tcgMiniTopBadges}>
                          <View style={styles.tcgCatChip}>
                            <Text style={styles.tcgCatChipText} numberOfLines={1}>{catDe}</Text>
                          </View>
                          <View style={[styles.tcgLvlChip, { borderColor: rankColor }]}>
                            <Text style={[styles.tcgLvlChipText, { color: rankColor }]}>Lv {exLvl.level}</Text>
                          </View>
                        </View>
                        <View style={styles.gridCardOverlay}>
                          <Text style={styles.gridCardText} numberOfLines={1}>{ex.name}</Text>
                          <Text style={styles.tcgMiniMetaText}>
                            {stats.totalSets} Sets • {stats.totalVolume >= 1000 ? (stats.totalVolume / 1000).toFixed(1) + 't' : stats.totalVolume + 'kg'}
                          </Text>
                          {stats.pr > 0 && (
                            <Text style={[styles.gridCardSubText, { color: rankColor, fontSize: 11 }]}>PR: {stats.pr} kg</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* 4. TOP CARDIO DISCIPLINES */}
            <View style={{ marginBottom: 22 }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>🏃 Top Cardio-Disziplinen</Text>
                <Text style={styles.sectionHint}>Splits & Bestzeiten</Text>
              </View>

              <View style={styles.cardioPodiumContainer}>
                {topCardio.length > 0 ? (
                  topCardio.map((cardio) => {
                    const getIcon = (type: string) => {
                      const t = type.toLowerCase();
                      if (t.includes('run')) return 'run';
                      if (t.includes('cycl') || t.includes('bike')) return 'bike';
                      if (t.includes('swim')) return 'swim';
                      if (t.includes('walk')) return 'walk';
                      if (t.includes('box')) return 'boxing-glove';
                      if (t.includes('football')) return 'soccer';
                      if (t.includes('paddle') || t.includes('padel')) return 'tennis';
                      return 'heart-pulse';
                    };

                    return (
                      <TouchableOpacity 
                        key={cardio.type}
                        style={[styles.cardioBadgeCard, { backgroundColor: theme.cardBg, borderColor: cardio.rankColor }]}
                        onPress={() => {
                          setSelectedCardioType(cardio.type);
                          setDetailNode({ type: 'cardio', name: cardio.type, xp: cardio.totalXP || cardio.progressXP + cardio.neededXP });
                        }}
                      >
                        <View style={[styles.cardioBadgeIcon, { backgroundColor: cardio.rankColor + '20' }]}>
                          <MaterialCommunityIcons name={getIcon(cardio.type) as any} size={26} color={cardio.rankColor} />
                        </View>
                        <Text style={styles.cardioBadgeType} numberOfLines={1}>{cardio.type}</Text>
                        <Text style={[styles.cardioBadgeLevel, { color: cardio.rankColor }]}>Lv {cardio.level}</Text>
                        <View style={styles.cardioBadgeBarContainer}>
                          <View style={[styles.cardioBadgeBarFill, { backgroundColor: cardio.rankColor, width: `${Math.min(100, (cardio.progressXP / cardio.neededXP) * 100)}%` }]} />
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={[styles.emptyCardBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                    <MaterialCommunityIcons name="run-fast" size={28} color="#555" />
                    <Text style={styles.emptyCardText}>
                      Schließe eine Cardio-Einheit ab, um deine Top-Disziplinen und Bestzeiten hier freizuschalten.
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* 5. ERFOLGE & ABZEICHEN VITRINE */}
            <View style={{ marginBottom: 12 }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>🎖️ Erfolge & Abzeichen</Text>
                <TouchableOpacity onPress={() => { setSelectingBadgeSlot(0); setBadgePickerVisible(true); }}>
                  <Text style={[styles.sectionActionLink, { color: theme.accent }]}>An Profil pinnen ✎</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                {[
                  { id: 'all', label: `Alle (${allBadges.length})` },
                  { id: 'fitness', label: `🏋️ Fitness (${achievements.length})` },
                  { id: 'tactics', label: `🏆 Iron Tactics (${trophyBadges.length})` },
                ].map((tab) => (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.achFilterPill, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }, achievementFilter === tab.id && [styles.achFilterPillActive, { backgroundColor: theme.accentSoftBg, borderColor: theme.accent }]]}
                    onPress={() => setAchievementFilter(tab.id as any)}
                  >
                    <Text style={[styles.achFilterPillText, achievementFilter === tab.id && [styles.achFilterPillTextActive, { color: theme.accent }]]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.achievementsGrid}>
                {(achievementsExpanded ? displayedBadges : displayedBadges.slice(0, 5)).map((ach) => {
                  const isCompleted = ach.tier !== 'Locked';
                  const tierColor = ach.tierColor;
                  const progressPercent = ach.max > 0 ? (ach.progress / ach.max) * 100 : 0;

                  return (
                    <TouchableOpacity
                      key={ach.id}
                      onPress={() => setDetailNode({ type: 'achievement', name: ach.title, xp: ach.progress, thresholds: (ach as any).thresholds, desc: ach.description })}
                      style={[styles.achievementBadge, { borderColor: isCompleted ? tierColor : theme.subtleBorder, backgroundColor: theme.cardBg }]}
                    >
                      <EmblemIcon icon={isCompleted ? (ach.icon || 'trophy') : 'lock'} color={isCompleted ? tierColor : '#444'} size={50} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.achTitle, { color: isCompleted ? tierColor : '#FFF', flex: 1 }]} numberOfLines={1}>{ach.title}</Text>
                          <Text style={{ color: isCompleted ? tierColor : '#666', fontSize: 10, fontWeight: '800', marginLeft: 8 }}>
                            {ach.tier.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.achDesc}>{ach.description}</Text>
                        <View style={styles.achProgressBg}>
                          <View style={[styles.achProgressFill, { width: `${Math.min(100, progressPercent)}%`, backgroundColor: isCompleted ? tierColor : theme.accent }]} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {displayedBadges.length > 5 && (
                <TouchableOpacity
                  style={[styles.showMoreAchBtn, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
                  onPress={() => setAchievementsExpanded(!achievementsExpanded)}
                >
                  <Text style={[styles.showMoreAchBtnText, { color: theme.accent }]}>
                    {achievementsExpanded ? 'Weniger anzeigen ▲' : `Alle ${displayedBadges.length} Abzeichen anzeigen ▼`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* ===============================================================
             TAB 2: INTERAKTIVES SAMMELALBUM (ÜBUNGEN, REZEPTE, SUPPLEMENTS)
             =============================================================== */}
        {activeSubTab === 'vault' && (
          <>
            {/* BINDER HEADER & CATEGORY SWITCHER */}
            <View style={[styles.binderHeaderCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={[styles.binderHeaderEyebrow, { color: theme.accent }]}>TCG SAMMEL-BIBLIOTHEK</Text>
                  <Text style={styles.binderHeaderTitle}>Deine Sammel-Karten</Text>
                </View>
                <TouchableOpacity
                  style={[styles.fullscreenDeckBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                  onPress={() => openPager(0)}
                >
                  <MaterialCommunityIcons name="cards-playing-outline" size={16} color={theme.accent} />
                  <Text style={[styles.fullscreenDeckBtnText, { color: theme.accent }]}>3D Deck-Ansicht</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.binderTypeTabs}>
                <TouchableOpacity
                  style={[styles.binderTypeBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }, collectionType === 'Exercises' && [styles.binderTypeBtnActiveCyan, { borderColor: theme.accent, backgroundColor: theme.accentSoftBg }]]}
                  onPress={() => setCollectionType('Exercises')}
                >
                  <Text style={{ fontSize: 20 }}>🏋️</Text>
                  <Text style={styles.binderTypeLabel}>Übungen</Text>
                  <Text style={[styles.binderTypeCount, { color: theme.accent }]}>{baseExercises.length} Entdeckt</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.binderTypeBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }, collectionType === 'Recipes' && styles.binderTypeBtnActiveGreen]}
                  onPress={() => setCollectionType('Recipes')}
                >
                  <Text style={{ fontSize: 20 }}>🍲</Text>
                  <Text style={styles.binderTypeLabel}>Rezepte</Text>
                  <Text style={[styles.binderTypeCount, { color: '#30D158' }]}>{savedMeals.length} Gespeichert</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.binderTypeBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }, collectionType === 'Supplements' && styles.binderTypeBtnActivePurple]}
                  onPress={() => setCollectionType('Supplements')}
                >
                  <Text style={{ fontSize: 20 }}>💊</Text>
                  <Text style={styles.binderTypeLabel}>Supplements</Text>
                  <Text style={[styles.binderTypeCount, { color: '#BF5AF2' }]}>{(supplementLibrary || []).length} Aktiv</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.binderTipText}>
                💡 Tippe auf eine Karte für den 3D-Flip (Gewichts-Chart, Portions-Rechner & Rang-Leiter)!
              </Text>
            </View>

            {/* SEARCH, FILTER & SORT DOCK */}
            <View style={styles.filterToolbarRow}>
              <View style={[styles.searchInputBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                <MaterialCommunityIcons name="magnify" size={18} color="#888" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={
                    collectionType === 'Exercises'
                      ? 'Übung, Muskel oder Marke suchen...'
                      : collectionType === 'Recipes'
                      ? 'Rezept suchen...'
                      : 'Supplement suchen...'
                  }
                  placeholderTextColor="#666"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <MaterialCommunityIcons name="close-circle" size={16} color="#888" />
                  </TouchableOpacity>
                )}
              </View>

              {collectionType === 'Exercises' && (
                <>
                  <TouchableOpacity
                    style={[styles.toolbarBtn, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }, filtersExpanded && { borderColor: theme.accent, backgroundColor: theme.accentBgSoft }]}
                    onPress={() => setFiltersExpanded(!filtersExpanded)}
                  >
                    <MaterialCommunityIcons name="filter-variant" size={18} color={theme.accent} />
                    <Text style={styles.toolbarBtnText}>Filter</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.newExerciseBtn, { backgroundColor: theme.accent }]}
                    onPress={() => {
                      setEditingExercise(null);
                      setManagerVisible(true);
                    }}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color="#000" />
                    <Text style={styles.newExerciseBtnText}>Neu</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {collectionType === 'Exercises' && (
              <>
                {/* Quick Muscle & Plan Filter Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 10 }}
                  contentContainerStyle={{ gap: 6 }}
                >
                  <TouchableOpacity
                    style={[styles.chip, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }, filterMode === 'All' && selectedMuscle === 'All' && [styles.chipActive, { backgroundColor: theme.accent, borderColor: theme.accent }]]}
                    onPress={() => {
                      setFilterMode('All');
                      setSelectedMuscle('All');
                    }}
                  >
                    <Text style={[styles.chipText, filterMode === 'All' && selectedMuscle === 'All' && styles.chipTextActive]}>
                      Alle
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.chip, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }, filterMode === 'In Plan' && [styles.chipActive, { backgroundColor: theme.accent, borderColor: theme.accent }]]}
                    onPress={() => setFilterMode(filterMode === 'In Plan' ? 'All' : 'In Plan')}
                  >
                    <Text style={[styles.chipText, filterMode === 'In Plan' && styles.chipTextActive]}>
                      📋 Im Plan
                    </Text>
                  </TouchableOpacity>

                  {['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'].map(group => (
                    <TouchableOpacity
                      key={group}
                      style={[styles.chip, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }, selectedMuscle === group && [styles.chipActive, { backgroundColor: theme.accent, borderColor: theme.accent }]]}
                      onPress={() => setSelectedMuscle(selectedMuscle === group ? 'All' : group)}
                    >
                      <Text style={[styles.chipText, selectedMuscle === group && styles.chipTextActive]}>
                        {MUSCLE_LABELS_DE[group] || group}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Collapsible Advanced Equipment & Brand Drawer */}
                {filtersExpanded && (
                  <View style={[styles.advancedFilterDrawer, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                    <Text style={styles.drawerSectionTitle}>EQUIPMENT-TYP</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
                      {['All', ...equipmentTypes].map(eq => (
                        <TouchableOpacity
                          key={eq}
                          style={[styles.chip, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }, selectedEquipment === eq && [styles.chipActive, { backgroundColor: theme.accent, borderColor: theme.accent }]]}
                          onPress={() => setSelectedEquipment(eq)}
                        >
                          <Text style={[styles.chipText, selectedEquipment === eq && styles.chipTextActive]}>
                            {eq === 'All' ? 'Alle Geräte' : eq}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={styles.drawerSectionTitle}>MARKE (BRAND)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {['All', ...equipmentBrands].map(b => (
                        <TouchableOpacity
                          key={b}
                          style={[styles.chip, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }, selectedBrand === b && [styles.chipActive, { backgroundColor: theme.accent, borderColor: theme.accent }]]}
                          onPress={() => setSelectedBrand(b)}
                        >
                          <Text style={[styles.chipText, selectedBrand === b && styles.chipTextActive]}>
                            {b === 'All' ? 'Alle Marken' : b}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Sort Bar */}
                <View style={[styles.binderSortBar, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                  <Text style={styles.sortLabel}>Sortieren nach:</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {([
                      { key: 'pr', label: 'PR (kg)' },
                      { key: 'sets', label: 'Sätze' },
                      { key: 'volume', label: 'Volumen' },
                      { key: 'reps', label: 'Wdh.' },
                    ] as { key: SortMode; label: string }[]).map(mode => (
                      <TouchableOpacity
                        key={mode.key}
                        style={[styles.sortPill, sortMode === mode.key && [styles.sortPillActive, { backgroundColor: theme.accentBgSoft }]]}
                        onPress={() => setSortMode(mode.key)}
                      >
                        <Text style={[styles.sortOption, sortMode === mode.key && [styles.sortOptionActive, { color: theme.accent }]]}>
                          {mode.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* INTERACTIVE 3-COLUMN TCG BINDER GRID */}
            {collectionItems.length === 0 ? (
              <View style={[styles.emptyCardBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                <MaterialCommunityIcons name="cards-outline" size={34} color="#555" />
                <Text style={styles.emptyCardText}>
                  Keine Karten für diesen Filter gefunden.
                </Text>
              </View>
            ) : (
              <View style={styles.tcgGridContainer}>
                {collectionItems.map((item, idx) => {
                  const { getResolvedUri } = require('../utils/uriResolver');
                  const imageUri = getResolvedUri(collectibleImages[item.id]);
                  const stats = exerciseStats[item.name];
                  
                  let gridBorderColor = '#333';
                  let cardLevel = 1;
                  let subLine = '';
                  let highlightLine = '';

                  if (collectionType === 'Exercises') {
                    const xp = (stats?.totalSets || 0) * 10;
                    const lvl = getLevelData(xp);
                    gridBorderColor = lvl.rankColor;
                    cardLevel = lvl.level;
                    const volStr = stats?.totalVolume ? (stats.totalVolume >= 1000 ? `${(stats.totalVolume / 1000).toFixed(1)}t` : `${stats.totalVolume}kg`) : '0kg';
                    subLine = `${stats?.totalSets || 0} Sets • ${volStr}`;
                    highlightLine = stats && stats.pr > 0 ? `PR: ${stats.pr} kg` : 'Noch kein PR';
                  } else if (collectionType === 'Recipes') {
                    const rData = (item as any).recipeData;
                    const recipeXP = mealLogCounts?.[rData?.id as string] || 0;
                    const lvl = getRecipeLevelData(recipeXP);
                    gridBorderColor = lvl.rankColor;
                    cardLevel = lvl.level;
                    const servings = rData?.totalServings || 1;
                    subLine = `${Math.round((rData?.calories || 0) / servings)} kcal`;
                    highlightLine = `${Math.round((rData?.protein || 0) / servings)}g Protein`;
                  } else if (collectionType === 'Supplements') {
                    const sData = (item as any).supplementData;
                    const suppXP = sData?.totalTakenTimes || 0;
                    const lvl = getRecipeLevelData(suppXP);
                    gridBorderColor = lvl.rankColor;
                    cardLevel = lvl.level;
                    subLine = `🔥 ${sData?.streak || 0} Streak`;
                    highlightLine = `${sData?.currentInventory ?? 0} ${sData?.unit || ''} übrig`;
                  }

                  const catChipLabel = collectionType === 'Exercises'
                    ? (MUSCLE_LABELS_DE[item.category || ''] || item.category || 'Kraft')
                    : collectionType === 'Recipes'
                    ? 'Rezept'
                    : (item.category || 'Supp');

                  return (
                    <TouchableOpacity 
                      key={item.id} 
                      activeOpacity={0.82}
                      style={[styles.tcgMiniCard, { backgroundColor: theme.cardBg, borderColor: gridBorderColor }]}
                      onPress={() => openPager(idx)}
                      onLongPress={() => handleDeleteItem(item)}
                    >
                      {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.gridImage} />
                      ) : (
                        <View style={[styles.gridPlaceholder, { backgroundColor: theme.subCardBg }]}>
                          <MaterialCommunityIcons
                            name={collectionType === 'Exercises' ? "dumbbell" : collectionType === 'Recipes' ? "silverware-fork-knife" : "pill"}
                            size={30}
                            color={gridBorderColor}
                          />
                        </View>
                      )}

                      <View style={styles.tcgMiniTopBadges}>
                        <View style={styles.tcgCatChip}>
                          <Text style={styles.tcgCatChipText} numberOfLines={1}>{catChipLabel}</Text>
                        </View>
                        <View style={[styles.tcgLvlChip, { borderColor: gridBorderColor }]}>
                          <Text style={[styles.tcgLvlChipText, { color: gridBorderColor }]}>Lv {cardLevel}</Text>
                        </View>
                      </View>

                      <View style={styles.gridCardOverlay}>
                        <Text style={styles.gridCardText} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.tcgMiniMetaText} numberOfLines={1}>{subLine}</Text>
                        <Text style={[styles.gridCardSubText, { color: gridBorderColor }]} numberOfLines={1}>
                          {highlightLine}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* SPECIAL LIBRARIES (STRETCHING & CORE) */}
            <View style={{ marginTop: 22 }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>🧘 Spezial-Bibliotheken & Routinen</Text>
              </View>

              <View style={styles.specialLibsRow}>
                <TouchableOpacity
                  style={[styles.specialLibCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('StretchingLibrary')}
                >
                  <View style={[styles.specialLibIconBox, { backgroundColor: 'rgba(255, 149, 0, 0.16)' }]}>
                    <MaterialCommunityIcons name="yoga" size={24} color="#FF9500" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.specialLibTitle}>Stretching</Text>
                    <Text style={styles.specialLibSub}>Rehab & Mobility</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.specialLibCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('CoreLibrary')}
                >
                  <View style={[styles.specialLibIconBox, { backgroundColor: 'rgba(255, 59, 48, 0.16)' }]}>
                    <MaterialCommunityIcons name="fire" size={24} color="#FF3B30" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.specialLibTitle}>Core Routinen</Text>
                    <Text style={styles.specialLibSub}>Ab & Stabilität</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* ===============================================================
             TAB 3: ANALYSE & TRENDS (TOTAL WEIGHT MOVED, CHARTS & MUSIC)
             =============================================================== */}
        {activeSubTab === 'analytics' && (
          <>
            {/* 1. NEW HERO GRAPH: BEWEGTES GESAMTGEWICHT (TONNAGE) */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>🏋️ Bewegtes Gesamtgewicht (Tonnage)</Text>
            </View>

            <View style={[styles.tonnageHeroCard, { backgroundColor: theme.cardBg }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tonnageEyebrow}>{tonnageAnalytics.periodLabel}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                    <Text style={styles.tonnageBigVal}>
                      {Math.round(tonnageAnalytics.periodTotalKg).toLocaleString('de-DE')} kg
                    </Text>
                    <Text style={styles.tonnageBigTons}>
                      ({(tonnageAnalytics.periodTotalKg / 1000).toFixed(1)} t)
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {([
                    { key: '1w', label: '1W' },
                    { key: '1m', label: '1M' },
                    { key: '1y', label: '1J' },
                    { key: 'all', label: 'ALL' },
                  ] as { key: TonnageRange; label: string }[]).map(r => (
                    <TouchableOpacity
                      key={r.key}
                      onPress={() => setTonnageTimeRange(r.key)}
                      style={[
                        styles.rangePill,
                        { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                        tonnageTimeRange === r.key && styles.rangePillActiveGold,
                      ]}
                    >
                      <Text style={[styles.rangePillText, tonnageTimeRange === r.key && { color: '#FFD700' }]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 3 Summary KPIs for the selected period */}
              <View style={styles.tonnageKpiRow}>
                <View style={[styles.tonnageKpiBox, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                  <Text style={styles.tonnageKpiVal}>{tonnageAnalytics.periodWorkouts} Workouts</Text>
                  <Text style={styles.tonnageKpiSub}>Im Zeitraum</Text>
                </View>
                <View style={[styles.tonnageKpiBox, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                  <Text style={[styles.tonnageKpiVal, { color: theme.accent }]}>
                    Ø {tonnageAnalytics.avgPerWorkoutKg >= 1000
                      ? `${(tonnageAnalytics.avgPerWorkoutKg / 1000).toFixed(1)} t`
                      : `${Math.round(tonnageAnalytics.avgPerWorkoutKg)} kg`}
                  </Text>
                  <Text style={styles.tonnageKpiSub}>Pro Workout</Text>
                </View>
                <View style={[styles.tonnageKpiBox, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                  <Text style={[styles.tonnageKpiVal, { color: '#30D158' }]}>{tonnageAnalytics.periodSets} Sätze</Text>
                  <Text style={styles.tonnageKpiSub}>Abgehakt</Text>
                </View>
              </View>

              {/* Mode Toggle: Pro Einheit vs. Kumuliert */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: '#AAA', fontSize: 11, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                  {tonnageAnalytics.hintText}
                </Text>
                <View style={[styles.tonnageModeSwitch, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                  <TouchableOpacity
                    style={[styles.tonnageModeBtn, tonnageChartMode === 'per_unit' && [styles.tonnageModeBtnActive, { backgroundColor: theme.accentBgSoft }]]}
                    onPress={() => setTonnageChartMode('per_unit')}
                  >
                    <Text style={[styles.tonnageModeBtnText, tonnageChartMode === 'per_unit' && { color: theme.accent }]}>
                      Pro Einheit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tonnageModeBtn, tonnageChartMode === 'cumulative' && [styles.tonnageModeBtnActive, { backgroundColor: theme.accentBgSoft }]]}
                    onPress={() => setTonnageChartMode('cumulative')}
                  >
                    <Text style={[styles.tonnageModeBtnText, tonnageChartMode === 'cumulative' && { color: theme.accent }]}>
                      Kumuliert ↗
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <LineChart
                data={tonnageAnalytics.chartData}
                width={screenWidth - 64}
                height={195}
                yAxisSuffix={tonnageAnalytics.useTonnesAxis ? 't' : 'kg'}
                chartConfig={{
                  backgroundColor: theme.subCardBg,
                  backgroundGradientFrom: theme.subCardBg,
                  backgroundGradientTo: theme.subCardBg,
                  color: (opacity = 1) => `rgba(255, 215, 0, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(220, 220, 230, ${opacity})`,
                  propsForDots: { r: '4', strokeWidth: '2', stroke: '#FFD700' },
                  decimalPlaces: tonnageAnalytics.useTonnesAxis ? 1 : 0,
                }}
                bezier
                style={{ marginTop: 4, borderRadius: 12, transform: [{ translateX: -8 }] }}
              />
            </View>

            {/* 2. WORKOUT VOLUME PER SESSION & NUTRITION CALORIES CHARTS */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>📈 Trainings- & Ernährungs-Verlauf</Text>
            </View>

            {workoutChartData ? (
              <View style={[styles.chartWrapper, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={[styles.chartTitle, { marginBottom: 0 }]}>Workout-Volumen pro Session (kg)</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {(['1w', '1m', '1y'] as const).map(range => (
                      <TouchableOpacity
                        key={range}
                        onPress={() => setWorkoutTimeRange(range)}
                        style={[styles.rangePill, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }, workoutTimeRange === range && [styles.rangePillActiveCyan, { backgroundColor: theme.accentBgSoft, borderColor: theme.accent }]]}
                      >
                        <Text style={[styles.rangePillText, workoutTimeRange === range && { color: theme.accent }]}>
                          {range === '1y' ? '1J' : range.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <LineChart
                  data={workoutChartData}
                  width={screenWidth - 64}
                  height={200}
                  chartConfig={{
                    backgroundColor: theme.cardBg,
                    backgroundGradientFrom: theme.cardBg,
                    backgroundGradientTo: theme.cardBg,
                    color: (opacity = 1) => `rgba(${theme.accentRgb}, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: theme.accent },
                    decimalPlaces: 0,
                  }}
                  bezier
                  style={{ marginVertical: 4, borderRadius: 8, transform: [{ translateX: -10 }] }}
                />
              </View>
            ) : (
              <View style={[styles.chartEmpty, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                <Text style={styles.chartEmptyText}>Noch nicht genügend Workout-Daten im Zeitraum.</Text>
              </View>
            )}

            {nutritionChartData ? (
              <View style={[styles.chartWrapper, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={[styles.chartTitle, { marginBottom: 0 }]}>Kalorien-Verlauf (kcal)</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {(['1w', '1m', '1y'] as const).map(range => (
                      <TouchableOpacity
                        key={range}
                        onPress={() => setNutritionTimeRange(range)}
                        style={[styles.rangePill, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }, nutritionTimeRange === range && styles.rangePillActiveGreen]}
                      >
                        <Text style={[styles.rangePillText, nutritionTimeRange === range && { color: '#30D158' }]}>
                          {range === '1y' ? '1J' : range.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <LineChart
                  data={nutritionChartData}
                  width={screenWidth - 64}
                  height={200}
                  chartConfig={{
                    backgroundColor: theme.cardBg,
                    backgroundGradientFrom: theme.cardBg,
                    backgroundGradientTo: theme.cardBg,
                    color: (opacity = 1) => `rgba(48, 209, 88, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#30D158' },
                    decimalPlaces: 0,
                  }}
                  bezier
                  style={{ marginVertical: 4, borderRadius: 8, transform: [{ translateX: -10 }] }}
                />
              </View>
            ) : (
              <View style={[styles.chartEmpty, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                <Text style={styles.chartEmptyText}>Noch nicht genügend Ernährungs-Daten im Zeitraum.</Text>
              </View>
            )}

            {/* 3. WORKOUT MUSIC STATS (INLINE) */}
            <View style={{ marginTop: 8 }}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>🎵 Workout Music Stats</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {([
                    { key: 'week', label: 'Woche' },
                    { key: 'month', label: 'Monat' },
                    { key: 'year', label: 'Jahr' },
                  ] as const).map(r => (
                    <TouchableOpacity
                      key={r.key}
                      onPress={() => setMusicTimeRange(r.key)}
                      style={[styles.rangePill, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }, musicTimeRange === r.key && [styles.rangePillActiveCyan, { backgroundColor: theme.accentBgSoft, borderColor: theme.accent }]]}
                    >
                      <Text style={[styles.rangePillText, musicTimeRange === r.key && { color: theme.accent }]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {topSongs.length === 0 ? (
                <View style={[styles.chartEmpty, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                  <MaterialCommunityIcons name="music-off" size={32} color="#444" />
                  <Text style={[styles.chartEmptyText, { marginTop: 8 }]}>
                    Keine gespielten Workout-Songs in diesem Zeitraum.
                  </Text>
                </View>
              ) : (
                topSongs.map((song, idx) => (
                  <View key={`${song.id}-${idx}`} style={[styles.songRowCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.songRankText, { color: theme.accent }, idx === 0 && { color: '#FFD700' }]}>#{idx + 1}</Text>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.songTitleText} numberOfLines={1}>{song.title}</Text>
                      <Text style={styles.songArtistText} numberOfLines={1}>{song.artist}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.songPlaysCount}>{song.playsInRange}</Text>
                      <Text style={styles.songPlaysLabel}>PLAYS</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* =================================================================
           MODALS
           ================================================================= */}

      {/* 1. LEVEL PROGRESSION & CARDIO DETAIL MODAL */}
      {detailNode && (
        <LevelProgressionModal 
          visible={!!detailNode} 
          onClose={() => setDetailNode(null)} 
          title={detailNode.name} 
          currentXP={Math.round(detailNode.xp)} 
          type={detailNode.type} 
          thresholds={detailNode.thresholds}
          description={detailNode.desc}
        >
          {detailNode.type === 'cardio' && (
            <View style={{ marginTop: 24 }}>
              {cardioAggregates && (
                <View style={{ marginBottom: 24, backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#333' }}>
                  <Text style={{ color: theme.accent, fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Lifetime Stats</Text>
                  
                  {cardioAggregates.type === 'distance' ? (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: '#888' }}>Total Distance</Text>
                        <Text style={{ color: '#FFF', fontWeight: '600' }}>{((cardioAggregates as any).totalDistance / 1000).toFixed(2)} km</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: '#888' }}>Longest Distance</Text>
                        <Text style={{ color: '#FFF', fontWeight: '600' }}>{((cardioAggregates as any).longestDistance / 1000).toFixed(2)} km</Text>
                      </View>
                      
                      {(cardioAggregates as any).fastest10k ? (
                        <TouchableOpacity 
                          style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingVertical: 8, borderTopWidth: 1, borderColor: '#333' }}
                          onPress={() => setSplitsExpanded(!splitsExpanded)}
                        >
                          <Text style={{ color: '#888' }}>Fastest 10km Split</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ color: '#FFF', fontWeight: '600', marginRight: 4 }}>
                              {Math.floor((cardioAggregates as any).fastest10k / 60)}:{String(Math.floor((cardioAggregates as any).fastest10k % 60)).padStart(2, '0')}
                            </Text>
                            <MaterialCommunityIcons name={splitsExpanded ? "chevron-up" : "chevron-down"} color="#888" size={16} />
                          </View>
                        </TouchableOpacity>
                      ) : null}

                      {splitsExpanded && (cardioAggregates as any).fastest5k && (
                        <View style={{ paddingLeft: 16, borderLeftWidth: 2, borderColor: '#333', marginLeft: 8, marginTop: 4 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text style={{ color: '#666', fontSize: 12 }}>Fastest 5km</Text>
                            <Text style={{ color: '#CCC', fontSize: 12 }}>
                              {Math.floor((cardioAggregates as any).fastest5k / 60)}:{String(Math.floor((cardioAggregates as any).fastest5k % 60)).padStart(2, '0')}
                            </Text>
                          </View>
                          {(cardioAggregates as any).fastest1k && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                              <Text style={{ color: '#666', fontSize: 12 }}>Fastest 1km</Text>
                              <Text style={{ color: '#CCC', fontSize: 12 }}>
                                {Math.floor((cardioAggregates as any).fastest1k / 60)}:{String(Math.floor((cardioAggregates as any).fastest1k % 60)).padStart(2, '0')}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: '#888' }}>Total Time</Text>
                        <Text style={{ color: '#FFF', fontWeight: '600' }}>{Math.floor((cardioAggregates as any).totalTime / 60)} mins</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: '#888' }}>Longest Session</Text>
                        <Text style={{ color: '#FFF', fontWeight: '600' }}>{Math.floor((cardioAggregates as any).longestSession / 60)} mins</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: '#888' }}>Highest Avg HR</Text>
                        <Text style={{ color: '#FFF', fontWeight: '600' }}>{(cardioAggregates as any).highestAvgHR} bpm</Text>
                      </View>
                    </>
                  )}

                  <TouchableOpacity 
                    style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: cardioAggregates.type === 'distance' && !(cardioAggregates as any).fastest10k ? 8 : 0, paddingTop: 8, borderTopWidth: 1, borderColor: '#333' }}
                    onPress={() => setCaloriesExpanded(!caloriesExpanded)}
                  >
                    <Text style={{ color: '#888' }}>Total Calories Burned</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: '#FFF', fontWeight: '600', marginRight: 4 }}>
                        {(cardioAggregates as any).totalCalories} kcal
                      </Text>
                      <MaterialCommunityIcons name={caloriesExpanded ? "chevron-up" : "chevron-down"} color="#888" size={16} />
                    </View>
                  </TouchableOpacity>

                  {caloriesExpanded && (
                    <View style={{ paddingLeft: 16, borderLeftWidth: 2, borderColor: '#333', marginLeft: 8, marginTop: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#666', fontSize: 12 }}>Highest single session</Text>
                        <Text style={{ color: '#CCC', fontSize: 12 }}>
                          {(cardioAggregates as any).maxCalories} kcal
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              <Text style={{ color: '#888', marginBottom: 16 }}>Highest XP Sessions</Text>
              {cardioHistory
                .filter(s => s.type === selectedCardioType && s.xpEarned && s.xpEarned > 0)
                .sort((a, b) => (b.xpEarned || 0) - (a.xpEarned || 0))
                .map(session => (
                  <View key={session.id} style={{ backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
                        {new Date(session.date).toLocaleDateString('de-DE')}
                      </Text>
                      <Text style={{ color: theme.accent, fontSize: 18, fontWeight: '800' }}>
                        +{Math.round(session.xpEarned || 0)} XP
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'space-between' }}>
                      <View>
                        <Text style={{ color: '#888', fontSize: 12 }}>Duration</Text>
                        <Text style={{ color: '#FFF', fontSize: 14 }}>{Math.floor(session.durationSeconds / 60)} min</Text>
                      </View>
                      <View>
                        <Text style={{ color: '#888', fontSize: 12 }}>Distance</Text>
                        <Text style={{ color: '#FFF', fontSize: 14 }}>{(session.distanceMeters / 1000).toFixed(2)} km</Text>
                      </View>
                      <View>
                        <Text style={{ color: '#888', fontSize: 12 }}>Avg HR</Text>
                        <Text style={{ color: '#FFF', fontSize: 14 }}>{session.averageHeartRate} bpm</Text>
                      </View>
                    </View>
                  </View>
                ))}
              {cardioHistory.filter(s => s.type === selectedCardioType).length === 0 && (
                <Text style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>No recorded sessions found.</Text>
              )}
            </View>
          )}
        </LevelProgressionModal>
      )}

      {/* 2. DEEP CAREER PROFILE STATS MODAL */}
      <Modal visible={profileModalVisible} animationType="slide" transparent={true}>
        <View style={styles.profileModalOverlay}>
          <View style={[styles.profileModalContent, { backgroundColor: theme.cardBg }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.subtleBorder }}>
              <View>
                <Text style={{ color: '#FFF', fontSize: 19, fontWeight: '900' }}>🛡️ Karriere-Statistiken</Text>
                <Text style={{ color: levelData.rankColor, fontSize: 12, fontWeight: '700', marginTop: 2 }}>
                  Level {levelData.level} • {levelData.title} ({Math.round(levelData.totalXP).toLocaleString('de-DE')} XP)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <View style={[styles.deepStatBox, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                  <Text style={[styles.deepStatVal, { color: theme.accent }]}>{totalWorkouts}</Text>
                  <Text style={styles.deepStatLabel}>Gesamt-Workouts</Text>
                </View>
                <View style={[styles.deepStatBox, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                  <Text style={[styles.deepStatVal, { color: '#FFD700' }]}>
                    {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)} t` : `${totalVolume} kg`}
                  </Text>
                  <Text style={styles.deepStatLabel}>Bewegte Tonnage</Text>
                </View>
                <View style={[styles.deepStatBox, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                  <Text style={[styles.deepStatVal, { color: '#30D158' }]}>{totalSets.toLocaleString('de-DE')}</Text>
                  <Text style={styles.deepStatLabel}>Abgehakte Sätze</Text>
                </View>
                <View style={[styles.deepStatBox, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                  <Text style={[styles.deepStatVal, { color: '#FF9500' }]}>{totalReps.toLocaleString('de-DE')}</Text>
                  <Text style={styles.deepStatLabel}>Wiederholungen</Text>
                </View>
              </View>

              <View style={{ backgroundColor: theme.subCardBg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.subtleBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#999', fontSize: 13, fontWeight: '700' }}>Meisttrainierte Muskelgruppe</Text>
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '900' }}>{topMuscle}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. PAGER MODAL (3D FLIPPABLE TCG CARD VIEW) */}
      <Modal visible={pagerModalVisible} animationType="fade" transparent={true}>
        <View style={styles.pagerOverlay}>
          <TouchableOpacity style={styles.pagerCloseBtn} onPress={closePagerModal}>
            <MaterialCommunityIcons name="close" size={32} color="#FFF" />
          </TouchableOpacity>
          {(() => {
            const activeCollectionType = customPagerItems ? 'Exercises' : collectionType;
            const activeItems = customPagerItems || collectionItems;

            return (
              <PagerView style={styles.pagerView} initialPage={initialPage}>
                {activeItems.map((item) => {
                  const { getResolvedUri } = require('../utils/uriResolver');
                  const imageUri = getResolvedUri(collectibleImages[item.id]);
                  const stats = exerciseStats[item.name] || { totalSets: 0, totalReps: 0, totalVolume: 0, pr: 0, history: [] };
                  
                  // Chart Data
                  const eDays = exerciseTimeRange === '1w' ? 7 : exerciseTimeRange === '1m' ? 30 : 365;
                  const eNow = new Date().getTime();
                  let eFiltered = stats.history.filter(h => {
                    const hDate = h.date.length === 5 ? new Date().getFullYear() + '-' + h.date : h.date;
                    return eNow - new Date(hDate).getTime() <= eDays * 24 * 60 * 60 * 1000;
                  });
                  
                  if (eFiltered.length === 0) eFiltered = stats.history.slice(-6);
                  
                  const chartLabels = eFiltered.map((h, i) => {
                    if (eFiltered.length > 7 && i % Math.ceil(eFiltered.length / 7) !== 0 && i !== eFiltered.length - 1) return '';
                    const dateStr = h.date.length > 5 ? h.date.substring(5, 10) : h.date;
                    const parts = dateStr.split('-');
                    if (parts.length === 2) return `${parts[1]}-${parts[0]}`;
                    return dateStr;
                  });
                  const chartData = eFiltered.map(h => h.maxWeight);

                  const xp = activeCollectionType === 'Recipes'
                    ? (mealLogCounts?.[(item as any).recipeData?.id as string] || 0)
                    : activeCollectionType === 'Supplements'
                    ? ((item as any).supplementData?.totalTakenTimes || 0)
                    : (stats?.totalSets || 0) * 10;
                    
                  const itemLevelData = activeCollectionType === 'Recipes'
                    ? getRecipeLevelData(mealLogCounts?.[(item as any).recipeData?.id as string] || 0)
                    : activeCollectionType === 'Supplements'
                    ? getRecipeLevelData((item as any).supplementData?.totalTakenTimes || 0)
                    : getLevelData(xp);
                  const borderColor = itemLevelData.rankColor;

                  return (
                    <View key={item.id} style={styles.page}>
                      <FlippableExerciseCard 
                        item={item}
                        imageUri={imageUri}
                        stats={stats}
                        chartLabels={chartLabels}
                        chartData={chartData}
                        levelData={itemLevelData}
                        borderColor={borderColor}
                        collectionType={activeCollectionType}
                        screenWidth={screenWidth}
                        styles={styles}
                        exerciseTimeRange={exerciseTimeRange}
                        setExerciseTimeRange={setExerciseTimeRange}
                        theme={theme}
                      />

                      {/* Action Buttons at the Bottom of the Screen */}
                      <View style={{ position: 'absolute', bottom: 40, flexDirection: 'row', gap: 16, width: '100%', justifyContent: 'center' }}>
                        {(item.type === 'custom' || item.type === 'preloaded') && (
                          <TouchableOpacity 
                            style={[styles.addPhotoBtn, { backgroundColor: '#333', borderWidth: 2, borderColor: borderColor, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30 }]}
                            onPress={() => {
                              const exObj = customExercises.find(e => e.name === item.name) || PRELOADED_EXERCISES.find(e => e.name === item.name);
                              setEditingExercise({
                                ...exObj, 
                                name: item.name, 
                                category: item.category,
                                isPreloaded: item.type === 'preloaded'
                              });
                              setManagerVisible(true);
                              closePagerModal();
                            }}
                          >
                            <MaterialCommunityIcons name="pencil" size={20} color={borderColor} />
                            <Text style={[styles.addPhotoBtnText, { color: borderColor, fontSize: 16 }]}>Edit</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                          style={[styles.addPhotoBtn, { backgroundColor: '#333', borderWidth: 2, borderColor: '#FFF', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30 }]}
                          onPress={() => pickImage(item.id)}
                        >
                          <MaterialCommunityIcons name="image-edit" size={20} color="#FFF" />
                          <Text style={[styles.addPhotoBtnText, { fontSize: 16 }]}>{imageUri ? "Photo" : "Add Photo"}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </PagerView>
            );
          })()}
        </View>
      </Modal>

      {/* 4. TITLE SELECTION MODAL */}
      <Modal visible={titleModalVisible} animationType="slide" transparent={true}>
        <View style={styles.profileModalOverlay}>
          <View style={[styles.profileModalContent, { backgroundColor: theme.cardBg }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.subtleBorder }}>
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>Spieler-Titel ausrüsten</Text>
              <TouchableOpacity onPress={() => setTitleModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16, maxHeight: 420 }}>
              <TouchableOpacity 
                style={{ padding: 16, backgroundColor: equippedTitle === null ? theme.accentBgSoft : theme.subCardBg, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: equippedTitle === null ? theme.accent : theme.subtleBorder }}
                onPress={() => { setEquippedTitle(null); setTitleModalVisible(false); }}
              >
                <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold' }}>Kein Titel</Text>
              </TouchableOpacity>
              
              {/* Derive titles from unlocked achievements */}
              {unlockedAchievements && unlockedAchievements.map(id => {
                const ach = achievements.find(a => a.id === id);
                if (!ach) return null;
                return (
                  <TouchableOpacity 
                    key={id} 
                    style={{ padding: 16, backgroundColor: equippedTitle === ach.title ? theme.accentBgSoft : theme.subCardBg, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: equippedTitle === ach.title ? theme.accent : theme.subtleBorder }}
                    onPress={() => { setEquippedTitle(ach.title); setTitleModalVisible(false); }}
                  >
                    <Text style={{ color: theme.accent, textAlign: 'center', fontWeight: 'bold' }}>« {ach.title} »</Text>
                  </TouchableOpacity>
                );
              })}

              {/* Iron Tactics Unlocked Titles */}
              {trophyBadges.filter(b => b.tier !== 'Locked').map(tb => (
                <TouchableOpacity 
                  key={tb.id} 
                  style={{ 
                    padding: 16, 
                    backgroundColor: equippedTitle === tb.title ? '#2A2A2E' : theme.subCardBg, 
                    borderRadius: 8, 
                    marginBottom: 8, 
                    borderWidth: 1.5, 
                    borderColor: equippedTitle === tb.title ? tb.tierColor : theme.subtleBorder,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                  onPress={() => { setEquippedTitle(tb.title); setTitleModalVisible(false); }}
                >
                  <MaterialCommunityIcons name={tb.icon as any} size={18} color={tb.tierColor} />
                  <Text style={{ color: tb.tierColor, textAlign: 'center', fontWeight: 'bold' }}>
                    « {tb.title} »
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. CUSTOM EXERCISE MANAGER MODAL */}
      <ExerciseManagerModal 
        visible={managerVisible} 
        onClose={() => setManagerVisible(false)} 
        initialExercise={editingExercise}
        isPreloaded={editingExercise?.isPreloaded}
      />

      {/* 6. BADGE PICKER MODAL */}
      <Modal visible={badgePickerVisible} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>Abzeichen anpinnen</Text>
              <TouchableOpacity onPress={() => { setBadgePickerVisible(false); setSelectingBadgeSlot(null); }}>
                <MaterialCommunityIcons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#888', marginBottom: 16 }}>Wähle ein freigeschaltetes Abzeichen für dein Spieler-Profil.</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.subCardBg, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.subtleBorder }}
                onPress={() => {
                  if (selectingBadgeSlot !== null) {
                    const newPinned = [...(pinnedAchievements || [])];
                    newPinned[selectingBadgeSlot] = '';
                    setPinnedAchievements(newPinned);
                  }
                  setBadgePickerVisible(false);
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                  <MaterialCommunityIcons name="minus" size={24} color="#FFF" />
                </View>
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Slot leeren</Text>
              </TouchableOpacity>

              {/* SECTION: IRON TACTICS TROPHÄEN-ABZEICHEN */}
              <View style={{ marginTop: 8, marginBottom: 12 }}>
                <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 }}>
                  🏆 IRON TACTICS TROPHÄEN-ABZEICHEN
                </Text>
              </View>

              {trophyBadges.filter(a => a.tier !== 'Locked').map(ach => (
                <TouchableOpacity 
                  key={ach.id} 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.subCardBg, borderRadius: 12, marginBottom: 12, borderWidth: 1.5, borderColor: ach.tierColor }}
                  onPress={() => {
                    if (selectingBadgeSlot !== null) {
                      const newPinned = [...(pinnedAchievements || [])];
                      const existingIndex = newPinned.indexOf(ach.id);
                      if (existingIndex !== -1) newPinned[existingIndex] = '';
                      newPinned[selectingBadgeSlot] = ach.id;
                      setPinnedAchievements(newPinned);
                    }
                    setBadgePickerVisible(false);
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: ach.tierColor + '20', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                    <EmblemIcon icon={ach.icon || 'trophy'} color={ach.tierColor} size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: ach.tierColor, fontSize: 16, fontWeight: 'bold' }}>{ach.title}</Text>
                    <Text style={{ color: '#AAA', fontSize: 12, marginTop: 4 }}>{ach.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {trophyBadges.filter(a => a.tier !== 'Locked').length === 0 && (
                <View style={{ padding: 14, backgroundColor: theme.subCardBg, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: theme.subtleBorder }}>
                  <Text style={{ color: '#888', fontSize: 12, textAlign: 'center' }}>
                    Schließe Boss-Kämpfe in Iron Tactics ab (ab 100 🏆), um Gladiator- & Meister-Abzeichen freizuschalten!
                  </Text>
                </View>
              )}

              {/* SECTION: FITNESS ACHIEVEMENTS */}
              <View style={{ marginTop: 8, marginBottom: 12 }}>
                <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 }}>
                  🏋️ FITNESS & TRAINING-ERFOLGE
                </Text>
              </View>

              {achievements.filter(a => a.tier !== 'Locked').map(ach => (
                <TouchableOpacity 
                  key={ach.id} 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: theme.subCardBg, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: ach.tierColor }}
                  onPress={() => {
                    if (selectingBadgeSlot !== null) {
                      const newPinned = [...(pinnedAchievements || [])];
                      const existingIndex = newPinned.indexOf(ach.id);
                      if (existingIndex !== -1) newPinned[existingIndex] = '';
                      newPinned[selectingBadgeSlot] = ach.id;
                      setPinnedAchievements(newPinned);
                    }
                    setBadgePickerVisible(false);
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: ach.tierColor + '20', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                    <EmblemIcon icon={ach.icon || 'trophy'} color={ach.tierColor} size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: ach.tierColor, fontSize: 16, fontWeight: 'bold' }}>{ach.title}</Text>
                    <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>{ach.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {achievements.filter(a => a.tier !== 'Locked').length === 0 && (
                <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>Noch keine Erfolge freigeschaltet.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 7. WORKOUT DETAIL MODAL */}
      <Modal visible={workoutDetailModalVisible} animationType="slide" transparent={false}>
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          {currentSelectedWorkout && (
            <>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setWorkoutDetailModalVisible(false)} style={styles.closeBtn}>
                  <MaterialCommunityIcons name="close" size={26} color="#FFF" />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {currentSelectedWorkout.customName || currentSelectedWorkout.planName}
                  </Text>
                  {currentSelectedWorkout.trainingPartner ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <MaterialCommunityIcons name="account-multiple" size={13} color="#30D158" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#30D158', fontSize: 13, fontWeight: '600' }}>
                        mit {currentSelectedWorkout.trainingPartner}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity 
                  onPress={() => toggleFavoriteWorkout(currentSelectedWorkout.id)}
                  style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
                >
                  <MaterialCommunityIcons 
                    name={currentSelectedWorkout.isFavorite ? "star" : "star-outline"} 
                    size={26} 
                    color={currentSelectedWorkout.isFavorite ? "#FFD700" : "#666"} 
                  />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={{ flex: 1 }} 
                contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
                showsVerticalScrollIndicator={false}
              >
                <View style={[styles.detailSummaryCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                  <View style={styles.detailSummaryCol}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color={theme.accent} />
                    <Text style={styles.detailSummaryVal}>{Math.floor(currentSelectedWorkout.durationSeconds / 60)} min</Text>
                    <Text style={styles.detailSummarySub}>Dauer</Text>
                  </View>
                  <View style={styles.detailSummaryDivider} />
                  <View style={styles.detailSummaryCol}>
                    <MaterialCommunityIcons name="fire" size={20} color="#FF9500" />
                    <Text style={styles.detailSummaryVal}>{Math.floor(currentSelectedWorkout.caloriesBurned)}</Text>
                    <Text style={styles.detailSummarySub}>kcal</Text>
                  </View>
                  <View style={styles.detailSummaryDivider} />
                  <View style={styles.detailSummaryCol}>
                    <MaterialCommunityIcons name="weight-lifter" size={20} color="#30D158" />
                    <Text style={styles.detailSummaryVal}>
                      {(() => {
                        let total = 0;
                        (currentSelectedWorkout.exercises || []).forEach(ex => {
                          (ex.sets || []).forEach(s => {
                            total += (s.weight || 0) * ((s.reps || 0) + (s.repsRight || 0));
                          });
                        });
                        return total >= 1000 ? (total / 1000).toFixed(1) + ' t' : total + ' kg';
                      })()}
                    </Text>
                    <Text style={styles.detailSummarySub}>Tonnage</Text>
                  </View>
                  {currentSelectedWorkout.avgHeartRate ? (
                    <>
                      <View style={styles.detailSummaryDivider} />
                      <View style={styles.detailSummaryCol}>
                        <MaterialCommunityIcons name="heart-pulse" size={20} color="#FF2D55" />
                        <Text style={styles.detailSummaryVal}>{currentSelectedWorkout.avgHeartRate}</Text>
                        <Text style={styles.detailSummarySub}>Ø bpm</Text>
                      </View>
                    </>
                  ) : null}
                </View>

                <Text style={styles.detailDateText}>{currentSelectedWorkout.formattedDate}</Text>

                <Text style={styles.detailSectionHeader}>Übungen ({currentSelectedWorkout.exercises?.length || 0})</Text>

                {(currentSelectedWorkout.exercises || []).map((ex, exIdx) => {
                  const isUni = ex.isUnilateral;
                  return (
                    <View key={exIdx} style={[styles.detailExerciseCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                      <View style={styles.detailExerciseHeader}>
                        <Text style={styles.detailExerciseTitle}>{ex.name}</Text>
                        {isUni && (
                          <View style={[styles.detailUnilateralBadge, { backgroundColor: theme.accentSoftBg, borderColor: theme.accent }]}>
                            <Text style={[styles.detailUnilateralText, { color: theme.accent }]}>Unilateral</Text>
                          </View>
                        )}
                      </View>

                      <View style={[styles.detailSetsTable, { backgroundColor: theme.subCardBg }]}>
                        <View style={[styles.detailSetsTableHeader, { borderBottomColor: theme.subtleBorder }]}>
                          <Text style={[styles.detailSetsTableTh, { width: 44 }]}>SATZ</Text>
                          <Text style={[styles.detailSetsTableTh, { flex: 1 }]}>GEWICHT</Text>
                          <Text style={[styles.detailSetsTableTh, { flex: 1, textAlign: 'right' }]}>
                            {isUni ? 'WDH. (L / R)' : 'WIEDERHOLUNGEN'}
                          </Text>
                        </View>
                        {(ex.sets || []).map((set, setIdx) => (
                          <View key={setIdx} style={styles.detailSetsTableRow}>
                            <Text style={[styles.detailSetsTableTd, { width: 44, color: '#888', fontWeight: 'bold' }]}>
                              #{setIdx + 1}
                            </Text>
                            <Text style={[styles.detailSetsTableTd, { flex: 1, color: theme.accent, fontWeight: 'bold' }]}>
                              {set.weight || 0} kg
                            </Text>
                            <Text style={[styles.detailSetsTableTd, { flex: 1, textAlign: 'right', color: '#FFF' }]}>
                              {isUni 
                                ? `${set.reps || 0} / ${set.repsRight ?? set.reps ?? 0} reps`
                                : `${set.reps || 0} reps`}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>
      </Modal>

      {/* 8. IRON TACTICS TROPHY ROAD MODAL */}
      <TrophyRoadModal
        visible={trophyRoadModalVisible}
        onClose={() => setTrophyRoadModalVisible(false)}
      />

      {/* 9. MONTHLY REVIEW MODAL */}
      <MonthlyReviewModal
        visible={monthlyReviewModalVisible}
        onClose={() => setMonthlyReviewModalVisible(false)}
        initialMonth={selectedReviewMonth}
      />

      {/* 10. FLAWLESS MONTHS HISTORY MODAL */}
      <Modal visible={flawlessMonthsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.profileModalOverlay}>
          <View style={[styles.flawlessModalCard, { backgroundColor: theme.cardBg, borderColor: theme.accent }]}>
            <View style={styles.flawlessModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 24 }}>💎</Text>
                <View>
                  <Text style={styles.flawlessModalTitle}>Makellose Monate</Text>
                  <Text style={[styles.flawlessModalSub, { color: theme.accent }]}>Karriere-Meilenstein</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setFlawlessMonthsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.flawlessDescText}>
              In diesen Monaten hast du an 100% aller Tage deine Trainings- und Ernährungsziele erreicht.
            </Text>

            <ScrollView style={{ maxHeight: 280, marginVertical: 12 }}>
              {(flawlessMonths || []).length === 0 ? (
                <View style={[styles.flawlessEmptyBox, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                  <Text style={styles.flawlessEmptyText}>
                    Noch kein voller Monat mit 100% Ziel-Disziplin abgeschlossen. Schließe diesen Monat makellos ab, um dein erstes Diamant-Siegel zu erhalten!
                  </Text>
                </View>
              ) : (
                (flawlessMonths || []).map(mKey => (
                  <TouchableOpacity
                    key={mKey}
                    style={[styles.flawlessHistoryItem, { backgroundColor: theme.subCardBg, borderColor: theme.accentBorderSoft }]}
                    onPress={() => {
                      setFlawlessMonthsModalVisible(false);
                      setSelectedReviewMonth(mKey);
                      setMonthlyReviewModalVisible(true);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 20 }}>💎</Text>
                      <View>
                        <Text style={styles.flawlessItemMonth}>{formatMonthLabel(mKey)}</Text>
                        <Text style={styles.flawlessItemNote}>Tippen für Monats-Review</Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={theme.accent} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.flawlessCloseBtn, { backgroundColor: theme.subCardBg, borderWidth: 1, borderColor: theme.subtleBorder }]}
              onPress={() => setFlawlessMonthsModalVisible(false)}
            >
              <Text style={styles.flawlessCloseBtnText}>Schließen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 11. ADMIN PANEL MODAL */}
      <AdminPanelModal 
        visible={adminModalVisible} 
        onClose={() => setAdminModalVisible(false)} 
      />

      {/* 12. ACCENT THEME PICKER MODAL */}
      <AccentThemePickerModal
        visible={themePickerVisible}
        onClose={() => setThemePickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: '#121214',
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 10,
    backgroundColor: '#121214',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  adminIconBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#161C22',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#222C36',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subNavBar: {
    flexDirection: 'row',
    backgroundColor: '#12171D',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222C36',
    gap: 4,
  },
  subNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 5,
  },
  subNavBtnActive: {
    backgroundColor: '#161C22',
    borderColor: 'rgba(0, 210, 255, 0.35)',
  },
  subNavEmoji: {
    fontSize: 13,
  },
  subNavText: {
    color: '#9E9EA8',
    fontSize: 12,
    fontWeight: '800',
  },
  subNavTextActive: {
    color: '#FFF',
  },

  container: {
    flex: 1,
    backgroundColor: '#121214',
    paddingHorizontal: 16,
  },

  // Hero Profile Card
  profileCard: {
    backgroundColor: '#161C22',
    borderRadius: 22,
    padding: 16,
    marginBottom: 22,
    borderWidth: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeLvlText: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },
  rankTierTag: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  rankTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 1,
  },
  equippedTitlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.4)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 5,
  },
  equippedTitlePillText: {
    color: '#00D2FF',
    fontSize: 11,
    fontWeight: '800',
  },
  xpText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
  },
  xpSubtext: {
    color: '#9E9EA8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  xpBarContainer: {
    height: 7,
    backgroundColor: '#222C36',
    borderRadius: 4,
    marginTop: 14,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  xpMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  xpMetaLeft: {
    color: '#9E9EA8',
    fontSize: 10,
    fontWeight: '700',
  },
  xpToNext: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Career KPI Strip inside Hero Card
  careerKpiStrip: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  careerKpiPill: {
    flex: 1,
    backgroundColor: '#12171D',
    borderWidth: 1,
    borderColor: '#222C36',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  careerKpiVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFF',
  },
  careerKpiLbl: {
    fontSize: 9,
    fontWeight: '700',
    color: '#888',
    marginTop: 2,
    textTransform: 'uppercase',
  },

  // Streak & Pinned Badges Showcase
  profileStreakWidget: {
    flexDirection: 'row',
    backgroundColor: '#12171D',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222C36',
    marginTop: 12,
    padding: 11,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileStreakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakFlameBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 149, 0, 0.16)',
    borderWidth: 1.5,
    borderColor: '#FF9500',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileStreakNum: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
  },
  profileStreakLabel: {
    color: '#FFD60A',
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  streakSubPills: {
    color: '#999',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 2,
  },
  pinnedBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pinnedSlotBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Flawless Months & Review Row
  profileReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  flawlessSealButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12171D',
    borderWidth: 1.5,
    borderColor: '#00D2FF',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  flawlessSealIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00D2FF20',
    borderWidth: 1,
    borderColor: '#00D2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flawlessSealCount: {
    color: '#00D2FF',
    fontSize: 12.5,
    fontWeight: '900',
  },
  monthlyReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00D2FF',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  monthlyReviewBtnText: {
    color: '#000000',
    fontSize: 11.5,
    fontWeight: '900',
  },

  // Iron Tactics Trophy Road Row
  profileTrophyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#12171D',
    borderRadius: 12,
    marginTop: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FFD70040',
  },
  profileTrophyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trophyIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFD70018',
    borderWidth: 1,
    borderColor: '#FFD70045',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTrophyNum: {
    color: '#FFF',
    fontSize: 13.5,
    fontWeight: '900',
  },
  trophyLeagueBadge: {
    backgroundColor: '#FFD70020',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#FFD70060',
  },
  trophyLeagueBadgeText: {
    color: '#FFD700',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  profileTrophySub: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },

  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  sectionHint: {
    fontSize: 11,
    color: '#9E9EA8',
    fontWeight: '600',
  },
  sectionActionLink: {
    fontSize: 12,
    color: '#00D2FF',
    fontWeight: '800',
  },

  // Top Workouts Carousel
  topWorkoutCard: {
    backgroundColor: '#161C22',
    borderRadius: 16,
    padding: 14,
    width: 256,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 210, 255, 0.28)',
  },
  topWorkoutCardFav: {
    borderColor: '#FFD700',
  },
  topWorkoutBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recordBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  recordBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  topWorkoutTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  topWorkoutPartnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  topWorkoutPartnerText: {
    color: '#30D158',
    fontSize: 10.5,
    fontWeight: '700',
  },
  topWorkoutDate: {
    color: '#888',
    fontSize: 10.5,
  },
  topWorkoutDivider: {
    height: 1,
    backgroundColor: '#222C36',
    marginVertical: 10,
  },
  topWorkoutStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topWorkoutStatCol: {
    alignItems: 'center',
  },
  topWorkoutStatLabel: {
    color: '#777',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  topWorkoutStatVal: {
    color: '#EAEAEA',
    fontSize: 12,
    fontWeight: '800',
  },

  // TCG Mini-Grid (3-Column)
  tcgGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  tcgMiniCard: {
    width: '31%',
    aspectRatio: 3 / 4.1,
    marginHorizontal: '1.15%',
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: '#161C22',
    overflow: 'hidden',
    borderWidth: 2,
  },
  tcgMiniTopBadges: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tcgCatChip: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    maxWidth: '58%',
  },
  tcgCatChipText: {
    color: '#CCC',
    fontSize: 8,
    fontWeight: '800',
  },
  tcgLvlChip: {
    backgroundColor: 'rgba(0,0,0,0.82)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tcgLvlChipText: {
    fontSize: 9,
    fontWeight: '900',
  },
  tcgMiniMetaText: {
    color: '#999',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#12171D',
  },
  gridCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 14, 18, 0.92)',
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  gridCardText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  gridCardSubText: {
    color: '#00D2FF',
    fontSize: 10.5,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 2,
  },

  // Cardio Podium
  cardioPodiumContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardioBadgeCard: {
    flex: 1,
    backgroundColor: '#161C22',
    borderRadius: 16,
    borderWidth: 2,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardioBadgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardioBadgeType: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardioBadgeLevel: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  cardioBadgeBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#222C36',
    borderRadius: 2,
    overflow: 'hidden',
  },
  cardioBadgeBarFill: {
    height: '100%',
  },

  // Achievements Vitrine
  achFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#12171D',
    borderWidth: 1,
    borderColor: '#222C36',
  },
  achFilterPillActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.14)',
    borderColor: '#00D2FF',
  },
  achFilterPillText: {
    color: '#999',
    fontSize: 11,
    fontWeight: '800',
  },
  achFilterPillTextActive: {
    color: '#00D2FF',
  },
  achievementsGrid: {
    marginBottom: 4,
  },
  achievementBadge: {
    flexDirection: 'row',
    backgroundColor: '#161C22',
    borderRadius: 14,
    padding: 12,
    marginBottom: 9,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  achTitle: {
    fontSize: 13.5,
    fontWeight: '900',
  },
  achDesc: {
    color: '#999',
    fontSize: 11,
    marginTop: 2,
  },
  achProgressBg: {
    height: 4,
    backgroundColor: '#222C36',
    borderRadius: 2,
    marginTop: 7,
    overflow: 'hidden',
  },
  achProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  showMoreAchBtn: {
    backgroundColor: '#161C22',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  showMoreAchBtnText: {
    color: '#00D2FF',
    fontSize: 12,
    fontWeight: '800',
  },

  // Tab 2: Sammelalbum (Binder)
  binderHeaderCard: {
    backgroundColor: '#161C22',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  binderHeaderEyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#00D2FF',
    letterSpacing: 0.6,
  },
  binderHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    marginTop: 1,
  },
  fullscreenDeckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#12171D',
    borderWidth: 1,
    borderColor: '#222C36',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  fullscreenDeckBtnText: {
    color: '#00D2FF',
    fontSize: 11,
    fontWeight: '800',
  },
  binderTypeTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  binderTypeBtn: {
    flex: 1,
    backgroundColor: '#12171D',
    borderWidth: 1.5,
    borderColor: '#222C36',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  binderTypeBtnActiveCyan: {
    borderColor: '#00D2FF',
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
  },
  binderTypeBtnActiveGreen: {
    borderColor: '#30D158',
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
  },
  binderTypeBtnActivePurple: {
    borderColor: '#BF5AF2',
    backgroundColor: 'rgba(191, 90, 242, 0.12)',
  },
  binderTypeLabel: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  binderTypeCount: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  binderTipText: {
    color: '#A0A0B0',
    fontSize: 11,
    lineHeight: 15,
  },

  filterToolbarRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  searchInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161C22',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 12.5,
    paddingVertical: 0,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#161C22',
    borderWidth: 1,
    borderColor: '#222C36',
    borderRadius: 12,
    paddingHorizontal: 11,
    height: 40,
  },
  toolbarBtnText: {
    color: '#FFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  newExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#00D2FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  newExerciseBtnText: {
    color: '#000',
    fontSize: 11.5,
    fontWeight: '900',
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    backgroundColor: '#161C22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222C36',
  },
  chipActive: {
    backgroundColor: '#00D2FF',
    borderColor: '#00D2FF',
  },
  chipText: {
    color: '#AAA',
    fontSize: 11,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#000',
    fontWeight: '800',
  },
  advancedFilterDrawer: {
    backgroundColor: '#161C22',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  drawerSectionTitle: {
    color: '#888',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 6,
  },
  binderSortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#12171D',
    borderWidth: 1,
    borderColor: '#222C36',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  sortLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
  },
  sortPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sortPillActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.16)',
  },
  sortOption: {
    color: '#888',
    fontSize: 11,
    fontWeight: '800',
  },
  sortOptionActive: {
    color: '#FFF',
  },

  specialLibsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  specialLibCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#161C22',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
    borderRadius: 14,
    padding: 12,
  },
  specialLibIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialLibTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  specialLibSub: {
    color: '#999',
    fontSize: 10.5,
    marginTop: 1,
  },

  // Tab 3: Analyse & Tonnage Hero Card
  tonnageHeroCard: {
    backgroundColor: '#161C22',
    borderWidth: 1.5,
    borderColor: '#FFD700',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  tonnageEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  tonnageBigVal: {
    fontSize: 25,
    fontWeight: '900',
    color: '#FFF',
  },
  tonnageBigTons: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFD700',
  },
  tonnageKpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  tonnageKpiBox: {
    flex: 1,
    backgroundColor: '#12171D',
    borderWidth: 1,
    borderColor: '#222C36',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  tonnageKpiVal: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
  },
  tonnageKpiSub: {
    color: '#888',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 2,
  },
  tonnageModeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#12171D',
    padding: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#222C36',
  },
  tonnageModeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tonnageModeBtnActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.16)',
  },
  tonnageModeBtnText: {
    color: '#888',
    fontSize: 9.5,
    fontWeight: '800',
  },
  rangePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#12171D',
    borderWidth: 1,
    borderColor: '#222C36',
  },
  rangePillActiveGold: {
    backgroundColor: 'rgba(255, 215, 0, 0.16)',
    borderColor: '#FFD700',
  },
  rangePillActiveCyan: {
    backgroundColor: 'rgba(0, 210, 255, 0.16)',
    borderColor: '#00D2FF',
  },
  rangePillActiveGreen: {
    backgroundColor: 'rgba(48, 209, 88, 0.16)',
    borderColor: '#30D158',
  },
  rangePillText: {
    color: '#888',
    fontSize: 10,
    fontWeight: '800',
  },

  chartWrapper: {
    backgroundColor: '#161C22',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
  },
  chartTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  chartEmpty: {
    backgroundColor: '#161C22',
    borderRadius: 18,
    padding: 24,
    marginBottom: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
  },
  chartEmptyText: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyCardBox: {
    flex: 1,
    backgroundColor: '#161C22',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
  },
  emptyCardText: {
    color: '#888',
    fontSize: 12.5,
    marginTop: 8,
    textAlign: 'center',
  },

  // Music Song Rows
  songRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161C22',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  songRankText: {
    color: '#00D2FF',
    fontSize: 16,
    fontWeight: '900',
    width: 30,
  },
  songTitleText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  songArtistText: {
    color: '#888',
    fontSize: 12,
    marginTop: 1,
  },
  songPlaysCount: {
    color: '#30D158',
    fontSize: 16,
    fontWeight: '900',
  },
  songPlaysLabel: {
    color: '#888',
    fontSize: 9,
    fontWeight: '800',
  },

  // Modals & 3D Pager
  modalContainer: { flex: 1, backgroundColor: '#121212' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  closeBtn: { padding: 4, marginBottom: 12 },

  pagerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  pagerCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  pagerView: { flex: 1 },
  page: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  cardFull: { 
    width: '100%', aspectRatio: 3/4, backgroundColor: '#161C22', 
    borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: '#222C36' 
  },
  cardStatVal: { color: '#00D2FF', fontSize: 18, fontWeight: '800' },
  cardStatLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginTop: 2 },
  addPhotoBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A84FF', 
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 
  },
  addPhotoBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8 },

  profileModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  profileModalContent: { backgroundColor: '#161C22', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  deepStatBox: { width: '48%', backgroundColor: '#12171D', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#222C36' },
  deepStatVal: { color: '#00D2FF', fontSize: 22, fontWeight: '900' },
  deepStatLabel: { color: '#888', fontSize: 11.5, fontWeight: '700', marginTop: 4 },

  // Detail Modal styles
  detailSummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#161C22',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
  },
  detailSummaryCol: {
    alignItems: 'center',
    flex: 1,
  },
  detailSummaryVal: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  detailSummarySub: {
    color: '#888',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  detailSummaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#222C36',
  },
  detailDateText: {
    color: '#888',
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  detailSectionHeader: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  detailExerciseCard: {
    backgroundColor: '#161C22',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
  },
  detailExerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailExerciseTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  detailUnilateralBadge: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    borderColor: '#00D2FF',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  detailUnilateralText: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '700',
  },
  detailSetsTable: {
    backgroundColor: '#12171D',
    borderRadius: 8,
    padding: 8,
  },
  detailSetsTableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#222C36',
    paddingBottom: 6,
    marginBottom: 6,
  },
  detailSetsTableTh: {
    color: '#666',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailSetsTableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  detailSetsTableTd: {
    fontSize: 13,
  },

  // Flawless Modal Card
  flawlessModalCard: {
    backgroundColor: '#161C22',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 2,
    borderColor: '#00D2FF',
  },
  flawlessModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  flawlessModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  flawlessModalSub: {
    color: '#00D2FF',
    fontSize: 11,
    fontWeight: '700',
  },
  flawlessDescText: {
    color: '#A0A0B5',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  flawlessEmptyBox: {
    padding: 18,
    backgroundColor: '#12171D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222C36',
    alignItems: 'center',
  },
  flawlessEmptyText: {
    color: '#8E8E93',
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
  },
  flawlessHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#12171D',
    borderWidth: 1.5,
    borderColor: '#00D2FF50',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  flawlessItemMonth: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  flawlessItemNote: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  flawlessCloseBtn: {
    backgroundColor: '#12171D',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  flawlessCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
