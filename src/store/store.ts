import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLevelData } from '../utils/gamification';
import { getAvailableMonths, calculateMonthlyReview } from '../utils/monthlyReviewEngine';
import { resolveActiveNutritionTargets } from '../utils/dietPlanEngine';
import { AccentThemeId } from '../utils/theme';

export const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  isUnilateral?: boolean;
  lastCompletedSets?: Array<{ weight: number; reps: number; repsRight?: number }>;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  daysOfWeek: string[];
  isActive?: boolean; // Deprecated, moved to WorkoutProgram
  exercises: Exercise[];
}

export interface WorkoutProgram {
  id: string;
  name: string;
  isActive: boolean;
  workouts: WorkoutPlan[];
}

export interface CompletedSet {
  setNumber: number;
  weight: number;
  reps: number;
  repsRight?: number;
}

export interface CompletedExercise {
  name: string;
  isUnilateral?: boolean;
  sets: CompletedSet[];
}

export interface CompletedWorkout {
  id: string;
  planName: string;
  customName?: string;
  trainingPartner?: string;
  isFavorite?: boolean;
  notes?: string;
  date: string; // ISO date
  formattedDate: string; // "Sep 4, 2026 - 18:30"
  durationSeconds: number;
  caloriesBurned: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  exercises: CompletedExercise[];
}

export interface StorePrice {
  storeName: string; // e.g. 'Aldi' | 'Lidl' | 'Migros' | 'Coop' | 'Denner' | 'Spar' | string
  price: number; // in CHF or currency
  packageSize: number; // in grams, ml, or pieces
  packageUnit?: string; // 'g' | 'kg' | 'ml' | 'l' | 'Stk'
}

export interface Ingredient {
  id: string;
  name: string;
  barcode?: string;
  baseAmount: number; // e.g., 100 for 100g
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  usageCount?: number;
  prices?: StorePrice[];
  preferredStore?: string;
}

export interface RecipeIngredient {
  ingredient: Ingredient;
  amount: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients?: RecipeIngredient[]; // Optional for legacy
  totalServings?: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  usageCount?: number;
  imageUri?: string;
}

export interface LoggedMeal {
  id: string;
  name: string;
  time: string;
  ingredients?: RecipeIngredient[]; // Optional for legacy
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  usageCount?: number;
  scheduledMealId?: string; // Links this back to the scheduled meal
  servingsLogged?: number; // How many servings were logged
  recipeId?: string; // Links this log to a saved recipe for XP tracking
}

export interface ScheduledMeal {
  id: string;
  dayOfWeek: string[]; // e.g. ["Monday", "Wednesday"]
  time: string; // "08:00"
  recipeId: string;
  customName?: string;
  servings?: number;
  isBalancerMeal?: boolean; // NEW: Designated as auto-adjusting balancer meal
}

export interface CustomShoppingItem {
  id: string;
  name: string;
  amount?: string;
  storeName?: string;
  price?: number;
  checked: boolean;
}

export interface DietPlan {
  id: string;
  name: string;
  goal: 'Cut' | 'Bulk' | 'Maintain';
  isActive: boolean;
  scheduledMeals: ScheduledMeal[];
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}

export type WidgetType = 'streak' | 'bodyweight' | 'workout' | 'nextMeal' | 'nutrition' | 'activity' | 'music' | 'supplements' | 'checkin' | 'arena';

export interface WidgetContainer {
  id: string;
  widgets: WidgetType[];
}

export interface DailyNutritionLog {
  date: string; // ISO date YYYY-MM-DD
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  usageCount?: number;
  hitGoal: boolean;
  meals: LoggedMeal[];
}

export interface Supplement {
  id: string;
  name: string;
  dosage: string;
  time: string; // "HH:MM" 24-hour format
  category: 'Daily Health' | 'Performance' | 'Recovery' | 'Vitamins';
  notes?: string;
  notificationEnabled?: boolean;
  notificationId?: string;
  takenToday?: boolean;
  lastTakenDate?: string;
  totalAmount?: number; // e.g. 300 (total grams or capsules in bottle)
  amountPerServing?: number; // e.g. 5 (amount taken per dose)
  remainingAmount?: number; // current inventory level
  servingUnit?: string; // "g", "capsules", "scoops"
}

export interface SupplementLibraryItem {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  category: 'Daily Health' | 'Performance' | 'Recovery' | 'Vitamins' | string;
  imageUri?: string;
  unit: string; // e.g. 'capsule', 'scoop', 'g'
  contentPerUnit: number; 
  unitsPerBox?: number;
  currentInventory?: number; // in units
  streak: number;
  totalTakenTimes: number;
  totalMissedTimes: number;
}

export interface SupplementTarget {
  libraryItemId: string;
  targetDosage: number; 
}

export interface SupplementStack {
  id: string;
  name: string;
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Bedtime' | 'Pre-Workout' | 'Post-Workout' | string;
  timeTarget?: string;
  supplements: SupplementTarget[];
}

export interface SupplementPlan {
  id: string;
  name: string;
  isActive: boolean;
  stacks: SupplementStack[];
}

export interface SupplementIntakeLog {
  date: string; // YYYY-MM-DD
  checkedItems: Record<string, boolean>; // key: `${stackId}_${libraryItemId}` -> boolean
}

interface WeightEntry {
  date: string;
  weight: number;
}

export interface CustomAlertButton {
  text: string;
  style?: 'cancel' | 'destructive' | 'default';
  onPress?: () => void;
}

export interface CustomAlertOptions {
  title: string;
  message?: string;
  buttons?: CustomAlertButton[];
}

export interface AppNote {
  id: string;
  text: string;
  screenName: string;
  createdAt: string;
}

export interface AppState {
  globalNotes: AppNote[];
  addGlobalNote: (text: string, screenName: string) => void;
  deleteGlobalNote: (id: string) => void;
  healthConnectEnabled: boolean;
  setHealthConnectEnabled: (enabled: boolean) => void;
  
  adminStreakOverride: number | null;
  setAdminStreakOverride: (val: number | null) => void;
  xpEvent: { id: number, sourceX: number, sourceY: number, amount: number, type: string } | null;
  triggerXPEvent: (sourceX: number, sourceY: number, amount: number, type?: string) => void;
  // Bodyweight
  bodyweight: number;
  weightHistory: WeightEntry[];
  setBodyweight: (weight: number) => void;
  
  // Exercise Defaults
  exerciseDefaults: Record<string, { weight: number; reps: number; isUnilateral?: boolean; lastCompletedSets?: Array<{ weight: number; reps: number; repsRight?: number }> }>;

  // Training (Legacy, for migration)
  workoutPlans?: WorkoutPlan[];

  // Programs
  workoutPrograms: WorkoutProgram[];
  
