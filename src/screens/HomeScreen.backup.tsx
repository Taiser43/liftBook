import React, { useState, useEffect } from 'react';
import { KeyboardAwareScrollView as ScrollView } from 'react-native-keyboard-aware-scroll-view';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Dimensions,
  Platform,
  Vibration,
  Linking
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ingredient } from '../store/store';
import { useAppStore, Recipe, getLocalDateString, showCustomAlert } from '../store/store';
import { LineChart } from 'react-native-chart-kit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SwipeableModal from '../components/SwipeableModal';
import { calculateStreaks } from '../utils/streakEngine';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import HomeWidgetEditor from '../components/HomeWidgetEditor';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomSpacing } from '../hooks/useBottomSpacing';
import { KeyboardAwareWrapper } from '../components/KeyboardAwareWrapper';
// [AGENT CONTEXT] Do NOT import react-native-health-connect at the top level! 
// It causes fatal Native crashes on launch if the Health Connect APK is missing or in Expo Go.
import MediaPlayerWidget from '../components/MediaPlayerWidget';


type TimeRange = '1W' | '1M' | '1Y' | 'ALL';

export default function HomeScreen({ navigation }: any) {
  const bottomSpacing = useBottomSpacing();
  const insets = useSafeAreaInsets();
  const { 
    bodyweight, 
    weightHistory, 
    setBodyweight, 
    workoutPrograms, 
    consumedToday, 
    targets, 
    addLoggedMeal, 
    savedMeals,
    addSavedMeal,
    workoutHistory,
    setLiveWorkoutToStart,
    addIngredient,
    nutritionHistory,
    dietPlans,
    skippedMealsToday,
    skipScheduledMeal,
    loggedMealsToday,
    homeLayout,
    disabledWidgets,
    updateHomeLayout,
    totalXP,
    levelUpData,
    setLevelUpData,
    checkDailyReset,
    triggerMacroConfetti,
    setTriggerMacroConfetti,
    triggerStreakConfetti,
    setTriggerStreakConfetti
  } = useAppStore();

  React.useEffect(() => {
    // Auto-inject new widgets that are not disabled and not in layout
    const allKnownWidgets: import('../store/store').WidgetType[] = ['streak', 'bodyweight', 'workout', 'nextMeal', 'nutrition', 'activity', 'music'];
    const currentWidgetsInLayout = homeLayout.flatMap(c => c.widgets);
    const missingWidgets = allKnownWidgets.filter(w => !currentWidgetsInLayout.includes(w) && !(disabledWidgets || []).includes(w));
    
    if (missingWidgets.length > 0) {
      const newLayout = [...homeLayout];
      missingWidgets.forEach(mw => {
        newLayout.push({ id: `auto-${mw}-${Date.now()}`, widgets: [mw] });
      });
      updateHomeLayout(newLayout);
    }
  }, []);
  
  // Widget Editor State
  const [widgetEditorVisible, setWidgetEditorVisible] = useState(false);

  // Weight Edit State
  const [isEditingWeight, setIsEditingWeight] = useState(false);
  const [newWeight, setNewWeight] = useState(bodyweight > 0 ? bodyweight.toString() : '');

  // Time Range Filter for Weight Graph
  const [timeRange, setTimeRange] = useState<TimeRange>('1W');

  // Health Data State
  const [healthData, setHealthData] = useState({ steps: 0, activeCalories: 0 });
  const healthConnected = useAppStore(state => state.healthConnectEnabled);
  const setHealthConnected = useAppStore(state => state.setHealthConnectEnabled);

  const syncHealthData = async () => {
    try {
      const HealthConnect = require('react-native-health-connect');
      await HealthConnect.initialize();
      const timeRangeFilter = {
        operator: 'between',
        startTime: new Date(new Date().setHours(0,0,0,0)).toISOString(),
        endTime: new Date().toISOString(),
      };
      const steps = await HealthConnect.readRecords('Steps', { timeRangeFilter });
      const cals = await HealthConnect.readRecords('ActiveCaloriesBurned', { timeRangeFilter });
      const totalCals = await HealthConnect.readRecords('TotalCaloriesBurned', { timeRangeFilter });
      
      console.log('Health Connect Steps found:', steps.records.length);
      console.log('Health Connect Active Cals found:', cals.records.length);
      console.log('Health Connect Total Cals found:', totalCals.records.length);

      let activeKcal = cals.records.reduce((acc: number, curr: any) => acc + curr.energy.inKilocalories, 0);
      if (activeKcal === 0 && totalCals.records.length > 0) {
          // Fallback to TotalCaloriesBurned if Active is empty
          activeKcal = totalCals.records.reduce((acc: number, curr: any) => acc + curr.energy.inKilocalories, 0);
      }

      setHealthData({
        steps: steps.records.reduce((acc: number, curr: any) => acc + curr.count, 0),
        activeCalories: Math.round(activeKcal)
      });
    } catch (e) {
      console.warn('Health Connect sync error:', e);
    }
  };

  const connectHealthConnect = async () => {
    if (Platform.OS !== 'android') return;
    try {
      const HealthConnect = require('react-native-health-connect');
      
      // Check if Health Connect is available on the device
      const sdkStatus = await HealthConnect.getSdkStatus();
      // sdkStatus: 1 = installed, 2 = not installed, 3 = update needed
      if (sdkStatus !== 1) {
        const { Linking } = require('react-native');
        // Direct user to Play Store to install Health Connect
        await Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata');
        return;
      }

      const isInitialized = await HealthConnect.initialize();
      if (isInitialized) {
        const granted = await HealthConnect.requestPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
          { accessType: 'read', recordType: 'TotalCaloriesBurned' }
        ]);
        setHealthConnected(true);
        await syncHealthData();
      }
    } catch (e) {
      console.error('Health Connect error:', e);
    }
  };

  // On startup, silently sync if already connected
  useEffect(() => {
    if (Platform.OS === 'android' && healthConnected) {
      syncHealthData();
    }
  }, []);


  // Recipe Modal State
  const [mealModalVisible, setRecipeModalVisible] = useState(false);
  const [barcodeModalVisible, setBarcodeModalVisible] = useState(false);
  const [scannedIngredient, setScannedIngredient] = useState<Ingredient | null>(null);
  const [portionGrams, setPortionGrams] = useState('100');
  

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];

  // Active program workflows
  const activeProgram = (workoutPrograms || []).find(p => p.isActive);
  const currentWorkouts = activeProgram?.workouts || [];

  const todaysPlan = currentWorkouts.find(plan => {
    if (Array.isArray(plan.daysOfWeek)) {
      return plan.daysOfWeek.some(d => d.toLowerCase() === today.toLowerCase());
    }
    return false;
  });

  const activePlan = dietPlans.find(p => p.isActive);
  const activeTargets = activePlan?.targetCalories ? {
    calories: activePlan.targetCalories,
    protein: activePlan.targetProtein || 0,
    carbs: activePlan.targetCarbs || 0,
    fat: activePlan.targetFat || 0
  } : targets;

  const streaks = calculateStreaks(workoutHistory, workoutPrograms, nutritionHistory, consumedToday, activeTargets);
  const workedOutToday = streaks.workedOutToday;

  // Next Meal Calculation
  const activeDietPlan = dietPlans?.find(p => p.isActive);
  let nextScheduledMeal: any = null;
  let nextRecipe: Recipe | null = null;
  if (activeDietPlan) {
    const todaysMeals = activeDietPlan.scheduledMeals.filter(m => 
      m.dayOfWeek.includes('Everyday') || m.dayOfWeek.includes(today)
    );
    // Filter out skipped and logged meals
    const pendingMeals = todaysMeals.filter(m => 
      !(skippedMealsToday || []).includes(m.id) && 
      !(loggedMealsToday || []).some(logged => logged.scheduledMealId === m.id)
    );
    // Sort by time
    pendingMeals.sort((a, b) => a.time.localeCompare(b.time));
    if (pendingMeals.length > 0) {
      nextScheduledMeal = pendingMeals[0];
      nextRecipe = savedMeals.find(r => r.id === nextScheduledMeal?.recipeId) || null;
    }
  }

  const handleSkipNextMeal = () => {
    if (nextScheduledMeal) {
      skipScheduledMeal(nextScheduledMeal.id);
    }
  };

  const handleLogNextMeal = () => {
    if (nextScheduledMeal && nextRecipe) {
      const servings = nextRecipe.totalServings || 1;
      addLoggedMeal({
        name: nextScheduledMeal.customName || nextRecipe.name,
        calories: Math.round(nextRecipe.calories / servings),
        protein: Math.round(nextRecipe.protein / servings),
        carbs: Math.round(nextRecipe.carbs / servings),
        fat: Math.round(nextRecipe.fat / servings),
        ingredients: nextRecipe.ingredients || [],
        scheduledMealId: nextScheduledMeal.id
      });
      Vibration.vibrate(40);
    }
  };

  const handleSaveWeight = () => {
    const val = parseFloat(newWeight);
    if (!isNaN(val) && val > 0) {
      setBodyweight(val);
    }
    setIsEditingWeight(false);
  };

  const handleAddRecipeFromRecipe = (meal: Recipe) => {
    const s = meal.totalServings || 1;
    addLoggedMeal({
      name: meal.name,
      calories: Math.round(meal.calories / s),
      protein: Math.round(meal.protein / s),
      carbs: Math.round(meal.carbs / s),
      fat: Math.round(meal.fat / s),
    });
    setRecipeModalVisible(false);
    Vibration.vibrate(40);
  };

  const handleStartTodayWorkout = () => {
    Vibration.vibrate(35);
    if (todaysPlan) {
      setLiveWorkoutToStart(todaysPlan);
      navigation.navigate('Training', { startWorkoutPlanId: todaysPlan.id });
    } else {
      navigation.navigate('Training');
    }
  };

  // Filter weight data based on selected time range
  const now = new Date();
  const getFilteredHistory = () => {
    if (weightHistory.length === 0) return [];
    
    return weightHistory.filter(entry => {
      const entryDate = new Date(entry.date);
      const diffDays = (now.getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
      if (timeRange === '1W') return diffDays <= 7;
      if (timeRange === '1M') return diffDays <= 30;
      if (timeRange === '1Y') return diffDays <= 365;
      return true; // ALL
    });
  };

  const filteredHistory = getFilteredHistory();
  
  // Format for LineChart
  const numLabels = filteredHistory.length;
  const chartLabels = filteredHistory.length > 0 
    ? filteredHistory.map((w, i) => {
        if (numLabels <= 7) return w.date.substring(5); // Show all if <= 7
        // Downsample to ~5 evenly spaced labels + the very last one
        const step = Math.ceil(numLabels / 5);
        if (i % step === 0 || i === numLabels - 1) return w.date.substring(5);
        return "";
      })
    : ['Today'];
  const chartData = filteredHistory.length > 0 
    ? filteredHistory.map(w => w.weight) 
    : [bodyweight > 0 ? bodyweight : 70];

  const screenWidth = Dimensions.get('window').width;

  const renderProgressBar = (current: number, target: number, color: string) => {
    const ratio = Math.min(Math.max(current / (target || 1), 0), 1);
    const isCompleted = current >= target && target > 0;
    return (
      <View style={styles.progressTrack}>
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${ratio * 100}%`, 
              backgroundColor: isCompleted ? '#30D158' : color 
            }
          ]} 
        />
      </View>
    );
  };

  const renderWidget = (type: string, containerWidth: number) => {
    switch (type) {
      case 'streak':
        return (
          <View style={[styles.unifiedStreakCard, { width: containerWidth, marginHorizontal: 0, paddingHorizontal: 16 }]} key="streak">
            <View style={styles.masterStreakRow}>
              <MaterialCommunityIcons name="crown" size={32} color={(streaks.workedOutToday && streaks.hitNutritionToday) ? "#FFD60A" : "#666"} />
              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text style={styles.masterStreakNum}>{streaks.overall}</Text>
                <Text style={styles.masterStreakTitle}>MASTER STREAK</Text>
              </View>
              <View style={[styles.masterBadge, (streaks.workedOutToday && streaks.hitNutritionToday) && styles.masterBadgeActive]}>
                <Text style={[styles.masterBadgeText, (streaks.workedOutToday && streaks.hitNutritionToday) && { color: '#000' }]}>
                  {(streaks.workedOutToday && streaks.hitNutritionToday) ? 'LOCKED TODAY' : 'PENDING'}
                </Text>
              </View>
            </View>

            <View style={styles.subStreaksRow}>
              <View style={styles.subStreak}>
                <MaterialCommunityIcons name="weight-lifter" size={20} color={streaks.workedOutToday ? "#00D2FF" : "#666"} />
                <Text style={styles.subStreakVal}>{streaks.training} <Text style={styles.subStreakLabel}>Training</Text></Text>
              </View>
              <View style={styles.subStreakDivider} />
              <View style={styles.subStreak}>
                <MaterialCommunityIcons name="food-apple" size={20} color={streaks.hitNutritionToday ? "#30D158" : "#666"} />
                <Text style={styles.subStreakVal}>{streaks.nutrition} <Text style={styles.subStreakLabel}>Nutrition</Text></Text>
              </View>
            </View>
          </View>
        );
        
      case 'bodyweight':
        return (
          <View style={[styles.card, { width: containerWidth, marginHorizontal: 0 }]} key="bodyweight">
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardSubtitle}>CURRENT BODYWEIGHT</Text>
                {isEditingWeight ? (
                  <View style={styles.weightEditRow}>
                    <TextInput
                      style={styles.weightInput}
                      value={newWeight}
                      onChangeText={setNewWeight}
                      keyboardType="numeric"
                      placeholder="0.0"
                      placeholderTextColor="#777777"
                      autoFocus
                    />
                    <Text style={styles.unitText}>kg</Text>
                    <TouchableOpacity style={styles.saveWeightBtn} onPress={handleSaveWeight}>
                      <Text style={styles.saveWeightBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.weightDisplayRow}>
                    <Text style={styles.weightNumber}>{bodyweight > 0 ? bodyweight : '--'}</Text>
                    <Text style={styles.weightUnit}>kg</Text>
                  </View>
                )}
              </View>
              {!isEditingWeight && (
                <TouchableOpacity 
                  style={styles.editBtn} 
                  onPress={() => {
                    setNewWeight(bodyweight > 0 ? bodyweight.toString() : '');
                    setIsEditingWeight(true);
                  }}
                >
                  <MaterialCommunityIcons name="pencil" size={16} color="#00D2FF" />
                  <Text style={styles.editBtnText}>Log</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Time range selector pills */}
            <View style={styles.rangeSelector}>
              {(['1W', '1M', '1Y', 'ALL'] as TimeRange[]).map(range => (
                <TouchableOpacity 
                  key={range} 
                  style={[styles.rangePill, timeRange === range && styles.rangePillActive]}
                  onPress={() => setTimeRange(range)}
                >
                  <Text style={[styles.rangePillText, timeRange === range && styles.rangePillTextActive]}>{range}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Interactive Dark Graph */}
            <View style={{}}>
              {weightHistory.length > 0 ? (
                <LineChart
                  data={{
                    labels: chartLabels,
                    datasets: [{ data: chartData }]
                  }}
                  width={screenWidth - 48}
                  height={150}
                  withInnerLines={true}
                  withOuterLines={false}
                  yAxisSuffix="kg"
                  yAxisLabel=""
                  yAxisInterval={1}
                  onDataPointClick={({ value, index }) => {
                    const realIndex = filteredHistory.length > 0 ? index : 0;
                    const date = filteredHistory.length > 0 ? filteredHistory[realIndex].date : getLocalDateString();
                    showCustomAlert("Weight Log", `Date: ${date}\nWeight: ${value} kg`);
                  }}
                  chartConfig={{
                    backgroundColor: '#1E1E1E',
                    backgroundGradientFrom: '#1E1E1E',
                    backgroundGradientTo: '#1E1E1E',
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(0, 210, 255, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.7})`,
                    style: { borderRadius: 8 },
                    propsForDots: { r: '5', strokeWidth: '2', stroke: '#00D2FF', fill: '#1E1E1E' }
                  }}
                  bezier
                  style={{ borderRadius: 8, marginVertical: 8 }}
                />
              ) : (
                <View style={styles.emptyChartBox}>
                  <Text style={styles.emptyChartText}>
                    No entries yet. Tap 'Log' above to record today's weight!
                  </Text>
                </View>
              )}
            </View>
          </View>
        );

      case 'workout':
        return (
          <TouchableOpacity 
            style={[styles.card, { width: containerWidth, marginHorizontal: 0 }]} 
            activeOpacity={todaysPlan ? 0.9 : 1}
            onPress={handleStartTodayWorkout}
            key="workout"
          >
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardSubtitle}>TODAY'S WORKOUT</Text>
              <View style={[styles.statusBadge, { backgroundColor: todaysPlan ? 'rgba(48, 209, 88, 0.15)' : '#282828' }]}>
                <Text style={[styles.statusBadgeText, { color: todaysPlan ? '#30D158' : '#888888' }]}>
                  {todaysPlan ? 'Scheduled' : 'Rest Day'}
                </Text>
              </View>
            </View>

            {todaysPlan ? (
              <View>
                <View style={styles.trainingInfoRow}>
                  <View style={styles.trainingIconCircle}>
                    <MaterialCommunityIcons name="dumbbell" size={24} color="#00D2FF" />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.trainingPlanTitle}>{todaysPlan.name}</Text>
                    <Text style={styles.trainingPlanDetails}>
                      {todaysPlan.exercises.length} Exercises Planned • Tap to start
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={22} color="#777777" />
                </View>

                <TouchableOpacity 
                  style={styles.homeStartWorkoutBtn} 
                  activeOpacity={0.85}
                  onPress={handleStartTodayWorkout}
                >
                  <MaterialCommunityIcons name="play" size={18} color="#000000" />
                  <Text style={styles.homeStartWorkoutBtnText}>Start Workout</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.restDayBox}>
                <MaterialCommunityIcons name="bed" size={26} color="#777777" />
                <Text style={styles.restDayText}>
                  No workout scheduled for today. Enjoy your rest or tap to view your routine in Training!
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );

      case 'nextMeal':
        if (!activeDietPlan) return null;
        return (
          <View style={[styles.card, { width: containerWidth, marginHorizontal: 0 }]} key="nextMeal">
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardSubtitle}>NEXT MEAL</Text>
              <View style={[styles.statusBadge, { backgroundColor: nextScheduledMeal ? 'rgba(0, 210, 255, 0.15)' : '#282828' }]}>
                <Text style={[styles.statusBadgeText, { color: nextScheduledMeal ? '#00D2FF' : '#888888' }]}>
                  {nextScheduledMeal ? nextScheduledMeal.time : 'All Done'}
                </Text>
              </View>
            </View>
            
            {nextScheduledMeal && nextRecipe ? (
              <View>
                <View style={styles.trainingInfoRow}>
                  <View style={[styles.trainingIconCircle, { backgroundColor: '#30D15820' }]}>
                    <MaterialCommunityIcons name="silverware-fork-knife" size={24} color="#30D158" />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.trainingPlanTitle}>{nextScheduledMeal.customName || nextRecipe.name}</Text>
                    {(() => {
                      const s = nextRecipe.totalServings || 1;
                      const cal = Math.round(nextRecipe.calories / s);
                      const p = Math.round(nextRecipe.protein / s);
                      const cb = Math.round(nextRecipe.carbs / s);
                      const f = Math.round(nextRecipe.fat / s);
                      return (
                        <Text style={styles.trainingPlanDetails}>
                          {cal} kcal • {p}g P • {cb}g C • {f}g F (1 Portion)
                        </Text>
                      );
                    })()}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity 
                    style={[styles.homeStartWorkoutBtn, { flex: 1, backgroundColor: '#333' }]} 
                    activeOpacity={0.85}
                    onPress={handleSkipNextMeal}
                  >
                    <MaterialCommunityIcons name="skip-next" size={18} color="#FFF" />
                    <Text style={[styles.homeStartWorkoutBtnText, { color: '#FFF' }]}>Skip</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.homeStartWorkoutBtn, { flex: 2, backgroundColor: '#30D158' }]} 
                    activeOpacity={0.85}
                    onPress={handleLogNextMeal}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color="#000" />
                    <Text style={styles.homeStartWorkoutBtnText}>Quick Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
               <View style={styles.restDayBox}>
                <MaterialCommunityIcons name="check-circle" size={26} color="#30D158" />
                <Text style={styles.restDayText}>
                  No more meals scheduled for today in {activeDietPlan.name}.
                </Text>
              </View>
            )}
          </View>
        );

      case 'nutrition':
        return (
          <View style={[styles.card, { width: containerWidth, marginHorizontal: 0 }]} key="nutrition">
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardSubtitle}>NUTRITION PROGRESS</Text>
              <TouchableOpacity style={styles.addRecipePill} activeOpacity={0.8} onPress={() => setRecipeModalVisible(true)}>
                <MaterialCommunityIcons name="plus" size={16} color="#000000" />
                <Text style={styles.addRecipePillText}>Log Recipe</Text>
              </TouchableOpacity>
            </View>

            {/* Macro Bars */}
            <View style={styles.macroBlock}>
              <View style={styles.macroLabelRow}>
                <Text style={styles.macroTitle}>Calories</Text>
                <Text style={styles.macroVal}>
                  <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>{consumedToday.calories}</Text> / {activeTargets.calories} kcal
                </Text>
              </View>
              {renderProgressBar(consumedToday.calories, activeTargets.calories, '#00D2FF')}
            </View>

            <View style={styles.macroBlock}>
              <View style={styles.macroLabelRow}>
                <Text style={styles.macroTitle}>Protein</Text>
                <Text style={styles.macroVal}>
                  <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>{consumedToday.protein}</Text> / {activeTargets.protein} g
                </Text>
              </View>
              {renderProgressBar(consumedToday.protein, activeTargets.protein, '#FF453A')}
            </View>

            <View style={styles.macroBlock}>
              <View style={styles.macroLabelRow}>
                <Text style={styles.macroTitle}>Carbs</Text>
                <Text style={styles.macroVal}>
                  <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>{consumedToday.carbs}</Text> / {activeTargets.carbs} g
                </Text>
              </View>
              {renderProgressBar(consumedToday.carbs, activeTargets.carbs, '#FF9F0A')}
            </View>

            <View style={styles.macroBlock}>
              <View style={styles.macroLabelRow}>
                <Text style={styles.macroTitle}>Fat</Text>
                <Text style={styles.macroVal}>
                  <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>{consumedToday.fat}</Text> / {activeTargets.fat} g
                </Text>
              </View>
              {renderProgressBar(consumedToday.fat, activeTargets.fat, '#BF5AF2')}
            </View>
          </View>
        );

      case 'activity':
        return (
          <View style={[styles.activityCard, { width: containerWidth, marginHorizontal: 0 }]} key="activity">
            <View style={styles.activityHeader}>
              <MaterialCommunityIcons name="watch" size={20} color={healthConnected ? '#30D158' : '#888'} />
              <Text style={styles.activityTitle}>Activity (Health Connect)</Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={connectHealthConnect}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: healthConnected ? 'rgba(48, 209, 88, 0.12)' : 'rgba(0, 210, 255, 0.12)',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: healthConnected ? '#30D158' : '#00D2FF',
                }}
              >
                <MaterialCommunityIcons 
                  name={healthConnected ? 'check-circle' : 'link-variant'} 
                  size={14} 
                  color={healthConnected ? '#30D158' : '#00D2FF'} 
                />
                <Text style={{ color: healthConnected ? '#30D158' : '#00D2FF', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>
                  {healthConnected ? 'Connected' : 'Connect'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activityRow}>
              <View style={styles.activityStat}>
                <MaterialCommunityIcons name="fire" size={24} color="#FF453A" />
                <Text style={styles.activityValue}>
                  {healthData.activeCalories > 0 ? healthData.activeCalories : (workoutHistory.filter(w => w.date.startsWith(getLocalDateString())).reduce((sum, w) => sum + w.caloriesBurned, 0) || 0)}
                  <Text style={styles.activityUnit}>kcal</Text>
                </Text>
                <Text style={styles.activityLabel}>Active Burn</Text>
              </View>
              <View style={styles.activityStat}>
                <MaterialCommunityIcons name="shoe-sneaker" size={24} color="#00D2FF" />
                <Text style={styles.activityValue}>{healthData.steps} <Text style={styles.activityUnit}>steps</Text></Text>
                <Text style={styles.activityLabel}>Daily Steps</Text>
              </View>
            </View>
          </View>
        );

      case 'music':
        return (
          <View key="music" style={{ width: containerWidth, marginHorizontal: 0 }}>
            <MediaPlayerWidget width={containerWidth} />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1 }}>
    <ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" 
      style={[styles.container, { paddingTop: Math.max(insets.top + 8, 28) }]} 
      showsVerticalScrollIndicator={false}
     contentContainerStyle={{ paddingBottom: bottomSpacing }}>
      {/* Header Greeting with Notch Spacing */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.greeting}>Daily Dashboard</Text>
          <Text style={styles.todayDate}>{today}, {new Date().toLocaleDateString('de-DE')}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            style={[styles.headerIconBadge, { backgroundColor: '#FF000020', marginRight: 8 }]} 
            onPress={() => Linking.openURL('https://music.youtube.com').catch(() => {})}
          >
            <MaterialCommunityIcons name="youtube" size={20} color="#FF0000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBadge} onPress={() => setWidgetEditorVisible(true)}>
            <MaterialCommunityIcons name="pencil" size={20} color="#FFD60A" />
          </TouchableOpacity>
        </View>
      </View>


      {/* Dynamic Layout Engine */}
      {homeLayout.map(container => {
        if (container.widgets.length === 0) return null;
        
        if (container.widgets.length === 1) {
          // Single row widget
          return (
            <View key={container.id} style={{ marginBottom: 16 }}>
              {renderWidget(container.widgets[0], screenWidth - 32)}
            </View>
          );
        }

        // Swipeable Stack of widgets
        return (
          <View key={container.id} style={{ marginBottom: 16 }}>
            <ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled"
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={screenWidth - 32}
              decelerationRate="fast"
            >
              {container.widgets.map((w, i) => (
                <View key={w} style={{ width: screenWidth - 32, alignItems: 'center' }}>
                  {renderWidget(w, screenWidth - 32)}
                </View>
              ))}
            </ScrollView>
            
            {/* Pagination Dots */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 6 }}>
              {container.widgets.map((w, i) => (
                <View key={w} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#555' }} />
              ))}
            </View>
          </View>
        );
      })}

      {/* Select Recipe Swipeable Sheet */}
      <SwipeableModal 
        visible={mealModalVisible} 
        onClose={() => setRecipeModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.scanBarcodeModalBtn}
          activeOpacity={0.8}
          onPress={() => {
            setRecipeModalVisible(false);
            setBarcodeModalVisible(true);
          }}
        >
          <MaterialCommunityIcons name="barcode-scan" size={20} color="#000000" style={{ marginRight: 8 }} />
          <Text style={styles.scanBarcodeModalBtnText}>📷 Scan Food Barcode (EAN)</Text>
        </TouchableOpacity>

        <View style={styles.orDividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR PICK SAVED RECIPE</Text>
          <View style={styles.dividerLine} />
        </View>

        <Text style={styles.mealModalTitle}>Select a Saved Recipe</Text>

        {savedMeals.length === 0 ? (
          <View style={styles.emptyRecipesNotice}>
            <MaterialCommunityIcons name="food-apple-outline" size={44} color="#666666" />
            <Text style={styles.emptyRecipesTitle}>No Saved Recipes Yet</Text>
            <Text style={styles.emptyRecipesDesc}>
              Swipe to the Nutrition tab to save recipes (like "Chicken & Rice", "Oatmeal Bowl") to easily log them here!
            </Text>
          </View>
        ) : (
          <ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={{ maxHeight: 350 }}>
            {savedMeals.map(meal => (
              <TouchableOpacity 
                key={meal.id} 
                style={styles.mealOptionCard} 
                onPress={() => handleAddRecipeFromRecipe(meal)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealOptionName}>{meal.name}</Text>
                  {(() => {
                    const s = meal.totalServings || 1;
                    return (
                      <Text style={styles.mealOptionMacros}>
                        {Math.round(meal.calories / s)} kcal • {Math.round(meal.protein / s)}g P • {Math.round(meal.carbs / s)}g C • {Math.round(meal.fat / s)}g F
                      </Text>
                    );
                  })()}
                </View>
                <View style={styles.addIconCircle}>
                  <MaterialCommunityIcons name="plus" size={18} color="#000000" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity 
          style={styles.closeRecipeModalBtn} 
          onPress={() => setRecipeModalVisible(false)}
        >
          <Text style={styles.closeRecipeModalBtnText}>Close</Text>
        </TouchableOpacity>
      </SwipeableModal>



      <View style={{ height: 60 }} />
    </ScrollView>

    <BarcodeScannerModal 
      visible={barcodeModalVisible} 
      onClose={() => setBarcodeModalVisible(false)} 
      onIngredientFound={(ing) => {
        // Add to global pool if not exists (handled by store usually, but let's just do it)
        addIngredient(ing);
        setBarcodeModalVisible(false);
        setScannedIngredient(ing);
        setPortionGrams('100');
      }} 
    />

    <SwipeableModal visible={!!scannedIngredient} onClose={() => setScannedIngredient(null)}>
      {scannedIngredient && (
        <View>
          <Text style={styles.mealModalTitle}>Log {scannedIngredient.name}</Text>
          <Text style={{ color: '#888', marginBottom: 16 }}>How many grams/ml did you consume?</Text>
          <TextInput 
            style={styles.portionInput}
            keyboardType="numeric"
            value={portionGrams}
            onChangeText={setPortionGrams}
            autoFocus
          />
          <TouchableOpacity 
            style={styles.logPillFull}
            onPress={() => {
              const amount = parseFloat(portionGrams) || 0;
              addLoggedMeal({
                name: scannedIngredient.name,
                ingredients: [{ ingredient: scannedIngredient, amount }],
                calories: 0, protein: 0, carbs: 0, fat: 0 // Will be recalculated by store
              });
              setScannedIngredient(null);
            }}
          >
            <Text style={styles.logPillTextFull}>Log Food</Text>
          </TouchableOpacity>
        </View>
      )}
    </SwipeableModal>

    {/* Widget Editor Modal */}
    <HomeWidgetEditor 
      visible={widgetEditorVisible}
      onClose={() => setWidgetEditorVisible(false)}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#121212' },
  topHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  greeting: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  todayDate: { fontSize: 13, color: '#888888', marginTop: 2 },
  headerIconBadge: {
    backgroundColor: '#1E1E1E',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A'
  },

  // STREAK CARD STYLES
  streakCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2E2E32',
  },
  streakLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakFlameCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.25)',
  },
  streakFlameCircleActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.18)',
    borderColor: '#FF3B30',
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  streakTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FF9500',
    letterSpacing: 0.5,
  },
  streakStatusBadge: {
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  streakStatusBadgeDone: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
  },
  streakStatusBadgeText: {
    color: '#FF9500',
    fontSize: 10,
    fontWeight: '800',
  },
  streakSubText: {
    fontSize: 12,
    color: '#AAAAAA',
    marginTop: 3,
    fontWeight: '500',
  },

  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  cardSubtitle: { fontSize: 11, fontWeight: '800', color: '#888888', letterSpacing: 0.5 },
  
  weightDisplayRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  weightNumber: { fontSize: 32, fontWeight: '800', color: '#FFFFFF' },
  weightUnit: { fontSize: 16, fontWeight: '600', color: '#888888', marginLeft: 4 },
  
  weightEditRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  weightInput: { 
    borderWidth: 1, 
    borderColor: '#00D2FF', 
    borderRadius: 8, 
    padding: 8, 
    width: 90, 
    fontSize: 20, 
    fontWeight: '700', 
    backgroundColor: '#252525',
    color: '#FFFFFF',
    textAlign: 'center'
  },
  unitText: { marginLeft: 6, fontSize: 16, color: '#888888', fontWeight: '600' },
  saveWeightBtn: { backgroundColor: '#00D2FF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginLeft: 10 },
  saveWeightBtnText: { color: '#000000', fontWeight: '800' },
  
  editBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0, 210, 255, 0.12)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12 
  , marginBottom: 12 },
  editBtnText: { color: '#00D2FF', fontWeight: '700', fontSize: 13, marginLeft: 4 },

  rangeSelector: { flexDirection: 'row', backgroundColor: '#282828', borderRadius: 8, padding: 3, marginTop: 14, marginBottom: 8 },
  rangePill: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6 },
  rangePillActive: { backgroundColor: '#3A3A3C' },
  rangePillText: { fontSize: 12, fontWeight: '600', color: '#888888' },
  rangePillTextActive: { color: '#00D2FF', fontWeight: '800' },

  chartStyle: { marginVertical: 8, borderRadius: 12 },
  emptyChartBox: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  emptyChartText: { color: '#777777', textAlign: 'center', marginTop: 8, fontSize: 13 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontWeight: '700', fontSize: 12 },
  trainingInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  trainingIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  trainingPlanTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  trainingPlanDetails: { fontSize: 13, color: '#888888', marginTop: 2 },
  restDayBox: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  restDayText: { marginLeft: 10, fontSize: 13, color: '#888888', flex: 1 },

  addRecipePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00D2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  addRecipePillText: { color: '#000000', fontWeight: '800', fontSize: 12, marginLeft: 2 },

  macroBlock: { marginTop: 12 },
  macroLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  macroTitle: { fontSize: 14, color: '#CCCCCC', fontWeight: '600' },
  macroVal: { fontSize: 13, color: '#888888' },
  progressTrack: { height: 8, backgroundColor: '#282828', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  // Modal / Sheet
  scanBarcodeModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#30D158',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 14,
  },
  scanBarcodeModalBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333336',
  },
  orDividerText: {
    color: '#777777',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 10,
    letterSpacing: 0.5,
  },

  mealModalTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 12 },
  emptyRecipesNotice: { alignItems: 'center', padding: 24 },
  emptyRecipesTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
  emptyRecipesDesc: { fontSize: 13, color: '#888888', textAlign: 'center', marginTop: 4 },
  mealOptionCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#282828' 
  },
  mealOptionName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  mealOptionMacros: { fontSize: 13, color: '#888888', marginTop: 2 },
  addIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00D2FF',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeRecipeModalBtn: { backgroundColor: '#282828', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  closeRecipeModalBtnText: { fontWeight: '700', color: '#FFFFFF' },

  homeStartWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00D2FF',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
    gap: 6,
    shadowColor: '#00D2FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  homeStartWorkoutBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  dividerLine: { flex: 1, height: 1, backgroundColor: '#333333' },
  dividerText: { color: '#666666', fontSize: 11, fontWeight: '800', marginHorizontal: 12, letterSpacing: 0.5 },
  portionInput: { backgroundColor: '#28282C', color: '#FFF', fontSize: 24, fontWeight: '900', textAlign: 'center', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#38383E' },
  logPillFull: { backgroundColor: '#30D158', padding: 16, borderRadius: 12, alignItems: 'center' },
  logPillTextFull: { color: '#000', fontSize: 16, fontWeight: '900' },

  activityCard: { backgroundColor: '#1E1E20', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#303036' },
  activityHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  activityTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8 },
  activityRow: { flexDirection: 'row', justifyContent: 'space-around' },
  activityStat: { alignItems: 'center' },
  activityValue: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 8 },
  activityUnit: { fontSize: 14, color: '#888', fontWeight: '600' },
  activityLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginTop: 4 },

  unifiedStreakCard: { backgroundColor: '#1E1E20', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#333' },
  masterStreakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  masterStreakNum: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  masterStreakTitle: { color: '#FFD60A', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  masterBadge: { backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  masterBadgeActive: { backgroundColor: '#FFD60A' },
  masterBadgeText: { color: '#888', fontSize: 10, fontWeight: '800' },
  subStreaksRow: { flexDirection: 'row', backgroundColor: '#121212', borderRadius: 12, padding: 12 },
  subStreak: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  subStreakDivider: { width: 1, backgroundColor: '#333', marginHorizontal: 10 },
  subStreakVal: { color: '#FFF', fontSize: 16, fontWeight: '800', marginLeft: 8 },
  subStreakLabel: { color: '#888', fontSize: 12, fontWeight: '600' }
});
