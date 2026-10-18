import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Image, Alert, Dimensions, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, Exercise, showCustomAlert, CompletedWorkout } from '../store/store';
import { calculateStreaks } from '../utils/streakEngine';
import { getLevelData, calculateAchievements, getCardioLevelData, getRecipeLevelData, AchievementBadge } from '../utils/gamification';
import { useCardioStore } from '../store/useCardioStore';
import { useMusicStore } from '../store/useMusicStore';
import { PRELOADED_EXERCISES, RADAR_GROUPS } from '../data/exercises';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { AdminPanelModal } from '../components/AdminPanelModal';
import * as ImagePicker from 'expo-image-picker';
import PagerView from 'react-native-pager-view';
import { LineChart } from 'react-native-chart-kit';
import { useBottomSpacing } from '../hooks/useBottomSpacing';
import { StreakGlow } from '../components/StreakGlow';
import { HeroClassIcon } from '../components/HeroClassIcon';
import { EmblemIcon } from '../components/EmblemIcon';
import { LevelProgressionModal } from '../components/LevelProgressionModal';
import { ExerciseManagerModal } from '../components/ExerciseManagerModal';
import { useAutoChessStore } from '../store/useAutoChessStore';
import { TrophyRoadModal, TROPHY_MILESTONES } from '../components/tcg/TrophyRoadModal';
import { MonthlyReviewModal } from '../components/MonthlyReviewModal';
import { formatMonthLabel } from '../utils/monthlyReviewEngine';
type SortMode = 'pr' | 'sets' | 'reps' | 'volume';
type FilterMode = 'In Plan' | 'All';


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
  setExerciseTimeRange
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
          { borderColor: borderColor, borderWidth: 8, backgroundColor: '#1A1A1A', aspectRatio: 2.5/3.5, padding: 0, position: 'absolute', backfaceVisibility: 'hidden', transform: [{ rotateY: frontInterpolate }] }
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
                  <Text style={[styles.cardStatVal, { color: '#00D2FF', fontSize: 18 }]}>{Math.round(displayPro)}g</Text>
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
                  <Text style={[styles.cardStatVal, { color: '#00D2FF', fontSize: 18 }]}>{(item as any).supplementData.currentInventory || 0}</Text>
                  <Text style={styles.cardStatLabel}>LEFT</Text>
                </View>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <MaterialCommunityIcons name="rotate-3d-variant" size={16} color="#DDD" style={{ marginRight: 6 }} />
              <Text style={{ color: '#DDD', fontSize: 14 }}>{collectionType === 'Recipes' ? 'Tap for Ingredients' : collectionType === 'Supplements' ? 'Tap for Info' : 'Tap for Chart'}</Text>
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
          { borderColor: borderColor, borderWidth: 8, backgroundColor: '#1A1A1A', aspectRatio: 2.5/3.5, padding: 0, position: 'absolute', backfaceVisibility: 'hidden', transform: [{ rotateY: backInterpolate }] }
        ]} pointerEvents={flipped ? 'auto' : 'none'}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#333' }}>
            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', flex: 1, textTransform: 'uppercase' }} numberOfLines={1}>
              {collectionType === 'Recipes' ? 'Ingredients' : collectionType === 'Supplements' ? 'Inventory Info' : 'Weight Progression'}
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
                            backgroundColor: exerciseTimeRange === range ? '#00D2FF20' : '#2A2A2A',
                            borderWidth: 1, borderColor: exerciseTimeRange === range ? '#00D2FF' : '#444'
                          }}
                        >
                          <Text style={{ color: exerciseTimeRange === range ? '#00D2FF' : '#888', fontSize: 12, fontWeight: '700' }}>
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
                        backgroundGradientFrom: '#1A1A1A',
                        backgroundGradientFromOpacity: 0,
                        backgroundGradientTo: '#1A1A1A',
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
                    <Text style={{ color: '#888', marginTop: 12, textAlign: 'center' }}>No history found to generate chart.</Text>
                  </View>
                )}
              </View>
            )}

            {collectionType === 'Recipes' && recipe && (
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8 }}>
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Portions</Text>
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
                            {Math.round(amount)} {ing.ingredient?.baseAmount === 100 ? 'g/ml' : 'pcs'}
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No ingredients available.</Text>
                  )}
                </ScrollView>
              </View>
            )}

            {collectionType === 'Supplements' && (item as any).supplementData && (
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8 }}>
                  <Text style={{ color: '#FFF', fontWeight: '800' }}>Stock Remaining</Text>
                  <Text style={{ color: '#00D2FF', fontWeight: '800' }}>{(item as any).supplementData.currentInventory} {(item as any).supplementData.unit}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8 }}>
                  <Text style={{ color: '#FFF', fontWeight: '800' }}>Unit Size</Text>
                  <Text style={{ color: borderColor, fontWeight: '800' }}>{(item as any).supplementData.contentPerUnit}mg</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8 }}>
                  <Text style={{ color: '#FFF', fontWeight: '800' }}>Units per Box</Text>
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
  const { playlists } = useMusicStore();
  const [musicStatsModalVisible, setMusicStatsModalVisible] = useState(false);
  const [musicTimeRange, setMusicTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [workoutTimeRange, setWorkoutTimeRange] = useState<'1w' | '1m' | '1y'>('1w');
  const [nutritionTimeRange, setNutritionTimeRange] = useState<'1w' | '1m' | '1y'>('1w');
  const [exerciseTimeRange, setExerciseTimeRange] = useState<'1w' | '1m' | '1y'>('1w');
  const [selectedTopWorkout, setSelectedTopWorkout] = useState<CompletedWorkout | null>(null);
  const [workoutDetailModalVisible, setWorkoutDetailModalVisible] = useState(false);
  const [trophyRoadModalVisible, setTrophyRoadModalVisible] = useState(false);
  const autoChessTrophies = useAutoChessStore(state => state.trophies);
  const trophyMilestonesClaimed = useAutoChessStore(state => state.trophyMilestonesClaimed || []);


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

  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  
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
    fitCoins,
    restDayTokens,
    useRestDayToken,
    juggernautXP,
    aestheticXP,
    rangerXP,
    monkXP,
    equippedTitle,
    setEquippedTitle,
    quests,
    freeRerollsLeft,
    generateQuests,
    rerollQuest,
    mealLogCounts,
    toggleFavoriteWorkout,
    flawlessMonths,
    checkAndUpdateFlawlessMonths,
  } = useAppStore();

  const [monthlyReviewModalVisible, setMonthlyReviewModalVisible] = useState(false);
  const [flawlessMonthsModalVisible, setFlawlessMonthsModalVisible] = useState(false);
  const [selectedReviewMonth, setSelectedReviewMonth] = useState<string | undefined>(undefined);

  useEffect(() => {
    checkAndUpdateFlawlessMonths();
  }, []);

  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const adminStreakOverride = useAppStore(state => state.adminStreakOverride);
  const _streaks = calculateStreaks(workoutHistory, workoutPrograms, nutritionHistory, consumedToday, targets);
  const streaks = adminStreakOverride !== null ? { ..._streaks, overall: adminStreakOverride } : _streaks;

  const [collectionModalVisible, setCollectionModalVisible] = useState(false);
  const [collectionType, setCollectionType] = useState<'Exercises' | 'Recipes' | 'Supplements'>('Exercises');
  
  const cardioXP = useCardioStore(state => state.cardioXP) || {};
  const cardioHistory = useCardioStore(state => state.history) || [];

  const topCardio = useMemo(() => {
    return Object.entries(cardioXP)
      .map(([type, xp]) => ({ type, xp, ...getCardioLevelData(xp as number) }))
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 3);
  }, [cardioXP]);

  const [cardioModalVisible, setCardioModalVisible] = useState(false);
  const [selectedCardioType, setSelectedCardioType] = useState<string | null>(null);
  const [splitsExpanded, setSplitsExpanded] = useState(false);
  const [caloriesExpanded, setCaloriesExpanded] = useState(false);

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

  // Advanced Exercise Filters
  const [filterMode, setFilterMode] = useState<FilterMode>('In Plan');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('All');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [sortMode, setSortMode] = useState<SortMode>('pr');
  const [managerVisible, setManagerVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  const [pagerModalVisible, setPagerModalVisible] = useState(false);
  const [initialPage, setInitialPage] = useState(0);
  const [customPagerItems, setCustomPagerItems] = useState<any[] | null>(null);
  
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Quests' | 'Legacy'>('Dashboard');
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);
  const [titleModalVisible, setTitleModalVisible] = useState(false);
  const [badgePickerVisible, setBadgePickerVisible] = useState(false);
  const [selectingBadgeSlot, setSelectingBadgeSlot] = useState<number | null>(null);

  type DetailNode = { type: 'class' | 'cardio' | 'achievement'; name: string; iconName?: string; xp: number; thresholds?: number[]; desc?: string } | null;
  const [detailNode, setDetailNode] = useState<DetailNode>(null);

  // --- Compute RPG Data ---
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
  
  // Total Deep Stats (for modal)
  let totalWorkouts = workoutHistory.length;
  let totalReps = 0;
  let totalSets = 0;
  let totalVolume = 0;
  const muscleGroupsCount: Record<string, number> = {};
  
  workoutHistory.forEach(w => {
    w.exercises.forEach(ex => {
      totalSets += ex.sets.length;
      // Pre-fill muscle group if possible (simple heuristic)
      const baseEx = [...PRELOADED_EXERCISES, ...customExercises].find(e => e.name === ex.name);
      if (baseEx && baseEx.category) {
        muscleGroupsCount[baseEx.category] = (muscleGroupsCount[baseEx.category] || 0) + 1;
      }
      ex.sets.forEach(set => {
        totalReps += set.reps || 0;
        totalVolume += (set.reps || 0) * (set.weight || 0);
      });
    });
  });
  
  let topMuscle = 'None';
  let mCount = 0;
  Object.entries(muscleGroupsCount).forEach(([m, c]) => {
    if (c > mCount) {
      mCount = c;
      topMuscle = m;
    }
  });

  // --- Aggregate Stats per Exercise ---
  const exerciseStats = useMemo(() => {
    const stats: Record<string, { totalSets: number; totalReps: number; totalVolume: number; pr: number; history: {date: string, maxWeight: number}[] }> = {};
    
    // Sort workout history chronologically (assuming earliest to latest, or just by date string)
    const sortedHistory = [...workoutHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedHistory.forEach(workout => {
      workout.exercises.forEach(ex => {
        if (!stats[ex.name]) {
          stats[ex.name] = { totalSets: 0, totalReps: 0, totalVolume: 0, pr: 0, history: [] };
        }
        
        let dailyMax = 0;
        stats[ex.name].totalSets += ex.sets.length;
        
        ex.sets.forEach(set => {
          const reps = set.reps || 0;
          const weight = set.weight || 0;
          stats[ex.name].totalReps += reps;
          stats[ex.name].totalVolume += reps * weight;
          if (weight > stats[ex.name].pr) stats[ex.name].pr = weight;
          
          if (reps > 0 && weight > dailyMax) {
            dailyMax = weight;
          }
        });

        const hadReps = ex.sets.some(s => (s.reps || 0) > 0);
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
      let totalSets = 0;
      let totalReps = 0;

      (w.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(s => {
          totalSets += 1;
          const r = (s.reps || 0) + (s.repsRight || 0);
          totalReps += r;
          totalWeightMoved += (s.weight || 0) * r;
        });
      });

      const fairVolumeScore = (totalSets * 12) + totalReps;

      return {
        totalWeightMoved,
        totalSets,
        totalReps,
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
      addBadge((longestWorkout as any).workout, { label: 'Dauer-Rekord', color: '#00D2FF', icon: 'clock-outline' });
    }
    if (mostVolumeWorkout) {
      addBadge((mostVolumeWorkout as any).workout, { label: 'Volumen-Rekord', color: '#FF9500', icon: 'lightning-bolt' });
    }
    if (heaviestWorkout) {
      addBadge((heaviestWorkout as any).workout, { label: 'Tonnage-Rekord', color: '#FF3B30', icon: 'trophy' });
    }

    // Add manual favorites / pinned highlights
    workoutHistory.filter(w => w.isFavorite).forEach(w => {
      addBadge(w, { label: 'Highlight', color: '#FFD700', icon: 'star' });
    });

    return Array.from(map.values());
  }, [workoutHistory]);

  const currentSelectedWorkout = selectedTopWorkout 
    ? workoutHistory.find(w => w.id === selectedTopWorkout.id) || selectedTopWorkout
    : null;

  // --- Top Exercises ---
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
  const inPlanExercises = new Set<string>();
  if (activeProgram && activeProgram.workouts) {
    activeProgram.workouts.forEach(plan => {
      plan.exercises.forEach(ex => inPlanExercises.add(ex.name));
    });
  }

  // --- Collectibles Logic ---
  const baseExercises = [
    ...PRELOADED_EXERCISES.map(e => ({ name: e.name, category: e.category, equipmentType: (e as any).equipmentType, brand: (e as any).brand, type: 'preloaded' })), 
    ...customExercises.map(e => ({ name: e.name, category: e.category, equipmentType: e.equipmentType, brand: e.brand, type: 'custom' }))
  ].filter(e => !hiddenExercises.includes(e.name));

  const filteredExercises = baseExercises.filter(e => {
    if (filterMode === 'In Plan' && !inPlanExercises.has(e.name)) return false;
    if (selectedMuscle !== 'All' && e.category !== selectedMuscle) return false;
    if (selectedEquipment !== 'All' && e.equipmentType !== selectedEquipment) return false;
    if (selectedBrand !== 'All' && e.brand !== selectedBrand) return false;
    return true;
  });

  const sortedExercises = [...filteredExercises].sort((a, b) => {
    const statsA = exerciseStats[a.name] || { totalSets: 0, totalReps: 0, totalVolume: 0, pr: 0 };
    const statsB = exerciseStats[b.name] || { totalSets: 0, totalReps: 0, totalVolume: 0, pr: 0 };
    if (sortMode === 'sets') return statsB.totalSets - statsA.totalSets;
    if (sortMode === 'reps') return statsB.totalReps - statsA.totalReps;
    if (sortMode === 'volume') return statsB.totalVolume - statsA.totalVolume;
    return statsB.pr - statsA.pr;
  });

  const collectionItems = collectionType === 'Exercises' 
    ? sortedExercises.map(e => ({ id: `exercise_${e.name}`, name: e.name, type: e.type, category: e.category }))
    : collectionType === 'Recipes'
    ? savedMeals.map(m => ({ id: `recipe_${m.name}`, name: m.name, type: 'recipe', category: 'Nutrition', recipeData: m }))
    : (supplementLibrary || []).map(s => ({ id: `supp_${s.id}`, name: s.name, type: 'supplement', category: s.category, supplementData: s }));

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
        setCollectibleImage(id, sourceUri); // Fallback
      }
    }
  };

  const handleDeleteItem = (item: { id: string, name: string, type: string }) => {
    showCustomAlert(
      "Remove Item",
      `Are you sure you want to remove ${item.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: () => {
            if (item.type === 'preloaded') hidePreloadedExercise(item.name);
            else if (item.type === 'custom') deleteCustomExercise(item.name);
          }
        }
      ]
    );
  };

  const openCollection = (type: 'Exercises' | 'Recipes' | 'Supplements') => {
    setCollectionType(type);
    setCollectionModalVisible(true);
  };

  const openPager = (index: number) => {
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

  // --- Main Stats Charts ---
  const workoutChartData = useMemo(() => {
    const days = workoutTimeRange === '1w' ? 7 : workoutTimeRange === '1m' ? 30 : 365;
    const now = new Date().getTime();
    const filtered = [...workoutHistory]
      .filter(w => now - new Date(w.date).getTime() <= days * 24 * 60 * 60 * 1000)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
    if (filtered.length === 0) return null;
    
    return {
      labels: filtered.map((w, i) => {
        if (filtered.length > 7 && i % Math.ceil(filtered.length / 7) !== 0 && i !== filtered.length - 1) return '';
        const dateStr = w.date.substring(5, 10);
        const [month, day] = dateStr.split('-');
        return `${day}-${month}`;
      }),
      datasets: [{
        data: filtered.map(w => {
          let vol = 0;
          w.exercises.forEach(e => e.sets.forEach(s => vol += (s.weight || 0) * (s.reps || 0)));
          return vol;
        })
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
    
    return {
      labels: filtered.map((n, i) => {
        if (filtered.length > 7 && i % Math.ceil(filtered.length / 7) !== 0 && i !== filtered.length - 1) return '';
        const dateStr = n.date.substring(5, 10);
        const [month, day] = dateStr.split('-');
        return `${day}-${month}`;
      }),
      datasets: [{
        data: filtered.map(n => n.calories)
      }]
    };
  }, [nutritionHistory, nutritionTimeRange]);

  return (
    <>
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
                <Text style={{ color: '#00D2FF', fontSize: 16, fontWeight: '700', marginBottom: 12 }}>Lifetime Stats</Text>
                
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
                  style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: cardioAggregates.type === 'distance' && !(cardioAggregates as any).fastest10k ? 8 : (cardioAggregates.type === 'distance' ? 0 : 0), paddingTop: 8, borderTopWidth: 1, borderColor: '#333' }}
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
                    <Text style={{ color: '#00D2FF', fontSize: 18, fontWeight: '800' }}>
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
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ paddingBottom: bottomSpacing }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={styles.title}>Player Profile</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => setAdminModalVisible(true)} 
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ width: 40, height: 40, backgroundColor: '#26262B', borderRadius: 10, borderWidth: 1, borderColor: '#3A3A44', justifyContent: 'center', alignItems: 'center' }}
          >
            <MaterialCommunityIcons name="shield-account" size={22} color="#00D2FF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ width: 40, height: 40, backgroundColor: '#26262B', borderRadius: 10, borderWidth: 1, borderColor: '#3A3A44', justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="store" size={22} color="#FFD700" />
          </TouchableOpacity>
        </View>
      </View>

      {/* TABS REMOVED */}


      {activeTab === 'Dashboard' && (<>
      {/* PLAYER PROFILE CARD */}
      <TouchableOpacity 
        style={[styles.profileCard, { borderColor: levelData.rankColor }]} 
        activeOpacity={0.9}
        onPress={() => setProfileModalVisible(true)}
      >
        <View style={styles.profileHeader}>
          <View style={styles.rankBadge}>
            <MaterialCommunityIcons name="shield-star" size={32} color={levelData.rankColor} />
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <TouchableOpacity onPress={() => setTitleModalVisible(true)}>
              <Text style={[styles.rankTitle, { color: levelData.rankColor }]}>{levelData.title}</Text>
              {equippedTitle && <Text style={{ color: '#00D2FF', fontSize: 12, fontWeight: '700', marginTop: 4 }}>« {equippedTitle} »</Text>}
            </TouchableOpacity>
            <Text style={styles.levelText}>Level {levelData.level}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.xpText}>{Math.round(levelData.totalXP)} XP</Text>
            <Text style={styles.xpSubtext}>Total Exp</Text>
          </View>
        </View>

        <View style={styles.xpBarContainer}>
          <View style={[styles.xpBarFill, { width: `${Math.min(100, (levelData.progressXP / levelData.neededXP) * 100)}%`, backgroundColor: levelData.rankColor }]} />
        </View>
        <Text style={styles.xpToNext}>{Math.round(levelData.neededXP - levelData.progressXP)} XP to Level {levelData.level + 1}</Text>

        {/* Master Streak & Currency Widget Inside Profile */}
        <View style={styles.profileStreakWidget}>
          <StreakGlow streak={streaks.overall}>
          <View style={styles.profileStreakLeft}>
            {streaks.overall >= 30 ? (
              <Text style={{ fontSize: 24, marginRight: 8 }}>🔥</Text>
            ) : (
              <MaterialCommunityIcons name="crown" size={24} color="#FFD60A" />
            )}
            <Text style={styles.profileStreakNum}>{streaks.overall}</Text>
            <Text style={styles.profileStreakLabel}>Master Streak</Text>
          </View>
          </StreakGlow>
          <View style={{ width: 1, backgroundColor: '#333' }} />
          <View style={[styles.profileStreakRight, { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', flex: 1, paddingRight: 4 }]}>
            {[0, 1, 2].map(slotIndex => {
              const pinnedId = (pinnedAchievements || [])[slotIndex];
              const ach = pinnedId ? allBadges.find(a => a.id === pinnedId) : null;
              
              return (
                <TouchableOpacity 
                  key={slotIndex} 
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: ach ? (ach.tier !== 'Locked' ? ach.tierColor + '20' : '#222') : '#222', borderWidth: 1, borderColor: ach && ach.tier !== 'Locked' ? ach.tierColor : '#444', justifyContent: 'center', alignItems: 'center' }}
                  onPress={(e) => { e.stopPropagation(); setSelectingBadgeSlot(slotIndex); setBadgePickerVisible(true); }}
                >
                  {ach && ach.tier !== 'Locked' ? (
                    <EmblemIcon icon={ach.icon || 'trophy'} color={ach.tierColor} size={20} />
                  ) : (
                    <MaterialCommunityIcons name="plus" size={20} color="#666" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Iron Tactics Trophäen Pfad Row */}
        <TouchableOpacity
          style={styles.profileTrophyRow}
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
              <Text style={styles.profileTrophySub}>Iron Tactics • Belohnungen & Stufen ➔</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#FFD700" />
        </TouchableOpacity>

        {/* Monats-Review & Makellose Monate Row */}
        <View style={styles.profileReviewRow}>
          <TouchableOpacity
            style={styles.flawlessSealButton}
            activeOpacity={0.8}
            onPress={(e) => {
              e.stopPropagation();
              setFlawlessMonthsModalVisible(true);
            }}
          >
            <View style={styles.flawlessSealIconCircle}>
              <Text style={{ fontSize: 16 }}>💎</Text>
            </View>
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={styles.flawlessSealCount}>
                {(flawlessMonths || []).length} Makellose Monate
              </Text>
              <Text style={styles.flawlessSealSub}>100% Dauerhaft gesichert ➔</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.monthlyReviewBtn}
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
      </TouchableOpacity>

      {/* TOP WORKOUTS BANNER */}
      {topWorkouts.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <View style={styles.achievementsHeader}>
            <Text style={styles.subtitle}>Top Workouts & Rekorde</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
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
                    isFav && styles.topWorkoutCardFav,
                  ]}
                  onPress={() => {
                    setSelectedTopWorkout(workout);
                    setWorkoutDetailModalVisible(true);
                  }}
                >
                  {/* Badges & Favorite Star */}
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

                  {/* Workout Title */}
                  <Text style={styles.topWorkoutTitle} numberOfLines={1}>{displayName}</Text>

                  {/* Partner Badge */}
                  {workout.trainingPartner ? (
                    <View style={styles.topWorkoutPartnerRow}>
                      <MaterialCommunityIcons name="account-multiple" size={12} color="#30D158" style={{ marginRight: 4 }} />
                      <Text style={styles.topWorkoutPartnerText} numberOfLines={1}>mit {workout.trainingPartner}</Text>
                    </View>
                  ) : null}

                  {/* Date */}
                  <Text style={styles.topWorkoutDate}>{workout.formattedDate}</Text>

                  {/* Divider */}
                  <View style={styles.topWorkoutDivider} />

                  {/* Stats Row */}
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

      {/* TOP EXERCISES */}
      {topExercises.length > 0 && (
        <>
          <View style={styles.achievementsHeader}>
            <Text style={styles.subtitle}>Best Exercises</Text>
          </View>
          <View style={[styles.gridContainer, { paddingBottom: 10, paddingHorizontal: 16 }]}>
            {topExercises.map((ex, index) => {
              const { getResolvedUri } = require('../utils/uriResolver');
              const imageUri = getResolvedUri(collectibleImages[`exercise_${ex.name}`]);
              const stats = ex.stats;
              const xp = (stats?.totalSets || 0) * 10;
              const levelData = getLevelData(xp);
              const rankColor = levelData.rankColor;

              return (
                <TouchableOpacity 
                  key={ex.name} 
                  activeOpacity={0.8}
                  style={[styles.gridCard, { borderColor: rankColor, borderWidth: 2 }]}
                  onPress={() => openTopExerciseCard(index)}
                >
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.gridImage} />
                  ) : (
                    <View style={styles.gridPlaceholder}>
                      <MaterialCommunityIcons name="dumbbell" size={32} color={rankColor} />
                    </View>
                  )}
                  <View style={styles.gridCardOverlay}>
                    <Text style={styles.gridCardText} numberOfLines={1}>{ex.name}</Text>
                    <Text style={{color: '#AAA', fontSize: 9, textAlign: 'center', marginTop: 2}}>
                      {stats.totalSets} Sets • {stats.totalVolume > 1000 ? (stats.totalVolume/1000).toFixed(1) + 't' : stats.totalVolume + 'kg'}
                    </Text>
                    {stats.pr > 0 && (
                      <Text style={[styles.gridCardSubText, { color: rankColor, fontSize: 11 }]}>PR: {stats.pr} kg</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* TOP CARDIO DISCIPLINES */}
      <View style={styles.achievementsHeader}>
        <Text style={styles.subtitle}>Top Cardio Disciplines</Text>
      </View>
      <View style={styles.cardioPodiumContainer}>
        {topCardio.length > 0 ? (
          topCardio.map((cardio, index) => {
            // Get icon for type
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
                style={[styles.cardioBadgeCard, { borderColor: cardio.rankColor }]}
                onPress={() => {
                  setSelectedCardioType(cardio.type);
                  setDetailNode({ type: 'cardio', name: cardio.type, xp: cardio.totalXP || cardio.progressXP + cardio.neededXP });
                }}
              >
                <View style={[styles.cardioBadgeIcon, { backgroundColor: cardio.rankColor + '20' }]}>
                  <MaterialCommunityIcons name={getIcon(cardio.type) as any} size={28} color={cardio.rankColor} />
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
          <View style={{ flex: 1, backgroundColor: '#1E1E1E', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#333' }}>
            <MaterialCommunityIcons name="run-fast" size={32} color="#555" />
            <Text style={{ color: '#888', marginTop: 8, textAlign: 'center' }}>Complete a Cardio session to unlock levels and see your top disciplines here.</Text>
          </View>
        )}
      </View>

      {/* ACHIEVEMENTS SECTION (Moved to Dashboard) */}
      <View style={styles.achievementsHeader}>
        <Text style={styles.subtitle}>Achievements</Text>
        <TouchableOpacity onPress={() => setAchievementsExpanded(!achievementsExpanded)}>
          <Text style={{ color: '#00D2FF', fontWeight: '700' }}>{achievementsExpanded ? 'Show Less' : 'Show All'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.achievementsGrid}>
        {(achievementsExpanded ? achievements : achievements.slice(0, 3)).map((ach) => {
          const isCompleted = ach.tier !== 'Locked';
          const tierColor = ach.tierColor;
          const progressPercent = ach.max > 0 ? (ach.progress / ach.max) * 100 : 0;

          return (
          <TouchableOpacity key={ach.id} onPress={() => setDetailNode({ type: 'achievement', name: ach.title, xp: ach.progress, thresholds: (ach as any).thresholds, desc: ach.description })} style={[styles.achievementBadge, { borderColor: isCompleted ? tierColor : '#333', backgroundColor: '#161618' }]}>
            <EmblemIcon icon={isCompleted ? (ach.icon || 'trophy') : 'lock'} color={isCompleted ? tierColor : '#333'} size={56} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.achTitle, { color: isCompleted ? tierColor : '#FFF' }]}>{ach.title}</Text>
              <Text style={styles.achDesc}>{ach.description}</Text>
              <View style={styles.achProgressBg}>
                <View style={[styles.achProgressFill, { width: `${Math.min(100, progressPercent)}%`, backgroundColor: isCompleted ? tierColor : '#00D2FF' }]} />
              </View>
            </View>
          </TouchableOpacity>
        )
        })}
      </View>
      </>)}

      {activeTab === 'Quests' && (<>
      {/* QUESTS SECTION */}
      <View style={styles.achievementsHeader}>
        <Text style={styles.subtitle}>Bounty Board</Text>
        <TouchableOpacity onPress={generateQuests}>
          <Text style={{ color: '#00D2FF', fontWeight: '700' }}>Refresh</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ color: '#888', marginBottom: 8 }}>Free Rerolls: {freeRerollsLeft} (Costs 20 🪙 after)</Text>
      <View style={{ gap: 8, marginBottom: 24 }}>
        {[...(quests?.daily || []), ...(quests?.weekly || [])].map(q => (
          <View key={q.id} style={{ backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: q.completed ? '#30D158' : '#333' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: q.completed ? '#30D158' : '#FFF', fontWeight: 'bold' }}>
                  {q.title} <Text style={{ color: '#888', fontSize: 10 }}>({q.type.toUpperCase()})</Text>
                </Text>
                <Text style={{ color: '#888', fontSize: 12 }}>{q.description}</Text>
                <Text style={{ color: '#00D2FF', fontSize: 12, marginTop: 4 }}>Reward: {q.rewardCoins} 🪙 | {q.rewardXP} XP</Text>
                <View style={{ height: 4, backgroundColor: '#333', borderRadius: 2, marginTop: 8, width: '80%' }}>
                  <View style={{ height: 4, backgroundColor: q.completed ? '#30D158' : '#00D2FF', borderRadius: 2, width: `${Math.min(100, (q.progress / q.goal) * 100)}%` }} />
                </View>
              </View>
              {!q.completed && (
                <TouchableOpacity style={{ padding: 8, backgroundColor: '#333', borderRadius: 8 }} onPress={() => rerollQuest(q.id, q.type)}>
                  <MaterialCommunityIcons name="refresh" size={20} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
      </>)}

      {activeTab === 'Legacy' && (<>
        <Text style={{ color: '#888', textAlign: 'center', marginTop: 40, fontStyle: 'italic' }}>Legacy collections and vault items will appear here.</Text>
      </>)}

      <Text style={[styles.subtitle, { marginTop: 24 }]}>History Trends</Text>
      {workoutChartData ? (
        <View style={styles.chartWrapper}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.chartTitle, { marginBottom: 0 }]}>Workout Volume (kg)</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {['1w', '1m', '1y'].map(range => (
                <TouchableOpacity key={range} onPress={() => setWorkoutTimeRange(range as any)} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: workoutTimeRange === range ? '#00D2FF20' : '#2A2A2A', borderWidth: 1, borderColor: workoutTimeRange === range ? '#00D2FF' : '#444' }}>
                  <Text style={{ color: workoutTimeRange === range ? '#00D2FF' : '#888', fontSize: 10, fontWeight: '700' }}>{range.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <LineChart
            data={workoutChartData}
            width={screenWidth - 64}
            height={220}
            chartConfig={{
              backgroundColor: '#1E1E1E',
              backgroundGradientFrom: '#1E1E1E',
              backgroundGradientTo: '#1E1E1E',
              color: (opacity = 1) => `rgba(0, 210, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#00D2FF' },
              decimalPlaces: 0,
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 8, transform: [{ translateX: -10 }] }}
          />
        </View>
      ) : (
        <View style={styles.chartEmpty}>
          <Text style={styles.chartEmptyText}>Not enough workout data.</Text>
        </View>
      )}

      {nutritionChartData ? (
        <View style={styles.chartWrapper}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.chartTitle, { marginBottom: 0 }]}>Calories Consumed (kcal)</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {['1w', '1m', '1y'].map(range => (
                <TouchableOpacity key={range} onPress={() => setNutritionTimeRange(range as any)} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: nutritionTimeRange === range ? 'rgba(48, 209, 88, 0.2)' : '#2A2A2A', borderWidth: 1, borderColor: nutritionTimeRange === range ? '#30D158' : '#444' }}>
                  <Text style={{ color: nutritionTimeRange === range ? '#30D158' : '#888', fontSize: 10, fontWeight: '700' }}>{range.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <LineChart
            data={nutritionChartData}
            width={screenWidth - 64}
            height={220}
            chartConfig={{
              backgroundColor: '#1E1E1E',
              backgroundGradientFrom: '#1E1E1E',
              backgroundGradientTo: '#1E1E1E',
              color: (opacity = 1) => `rgba(48, 209, 88, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#30D158' },
              decimalPlaces: 0,
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 8, transform: [{ translateX: -10 }] }}
          />
        </View>
      ) : (
        <View style={styles.chartEmpty}>
          <Text style={styles.chartEmptyText}>Not enough nutrition data.</Text>
        </View>
      )}

      <Text style={[styles.subtitle, { marginTop: 24 }]}>Your Collection</Text>
      
      <TouchableOpacity style={styles.collectionBtn} onPress={() => openCollection('Exercises')}>
        <MaterialCommunityIcons name="cards-playing-outline" size={28} color="#00D2FF" />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.collectionBtnTitle}>Exercises</Text>
          <Text style={styles.collectionBtnSub}>{baseExercises.length} Discovered</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#555" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.collectionBtn} onPress={() => openCollection('Recipes')}>
        <MaterialCommunityIcons name="food-apple-outline" size={28} color="#30D158" />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.collectionBtnTitle}>Recipes</Text>
          <Text style={styles.collectionBtnSub}>{savedMeals.length} Discovered</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#555" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.collectionBtn} onPress={() => openCollection('Supplements')}>
        <MaterialCommunityIcons name="pill" size={28} color="#00D2FF" />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.collectionBtnTitle}>Supplements</Text>
          <Text style={styles.collectionBtnSub}>{(supplementLibrary || []).length} Discovered</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#555" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.collectionBtn} onPress={() => navigation.navigate('StretchingLibrary')}>
        <MaterialCommunityIcons name="yoga" size={28} color="#FF9500" />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.collectionBtnTitle}>Stretching Library</Text>
          <Text style={styles.collectionBtnSub}>View Rehab Hero Exercises</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#555" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.collectionBtn} onPress={() => navigation.navigate('CoreLibrary')}>
        <MaterialCommunityIcons name="dumbbell" size={28} color="#FF3B30" />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.collectionBtnTitle}>Core Exercises</Text>
          <Text style={styles.collectionBtnSub}>View Ab & Core Routines</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#555" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.collectionBtn} onPress={() => setMusicStatsModalVisible(true)}>
        <MaterialCommunityIcons name="music-box-multiple" size={28} color="#FFD60A" />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.collectionBtnTitle}>Music Stats</Text>
          <Text style={styles.collectionBtnSub}>Your Top Tracks</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#555" />
      </TouchableOpacity>

      {/* Grid Modal */}
      <Modal visible={collectionModalVisible} animationType="slide">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCollectionModalVisible(false)} style={styles.closeBtn}>
              <MaterialCommunityIcons name="chevron-down" size={32} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{collectionType} Collection</Text>
            <TouchableOpacity onPress={() => openPager(0)} style={styles.playBtn}>
              <MaterialCommunityIcons name="play-circle" size={28} color="#00D2FF" />
            </TouchableOpacity>
          </View>
          
          {collectionType === 'Exercises' && (
            <View style={styles.filterSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }}>
                <TouchableOpacity 
                  style={{ backgroundColor: '#1E1E1E', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#333', flex: 1, marginRight: 8 }}
                  onPress={() => setFiltersExpanded(!filtersExpanded)}
                >
                  <MaterialCommunityIcons name="filter-variant" size={20} color="#00D2FF" />
                  <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 8 }}>
                    Filters {(!['All', 'In Plan'].includes(filterMode) || selectedMuscle !== 'All' || selectedEquipment !== 'All' || selectedBrand !== 'All') && ' (Active)'}
                  </Text>
                  <MaterialCommunityIcons name={filtersExpanded ? "chevron-up" : "chevron-down"} size={20} color="#888" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ backgroundColor: '#00D2FF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => { setEditingExercise(null); setManagerVisible(true); }}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#000" />
                  <Text style={{ color: '#000', fontWeight: 'bold', marginLeft: 4 }}>New</Text>
                </TouchableOpacity>
              </View>

              {filtersExpanded && (
                <View style={{ backgroundColor: '#161618', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#333', marginBottom: 12 }}>
                  {/* Toggle In Plan / All */}
                  <View style={styles.toggleRow}>
                    <TouchableOpacity 
                      style={[styles.toggleBtn, filterMode === 'In Plan' && styles.toggleBtnActive]}
                      onPress={() => setFilterMode('In Plan')}
                    >
                      <Text style={[styles.toggleBtnText, filterMode === 'In Plan' && styles.toggleBtnTextActive]}>In Plan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.toggleBtn, filterMode === 'All' && styles.toggleBtnActive]}
                      onPress={() => setFilterMode('All')}
                    >
                      <Text style={[styles.toggleBtnText, filterMode === 'All' && styles.toggleBtnTextActive]}>Show All</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={{ color: '#888', fontSize: 12, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8, marginTop: 4 }}>MUSCLE GROUP</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muscleScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
                    {['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'].map(group => (
                      <TouchableOpacity 
                        key={group} 
                        style={[styles.chip, selectedMuscle === group && styles.chipActive]}
                        onPress={() => setSelectedMuscle(group)}
                      >
                        <Text style={[styles.chipText, selectedMuscle === group && styles.chipTextActive]}>{group}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={{ color: '#888', fontSize: 12, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 }}>EQUIPMENT</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muscleScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
                    {['All', ...equipmentTypes].map(eq => (
                      <TouchableOpacity 
                        key={eq} 
                        style={[styles.chip, selectedEquipment === eq && styles.chipActive]}
                        onPress={() => setSelectedEquipment(eq)}
                      >
                        <Text style={[styles.chipText, selectedEquipment === eq && styles.chipTextActive]}>{eq}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={{ color: '#888', fontSize: 12, fontWeight: '700', paddingHorizontal: 16, marginBottom: 8 }}>BRAND</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muscleScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
                    {['All', ...equipmentBrands].map(b => (
                      <TouchableOpacity 
                        key={b} 
                        style={[styles.chip, selectedBrand === b && styles.chipActive]}
                        onPress={() => setSelectedBrand(b)}
                      >
                        <Text style={[styles.chipText, selectedBrand === b && styles.chipTextActive]}>{b}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Sorting */}
                  <View style={styles.sortRow}>
                    <Text style={styles.sortLabel}>Sort By:</Text>
                    {(['pr', 'sets', 'reps', 'volume'] as SortMode[]).map(mode => (
                      <TouchableOpacity key={mode} onPress={() => setSortMode(mode)}>
                        <Text style={[styles.sortOption, sortMode === mode && styles.sortOptionActive]}>
                          {mode.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
          
          <ScrollView contentContainerStyle={styles.gridContainer}>
            {collectionItems.map((item, idx) => {
              const { getResolvedUri } = require('../utils/uriResolver');
              const imageUri = getResolvedUri(collectibleImages[item.id]);
              const stats = exerciseStats[item.name];
              
              let gridBorderColor = '#333';
              if (collectionType === 'Exercises') {
                const xp = (stats?.totalSets || 0) * 10;
                gridBorderColor = getLevelData(xp).rankColor;
              } else if (collectionType === 'Recipes') {
                const recipeXP = mealLogCounts?.[(item as any).recipeData?.id as string] || 0;
                gridBorderColor = getRecipeLevelData(recipeXP).rankColor;
              } else if (collectionType === 'Supplements') {
                const suppXP = (item as any).supplementData?.totalTakenTimes || 0;
                gridBorderColor = getRecipeLevelData(suppXP).rankColor;
              }

              return (
                <TouchableOpacity 
                  key={item.id} 
                  style={[styles.gridCard, { borderColor: gridBorderColor, borderWidth: 2 }]}
                  onPress={() => openPager(idx)}
                  onLongPress={() => handleDeleteItem(item)}
                >
                  {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.gridImage} />
                  ) : (
                    <View style={styles.gridPlaceholder}>
                      <MaterialCommunityIcons name={collectionType === 'Exercises' ? "dumbbell" : collectionType === 'Recipes' ? "silverware" : "pill"} size={32} color="#444" />
                    </View>
                  )}
                  <View style={styles.gridCardOverlay}>
                    <Text style={styles.gridCardText} numberOfLines={2}>{item.name}</Text>
                    {collectionType === 'Exercises' && stats && stats.pr > 0 && (
                      <Text style={[styles.gridCardSubText, { color: gridBorderColor }]}>PR: {stats.pr}kg</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* Music Stats Modal */}
      <Modal visible={musicStatsModalVisible} animationType="slide">
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setMusicStatsModalVisible(false)} style={styles.closeBtn}>
              <MaterialCommunityIcons name="chevron-down" size={32} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Music Stats</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={{ flexDirection: 'row', backgroundColor: '#1E1E1E', marginHorizontal: 16, padding: 4, borderRadius: 8, marginBottom: 16, marginTop: 16 }}>
            {(['week', 'month', 'year'] as const).map(range => (
              <TouchableOpacity 
                key={range}
                style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: musicTimeRange === range ? '#333' : 'transparent', borderRadius: 6 }}
                onPress={() => setMusicTimeRange(range)}
              >
                <Text style={{ color: musicTimeRange === range ? '#FFF' : '#888', fontWeight: 'bold' }}>
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}>
            {topSongs.length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                <MaterialCommunityIcons name="music-off" size={48} color="#333" />
                <Text style={{ color: '#888', marginTop: 16, fontSize: 16 }}>No music logged for this period.</Text>
              </View>
            ) : (
              topSongs.map((song, idx) => (
                <View key={`${song.id}-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', padding: 16, borderRadius: 12, marginBottom: 8 }}>
                  <Text style={{ color: '#00D2FF', fontSize: 18, fontWeight: '900', width: 30 }}>{idx + 1}</Text>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }} numberOfLines={1}>{song.title}</Text>
                    <Text style={{ color: '#888', fontSize: 14 }} numberOfLines={1}>{song.artist}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: '#30D158', fontSize: 18, fontWeight: '800' }}>{song.playsInRange}</Text>
                    <Text style={{ color: '#888', fontSize: 10, textTransform: 'uppercase' }}>plays</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Pager Modal (Card Game view) */}
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
                {activeItems.map((item, idx) => {
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
                    
                  const levelData = activeCollectionType === 'Recipes'
                    ? getRecipeLevelData(mealLogCounts?.[(item as any).recipeData?.id as string] || 0)
                    : activeCollectionType === 'Supplements'
                    ? getRecipeLevelData((item as any).supplementData?.totalTakenTimes || 0)
                    : getLevelData(xp);
                  const borderColor = levelData.rankColor;

                  return (
                    <View key={item.id} style={styles.page}>
                      <FlippableExerciseCard 
                        item={item}
                        imageUri={imageUri}
                        stats={stats}
                        chartLabels={chartLabels}
                        chartData={chartData}
                        levelData={levelData}
                        borderColor={borderColor}
                        collectionType={activeCollectionType}
                        screenWidth={screenWidth}
                        styles={styles}
                        exerciseTimeRange={exerciseTimeRange}
                        setExerciseTimeRange={setExerciseTimeRange}
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

      {/* Cardio Detail Modal */}
    </ScrollView>

      {/* Title Selection Modal */}
      <Modal visible={titleModalVisible} animationType="slide" transparent={true}>
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' }}>
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>Equip Title</Text>
              <TouchableOpacity onPress={() => setTitleModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }}>
              <TouchableOpacity 
                style={{ padding: 16, backgroundColor: equippedTitle === null ? '#333' : '#1E1E1E', borderRadius: 8, marginBottom: 8 }}
                onPress={() => { setEquippedTitle(null); setTitleModalVisible(false); }}
              >
                <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: 'bold' }}>None</Text>
              </TouchableOpacity>
              
              {/* Derive titles from unlocked achievements */}
              {unlockedAchievements && unlockedAchievements.map(id => {
                const ach = achievements.find(a => a.id === id);
                if (!ach) return null;
                return (
                  <TouchableOpacity 
                    key={id} 
                    style={{ padding: 16, backgroundColor: equippedTitle === ach.title ? '#333' : '#1E1E1E', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#444' }}
                    onPress={() => { setEquippedTitle(ach.title); setTitleModalVisible(false); }}
                  >
                    <Text style={{ color: '#00D2FF', textAlign: 'center', fontWeight: 'bold' }}>« {ach.title} »</Text>
                  </TouchableOpacity>
                );
              })}

              {/* Iron Tactics Unlocked Titles */}
              {trophyBadges.filter(b => b.tier !== 'Locked').map(tb => (
                <TouchableOpacity 
                  key={tb.id} 
                  style={{ 
                    padding: 16, 
                    backgroundColor: equippedTitle === tb.title ? '#2A2A2E' : '#1E1E1E', 
                    borderRadius: 8, 
                    marginBottom: 8, 
                    borderWidth: 1.5, 
                    borderColor: equippedTitle === tb.title ? tb.tierColor : '#444',
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

      {/* Custom Exercise Manager Modal */}
      <ExerciseManagerModal 
        visible={managerVisible} 
        onClose={() => setManagerVisible(false)} 
        initialExercise={editingExercise}
        isPreloaded={editingExercise?.isPreloaded}
      />

      {/* BADGE PICKER MODAL */}
      <Modal visible={badgePickerVisible} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>Pin Achievement</Text>
              <TouchableOpacity onPress={() => { setBadgePickerVisible(false); setSelectingBadgeSlot(null); }}>
                <MaterialCommunityIcons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#888', marginBottom: 16 }}>Select an unlocked achievement to show on your profile.</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#28282C', borderRadius: 12, marginBottom: 12 }}
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
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Clear Slot</Text>
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
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#28282C', borderRadius: 12, marginBottom: 12, borderWidth: 1.5, borderColor: ach.tierColor }}
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
                <View style={{ padding: 14, backgroundColor: '#222228', borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#33333E' }}>
                  <Text style={{ color: '#888', fontSize: 12, textAlign: 'center' }}>
                    Schließe Boss-Kämpfe in Iron Tactics ab (ab 100 🏆), um Gladiator- & Meister-Abzeichen freizuschalten!
                  </Text>
                </View>
              )}

              {/* SECTION: FITNESS ACHIEVEMENTS */}
              <View style={{ marginTop: 8, marginBottom: 12 }}>
                <Text style={{ color: '#00D2FF', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 }}>
                  🏋️ FITNESS & TRAINING-ERFOLGE
                </Text>
              </View>

              {achievements.filter(a => a.tier !== 'Locked').map(ach => (
                <TouchableOpacity 
                  key={ach.id} 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#28282C', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: ach.tierColor }}
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
                <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No unlocked achievements yet. Keep training!</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Workout Detail Modal */}
      <Modal visible={workoutDetailModalVisible} animationType="slide" transparent={false}>
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          {currentSelectedWorkout && (
            <>
              {/* Header */}
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
                {/* Meta summary card */}
                <View style={styles.detailSummaryCard}>
                  <View style={styles.detailSummaryCol}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color="#00D2FF" />
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

                {/* Exercises list */}
                <Text style={styles.detailSectionHeader}>Übungen ({currentSelectedWorkout.exercises?.length || 0})</Text>

                {(currentSelectedWorkout.exercises || []).map((ex, exIdx) => {
                  const isUni = ex.isUnilateral;
                  return (
                    <View key={exIdx} style={styles.detailExerciseCard}>
                      <View style={styles.detailExerciseHeader}>
                        <Text style={styles.detailExerciseTitle}>{ex.name}</Text>
                        {isUni && (
                          <View style={styles.detailUnilateralBadge}>
                            <Text style={styles.detailUnilateralText}>Unilateral</Text>
                          </View>
                        )}
                      </View>

                      {/* Sets Table */}
                      <View style={styles.detailSetsTable}>
                        <View style={styles.detailSetsTableHeader}>
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
                            <Text style={[styles.detailSetsTableTd, { flex: 1, color: '#00D2FF', fontWeight: 'bold' }]}>
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

      {/* IRON TACTICS TROPHY ROAD MODAL */}
      <TrophyRoadModal
        visible={trophyRoadModalVisible}
        onClose={() => setTrophyRoadModalVisible(false)}
      />

      {/* MONTHLY REVIEW MODAL */}
      <MonthlyReviewModal
        visible={monthlyReviewModalVisible}
        onClose={() => setMonthlyReviewModalVisible(false)}
        initialMonth={selectedReviewMonth}
      />

      {/* FLAWLESS MONTHS HISTORY MODAL */}
      <Modal visible={flawlessMonthsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.profileModalOverlay}>
          <View style={styles.flawlessModalCard}>
            <View style={styles.flawlessModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 24 }}>💎</Text>
                <View>
                  <Text style={styles.flawlessModalTitle}>Makellose Monate</Text>
                  <Text style={styles.flawlessModalSub}>Dauerhafter Karriere-Meilenstein</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setFlawlessMonthsModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.flawlessDescText}>
              In diesen Monaten hast du an 100% aller Tage deine Trainings- und Ernährungsziele erreicht. Diese Auszeichnung bleibt absolut bestehen, selbst wenn die tägliche Master Streak bricht!
            </Text>

            <ScrollView style={{ maxHeight: 280, marginVertical: 12 }}>
              {(flawlessMonths || []).length === 0 ? (
                <View style={styles.flawlessEmptyBox}>
                  <Text style={styles.flawlessEmptyText}>
                    Noch kein voller Monat mit 100% Ziel-Disziplin abgeschlossen. Schließe diesen Monat makellos ab, um dein erstes Diamant-Siegel zu erhalten!
                  </Text>
                </View>
              ) : (
                (flawlessMonths || []).map(mKey => (
                  <TouchableOpacity
                    key={mKey}
                    style={styles.flawlessHistoryItem}
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
                        <Text style={styles.flawlessItemNote}>100% Disziplin • Tippen für Monats-Review</Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#00D2FF" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.flawlessCloseBtn}
              onPress={() => setFlawlessMonthsModalVisible(false)}
            >
              <Text style={styles.flawlessCloseBtnText}>Schließen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ADMIN PANEL MODAL */}
      <AdminPanelModal 
        visible={adminModalVisible} 
        onClose={() => setAdminModalVisible(false)} 
      />

    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', paddingHorizontal: 16 },
  title: { fontSize: 32, fontWeight: '800', color: '#FFF', marginTop: 24, marginBottom: 24 },
  highlightsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  highlightBox: { 
    flex: 1, backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, 
    alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#333' 
  },
  highlightValue: { fontSize: 20, fontWeight: '700', color: '#FFF', marginTop: 8, textAlign: 'center' },
  highlightLabel: { fontSize: 12, color: '#888', marginTop: 4, textAlign: 'center' },
  subtitle: { fontSize: 22, fontWeight: '700', color: '#FFF', marginBottom: 16 },
  
  chartWrapper: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  chartTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  chartEmpty: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  chartEmptyText: { color: '#888', fontSize: 14 },

  collectionBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', 
    padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#333'
  },
  collectionBtnTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  collectionBtnSub: { fontSize: 14, color: '#888', marginTop: 4 },

  modalContainer: { flex: 1, backgroundColor: '#121212' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  closeBtn: { padding: 4 , marginBottom: 12 },
  playBtn: { padding: 4 , marginBottom: 12 },

  // Filter Styles
  filterSection: { paddingBottom: 16 },
  toggleRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#1E1E1E', borderRadius: 8, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 , marginBottom: 12 },
  toggleBtnActive: { backgroundColor: '#333' },
  toggleBtnText: { color: '#888', fontWeight: '600' },
  toggleBtnTextActive: { color: '#FFF' },
  
  muscleScroll: { marginBottom: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#1E1E1E', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#333' },
  chipActive: { backgroundColor: '#00D2FF', borderColor: '#00D2FF' },
  chipText: { color: '#AAA', fontWeight: '600' },
  chipTextActive: { color: '#000' },

  sortRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#333' },
  sortLabel: { color: '#888', fontSize: 12, fontWeight: '700' },
  sortOption: { color: '#555', fontSize: 12, fontWeight: '700' },
  sortOptionActive: { color: '#FFF' },

  // Cardio Podium Styles
  cardioPodiumContainer: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 16, marginBottom: 24, gap: 12 },
  cardioBadgeCard: {
    width: '30%',
    maxWidth: 110,
    aspectRatio: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    borderWidth: 2,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cardioBadgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardioBadgeType: { color: '#FFF', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  cardioBadgeLevel: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  cardioBadgeBarContainer: { width: '100%', height: 4, backgroundColor: '#333', borderRadius: 2, overflow: 'hidden' },
  cardioBadgeBarFill: { height: '100%' },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingBottom: 60 },
  gridCard: { 
    width: '30%', aspectRatio: 3/4, margin: '1.5%', borderRadius: 12, 
    backgroundColor: '#1E1E1E', overflow: 'hidden', borderWidth: 1, borderColor: '#333' 
  },
  gridImage: { width: '100%', height: '100%' },
  gridPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2C2C2E' },
  gridCardOverlay: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    backgroundColor: 'rgba(0,0,0,0.8)', padding: 6 
  },
  gridCardText: { color: '#FFF', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  gridCardSubText: { color: '#00D2FF', fontSize: 10, fontWeight: '800', textAlign: 'center', marginTop: 2 },

  pagerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  pagerCloseBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  pagerView: { flex: 1 },
  page: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  cardFull: { 
    width: '100%', aspectRatio: 3/4, backgroundColor: '#1E1E1E', 
    borderRadius: 24, overflow: 'hidden', borderWidth: 2, borderColor: '#333' 
  },
  cardFullImage: { width: '100%', height: '100%' },
  cardFullPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E1E1E' },
  cardFullOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)', padding: 20, alignItems: 'center'
  },
  cardFullTitle: { color: '#FFF', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  
  cardStatsGrid: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginBottom: 12 },
  cardStatCol: { alignItems: 'center' },
  cardStatVal: { color: '#00D2FF', fontSize: 18, fontWeight: '800' },
  cardStatLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginTop: 2 },

  chartContainer: { alignItems: 'center', marginBottom: 12 },

  addPhotoBtn: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A84FF', 
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 
  },
  addPhotoBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8 },

  profileCard: { backgroundColor: '#1E1E20', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 2 },
  profileHeader: { flexDirection: 'row', alignItems: 'center' },
  rankBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
  rankTitle: { fontSize: 20, fontWeight: '900', textTransform: 'uppercase' },
  levelText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginTop: 2 },
  xpText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  xpSubtext: { color: '#888', fontSize: 10, fontWeight: '700' },
  xpBarContainer: { height: 8, backgroundColor: '#333', borderRadius: 4, marginTop: 16, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 4 },
  xpToNext: { color: '#888', fontSize: 10, fontWeight: '700', textAlign: 'right', marginTop: 6 },
  
  profileStreakWidget: { flexDirection: 'row', backgroundColor: '#121212', borderRadius: 12, marginTop: 16, padding: 12, alignItems: 'center' },
  profileStreakLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  profileStreakNum: { color: '#FFF', fontSize: 20, fontWeight: '900', marginLeft: 8 },
  profileStreakLabel: { color: '#FFD60A', fontSize: 9, fontWeight: '800', marginLeft: 6, textTransform: 'uppercase', flexShrink: 1 },
  profileStreakRight: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  profileTrophyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#141418',
    borderRadius: 12,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FFD70035',
  },
  profileTrophyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trophyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD70018',
    borderWidth: 1,
    borderColor: '#FFD70040',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTrophyNum: {
    color: '#FFF',
    fontSize: 14,
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

  achievementsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  achievementsGrid: { marginBottom: 8 },
  achievementBadge: { flexDirection: 'row', backgroundColor: '#1E1E20', borderRadius: 12, padding: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1 },
  achTitle: { fontSize: 14, fontWeight: '800' },
  achDesc: { color: '#888', fontSize: 11, marginTop: 2 },
  achProgressBg: { height: 4, backgroundColor: '#333', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  achProgressFill: { height: '100%', borderRadius: 2 },
  achTierCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  achTierText: { fontSize: 16, fontWeight: '900' },

  profileModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  profileModalContent: { backgroundColor: '#1E1E20', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  deepStatBox: { width: '48%', backgroundColor: '#121212', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  deepStatVal: { color: '#00D2FF', fontSize: 24, fontWeight: '900' },
  deepStatLabel: { color: '#888', fontSize: 12, fontWeight: '700', marginTop: 4 },

  // Top Workouts Banner
  topWorkoutCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    width: 260,
    borderWidth: 1.5,
    borderColor: '#2A2A2E',
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
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  topWorkoutPartnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  topWorkoutPartnerText: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: '700',
  },
  topWorkoutDate: {
    color: '#888',
    fontSize: 11,
  },
  topWorkoutDivider: {
    height: 1,
    backgroundColor: '#2A2A2E',
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
    color: '#666',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  topWorkoutStatVal: {
    color: '#E0E0E0',
    fontSize: 12,
    fontWeight: '700',
  },

  // Detail Modal styles
  detailSummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#1E1E22',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#2A2A2E',
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
    backgroundColor: '#333',
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
    backgroundColor: '#1E1E22',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2E',
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
    backgroundColor: '#151517',
    borderRadius: 8,
    padding: 8,
  },
  detailSetsTableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#28282B',
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

  // Flawless Months & Review Profile Row
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
    backgroundColor: '#0E1724',
    borderWidth: 1.5,
    borderColor: '#00D2FF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  flawlessSealIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00D2FF20',
    borderWidth: 1,
    borderColor: '#00D2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flawlessSealCount: {
    color: '#00D2FF',
    fontSize: 12,
    fontWeight: '900',
  },
  flawlessSealSub: {
    color: '#30D158',
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 1,
  },
  monthlyReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00D2FF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  monthlyReviewBtnText: {
    color: '#000000',
    fontSize: 11.5,
    fontWeight: '900',
  },

  // Flawless Modal Card
  flawlessModalCard: {
    backgroundColor: '#161620',
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
    backgroundColor: '#1E1E2A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C3E',
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
    backgroundColor: '#1A2332',
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
    backgroundColor: '#262638',
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