  // Spontaneous Workouts
  spontaneousWorkouts: WorkoutPlan[];
  addSpontaneousWorkout: (plan: WorkoutPlan) => void;
  updateSpontaneousWorkout: (plan: WorkoutPlan) => void;
  renameSpontaneousWorkout: (id: string, name: string) => void;
  deleteSpontaneousWorkout: (id: string) => void;

  addWorkoutProgram: (program: WorkoutProgram) => void;
  updateWorkoutProgram: (program: WorkoutProgram) => void;
  deleteWorkoutProgram: (id: string) => void;
  toggleProgramActive: (id: string) => void;

  // Custom Exercises
  customExercises: { name: string; category: string; targetMuscle?: string; equipmentType?: string; brand?: string }[];
  equipmentTypes: string[];
  equipmentBrands: string[];
  addEquipmentType: (type: string) => void;
  addEquipmentBrand: (brand: string) => void;
  editCustomExercise: (oldName: string, exercise: { name: string; category: string; targetMuscle?: string; equipmentType?: string; brand?: string }) => void;
  addCustomExercise: (exercise: { name: string; category: string; targetMuscle?: string; equipmentType?: string; brand?: string }) => void;

  // Workout History
  workoutHistory: CompletedWorkout[];
  addCompletedWorkout: (workout: CompletedWorkout) => void;
  updateCompletedWorkout: (workout: CompletedWorkout) => void;
  toggleFavoriteWorkout: (id: string) => void;
  deleteCompletedWorkout: (id: string) => void;

  // Live Workout Launch Trigger
  liveWorkoutToStart: WorkoutPlan | null;
  setLiveWorkoutToStart: (plan: WorkoutPlan | null) => void;
  
  // Nutrition Targets
  targets: { calories: number; protein: number; carbs: number; fat: number };
  setTargets: (targets: { calories: number; protein: number; carbs: number; fat: number }) => void;
  
  // Ingredients Base
  ingredients: Ingredient[];
  addIngredient: (ingredient: Ingredient) => void;
  updateIngredient: (ingredient: Ingredient) => void;
  deleteIngredient: (id: string) => void;
  incrementIngredientUsage: (id: string) => void;


  // Nutrition History
  nutritionHistory: DailyNutritionLog[];

  // Gamification & XP
  totalXP: number;
  unlockedAchievements: string[];
  equippedTitle: string | null;
  setEquippedTitle: (title: string | null) => void;
  lastDailyResetDate: string;
  triggerMacroConfetti: boolean;
  setTriggerMacroConfetti: (val: boolean) => void;
  triggerStreakConfetti: boolean;
  setTriggerStreakConfetti: (val: boolean) => void;
  addXP: (amount: number) => void;
  unlockAchievement: (id: string, xpReward: number) => void;
  levelUpData: { newLevel: number, totalXP: number } | null;
  setLevelUpData: (data: { newLevel: number, totalXP: number } | null) => void;

  // Pinned Badges
  pinnedAchievements?: string[];
  setPinnedAchievements: (badges: string[]) => void;
  
  // Flawless Months & Monthly Review
  flawlessMonths: string[];
  lastViewedMonthlyReview: string | null;
  recordFlawlessMonth: (monthKey: string) => void;
  setLastViewedMonthlyReview: (monthKey: string) => void;
  checkAndUpdateFlawlessMonths: () => void;

  // Consumed Today
  consumedToday: { calories: number; protein: number; carbs: number; fat: number };
  dailyTargetExtra?: { calories: number; protein: number; carbs: number; fat: number };
  addDailyTargetExtra: (extra: { calories: number; protein: number; carbs: number; fat: number }) => void;
  loggedMealsToday: LoggedMeal[];
  mealLogCounts: Record<string, number>; // recipeId -> total times logged
  skippedMealsToday: string[];
  addLoggedMeal: (meal: Omit<LoggedMeal, 'id' | 'time'>) => void;
  deleteLoggedMeal: (id: string) => void;
  moveMealToYesterday: (id: string) => void;

  skipScheduledMeal: (scheduledMealId: string) => void;
  updateLoggedMealIngredientAmount: (mealId: string, ingredientId: string, newAmount: number) => void;
  resetConsumed: () => void;
  checkDailyReset: () => void;

  // Diet Plans
  dietPlans: DietPlan[];
  addDietPlan: (plan: DietPlan) => void;
  updateDietPlan: (plan: DietPlan) => void;
  deleteDietPlan: (id: string) => void;
  toggleDietPlanActive: (id: string) => void;

  // Saved Recipes
  savedMeals: Recipe[];
  addSavedMeal: (recipe: Recipe) => void;
  updateSavedMeal: (recipe: Recipe) => void;
  deleteSavedMeal: (id: string) => void;
  quickLogRecipeIds: string[];
  setQuickLogRecipeIds: (ids: string[]) => void;

  // Shopping List & Store Prices
  shoppingListCheckedIds: string[];
  toggleShoppingItemChecked: (id: string) => void;
  clearShoppingChecked: () => void;
  customShoppingItems: CustomShoppingItem[];
  addCustomShoppingItem: (item: Omit<CustomShoppingItem, 'id' | 'checked'>) => void;
  toggleCustomShoppingItem: (id: string) => void;
  deleteCustomShoppingItem: (id: string) => void;
  stores: string[];
  addCustomStore: (storeName: string) => void;
  setIngredientPrices: (ingredientId: string, prices: StorePrice[]) => void;

  // Supplements (Legacy)
  supplements?: Supplement[];
  addSupplement?: (supplement: Supplement) => void;
  updateSupplement?: (supplement: Supplement) => void;
  deleteSupplement?: (id: string) => void;
  toggleSupplementTaken?: (id: string) => void;
  takeAllSupplements?: () => void;
  resetSupplementsIfNewDay?: () => void;

  // Supplement System v2
  supplementLibrary: SupplementLibraryItem[];
  addSupplementLibraryItem: (item: SupplementLibraryItem) => void;
  updateSupplementLibraryItem: (item: SupplementLibraryItem) => void;
  deleteSupplementLibraryItem: (id: string) => void;

  supplementPlans: SupplementPlan[];
  addSupplementPlan: (plan: SupplementPlan) => void;
  updateSupplementPlan: (plan: SupplementPlan) => void;
  deleteSupplementPlan: (id: string) => void;
  setActiveSupplementPlan: (id: string) => void;

  supplementIntakeLog: Record<string, SupplementIntakeLog>;
  toggleSupplementIntake: (date: string, stackId: string, libraryItemId: string, targetDosage: number) => void;
  checkSupplementDailyReset: () => void;

  // Collectibles
  collectibleImages: Record<string, string>;
  setCollectibleImage: (id: string, uri: string) => void;
  
  hiddenExercises: string[];
  hidePreloadedExercise: (name: string) => void;
  restorePreloadedExercise: (name: string) => void;
  deleteCustomExercise: (name: string) => void;
  setExerciseDefault: (name: string, defaults: { weight?: number; reps?: number; isUnilateral?: boolean }) => void;

  // Global Live Workout State (Synced from TrainingScreen)
  globalActivePlan: WorkoutPlan | null;
  globalWorkoutDuration: number;
  globalWorkoutStartTime: number | null;
  globalRestTimeLeft: number | null;
  globalLiveWorkoutModalVisible: boolean;
  
  setGlobalActivePlan: (plan: WorkoutPlan | null) => void;
  setGlobalWorkoutDuration: (duration: number) => void;
  setGlobalWorkoutStartTime: (time: number | null) => void;
  setGlobalRestTimeLeft: (time: number | null) => void;
  setGlobalLiveWorkoutModalVisible: (visible: boolean) => void;
  openBarcodeScannerOnMount: boolean;
  setOpenBarcodeScannerOnMount: (visible: boolean) => void;

  // Home Screen Layout & Theme
  homeLayout: WidgetContainer[];
  disabledWidgets: WidgetType[];
  updateHomeLayout: (layout: WidgetContainer[]) => void;
  setDisabledWidgets: (widgets: WidgetType[]) => void;
  accentThemeId?: AccentThemeId;
  setAccentThemeId: (id: AccentThemeId) => void;
  geminiApiKey?: string;
  setGeminiApiKey: (key: string) => void;

  // Global Cardio Mini-Player state
  globalCardioActive: boolean;
  globalCardioDuration: number;
  globalCardioDistance: number; // metres
  globalCardioSpeed: number;    // km/h
  setGlobalCardioSession: (active: boolean, duration: number, distance: number, speed: number) => void;
  globalCardioModalVisible: boolean;
  setGlobalCardioModalVisible: (visible: boolean) => void;
  globalCardioActivityType: any;
  globalCardioTestType: any;
  setGlobalCardioSessionInfo: (activityType: any, testType: any) => void;
  finishCurrentCardio: ((skipNav?: boolean) => Promise<void>) | null;
  setFinishCurrentCardio: (fn: ((skipNav?: boolean) => Promise<void>) | null) => void;

  // Bluetooth Heart Rate State
  connectedDeviceId: string | null;
  currentHeartRate: number | null;
  setConnectedDevice: (id: string | null) => void;
  setCurrentHeartRate: (hr: number | null) => void;
  finishCurrentStrength: ((skipNav?: boolean) => Promise<void>) | null;
  setFinishCurrentStrength: (fn: ((skipNav?: boolean) => Promise<void>) | null) => void;
  customAlertOptions: CustomAlertOptions | null;
  setCustomAlert: (options: CustomAlertOptions | null) => void;
}

const initialSupplements: Supplement[] = [
  {
    id: 'supp-1',
    name: 'Creatine Monohydrate',
    dosage: '5g',
    time: '08:00',
    category: 'Performance',
    notes: 'Take with 300ml water or morning shake',
    notificationEnabled: true,
    takenToday: false,
  },
  {
    id: 'supp-2',
    name: 'Vitamin D3 + K2',
    dosage: '5000 IU',
    time: '08:30',
    category: 'Vitamins',
    notes: 'Take with morning meal containing healthy fats',
    notificationEnabled: true,
    takenToday: false,
  },
  {
    id: 'supp-3',
    name: 'Omega-3 Fish Oil',
    dosage: '2000mg',
    time: '13:00',
    category: 'Daily Health',
    notes: 'EPA/DHA with lunch',
    notificationEnabled: true,
    takenToday: false,
  },
  {
    id: 'supp-4',
    name: 'Magnesium Glycinate',
    dosage: '400mg',
    time: '21:30',
    category: 'Recovery',
    notes: 'Take 45 minutes before sleep for optimal muscle recovery',
    notificationEnabled: true,
    takenToday: false,
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      healthConnectEnabled: false,
      setHealthConnectEnabled: (enabled) => set({ healthConnectEnabled: enabled }),
      
      globalNotes: [],
      addGlobalNote: (text, screenName) => set((state) => ({
        globalNotes: [{ id: Date.now().toString(), text, screenName, createdAt: new Date().toISOString() }, ...state.globalNotes]
      })),
      deleteGlobalNote: (id) => set((state) => ({
        globalNotes: state.globalNotes.filter(n => n.id !== id)
      })),
      exerciseDefaults: {},
      bodyweight: 0,
      weightHistory: [],
      setBodyweight: (weight) => set((state) => {
        const today = getLocalDateString();
        const existingIndex = state.weightHistory.findIndex(entry => entry.date === today);
        let newHistory = [...state.weightHistory];
        
        if (existingIndex >= 0) {
          newHistory[existingIndex] = { date: today, weight };
        } else {
          newHistory.push({ date: today, weight });
        }
        
        return {
     
          bodyweight: weight,
          weightHistory: newHistory
        };
      }),

      workoutPrograms: [],
      
      spontaneousWorkouts: [],
      addSpontaneousWorkout: (plan) => set((state) => ({
        spontaneousWorkouts: [plan, ...(state.spontaneousWorkouts || [])]
      })),
      updateSpontaneousWorkout: (plan) => set((state) => ({
        spontaneousWorkouts: (state.spontaneousWorkouts || []).map(p => p.id === plan.id ? plan : p)
      })),
      renameSpontaneousWorkout: (id, name) => set((state) => ({
        spontaneousWorkouts: (state.spontaneousWorkouts || []).map(p => p.id === id ? { ...p, name } : p)
      })),
      deleteSpontaneousWorkout: (id) => set((state) => ({
        spontaneousWorkouts: (state.spontaneousWorkouts || []).filter(p => p.id !== id)
      })),

      xpEvent: null,
      triggerXPEvent: (sourceX, sourceY, amount, type = 'XP') => set({ xpEvent: { id: Date.now(), sourceX, sourceY, amount, type } }),
      adminStreakOverride: null,
      setAdminStreakOverride: (val: number | null) => set({ adminStreakOverride: val }),
      addWorkoutProgram: (program) => set((state) => ({ 
        workoutPrograms: [...(state.workoutPrograms || []), program] 
      })),
      updateWorkoutProgram: (updatedProgram) => set((state) => ({
        workoutPrograms: (state.workoutPrograms || []).map(p => p.id === updatedProgram.id ? updatedProgram : p)
      })),
      deleteWorkoutProgram: (id) => set((state) => ({
        workoutPrograms: (state.workoutPrograms || []).filter(p => p.id !== id)
      })),
      toggleProgramActive: (id) => set((state) => ({
        workoutPrograms: (state.workoutPrograms || []).map(p => 
          p.id === id ? { ...p, isActive: p.isActive === undefined ? false : !p.isActive } : p
        )
      })),

      customExercises: [],
      equipmentTypes: ['Freie Übung', 'Maschine', 'Kabelturm', 'Multipresse', 'Bodyweight', 'Sonstiges'],
      equipmentBrands: ['Technogym', 'Hammer Strength', 'Gym80', 'Nautilus', 'Precor', 'Cybex', 'Eleiko', 'Prime', 'Keine'],
      addEquipmentType: (type) => set((state) => {
        if (!state.equipmentTypes.includes(type)) {
          return { equipmentTypes: [...state.equipmentTypes, type] };
        }
        return state;
      }),
      addEquipmentBrand: (brand) => set((state) => {
        if (!state.equipmentBrands.includes(brand)) {
          return { equipmentBrands: [...state.equipmentBrands, brand] };
        }
        return state;
      }),
      editCustomExercise: (oldName, exercise) => set((state) => {
        const filtered = (state.customExercises || []).filter(e => e.name !== oldName);
        const newCustom = [...filtered, exercise];

        // If renamed, update defaults & plans
        let updatedDefaults = state.exerciseDefaults;
        if (oldName !== exercise.name && state.exerciseDefaults) {
          updatedDefaults = { ...state.exerciseDefaults };
          if (updatedDefaults[oldName]) {
            updatedDefaults[exercise.name] = updatedDefaults[oldName];
            delete updatedDefaults[oldName];
          }
        }

        let updatedPrograms = state.workoutPrograms;
        if (oldName !== exercise.name && state.workoutPrograms) {
          updatedPrograms = state.workoutPrograms.map(prog => ({
            ...prog,
            workouts: (prog.workouts || []).map(w => ({
              ...w,
              exercises: (w.exercises || []).map(ex =>
                ex.name.toLowerCase() === oldName.toLowerCase()
                  ? { ...ex, name: exercise.name }
                  : ex
              )
            }))
          }));
        }

        setTimeout(() => {
          try {
            import('../engine/ironTactics/cardPoolEngine')
              .then(m => m.resolveIronTacticsCardPool())
              .catch(() => {});
          } catch {
            // ignore
          }
        }, 50);

        return {
          customExercises: newCustom,
          exerciseDefaults: updatedDefaults,
          workoutPrograms: updatedPrograms,
        };
      }),
      setExerciseDefault: (name, defaults) => set((state) => ({
        exerciseDefaults: {
          ...(state.exerciseDefaults || {}),
          [name]: {
            ...(state.exerciseDefaults?.[name] || { weight: 0, reps: 10 }),
            ...defaults,
          }
        }
      })),
      addCustomExercise: (exercise) => set((state) => {
        if ((state.customExercises || []).find(e => e.name.toLowerCase() === exercise.name.toLowerCase())) {
          return state;
        }
        setTimeout(() => {
          try {
            import('../engine/ironTactics/cardPoolEngine')
              .then(m => m.resolveIronTacticsCardPool())
              .catch(() => {});
          } catch {
            // ignore
          }
        }, 50);
        return { customExercises: [...(state.customExercises || []), exercise] };
      }),

      workoutHistory: [],
      addCompletedWorkout: (workout) => set((state) => {
        const newExerciseDefaults = { ...(state.exerciseDefaults || {}) };
        workout.exercises.forEach(ex => {
          let lastWeight = 0;
          let lastReps = 0;
          const setsData: Array<{ weight: number; reps: number; repsRight?: number }> = [];
          ex.sets.forEach(set => {
            if (set.weight > 0 || set.reps > 0) {
              lastWeight = set.weight;
              lastReps = set.reps;
            }
            setsData.push({ 
              weight: set.weight || 0, 
              reps: set.reps || 0,
              repsRight: set.repsRight 
            });
          });
          if (lastWeight > 0 || lastReps > 0 || setsData.length > 0) {
            newExerciseDefaults[ex.name] = { 
              weight: lastWeight, 
              reps: lastReps,
              isUnilateral: ex.isUnilateral,
              lastCompletedSets: setsData
            };
          }
        });

        const earnedXP = 500 + (workout.exercises.length * 50);
        const currentXP = state.totalXP || 0;
        const newXP = currentXP + earnedXP;
        const oldLevel = getLevelData(currentXP).level;
        const newLevel = getLevelData(newXP).level;
        let newLevelUpData = state.levelUpData;

        if (newLevel > oldLevel) {
          newLevelUpData = { newLevel, totalXP: newXP };
        }

        return {
          workoutHistory: [workout, ...(state.workoutHistory || [])],
          exerciseDefaults: newExerciseDefaults,
          totalXP: newXP,
          levelUpData: newLevelUpData,
        };
      }),
      deleteCompletedWorkout: (id) => set((state) => ({
        workoutHistory: (state.workoutHistory || []).filter(w => w.id !== id)
      })),
      updateCompletedWorkout: (workout) => set((state) => ({
        workoutHistory: (state.workoutHistory || []).map(w => w.id === workout.id ? workout : w)
      })),
      toggleFavoriteWorkout: (id) => set((state) => ({
        workoutHistory: (state.workoutHistory || []).map(w => w.id === id ? { ...w, isFavorite: !w.isFavorite } : w)
      })),

      liveWorkoutToStart: null,
      setLiveWorkoutToStart: (plan) => set({ liveWorkoutToStart: plan }),

      globalActivePlan: null,
      globalWorkoutDuration: 0,
      globalWorkoutStartTime: null,
      globalRestTimeLeft: null,
      globalLiveWorkoutModalVisible: false,
      
      setGlobalActivePlan: (plan) => set({ globalActivePlan: plan }),

      globalCardioActive: false,
      globalCardioDuration: 0,
      globalCardioDistance: 0,
      globalCardioSpeed: 0,
      setGlobalCardioSession: (active, duration, distance, speed) =>
        set({ globalCardioActive: active, globalCardioDuration: duration, globalCardioDistance: distance, globalCardioSpeed: speed }),
      globalCardioModalVisible: false,
      setGlobalCardioModalVisible: (visible) => set({ globalCardioModalVisible: visible }),
      globalCardioActivityType: null,
      globalCardioTestType: null,
      setGlobalCardioSessionInfo: (activityType, testType) => set({ globalCardioActivityType: activityType, globalCardioTestType: testType }),
      finishCurrentCardio: null,
      setFinishCurrentCardio: (fn) => set({ finishCurrentCardio: fn }),

      connectedDeviceId: null,
      currentHeartRate: null,
      setConnectedDevice: (id) => set({ connectedDeviceId: id }),
      setCurrentHeartRate: (hr) => set({ currentHeartRate: hr }),
      finishCurrentStrength: null,
      setFinishCurrentStrength: (fn) => set({ finishCurrentStrength: fn }),
      customAlertOptions: null,
      setCustomAlert: (options) => set({ customAlertOptions: options }),
      setGlobalWorkoutDuration: (duration) => set({ globalWorkoutDuration: duration }),
      setGlobalWorkoutStartTime: (time) => set({ globalWorkoutStartTime: time }),
      setGlobalRestTimeLeft: (time) => set({ globalRestTimeLeft: time }),
      setGlobalLiveWorkoutModalVisible: (visible) => set({ globalLiveWorkoutModalVisible: visible }),
      openBarcodeScannerOnMount: false,
      setOpenBarcodeScannerOnMount: (visible) => set({ openBarcodeScannerOnMount: visible }),

      // Home Screen Layout
      homeLayout: [
        { id: '1', widgets: ['streak'] },
        { id: '2', widgets: ['bodyweight'] },
        { id: '3', widgets: ['workout'] },
        { id: '4', widgets: ['nextMeal'] },
        { id: '5', widgets: ['nutrition'] },
        { id: '7', widgets: ['music'] },
        { id: '6', widgets: ['activity'] }
      ],
      disabledWidgets: [],
      updateHomeLayout: (layout) => set({ homeLayout: layout }),
      setDisabledWidgets: (widgets) => set({ disabledWidgets: widgets }),

      targets: { calories: 2500, protein: 150, carbs: 250, fat: 80 },
      setTargets: (targets) => set({ targets }),

      ingredients: [],
      addIngredient: (ingredient) => set((state) => ({ ingredients: [...(state.ingredients || []), ingredient] })),
      updateIngredient: (ingredient) => set((state) => ({ ingredients: (state.ingredients || []).map(i => i.id === ingredient.id ? ingredient : i) })),
      deleteIngredient: (id) => set((state) => ({ ingredients: (state.ingredients || []).filter(i => i.id !== id) })),
      incrementIngredientUsage: (id) => set((state) => ({ ingredients: (state.ingredients || []).map(i => i.id === id ? { ...i, usageCount: (i.usageCount || 0) + 1 } : i) })),


      consumedToday: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      dailyTargetExtra: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      addDailyTargetExtra: (extra) => set((state) => ({
        dailyTargetExtra: {
          calories: (state.dailyTargetExtra?.calories || 0) + extra.calories,
          protein: (state.dailyTargetExtra?.protein || 0) + extra.protein,
          carbs: (state.dailyTargetExtra?.carbs || 0) + extra.carbs,
          fat: (state.dailyTargetExtra?.fat || 0) + extra.fat,
        }
      })),
      loggedMealsToday: [],
      mealLogCounts: {},
      
      addLoggedMeal: (meal) => set((state) => {
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Calculate macros
        let computedCal = 0, computedPro = 0, computedCar = 0, computedFat = 0;
        if (meal.ingredients && meal.ingredients.length > 0) {
          meal.ingredients.forEach(req => {
            const ratio = req.amount / req.ingredient.baseAmount;
            computedCal += req.ingredient.calories * ratio;
            computedPro += req.ingredient.protein * ratio;
            computedCar += req.ingredient.carbs * ratio;
            computedFat += req.ingredient.fat * ratio;
          });
        } else {
          computedCal = meal.calories || 0;
          computedPro = meal.protein || 0;
          computedCar = meal.carbs || 0;
          computedFat = meal.fat || 0;
        }

        const newEntry: LoggedMeal = {
          id: Date.now().toString(),
          name: meal.name.trim() || 'Quick Log',
          time,
          ingredients: meal.ingredients || [],
          calories: Math.round(computedCal),
          protein: Math.round(computedPro),
          carbs: Math.round(computedCar),
          fat: Math.round(computedFat),
          scheduledMealId: meal.scheduledMealId,
          recipeId: meal.recipeId,
        };

        // Track recipe log count for XP
        const newMealLogCounts = { ...(state.mealLogCounts || {}) };
        if (meal.recipeId) {
          newMealLogCounts[meal.recipeId] = (newMealLogCounts[meal.recipeId] || 0) + 1;
        }

        return {
          loggedMealsToday: [newEntry, ...(state.loggedMealsToday || [])],
          mealLogCounts: newMealLogCounts,
          consumedToday: {
            calories: (state.consumedToday?.calories || 0) + newEntry.calories,
            protein: (state.consumedToday?.protein || 0) + newEntry.protein,
            carbs: (state.consumedToday?.carbs || 0) + newEntry.carbs,
            fat: (state.consumedToday?.fat || 0) + newEntry.fat,
          }
        };
      }),

      updateLoggedMealIngredientAmount: (mealId, ingredientId, newAmount) => set((state) => {
        const mealIndex = (state.loggedMealsToday || []).findIndex(m => m.id === mealId);
        if (mealIndex === -1) return state;

        const meals = [...state.loggedMealsToday];
        const meal = { ...meals[mealIndex] };
        
        // Save old macros to subtract
        const oldCal = meal.calories || 0;
        const oldPro = meal.protein || 0;
        const oldCar = meal.carbs || 0;
        const oldFat = meal.fat || 0;

        // Update ingredient amount
        meal.ingredients = (meal.ingredients || []).map(req => 
          req.ingredient.id === ingredientId ? { ...req, amount: newAmount } : req
        );

        // Recalculate macros for the meal
        let computedCal = 0, computedPro = 0, computedCar = 0, computedFat = 0;
        meal.ingredients.forEach(req => {
          const ratio = req.amount / req.ingredient.baseAmount;
          computedCal += req.ingredient.calories * ratio;
          computedPro += req.ingredient.protein * ratio;
          computedCar += req.ingredient.carbs * ratio;
          computedFat += req.ingredient.fat * ratio;
        });

        meal.calories = Math.round(computedCal);
        meal.protein = Math.round(computedPro);
        meal.carbs = Math.round(computedCar);
        meal.fat = Math.round(computedFat);

        meals[mealIndex] = meal;

        return {
          loggedMealsToday: meals,
          consumedToday: {
            calories: Math.max(0, (state.consumedToday?.calories || 0) - oldCal + meal.calories),
            protein: Math.max(0, (state.consumedToday?.protein || 0) - oldPro + meal.protein),
            carbs: Math.max(0, (state.consumedToday?.carbs || 0) - oldCar + meal.carbs),
            fat: Math.max(0, (state.consumedToday?.fat || 0) - oldFat + meal.fat),
          }
        };
      }),


      moveMealToYesterday: (id) => set((state) => {
        const mealIndex = (state.loggedMealsToday || []).findIndex(m => m.id === id);
        if (mealIndex === -1) return state;

        const meals = [...state.loggedMealsToday];
        const meal = meals[mealIndex];
        meals.splice(mealIndex, 1);

        const cal = meal.calories || 0;
        const pro = meal.protein || 0;
        const car = meal.carbs || 0;
        const fat = meal.fat || 0;

        const history = [...(state.nutritionHistory || [])];
        if (history.length === 0) return state; // Nowhere to move

        const lastEntryIndex = history.length - 1;
        const lastEntry = { ...history[lastEntryIndex] };

        lastEntry.meals = [...(lastEntry.meals || []), meal];
        lastEntry.calories += cal;
        lastEntry.protein += pro;
        lastEntry.carbs += car;
        lastEntry.fat += fat;

        const baseTargets = resolveActiveNutritionTargets(state.dietPlans, state.targets, null, state.savedMeals);


        const calDiff = Math.abs(lastEntry.calories - baseTargets.calories) / baseTargets.calories;
        const proRatio = baseTargets.protein > 0 ? (lastEntry.protein / baseTargets.protein) : 1;
        const hitGoal = (calDiff <= 0.25) && (proRatio >= 0.75);

        let newTotalXP = state.totalXP || 0;
        let newLevelUpData = state.levelUpData;

        if (!lastEntry.hitGoal && hitGoal) {
          lastEntry.hitGoal = true;
          const currentXP = state.totalXP || 0;
          newTotalXP = currentXP + 250;
          const oldLevel = getLevelData(currentXP).level;
          const newLevel = getLevelData(newTotalXP).level;
          if (newLevel > oldLevel) {
            newLevelUpData = { newLevel, totalXP: newTotalXP };
          }
          try {
            const { useIronTacticsMetaStore } = require('./useIronTacticsMetaStore');
            useIronTacticsMetaStore.getState().claimFitnessAction('nutrition_hit');
          } catch {
            // ignore
          }
        }

        history[lastEntryIndex] = lastEntry;

        return {
          loggedMealsToday: meals,
          consumedToday: {
            calories: Math.max(0, (state.consumedToday?.calories || 0) - cal),
            protein: Math.max(0, (state.consumedToday?.protein || 0) - pro),
            carbs: Math.max(0, (state.consumedToday?.carbs || 0) - car),
            fat: Math.max(0, (state.consumedToday?.fat || 0) - fat),
          },
          nutritionHistory: history,
          totalXP: newTotalXP,
          levelUpData: newLevelUpData
        };
      }),
      deleteLoggedMeal: (id) => set((state) => {
        const targetMeal = (state.loggedMealsToday || []).find(m => m.id === id);
        if (!targetMeal) return state;

        const cal = targetMeal.calories || 0;
        const pro = targetMeal.protein || 0;
        const car = targetMeal.carbs || 0;
        const fat = targetMeal.fat || 0;

        return {
          loggedMealsToday: state.loggedMealsToday.filter(m => m.id !== id),
          consumedToday: {
            calories: Math.max(0, (state.consumedToday?.calories || 0) - cal),
            protein: Math.max(0, (state.consumedToday?.protein || 0) - pro),
            carbs: Math.max(0, (state.consumedToday?.carbs || 0) - car),
            fat: Math.max(0, (state.consumedToday?.fat || 0) - fat),
          }
        };
      }),

      totalXP: 0,
  unlockedAchievements: [],
  equippedTitle: null,
  setEquippedTitle: (title) => set({ equippedTitle: title }),
  lastDailyResetDate: getLocalDateString(),
  triggerMacroConfetti: false,
  setTriggerMacroConfetti: (val: boolean) => set({ triggerMacroConfetti: val }),
  triggerStreakConfetti: false,
  setTriggerStreakConfetti: (val: boolean) => set({ triggerStreakConfetti: val }),
  
  pinnedAchievements: [],
  setPinnedAchievements: (badges) => set({ pinnedAchievements: badges }),

  // Flawless Months & Monthly Review
  flawlessMonths: [],
  lastViewedMonthlyReview: null,
  recordFlawlessMonth: (monthKey: string) => set((state) => {
    const list = state.flawlessMonths || [];
    if (list.includes(monthKey)) return state;
    return { flawlessMonths: [...list, monthKey] };
  }),
  setLastViewedMonthlyReview: (monthKey: string) => set({ lastViewedMonthlyReview: monthKey }),
  checkAndUpdateFlawlessMonths: () => {
    const state = get();
    const available = getAvailableMonths(state.workoutHistory, state.nutritionHistory, state.weightHistory);
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    available.forEach(mKey => {
      if (mKey !== currentMonthKey && !(state.flawlessMonths || []).includes(mKey)) {
        const review = calculateMonthlyReview(mKey, state.workoutHistory, state.nutritionHistory, state.weightHistory, state.workoutPrograms);
        if (review.isFlawless) {
          state.recordFlawlessMonth(mKey);
        }
      }
    });
  },

  levelUpData: null,
  setLevelUpData: (data) => set({ levelUpData: data }),
  addXP: (amount: number) => set((state: AppState) => {
    const currentXP = state.totalXP || 0;
    const newXP = currentXP + amount;
    const oldLevel = getLevelData(currentXP).level;
    const newLevel = getLevelData(newXP).level;
    let newLevelUpData = state.levelUpData;
    if (newLevel > oldLevel) {
      newLevelUpData = { newLevel, totalXP: newXP };
    }
    return { totalXP: newXP, levelUpData: newLevelUpData };
  }),
  unlockAchievement: (id: string, xpReward: number) => set((state: AppState) => {
    if ((state.unlockedAchievements || []).includes(id)) return state;
    const currentXP = state.totalXP || 0;
    const newXP = currentXP + xpReward;
    const oldLevel = getLevelData(currentXP).level;
    const newLevel = getLevelData(newXP).level;
    let newLevelUpData = state.levelUpData;
    if (newLevel > oldLevel) {
      newLevelUpData = { newLevel, totalXP: newXP };
    }
    return { 
      unlockedAchievements: [...(state.unlockedAchievements || []), id],
      totalXP: newXP,
      levelUpData: newLevelUpData
    };
  }),

  nutritionHistory: [],
      
      checkDailyReset: () => set((state) => {
        const todayStr = getLocalDateString();
        if (state.lastDailyResetDate && state.lastDailyResetDate !== todayStr) {
          // It's a new day! We should auto-trigger the reset logic.
          const consumed = state.consumedToday || { calories: 0, protein: 0, carbs: 0, fat: 0 };
          const targets = resolveActiveNutritionTargets(state.dietPlans, state.targets, state.dailyTargetExtra, state.savedMeals);
          const meals = state.loggedMealsToday || [];
          
          const calDiff = Math.abs(consumed.calories - targets.calories) / targets.calories;
          const proRatio = targets.protein > 0 ? (consumed.protein / targets.protein) : 1;
          // Lenient tolerance: Within 25% of calories, and >= 75% of protein
          const hitGoal = (calDiff <= 0.25) && (proRatio >= 0.75);

          const historyEntry = {
            date: state.lastDailyResetDate,
            calories: consumed.calories,
            protein: consumed.protein,
            carbs: consumed.carbs,
            fat: consumed.fat,
            hitGoal,
            meals
          };

          const newHistory = (state.nutritionHistory || []).filter(h => h.date !== state.lastDailyResetDate);
          if (meals.length > 0) {
            newHistory.push(historyEntry);
          }
          let newTotalXP = state.totalXP || 0;
          let newLevelUpData = state.levelUpData;

          if (hitGoal && meals.length > 0) {
            const currentXP = state.totalXP || 0;
            newTotalXP = currentXP + 250;
            const oldLevel = getLevelData(currentXP).level;
            const newLevel = getLevelData(newTotalXP).level;
            if (newLevel > oldLevel) {
              newLevelUpData = { newLevel, totalXP: newTotalXP };
            }
          }

          return {
            nutritionHistory: newHistory,
            consumedToday: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            dailyTargetExtra: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            loggedMealsToday: [],
            skippedMealsToday: [],
            lastDailyResetDate: todayStr,
            totalXP: newTotalXP,
            levelUpData: newLevelUpData
          };
        }
        return state;
      }),

      skippedMealsToday: [],
      skipScheduledMeal: (scheduledMealId: string) => set((state) => ({
        skippedMealsToday: [...(state.skippedMealsToday || []), scheduledMealId]
      })),

      dietPlans: [],
      addDietPlan: (plan: DietPlan) => set((state) => ({ dietPlans: [...(state.dietPlans || []), plan] })),
      updateDietPlan: (plan: DietPlan) => set((state) => ({
        dietPlans: (state.dietPlans || []).map(p => p.id === plan.id ? plan : p)
      })),
      deleteDietPlan: (id: string) => set((state) => ({
        dietPlans: (state.dietPlans || []).filter(p => p.id !== id)
      })),
      toggleDietPlanActive: (id: string) => set((state) => ({
        dietPlans: (state.dietPlans || []).map(p => ({
          ...p,
          isActive: p.id === id ? !p.isActive : false // Only one active plan at a time
        }))
      })),

      resetConsumed: () => set((state) => {
        const consumed = state.consumedToday || { calories: 0, protein: 0, carbs: 0, fat: 0 };
        const targets = resolveActiveNutritionTargets(state.dietPlans, state.targets, state.dailyTargetExtra, state.savedMeals);
        const meals = state.loggedMealsToday || [];
        
        // Determine if goal was hit: Lenient tolerance - within 25% of calories, and >= 75% of protein
        const calDiff = Math.abs(consumed.calories - targets.calories) / targets.calories;
        const proRatio = targets.protein > 0 ? (consumed.protein / targets.protein) : 1;
        const hitGoal = (calDiff <= 0.25) && (proRatio >= 0.75);

        // Save to history using today's local date
        const todayStr = getLocalDateString();
        
        const historyEntry: DailyNutritionLog = {
          date: todayStr,
          calories: consumed.calories,
          protein: consumed.protein,
          carbs: consumed.carbs,
          fat: consumed.fat,
          hitGoal,
          meals
        };

        // If an entry for today already exists (user pressed reset twice in a day?), overwrite it
        const newHistory = (state.nutritionHistory || []).filter(h => h.date !== todayStr);
        // Only save if there was actually food eaten
        if (meals.length > 0) {
          newHistory.push(historyEntry);
        }
        let newTotalXP = state.totalXP || 0;
        let newLevelUpData = state.levelUpData;

        // If the user already reset today and hit the goal previously, we shouldn't grant XP twice. 
        // We'll grant XP if they didn't have an entry for today that already hit the goal.
        const alreadyHitGoalToday = (state.nutritionHistory || []).some(h => h.date === todayStr && h.hitGoal);
        
        if (hitGoal && meals.length > 0 && !alreadyHitGoalToday) {
          const currentXP = state.totalXP || 0;
          newTotalXP = currentXP + 250;
          const oldLevel = getLevelData(currentXP).level;
          const newLevel = getLevelData(newTotalXP).level;
          if (newLevel > oldLevel) {
            newLevelUpData = { newLevel, totalXP: newTotalXP };
          }
        }

        return {
          nutritionHistory: newHistory,
          consumedToday: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          dailyTargetExtra: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          loggedMealsToday: [],
          skippedMealsToday: [],
          lastDailyResetDate: todayStr,
          totalXP: newTotalXP,
          levelUpData: newLevelUpData
        };
      }),

      savedMeals: [],
      addSavedMeal: (recipe) => set((state) => ({ savedMeals: [...(state.savedMeals || []), recipe] })),
      updateSavedMeal: (recipe) => set((state) => ({ savedMeals: (state.savedMeals || []).map(r => r.id === recipe.id ? recipe : r) })),
      deleteSavedMeal: (id) => set((state) => ({
        savedMeals: (state.savedMeals || []).filter(m => m.id !== id)
      })),
      quickLogRecipeIds: [],
      setQuickLogRecipeIds: (ids) => set({ quickLogRecipeIds: ids }),

      // Shopping List & Store Prices
      shoppingListCheckedIds: [],
      toggleShoppingItemChecked: (id) => set((state) => {
        const checked = state.shoppingListCheckedIds || [];
        return {
          shoppingListCheckedIds: checked.includes(id)
            ? checked.filter(x => x !== id)
            : [...checked, id]
        };
      }),
      clearShoppingChecked: () => set({ shoppingListCheckedIds: [] }),

      customShoppingItems: [],
      addCustomShoppingItem: (item) => set((state) => ({
        customShoppingItems: [
          ...(state.customShoppingItems || []),
          { ...item, id: Date.now().toString(), checked: false }
        ]
      })),
      toggleCustomShoppingItem: (id) => set((state) => ({
        customShoppingItems: (state.customShoppingItems || []).map(item =>
          item.id === id ? { ...item, checked: !item.checked } : item
        )
      })),
      deleteCustomShoppingItem: (id) => set((state) => ({
        customShoppingItems: (state.customShoppingItems || []).filter(item => item.id !== id)
      })),

      stores: ['Aldi', 'Lidl', 'Migros', 'Coop', 'Denner', 'Spar'],
      addCustomStore: (storeName) => set((state) => {
        const s = (state.stores || ['Aldi', 'Lidl', 'Migros', 'Coop', 'Denner', 'Spar']);
        if (s.includes(storeName)) return state;
        return { stores: [...s, storeName] };
      }),

      setIngredientPrices: (ingredientId, prices) => set((state) => ({
        ingredients: (state.ingredients || []).map(ing =>
          ing.id === ingredientId ? { ...ing, prices } : ing
        )
      })),

      // Supplements (Legacy)
      supplements: initialSupplements,
      addSupplement: (supplement) => set((state) => ({
        supplements: [...(state.supplements || []), supplement]
      })),
      updateSupplement: (updated) => set((state) => ({
        supplements: (state.supplements || []).map(s => s.id === updated.id ? updated : s)
      })),
      deleteSupplement: (id) => set((state) => ({
        supplements: (state.supplements || []).filter(s => s.id !== id)
      })),
      toggleSupplementTaken: (id) => set((state) => {
        const today = getLocalDateString();
        return {
          supplements: (state.supplements || []).map(s => {
            if (s.id === id) {
              const isTaken = !s.takenToday;
              
              let newRemaining = s.remainingAmount;
              if (s.amountPerServing && newRemaining !== undefined) {
                if (isTaken) {
                  newRemaining = Math.max(0, newRemaining - s.amountPerServing);
                } else {
                  // Untaking it (undo)
                  newRemaining = newRemaining + s.amountPerServing;
                }
              }

              return {
                ...s,
                takenToday: isTaken,
                lastTakenDate: isTaken ? today : s.lastTakenDate,
                remainingAmount: newRemaining
              };
            }
            return s;
          })
        };
      }),
      takeAllSupplements: () => set((state) => {
        const today = getLocalDateString();
        return {
          supplements: (state.supplements || []).map(s => {
            if (s.takenToday) return s; // already taken
            
            let newRemaining = s.remainingAmount;
            if (s.amountPerServing && newRemaining !== undefined) {
              newRemaining = Math.max(0, newRemaining - s.amountPerServing);
            }
            
            return {
              ...s,
              takenToday: true,
              lastTakenDate: today,
              remainingAmount: newRemaining
            };
          })
        };
      }),
      resetSupplementsIfNewDay: () => set((state) => {
        const today = getLocalDateString();
        const needsReset = (state.supplements || []).some(s => s.takenToday && s.lastTakenDate !== today);
        if (!needsReset) return state;
        return {
          supplements: (state.supplements || []).map(s => (
            s.lastTakenDate !== today ? { ...s, takenToday: false } : s
          ))
        };
      }),

      // Supplement System v2
      supplementLibrary: [],
      addSupplementLibraryItem: (item) => set((state) => ({
        supplementLibrary: [...(state.supplementLibrary || []), item]
      })),
      updateSupplementLibraryItem: (item) => set((state) => ({
        supplementLibrary: (state.supplementLibrary || []).map(i => i.id === item.id ? item : i)
      })),
      deleteSupplementLibraryItem: (id) => set((state) => ({
        supplementLibrary: (state.supplementLibrary || []).filter(i => i.id !== id)
      })),

      supplementPlans: [],
      addSupplementPlan: (plan) => set((state) => ({
        supplementPlans: [...(state.supplementPlans || []), plan]
      })),
      updateSupplementPlan: (plan) => set((state) => ({
        supplementPlans: (state.supplementPlans || []).map(p => p.id === plan.id ? plan : p)
      })),
      deleteSupplementPlan: (id) => set((state) => ({
        supplementPlans: (state.supplementPlans || []).filter(p => p.id !== id)
      })),
      setActiveSupplementPlan: (id) => set((state) => ({
        supplementPlans: (state.supplementPlans || []).map(p => ({
          ...p,
          isActive: p.id === id
        }))
      })),

      supplementIntakeLog: {},
      toggleSupplementIntake: (date, stackId, libraryItemId, targetDosage) => set((state) => {
        const key = `${stackId}_${libraryItemId}`;
        const currentLog = state.supplementIntakeLog[date] || { date, checkedItems: {} };
        const isCurrentlyTaken = !!currentLog.checkedItems[key];
        
        // Target is being taken -> subtract inventory
        // Target is being UNtaken -> add inventory
        
        const newCheckedItems = { ...currentLog.checkedItems };
        if (isCurrentlyTaken) {
          delete newCheckedItems[key]; // untake
        } else {
          newCheckedItems[key] = true; // take
        }

        // Update inventory & stats in library
        const updatedLibrary = (state.supplementLibrary || []).map(item => {
          if (item.id === libraryItemId) {
            let newInventory = item.currentInventory;
            if (newInventory !== undefined) {
              const unitsToChange = targetDosage / (item.contentPerUnit || 1); // e.g. 3000mg / 1000mg = 3 pills
              if (isCurrentlyTaken) {
                // Untaking -> add back
                newInventory += unitsToChange;
              } else {
                // Taking -> subtract
                newInventory = Math.max(0, newInventory - unitsToChange);
              }
            }
            const prevTaken = item.totalTakenTimes || 0;
            const prevStreak = item.streak || 0;
            const newTotalTaken = isCurrentlyTaken ? Math.max(0, prevTaken - 1) : prevTaken + 1;
            const newStreak = isCurrentlyTaken ? Math.max(0, prevStreak - 1) : prevStreak + 1;
            return {
              ...item,
              currentInventory: newInventory,
              totalTakenTimes: newTotalTaken,
              streak: newStreak,
            };
          }
          return item;
        });

        return {
          supplementIntakeLog: {
            ...state.supplementIntakeLog,
            [date]: { ...currentLog, checkedItems: newCheckedItems }
          },
          supplementLibrary: updatedLibrary
        };
      }),
      
      checkSupplementDailyReset: () => set((state) => {
        // Here we could calculate missed streaks etc. if it's a new day
        return state;
      }),

      // Collectibles
      collectibleImages: {},
      setCollectibleImage: (id, uri) => set((state) => ({
        collectibleImages: { ...state.collectibleImages, [id]: uri }
      })),

      hiddenExercises: [],
      hidePreloadedExercise: (name) => set((state) => ({
        hiddenExercises: [...(state.hiddenExercises || []), name]
      })),
      restorePreloadedExercise: (name) => set((state) => ({
        hiddenExercises: (state.hiddenExercises || []).filter(n => n !== name)
      })),
      deleteCustomExercise: (name) => set((state) => ({
        customExercises: (state.customExercises || []).filter(e => e.name !== name)
      })),
      accentThemeId: 'cyan',
      setAccentThemeId: (id) => set({ accentThemeId: id }),
      geminiApiKey: '',
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
    }),
    {
      name: 'pt-nutrition-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function showCustomAlert(title: string, message?: string, buttons?: CustomAlertButton[]) {
  useAppStore.getState().setCustomAlert({ title, message, buttons });
}

// Automatically sync nutrition changes to Android home screen widgets
if (typeof setTimeout !== 'undefined') {
  useAppStore.subscribe((state, prev) => {
    if (
      !prev ||
      state.consumedToday !== prev.consumedToday ||
      state.targets !== prev.targets ||
      state.dailyTargetExtra !== prev.dailyTargetExtra ||
      state.accentThemeId !== prev.accentThemeId ||
      state.quickLogRecipeIds !== prev.quickLogRecipeIds ||
      state.savedMeals !== prev.savedMeals
    ) {
      setTimeout(() => {
        import('../widgets/widgetSyncService')
          .then((m) => m.updateAllNutritionWidgets())
          .catch(() => {});
      }, 100);
    }
  });
}

