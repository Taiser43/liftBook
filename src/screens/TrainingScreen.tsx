import React, { useState, useEffect, useRef } from 'react';
import { KeyboardAwareScrollView as ScrollView } from 'react-native-keyboard-aware-scroll-view';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal,
  TextInput, 
  Alert,
  Vibration,
  Animated,
  Dimensions,
  AppState,
  Keyboard,
  LayoutAnimation,
  UIManager,
  Platform,
  StatusBar,
  ScrollView as NativeScrollView,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getResolvedUri } from '../utils/uriResolver';
import { ScrollView as GHScrollView, TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import Svg, { Polygon, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackPlayer from 'react-native-track-player';
import { useLiveWorkoutStore } from '../store/useLiveWorkoutStore';
import { useMusicStore } from '../store/useMusicStore';
import { useAppStore, 
  WorkoutPlan, 
  Exercise, 
  CompletedWorkout, 
  CompletedExercise, 
  CompletedSet, showCustomAlert } from '../store/store';
import { getHeartRateZoneColor } from '../utils/heartRate';
import { useHeartRateMonitor } from '../hooks/useHeartRateMonitor';
import { useCardioStore } from '../store/useCardioStore';
import {
  PRELOADED_EXERCISES,
  PreloadedExercise,
  RADAR_GROUPS,
  DAYS_OF_WEEK,
  TARGET_MUSCLES_BY_CATEGORY,
  MAJOR_MUSCLE_LABELS_DE,
} from '../data/exercises';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import SwipeableModal from '../components/SwipeableModal';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useBottomSpacing } from '../hooks/useBottomSpacing';
import { KeyboardAwareWrapper } from '../components/KeyboardAwareWrapper';
import InWorkoutMusicWidget from '../components/InWorkoutMusicWidget';
import { ExerciseManagerModal } from '../components/ExerciseManagerModal';
import { RestAutoChessModal } from '../components/tcg/RestAutoChessModal';
import { WeightPlateIcon } from '../components/tcg/WeightPlateIcon';
import { useAutoChessStore } from '../store/useAutoChessStore';
import { useIronTacticsMetaStore } from '../store/useIronTacticsMetaStore';
import { 
  showActiveWorkoutNotification, 
  hideActiveWorkoutNotification,
  scheduleRestNotification,
  cancelRestNotification
} from '../services/notificationService';
import { getAppTheme } from '../utils/theme';
import AccentThemePickerModal from '../components/AccentThemePickerModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type BodyPart = 'All' | 'Chest' | 'Back' | 'Shoulders' | 'Legs' | 'Arms' | 'Core';


const getExerciseMuscleGroup = (exerciseName: string): 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core' => {
  const name = exerciseName.toLowerCase();
  
  // Exact match with preloaded library
  const match = PRELOADED_EXERCISES.find(p => p.name.toLowerCase() === name);
  if (match) return match.category;

  // Keyword heuristic matching
  if (name.includes('chest') || name.includes('bench') || name.includes('pec') || name.includes('push-up') || name.includes('pushup') || name.includes('fly')) {
    return 'Chest';
  }
  if (name.includes('back') || name.includes('row') || name.includes('lat') || name.includes('pull-up') || name.includes('pullup') || name.includes('chin-up') || name.includes('pulldown') || name.includes('deadlift') || name.includes('hyperextension')) {
    return 'Back';
  }
  if (name.includes('shoulder') || name.includes('overhead') || name.includes('ohp') || name.includes('lateral') || name.includes('delt') || name.includes('shrug') || name.includes('arnold') || name.includes('military')) {
    return 'Shoulders';
  }
  if (name.includes('leg') || name.includes('squat') || name.includes('lunge') || name.includes('calf') || name.includes('hamstring') || name.includes('quad') || name.includes('thrust') || name.includes('rdl') || name.includes('romanian')) {
    return 'Legs';
  }
  if (name.includes('arm') || name.includes('curl') || name.includes('bicep') || name.includes('tricep') || name.includes('skull crusher') || name.includes('dip') || name.includes('pushdown')) {
    return 'Arms';
  }
  if (name.includes('core') || name.includes('ab') || name.includes('plank') || name.includes('crunch') || name.includes('twist') || name.includes('woodchopper') || name.includes('rollout')) {
    return 'Core';
  }

  return 'Arms';
};

export const getExerciseMuscleInfo = (
  exerciseName: string
): { majorGroup: BodyPart; targetMuscle: string } => {
  const name = exerciseName.toLowerCase();
  const preMatch = PRELOADED_EXERCISES.find((p) => p.name.toLowerCase() === name);
  if (preMatch) {
    return { majorGroup: preMatch.category as BodyPart, targetMuscle: preMatch.targetMuscle };
  }
  const custom = useAppStore.getState().customExercises?.find((e) => e.name.toLowerCase() === name);
  if (custom) {
    const major = (custom.category as BodyPart) || getExerciseMuscleGroup(name);
    const target = custom.targetMuscle || (TARGET_MUSCLES_BY_CATEGORY[major] || [])[0] || major;
    return { majorGroup: major, targetMuscle: target };
  }
  const major = getExerciseMuscleGroup(name);
  const target = (TARGET_MUSCLES_BY_CATEGORY[major] || [])[0] || major;
  return { majorGroup: major, targetMuscle: target };
};

export default function TrainingScreen({ route, navigation }: any) {
  const bottomSpacing = useBottomSpacing();
  const insets = useSafeAreaInsets();
  const maxHeartRateSetting = useCardioStore(state => state.maxHeartRateSetting);
  const { powerSong, currentSongId, currentPlaylistId, playlists: musicPlaylists, currentQueueSong } = useMusicStore();
  const currentMusicPlaylist = musicPlaylists?.find(p => p.id === currentPlaylistId);
  const hasActiveSong = !!(currentQueueSong || currentMusicPlaylist?.songs?.some(s => s.id === currentSongId));
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);
  const { 
    workoutPlans: legacyWorkoutPlans, 
    workoutPrograms,
    addWorkoutProgram, 
    updateWorkoutProgram, 
    deleteWorkoutProgram, 
    toggleProgramActive,
    addCompletedWorkout,
    updateCompletedWorkout,
    workoutHistory,
    updateSpontaneousWorkout,
    bodyweight,
    liveWorkoutToStart,
    setLiveWorkoutToStart,
    customExercises,
    addCustomExercise,
    hiddenExercises,
    
    globalActivePlan,
    globalLiveWorkoutModalVisible,
    setGlobalActivePlan,
    setGlobalWorkoutDuration,
    setGlobalRestTimeLeft,
    setGlobalLiveWorkoutModalVisible,
    setFinishCurrentStrength,
    finishCurrentCardio,
    globalCardioActive,
    exerciseDefaults,
    setExerciseDefault,
    collectibleImages = {},
    setCollectibleImage,
  } = useAppStore();

  const getSmartExerciseDefaults = (exerciseName: string): { 
    weight: number; 
    reps: number; 
    isUnilateral?: boolean;
    lastCompletedSets?: Array<{ weight: number; reps: number; repsRight?: number }>;
  } => {
    // 1. Check exerciseDefaults in store
    if (exerciseDefaults?.[exerciseName]) {
      return exerciseDefaults[exerciseName];
    }

    // 2. Search most recent completed workout in workoutHistory for this exercise
    const sortedHistory = [...(workoutHistory || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const pastWorkout of sortedHistory) {
      const match = pastWorkout.exercises?.find(e => e.name.toLowerCase() === exerciseName.toLowerCase());
      if (match && match.sets && match.sets.length > 0) {
        const setsData = match.sets.map(s => ({ 
          weight: s.weight || 0, 
          reps: s.reps || 0,
          repsRight: s.repsRight 
        }));
        const lastSet = setsData[setsData.length - 1];
        return {
          weight: lastSet?.weight || 0,
          reps: lastSet?.reps || 10,
          isUnilateral: match.isUnilateral,
          lastCompletedSets: setsData,
        };
      }
    }

    // 3. Search program plans
    let foundWeight = 0;
    let foundReps = 10;
    let foundIsUni: boolean | undefined = undefined;
    for (const prog of (workoutPrograms || [])) {
      for (const plan of (prog.workouts || [])) {
        for (const ex of (plan.exercises || [])) {
          if (ex.name.toLowerCase() === exerciseName.toLowerCase()) {
            if (ex.lastCompletedSets && ex.lastCompletedSets.length > 0) {
              const lastSet = ex.lastCompletedSets[ex.lastCompletedSets.length - 1];
              return {
                weight: lastSet.weight || ex.weight || 0,
                reps: lastSet.reps || ex.reps || 10,
                isUnilateral: ex.isUnilateral,
                lastCompletedSets: ex.lastCompletedSets,
              };
            }
            if (ex.isUnilateral !== undefined) {
              foundIsUni = ex.isUnilateral;
            }
            if (ex.weight > foundWeight) {
              foundWeight = ex.weight;
              foundReps = ex.reps;
            }
          }
        }
      }
    }

    // 4. Search spontaneous workouts
    const spontaneous = useAppStore.getState().spontaneousWorkouts || [];
    for (const plan of spontaneous) {
      for (const ex of (plan.exercises || [])) {
        if (ex.name.toLowerCase() === exerciseName.toLowerCase()) {
          if (ex.lastCompletedSets && ex.lastCompletedSets.length > 0) {
            const lastSet = ex.lastCompletedSets[ex.lastCompletedSets.length - 1];
            return {
              weight: lastSet.weight || ex.weight || 0,
              reps: lastSet.reps || ex.reps || 10,
              isUnilateral: ex.isUnilateral,
              lastCompletedSets: ex.lastCompletedSets,
            };
          }
          if (ex.isUnilateral !== undefined) {
            foundIsUni = ex.isUnilateral;
          }
          if (ex.weight > foundWeight) {
            foundWeight = ex.weight;
            foundReps = ex.reps;
          }
        }
      }
    }

    return { weight: foundWeight, reps: foundReps, isUnilateral: foundIsUni };
  };

  const getSmartSetDefaults = (exercise: Exercise, setIndex: number): { 
    weight: number; 
    reps: number; 
    repsRight?: number;
    isUnilateral?: boolean;
  } => {
    // 1. Direct plan exercise lastCompletedSets at this specific setIndex
    if (exercise.lastCompletedSets && exercise.lastCompletedSets.length > 0) {
      const set = setIndex < exercise.lastCompletedSets.length
        ? exercise.lastCompletedSets[setIndex]
        : exercise.lastCompletedSets[exercise.lastCompletedSets.length - 1];
      return {
        weight: set.weight,
        reps: set.reps,
        repsRight: set.repsRight,
        isUnilateral: exercise.isUnilateral,
      };
    }

    // 2. Global defaults / history for this exercise name
    const defaults = getSmartExerciseDefaults(exercise.name);
    if (defaults.lastCompletedSets && defaults.lastCompletedSets.length > 0) {
      const set = setIndex < defaults.lastCompletedSets.length
        ? defaults.lastCompletedSets[setIndex]
        : defaults.lastCompletedSets[defaults.lastCompletedSets.length - 1];
      return {
        weight: set.weight,
        reps: set.reps,
        repsRight: set.repsRight,
        isUnilateral: exercise.isUnilateral ?? defaults.isUnilateral,
      };
    }

    // 3. Plan base target if specified (> 0)
    if ((exercise.weight && exercise.weight > 0) || (exercise.reps && exercise.reps > 0)) {
      return {
        weight: exercise.weight || 0,
        reps: exercise.reps || 10,
        repsRight: exercise.reps || 10,
        isUnilateral: exercise.isUnilateral ?? defaults.isUnilateral,
      };
    }

    // 4. Default fallback
    return {
      weight: defaults.weight || 0,
      reps: defaults.reps || 10,
      repsRight: defaults.reps || 10,
      isUnilateral: exercise.isUnilateral ?? defaults.isUnilateral,
    };
  };
  
  // Program & V2 Redesign Navigation State
  const [viewingProgramId, setViewingProgramId] = useState<string | null>(() => {
    const active = workoutPrograms.find(p => p.isActive) || workoutPrograms[0];
    return active ? active.id : null;
  });
  const [programEditorModalVisible, setProgramEditorModalVisible] = useState(false);
  const [programsModalVisible, setProgramsModalVisible] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>(
    () => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]
  );
  const [selectedDayPlanIdx, setSelectedDayPlanIdx] = useState<number>(0);
  const [recoveryExpanded, setRecoveryExpanded] = useState<boolean>(false);
  const [bottomTab, setBottomTab] = useState<'splits' | 'freestyle'>('splits');

  // Auto-sync viewingProgramId to active or first program
  useEffect(() => {
    if (workoutPrograms.length > 0) {
      if (!viewingProgramId || !workoutPrograms.some(p => p.id === viewingProgramId)) {
        const active = workoutPrograms.find(p => p.isActive) || workoutPrograms[0];
        if (active) setViewingProgramId(active.id);
      }
    } else if (viewingProgramId !== null) {
      setViewingProgramId(null);
    }
  }, [workoutPrograms, viewingProgramId]);

  // Migration for Legacy Workout Plans
  useEffect(() => {
    if (legacyWorkoutPlans && legacyWorkoutPlans.length > 0 && (!workoutPrograms || workoutPrograms.length === 0)) {
      addWorkoutProgram({
        id: 'default_legacy_program',
        name: 'Legacy Plans',
        isActive: true,
        workouts: legacyWorkoutPlans
      });
    }
  }, [legacyWorkoutPlans, workoutPrograms, addWorkoutProgram]);

  // Full-Screen Plan Editor Modal (Handles both New Plan and Editing Existing Plan)
  const [editorModalVisible, setEditorModalVisible] = useState(false);
  const [planPickerVisible, setPlanPickerVisible] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Monday']);
  const [editorExercises, setEditorExercises] = useState<Exercise[]>([]);
  const [editorInputValues, setEditorInputValues] = useState<Record<string, { sets: string; reps: string; weight: string }>>({});
  const [filterCategory, setFilterCategory] = useState<BodyPart>('All');
  const [filterTargetMuscle, setFilterTargetMuscle] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState("");
  const [managerVisible, setManagerVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [exerciseLibraryModalVisible, setExerciseLibraryModalVisible] = useState(false);
  const [filterEquip, setFilterEquip] = useState('All');

  const [customExerciseInput, setCustomExerciseInput] = useState('');
  const [customExerciseCategory, setCustomExerciseCategory] = useState<BodyPart>('Chest');

  // Full-Screen Active Live Workout Modal
  const [liveWorkoutModalVisible, setLiveWorkoutModalVisible] = useState(false);
  const [freestyleNameModalVisible, setFreestyleNameModalVisible] = useState(false);
  const [freestyleName, setFreestyleName] = useState('Freestyle Workout');
  const spontaneousWorkouts = useAppStore(state => state.spontaneousWorkouts) || [];

  const [swapExerciseIndex, setSwapExerciseIndex] = useState<number | null>(null);
  const [autoChessModalVisible, setAutoChessModalVisible] = useState(false);
  const [musicExpanded, setMusicExpanded] = useState(false);
  const autoChessCoins = useAutoChessStore(state => state.coins);
  const autoChessPendingBonus = useAutoChessStore(state => state.pendingWaveBonusStacks);
  const [editingNoteExId, setEditingNoteExId] = useState<string | null>(null);
  // Live Workout State from Persistent Store
  const {
    activePlan, setActivePlan,
    workoutStartTime, setWorkoutStartTime,
    liveExercises, setLiveExercises,
    setLogs, setSetLogs,
    setTypes = {}, setSetTypes,
    exerciseNotes = {}, setExerciseNotes,
    unilateralExercises: unilateralArr, setUnilateralExercises: setUnilateralArr,
    restEndTime, setRestEndTime
  } = useLiveWorkoutStore();

  const pickExerciseImage = async (exerciseName: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        useAppStore.getState().setCollectibleImage(`exercise_${exerciseName}`, uri);
        Vibration.vibrate(40);
      }
    } catch (e) {
      console.warn('Error picking exercise image:', e);
    }
  };

  const getExerciseImage = (exerciseName: string): string | undefined => {
    const norm = exerciseName.toLowerCase().trim();
    const raw = collectibleImages[`exercise_${exerciseName}`] ||
                collectibleImages[`exercise_${norm}`] ||
                (customExercises?.find(c => c.name?.toLowerCase().trim() === norm) as any)?.imageUri;
    return raw ? getResolvedUri(raw) : undefined;
  };

  const unilateralExercises = new Set(unilateralArr);
  const setUnilateralExercises = (newSet: Set<string> | string[] | ((prev: Set<string>) => Set<string> | string[])) => {
    if (typeof newSet === 'function') {
      const res = newSet(unilateralExercises);
      setUnilateralArr(Array.from(res));
    } else {
      setUnilateralArr(Array.from(newSet));
    }
  };

  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [restTimeLeft, setRestTimeLeft] = useState<number | null>(null);
  
  // Auto-resume logic
  useEffect(() => {
    if (activePlan && workoutStartTime) {
      setLiveWorkoutModalVisible(true);
    } else if (activePlan && !workoutStartTime) {
      setActivePlan(null);
      setLiveExercises([]);
      setSetLogs({});
    }
  }, []);


  // Galaxy Watch 5 Smartwatch Heart Rate State
  const { currentHR: heartRate, isWatchConnected, toggleConnection, setCurrentHR: setHeartRate, setIsWatchConnected } = useHeartRateMonitor();
  const [watchModalVisible, setWatchModalVisible] = useState(false);
  const [hrHistory, setHrHistory] = useState<number[]>([]);
  const heartScale = useRef(new Animated.Value(1)).current;

  const [celebrationModalVisible, setCelebrationModalVisible] = useState(false);
  const [pendingPlanChangesToSave, setPendingPlanChangesToSave] = useState<{ 
    planId: string; 
    addedExercises: Exercise[]; 
    removedExercises: Exercise[]; 
    finalLiveExercises: Exercise[]; 
  } | null>(null);
  const [savePlanChangesChecked, setSavePlanChangesChecked] = useState(true);
  const [lastCompletedWorkout, setLastCompletedWorkout] = useState<CompletedWorkout | null>(null);
  const [completedWorkoutCustomName, setCompletedWorkoutCustomName] = useState('');
  const [completedWorkoutPartner, setCompletedWorkoutPartner] = useState('');
  const [completedWorkoutIsFavorite, setCompletedWorkoutIsFavorite] = useState(false);

  // Heart Rate Zone Calculator
  const getHeartRateZone = (bpm: number) => {
    if (bpm === 0) return { label: 'Inactive', color: '#888888', bg: 'rgba(136,136,136,0.15)' };
    if (bpm < 115) return { label: 'Warmup', color: '#00D2FF', bg: 'rgba(0, 210, 255, 0.15)' };
    if (bpm < 135) return { label: 'Fat Burn', color: '#30D158', bg: 'rgba(48, 209, 88, 0.15)' };
    if (bpm < 155) return { label: 'Cardio', color: '#FF9500', bg: 'rgba(255, 149, 0, 0.15)' };
    return { label: 'Peak Zone', color: '#FF453A', bg: 'rgba(255, 69, 58, 0.15)' };
  };

  const currentHrZone = getHeartRateZone(heartRate);

  // Heartbeat Pulsing Animation synchronized to current BPM
  useEffect(() => {
    if (isWatchConnected && heartRate > 0) {
      const beatDuration = Math.max(380, Math.min(1000, Math.round((60 / heartRate) * 1000)));
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(heartScale, {
            toValue: 1.28,
            duration: Math.round(beatDuration * 0.35),
            useNativeDriver: true,
          }),
          Animated.timing(heartScale, {
            toValue: 1,
            duration: Math.round(beatDuration * 0.65),
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      heartScale.setValue(1);
    }
  }, [isWatchConnected, heartRate]);

  // Live Heart Rate Telemetry & Realistic Galaxy Watch 5 Simulation Loop
  useEffect(() => {
    let hrInterval: any;
    if (activePlan !== null && workoutStartTime !== null && isWatchConnected) {
      if (heartRate === 0) {
        setHeartRate(120);
        setHrHistory([120]);
      }

      hrInterval = setInterval(() => {
        const currentVal = useAppStore.getState().currentHeartRate || 120;
        let nextBpm = currentVal;
        
        if (restTimeLeft !== null && restTimeLeft > 0) {
          if (nextBpm > 122) {
            nextBpm -= (Math.random() > 0.4 ? 1 : 0);
          } else {
            nextBpm += (Math.random() > 0.5 ? 1 : -1);
          }
        } else {
          const jitter = Math.floor(Math.random() * 3) - 1;
          nextBpm = Math.max(105, Math.min(176, nextBpm + jitter));
        }

        setHeartRate(nextBpm);
        setHrHistory(history => [...history.slice(-180), nextBpm]);
      }, 1000);
    } else if (activePlan === null) {
      setHeartRate(0);
      setHrHistory([]);
    }
    return () => clearInterval(hrInterval);
  }, [activePlan, isWatchConnected, restTimeLeft]);

  // Live Workout Stopwatch
  useEffect(() => {
    let interval: any;
    if (activePlan !== null && workoutStartTime !== null) {
      interval = setInterval(() => {
        const now = Date.now();
        setWorkoutDuration(Math.floor((now - workoutStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activePlan, workoutStartTime]);

  // Rest Countdown Timer
  useEffect(() => {
    let timer: any;
    if (restEndTime !== null) {
      // Schedule background notification for the exact end time
      scheduleRestNotification(restEndTime);

      const checkRest = () => {
        const now = Date.now();
        const left = Math.ceil((restEndTime - now) / 1000);
        if (left <= 0) {
          Vibration.vibrate([0, 500, 200, 500]);
          showCustomAlert("🔔 Rest Over!", "Time for your next set! 🏋️‍♂️");
          setRestTimeLeft(null);
          setRestEndTime(null);
        } else {
          setRestTimeLeft(left);
        }
      };

      timer = setInterval(checkRest, 1000);
      
      const appStateSub = AppState.addEventListener('change', (nextAppState: any) => {
        if (nextAppState === 'active') {
          checkRest();
        }
      });
      
      return () => {
        clearInterval(timer);
        appStateSub.remove();
      };
    } else {
      cancelRestNotification();
    }
    return () => clearInterval(timer);
  }, [restEndTime]);



  // Sync to Global Store for Mini-Player everywhere and update persistent notification
  useEffect(() => {
    if (activePlan && workoutStartTime !== null) {
      setGlobalActivePlan(activePlan);
      setGlobalWorkoutDuration(workoutDuration);
      useAppStore.getState().setGlobalWorkoutStartTime(workoutStartTime);
      setGlobalRestTimeLeft(restTimeLeft);
    } else {
      setGlobalActivePlan(null);
      setGlobalWorkoutDuration(0);
      useAppStore.getState().setGlobalWorkoutStartTime(null);
      setGlobalRestTimeLeft(null);
    }
  }, [activePlan, workoutDuration, workoutStartTime, restTimeLeft]);

  // Manage sticky notification (ONLY when workout is actively running)
  useEffect(() => {
    if (activePlan && workoutStartTime !== null) {
      showActiveWorkoutNotification(activePlan.name);
    } else {
      hideActiveWorkoutNotification();
    }
  }, [activePlan?.id, workoutStartTime !== null]);

  // Listen to Global Modal state (if user opens workout from another tab)
  useEffect(() => {
    if (globalLiveWorkoutModalVisible && !liveWorkoutModalVisible) {
      setLiveWorkoutModalVisible(true);
      setGlobalLiveWorkoutModalVisible(false); // consume the trigger
    }
  }, [globalLiveWorkoutModalVisible]);

  // Close modal if workout was cleared/cancelled
  useEffect(() => {
    if (!activePlan && liveWorkoutModalVisible) {
      setLiveWorkoutModalVisible(false);
      setRestTimeLeft(null);
      setRestEndTime(null);
    }
  }, [activePlan, liveWorkoutModalVisible]);

  // Open Full-Screen Plan Editor for a NEW plan
  const handleOpenCreatePlan = (initialDay?: string) => {
    setEditingPlanId(null);
    setPlanName('');
    setSelectedDays(initialDay ? [initialDay] : ['Monday']);
    setEditorExercises([]);
    setEditorInputValues({});
    setFilterCategory('All');
    setFilterTargetMuscle('All');
    setCustomExerciseInput('');
    setPlanPickerVisible(false);
    setEditorModalVisible(true);
    Vibration.vibrate(30);
  };

  // Open Full-Screen Plan Editor to EDIT an existing plan
  const handleOpenEditPlan = (plan: WorkoutPlan) => {
    setEditingPlanId(plan.id);
    setPlanName(plan.name);
    setSelectedDays(
      Array.isArray(plan.daysOfWeek) && plan.daysOfWeek.length > 0
        ? plan.daysOfWeek
        : [(plan as any).dayOfWeek || 'Monday']
    );
    const existingExercises = plan.exercises ? [...plan.exercises] : [];
    setEditorExercises(existingExercises);

    const initialInputs: Record<string, { sets: string; reps: string; weight: string }> = {};
    existingExercises.forEach(ex => {
      initialInputs[ex.id] = {
        sets: ex.sets !== undefined ? ex.sets.toString() : '3',
        reps: ex.reps !== undefined ? ex.reps.toString() : '10',
        weight: ex.weight !== undefined ? ex.weight.toString() : '0',
      };
    });
    setEditorInputValues(initialInputs);

    setFilterCategory('All');
    setFilterTargetMuscle('All');
    setCustomExerciseInput('');
    setPlanPickerVisible(false);
    setEditorModalVisible(true);
    Vibration.vibrate(30);
  };

  // Toggle Day Selection (Multi-Day support)
  const handleToggleDay = (day: string) => {
    Vibration.vibrate(25);
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev; // Keep at least one day
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  // Toggle Exercise in Editor
  const handleToggleExerciseInEditor = (exerciseName: string) => {
    Vibration.vibrate(25);
    const existingIndex = editorExercises.findIndex(e => e.name === exerciseName);
    if (existingIndex >= 0) {
      const removedId = editorExercises[existingIndex].id;
      setEditorExercises(prev => prev.filter(e => e.name !== exerciseName));
      setEditorInputValues(prev => {
        const copy = { ...prev };
        delete copy[removedId];
        return copy;
      });
    } else {
      const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const defaultData = getSmartExerciseDefaults(exerciseName);
      const newEx: Exercise = {
        id: newId,
        name: exerciseName,
        sets: 3,
        reps: defaultData.reps,
        weight: defaultData.weight,
        isUnilateral: defaultData.isUnilateral,
        lastCompletedSets: defaultData.lastCompletedSets,
      };
      setEditorExercises(prev => [...prev, newEx]);
      setEditorInputValues(prev => ({
        ...prev,
        [newId]: { sets: '3', reps: defaultData.reps.toString(), weight: defaultData.weight.toString() }
      }));
    }
  };

  const handleAddCustomExercise = () => {
    const trimmed = customExerciseInput.trim();
    if (!trimmed) return;
    if (!editorExercises.some(e => e.name.toLowerCase() === trimmed.toLowerCase())) {
      const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const defaultData = getSmartExerciseDefaults(trimmed);
      const newEx: Exercise = {
        id: newId,
        name: trimmed,
        sets: 3,
        reps: defaultData.reps,
        weight: defaultData.weight,
        isUnilateral: defaultData.isUnilateral,
        lastCompletedSets: defaultData.lastCompletedSets,
      };
      // Save it to the global pool for future use
      addCustomExercise({ name: trimmed, category: customExerciseCategory === 'All' ? 'Core' : customExerciseCategory });
      setEditorExercises(prev => [...prev, newEx]);
      setEditorInputValues(prev => ({
        ...prev,
        [newId]: { sets: '3', reps: defaultData.reps.toString(), weight: defaultData.weight.toString() }
      }));
      setCustomExerciseInput('');
      Vibration.vibrate(30);
    }
  };

  const moveEditorExercise = (index: number, direction: -1 | 1) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditorExercises(prev => {
      const copy = [...prev];
      if (index + direction >= 0 && index + direction < copy.length) {
        const temp = copy[index];
        copy[index] = copy[index + direction];
        copy[index + direction] = temp;
      }
      return copy;
    });
  };

  const updateEditorExerciseTarget = (exerciseId: string, field: 'sets' | 'reps' | 'weight', val: string) => {
    let filtered = val;
    if (field === 'weight') {
      filtered = val.replace(/[^0-9.]/g, '');
      const parts = filtered.split('.');
      if (parts.length > 2) {
        filtered = parts[0] + '.' + parts.slice(1).join('');
      }
    } else {
      filtered = val.replace(/[^0-9]/g, '');
    }

    const exName = editorExercises.find(e => e.id === exerciseId)?.name || '';
    const defaultData = getSmartExerciseDefaults(exName);

    setEditorInputValues(prev => ({
      ...prev,
      [exerciseId]: {
        ...(prev[exerciseId] || { sets: '3', reps: defaultData.reps.toString(), weight: defaultData.weight.toString() }),
        [field]: filtered
      }
    }));
  };

  // Save Plan (handles both Insert and Update)
  const handleSavePlan = () => {
    if (!planName.trim()) {
      showCustomAlert("Missing Name", "Please enter a plan name.");
      return;
    }

    // Finalize exercise numeric values from editor text inputs
    const finalizedExercises: Exercise[] = editorExercises.map(ex => {
      const inputs = editorInputValues[ex.id];
      const setsVal = inputs?.sets !== undefined ? parseInt(inputs.sets, 10) : ex.sets;
      const repsVal = inputs?.reps !== undefined ? parseInt(inputs.reps, 10) : ex.reps;
      const weightVal = inputs?.weight !== undefined ? parseFloat(inputs.weight) : ex.weight;

      return {
        ...ex,
        sets: isNaN(setsVal) || setsVal <= 0 ? 1 : setsVal,
        reps: isNaN(repsVal) || repsVal <= 0 ? 1 : repsVal,
        weight: isNaN(weightVal) || weightVal < 0 ? 0 : weightVal,
      };
    });

    const activeProgram = workoutPrograms.find(p => p.id === viewingProgramId) || workoutPrograms.find(p => p.isActive) || workoutPrograms[0];

    if (!activeProgram) {
      const newProgId = Date.now().toString();
      const newPlan: WorkoutPlan = {
        id: (Date.now() + 1).toString(),
        name: planName.trim(),
        daysOfWeek: selectedDays,
        exercises: finalizedExercises,
      };
      addWorkoutProgram({
        id: newProgId,
        name: 'Trainingsprogramm',
        isActive: true,
        workouts: [newPlan],
      });
      setViewingProgramId(newProgId);
      setPlanPickerVisible(false);
      setEditorModalVisible(false);
      Vibration.vibrate(40);
      return;
    }

    if (editingPlanId) {
      // Update existing workout day in program
      const updatedWorkouts = activeProgram.workouts.map(w => w.id === editingPlanId ? {
        ...w,
        name: planName.trim(),
        daysOfWeek: selectedDays,
        exercises: finalizedExercises,
      } : w);
      updateWorkoutProgram({ ...activeProgram, workouts: updatedWorkouts });
    } else {
      // Create new workout day
      const newPlan: WorkoutPlan = {
        id: Date.now().toString(),
        name: planName.trim(),
        daysOfWeek: selectedDays,
        exercises: finalizedExercises,
      };
      updateWorkoutProgram({ ...activeProgram, workouts: [...activeProgram.workouts, newPlan] });
    }

    setPlanPickerVisible(false);
    setEditorModalVisible(false);
    Vibration.vibrate(40);
  };

  // Delete Plan with Confirmation
  const handleDeletePlan = (plan: WorkoutPlan) => {
    showCustomAlert(
      "Delete Workout Plan",
      `Are you sure you want to delete "${plan.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => {
            const activeProgram = workoutPrograms.find(p => p.id === viewingProgramId);
            if (activeProgram) {
              const updatedWorkouts = activeProgram.workouts.filter(w => w.id !== plan.id);
              updateWorkoutProgram({ ...activeProgram, workouts: updatedWorkouts });
              Vibration.vibrate(40);
            }
          } 
        }
      ]
    );
  };

  // START FREESTYLE WORKOUT
  const handleStartFreestyle = () => {
    const name = freestyleName.trim() || 'Freestyle Workout';
    const plan: WorkoutPlan = {
      id: 'spontaneous_' + Date.now(),
      name: name,
      daysOfWeek: [],
      exercises: []
    };
    handleStartLiveWorkout(plan);
    setFreestyleNameModalVisible(false);
    setFreestyleName('Freestyle Workout');
  };

  // START LIVE WORKOUT FULL-SCREEN
  const handleStartLiveWorkout = (plan: WorkoutPlan, startImmediately: boolean = true) => {
    // Resume if it's the exact same plan already running
    if (globalActivePlan && globalActivePlan.id === plan.id) {
      setLiveWorkoutModalVisible(true);
      return;
    }

    if (globalActivePlan && globalActivePlan.id !== plan.id) {
      showCustomAlert(
        "Active Strength Workout",
        "You already have a strength workout running. Finish and save it first?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Finish & Start New", onPress: () => {
              handleFinishLiveWorkout(true);
              startFreshStrengthWorkout(plan, startImmediately);
            }
          }
        ]
      );
      return;
    } else if (globalCardioActive) {
      showCustomAlert(
        "Active Cardio Session",
        "You have a cardio session running. Finish and save it first?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Finish & Start New", onPress: () => {
              if (finishCurrentCardio) finishCurrentCardio(true);
              startFreshStrengthWorkout(plan, startImmediately);
            }
          }
        ]
      );
      return;
    }
    
    startFreshStrengthWorkout(plan, startImmediately);
  };

  const startFreshStrengthWorkout = (plan: WorkoutPlan, startImmediately: boolean = true) => {
    const startTime = startImmediately ? Date.now() : null;
    setActivePlan(plan);
    setWorkoutDuration(0);
    setWorkoutStartTime(startTime);
    setRestTimeLeft(null);
    setRestEndTime(null);

    if (startImmediately) {
      setGlobalActivePlan(plan);
      setGlobalWorkoutDuration(0);
      useAppStore.getState().setGlobalWorkoutStartTime(startTime);
    } else {
      setGlobalActivePlan(null);
      setGlobalWorkoutDuration(0);
      useAppStore.getState().setGlobalWorkoutStartTime(null);
    }

    const exercises = plan.exercises && plan.exercises.length > 0 ? plan.exercises : [];
    setLiveExercises(exercises);

    const initialUni: string[] = [];
    const initialLogs: Record<string, { weight: string; reps: string; repsRight?: string; checked: boolean }> = {};
    exercises.forEach(ex => {
      const isExUni = ex.isUnilateral ?? getSmartExerciseDefaults(ex.name).isUnilateral ?? false;
      if (isExUni) {
        initialUni.push(ex.id);
      }

      const setCount = ex.sets || 3;
      for (let i = 0; i < setCount; i++) {
        const setDefaults = getSmartSetDefaults(ex, i);
        initialLogs[`${ex.id}_${i}`] = {
          weight: setDefaults.weight.toString(),
          reps: setDefaults.reps.toString(),
          repsRight: (setDefaults.repsRight !== undefined ? setDefaults.repsRight : setDefaults.reps).toString(),
          checked: false
        };
      }
    });
    setUnilateralExercises(initialUni);
    setSetLogs(initialLogs);

    setLiveWorkoutModalVisible(true);
    Vibration.vibrate(40);

    // Initialize Auto-Chess session for rest breaks
    try {
      useAutoChessStore.getState().initSession(
        workoutPrograms,
        legacyWorkoutPlans || [],
        customExercises,
        workoutHistory,
        plan.exercises || []
      );
    } catch (e) {
      console.warn('AutoChess init error', e);
    }
  };

  // Listen for Live Workout launch requests from HomeScreen or other tabs
  useEffect(() => {
    if (liveWorkoutToStart) {
      handleStartLiveWorkout(liveWorkoutToStart);
      setLiveWorkoutToStart(null);
    }
  }, [liveWorkoutToStart]);

  useEffect(() => {
    if (route?.params?.startWorkoutPlanId) {
      const allWorkouts = workoutPrograms.flatMap(p => p.workouts);
      const plan = allWorkouts.find(w => w.id === route.params.startWorkoutPlanId);
      if (plan) {
        handleStartLiveWorkout(plan);
        if (navigation?.setParams) {
          navigation.setParams({ startWorkoutPlanId: undefined });
        }
      }
    }
  }, [route?.params?.startWorkoutPlanId, workoutPrograms]);

  // Check off a set during live workout
  const handleCheckSet = (exerciseId: string, setIndex: number) => {
    const key = `${exerciseId}_${setIndex}`;
    const ex = liveExercises.find(e => e.id === exerciseId);
    const setDefaults = ex ? getSmartSetDefaults(ex, setIndex) : { weight: 0, reps: 10 };
    const current = setLogs[key] || { 
      weight: setDefaults.weight.toString(), 
      reps: setDefaults.reps.toString(), 
      repsRight: (setDefaults.repsRight !== undefined ? setDefaults.repsRight : setDefaults.reps).toString(),
      checked: false 
    };
    const nextCheckedState = !current.checked;

    setSetLogs(prev => ({
      ...prev,
      [key]: { ...current, checked: nextCheckedState }
    }));

    if (nextCheckedState) {
      if (workoutStartTime === null) {
        const now = Date.now();
        setWorkoutStartTime(now);
        if (activePlan) {
          setGlobalActivePlan(activePlan);
          setGlobalWorkoutDuration(0);
          useAppStore.getState().setGlobalWorkoutStartTime(now);
        }
      }
      setRestTimeLeft(180); // 3-minute rest timer
      setRestEndTime(Date.now() + 180000);
      Vibration.vibrate(100);

      // Determine if this set completes the final set of the entire workout
      const currentExIdx = liveExercises.findIndex(e => e.id === exerciseId);
      const isLastExercise = currentExIdx !== -1 && currentExIdx === liveExercises.length - 1;
      const exSetCount = ex?.sets || 3;
      const isLastSetOfLastEx = isLastExercise && setIndex >= exSetCount - 1;

      let allSetsDone = true;
      for (const e of liveExercises) {
        const sCount = e.sets || 3;
        for (let i = 0; i < sCount; i++) {
          const k = `${e.id}_${i}`;
          const isChecked = (k === key) ? true : !!setLogs[k]?.checked;
          if (!isChecked) {
            allSetsDone = false;
            break;
          }
        }
        if (!allSetsDone) break;
      }

      const isLastSetOfWorkout = isLastSetOfLastEx || allSetsDone;

      // Auto-Chess: Scale board slots based on current exercise & award reps as coins
      try {
        if (currentExIdx !== -1) {
          useAutoChessStore.getState().updateActiveExerciseIndex(currentExIdx);
        }
        if (useAutoChessStore.getState().pool.length === 0) {
          useAutoChessStore.getState().initSession(
            workoutPrograms,
            legacyWorkoutPlans || [],
            customExercises,
            workoutHistory,
            liveExercises
          );
        }
        // Reps = Coins (minimum 5 coins fallback)
        const loggedReps = Math.max(5, Number(current.reps) || 10);
        useAutoChessStore.getState().awardSetCoins(loggedReps, isLastSetOfWorkout);
      } catch (e) {
        console.warn('AutoChess set check error', e);
      }

      // Simulate exertion HR increase from completed set
      if (isWatchConnected) {
        const prev = useAppStore.getState().currentHeartRate || 0;
        const spike = Math.min(174, Math.max(prev + 10, 145 + Math.floor(Math.random() * 12)));
        setHeartRate(spike);
        setHrHistory(h => [...h, spike]);
      }
    } else {
      // User unchecked a set: Boss is not available
      try {
        useAutoChessStore.getState().setBossAvailable(false);
      } catch (e) {}
    }
  };

  const updateSetLog = (exerciseId: string, setIndex: number, field: 'weight' | 'reps' | 'repsRight', val: string) => {
    const key = `${exerciseId}_${setIndex}`;
    const ex = liveExercises.find(e => e.id === exerciseId);
    const setDefaults = ex ? getSmartSetDefaults(ex, setIndex) : { weight: 0, reps: 10 };
    const current = setLogs[key] || { 
      weight: setDefaults.weight.toString(), 
      reps: setDefaults.reps.toString(), 
      repsRight: (setDefaults.repsRight !== undefined ? setDefaults.repsRight : setDefaults.reps).toString(),
      checked: false 
    };
    setSetLogs(prev => ({
      ...prev,
      [key]: { ...current, [field]: val }
    }));
  };

  const handleAddLiveSet = (exerciseId: string) => {
    setLiveExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        const newSetCount = (ex.sets || 0) + 1;
        const newSetIdx = newSetCount - 1;

        // Default to previous set's weight & reps if available
        const prevSetKey = `${exerciseId}_${newSetIdx - 1}`;
        const prevSetLog = setLogs[prevSetKey];
        const defaultWeight = prevSetLog ? prevSetLog.weight : (ex.weight || 0).toString();
        const defaultReps = prevSetLog ? prevSetLog.reps : (ex.reps || 10).toString();
        const defaultRepsRight = prevSetLog ? (prevSetLog.repsRight || prevSetLog.reps) : defaultReps;

        setSetLogs(l => ({
          ...l,
          [`${exerciseId}_${newSetIdx}`]: {
            weight: defaultWeight,
            reps: defaultReps,
            repsRight: defaultRepsRight,
            checked: false
          }
        }));
        return { ...ex, sets: newSetCount };
      }
      return ex;
    }));
    try {
      useAutoChessStore.getState().setBossAvailable(false);
    } catch (e) {}
    Vibration.vibrate(30);
  };
  const handleRemoveLiveSet = (exerciseId: string) => {
    setLiveExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId && (ex.sets || 0) > 1) {
        const newSetCount = (ex.sets || 0) - 1;
        setSetLogs(l => {
          const newLogs = { ...l };
          delete newLogs[`${exerciseId}_${newSetCount}`];
          return newLogs;
        });
        return { ...ex, sets: newSetCount };
      }
      return ex;
    }));
    Vibration.vibrate(30);
  };

  const toggleUnilateral = (exerciseId: string) => {
    let isNowUni = false;
    setUnilateralExercises(prev => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
        isNowUni = false;
      } else {
        next.add(exerciseId);
        isNowUni = true;
      }
      return next;
    });
    setLiveExercises(prev => prev.map(ex => {
      if (ex.id === exerciseId) {
        return { ...ex, isUnilateral: isNowUni };
      }
      return ex;
    }));
    Vibration.vibrate(30);
  };


  // FINISH WORKOUT & LOG TO HISTORY
  const handleFinishLiveWorkout = async (skipCelebration = false, saveNewExercises = false) => {
    if (!activePlan) return;

    // Compile all exercises and sets
    const completedExercises: CompletedExercise[] = [];
    let totalCompletedSets = 0;

    liveExercises.forEach(ex => {
      const isUnilateral = unilateralExercises.has(ex.id);
      const completedSets: CompletedSet[] = [];
      const count = ex.sets || 3;
      for (let i = 0; i < count; i++) {
        const key = `${ex.id}_${i}`;
        const log = setLogs[key];
        const isChecked = log ? log.checked : false;
        
        // ONLY count and record ticked sets as completed!
        if (isChecked) {
          totalCompletedSets++;
          const repsVal = log ? (parseInt(log.reps, 10) || 0) : (ex.reps || 10);
          const repsRightVal = isUnilateral 
            ? (log && log.repsRight !== undefined ? (parseInt(log.repsRight, 10) || repsVal) : repsVal)
            : undefined;

          completedSets.push({
            setNumber: completedSets.length + 1,
            weight: log ? (parseFloat(log.weight) || 0) : (ex.weight || 0),
            reps: repsVal,
            repsRight: repsRightVal,
          });
        }
      }

      // Only include exercise if at least one set was completed/ticked
      if (completedSets.length > 0) {
        completedExercises.push({
          name: ex.name,
          isUnilateral,
          sets: completedSets
        });
      }
    });

    // Compute Heart Rate Statistics
    let avgHeartRate: number | undefined = undefined;
    let maxHeartRate: number | undefined = undefined;
    if (isWatchConnected && hrHistory.length > 0) {
      avgHeartRate = Math.round(hrHistory.reduce((a, b) => a + b, 0) / hrHistory.length);
      maxHeartRate = Math.max(...hrHistory);
    }

    // Estimate calories burned:
    // With Galaxy Watch HR: minutes * ((avgHR * 0.22) + (bodyweight * 0.04))
    // Standard estimation without watch: ~6 kcal/min + 3.5 kcal per completed set
    const minutes = Math.max(1, Math.round(workoutDuration / 60));
    const userWeight = bodyweight > 0 ? bodyweight : 75;
    let estimatedCalories = 0;
    if (avgHeartRate) {
      estimatedCalories = Math.max(45, Math.round(minutes * ((avgHeartRate * 0.22) + (userWeight * 0.04))));
    } else {
      estimatedCalories = Math.max(40, Math.round(minutes * 6 + totalCompletedSets * 3.5));
    }

    const now = new Date();
    const formattedDate = now.toLocaleString('de-DE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const completedWorkoutEntry: CompletedWorkout = {
      id: Date.now().toString(),
      planName: activePlan.name,
      date: now.toISOString(),
      formattedDate,
      durationSeconds: workoutDuration,
      caloriesBurned: estimatedCalories,
      avgHeartRate,
      maxHeartRate,
      exercises: completedExercises
    };

    // Build the fully updated live exercises list with latest per-set logs
    const finalLiveExercises: Exercise[] = liveExercises.map(liveEx => {
      const isUnilateral = unilateralExercises.has(liveEx.id);
      const currentCount = liveEx.sets || 3;
      const recordedSets: Array<{ weight: number; reps: number; repsRight?: number }> = [];

      for (let i = 0; i < currentCount; i++) {
        const key = `${liveEx.id}_${i}`;
        const log = setLogs[key];
        if (log) {
          const w = parseFloat(log.weight);
          const r = parseInt(log.reps, 10);
          const rr = isUnilateral ? (log.repsRight !== undefined ? parseInt(log.repsRight, 10) : r) : undefined;
          recordedSets.push({
            weight: !isNaN(w) ? w : (liveEx.weight || 0),
            reps: !isNaN(r) ? r : (liveEx.reps || 10),
            repsRight: rr !== undefined && !isNaN(rr) ? rr : undefined,
          });
        } else {
          const prev = liveEx.lastCompletedSets?.[i];
          recordedSets.push({
            weight: prev ? prev.weight : (liveEx.weight || 0),
            reps: prev ? prev.reps : (liveEx.reps || 10),
            repsRight: isUnilateral ? (prev ? prev.repsRight : undefined) : undefined,
          });
        }
      }

      const lastRecorded = recordedSets[recordedSets.length - 1] || { 
        weight: liveEx.weight || 0, 
        reps: liveEx.reps || 10 
      };

      return {
        ...liveEx,
        sets: Math.max(liveEx.sets || 3, recordedSets.length),
        weight: lastRecorded.weight,
        reps: lastRecorded.reps,
        isUnilateral,
        lastCompletedSets: recordedSets.length > 0 ? recordedSets : undefined,
      };
    });

    const originalIds = new Set((activePlan.exercises || []).map(e => e.id));
    const liveIds = new Set(finalLiveExercises.map(e => e.id));

    const addedExercises = finalLiveExercises.filter(e => !originalIds.has(e.id));
    const removedExercises = (activePlan.exercises || []).filter(e => !liveIds.has(e.id));
    const hasStructuralChanges = addedExercises.length > 0 || removedExercises.length > 0;

    if (hasStructuralChanges) {
      setPendingPlanChangesToSave({
        planId: activePlan.id,
        addedExercises,
        removedExercises,
        finalLiveExercises,
      });
      setSavePlanChangesChecked(true); // Default to true so user changes are saved
    } else {
      setPendingPlanChangesToSave(null);
    }

    // Always update per-set weights and reps on existing exercises in the plan right away
    const updatedPlanExercises: Exercise[] = (activePlan.exercises || []).map(originalEx => {
      const liveEx = finalLiveExercises.find(le => le.id === originalEx.id);
      return liveEx || originalEx;
    });

    const updatedPlan: WorkoutPlan = {
      ...activePlan,
      exercises: updatedPlanExercises,
    };
    
    // Find parent program to update the plan within it
    const parentProgram = workoutPrograms.find(p => p.workouts.some(w => w.id === activePlan.id));
    if (parentProgram) {
      const updatedWorkouts = parentProgram.workouts.map(w => w.id === activePlan.id ? updatedPlan : w);
      updateWorkoutProgram({ ...parentProgram, workouts: updatedWorkouts });
    } else {
      const isSpontaneous = spontaneousWorkouts.some(w => w.id === activePlan.id);
      if (isSpontaneous) {
        updateSpontaneousWorkout(updatedPlan);
      }
    }

    // Save to Zustand store & persistence!
    addCompletedWorkout(completedWorkoutEntry);

    // Award Iron Tactics fitness fuel rewards automatically!
    try {
      useIronTacticsMetaStore.getState().claimFitnessAction('workout_completed', { sets: totalCompletedSets });
    } catch {
      // ignore
    }

    // Show celebration modal
    setLastCompletedWorkout(completedWorkoutEntry);
    setCompletedWorkoutCustomName(completedWorkoutEntry.planName);
    setCompletedWorkoutPartner('');
    setCompletedWorkoutIsFavorite(false);
    setLiveWorkoutModalVisible(false);
    setActivePlan(null); // Clear the active plan to hide mini player
    setUnilateralExercises([]);
    setRestTimeLeft(null);
    setRestEndTime(null);
    setWorkoutStartTime(null);
    if (!skipCelebration) {
      setCelebrationModalVisible(true);
      Vibration.vibrate([0, 200, 100, 300]);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Render Spider/Radar Chart of Muscle Groups Trained (Only Ticked Sets Count)
  const renderSpiderChart = (exercises: CompletedExercise[]) => {
    const muscleCounts: Record<string, number> = {
      Chest: 0,
      Back: 0,
      Shoulders: 0,
      Arms: 0,
      Legs: 0,
      Core: 0,
    };

    exercises.forEach(ex => {
      const group = getExerciseMuscleGroup(ex.name);
      muscleCounts[group] = (muscleCounts[group] || 0) + (ex.sets?.length || 0);
    });

    const maxSets = Math.max(...Object.values(muscleCounts));
    const scaleMax = Math.max(4, maxSets);

    const cx = 140;
    const cy = 110;
    const R = 64;
    const labelR = 92;

    const angles = [
      -Math.PI / 2,                  // Top: Chest
      -Math.PI / 6,                  // Top-Right: Back
      Math.PI / 6,                   // Bottom-Right: Shoulders
      Math.PI / 2,                   // Bottom: Arms
      (5 * Math.PI) / 6,             // Bottom-Left: Legs
      (7 * Math.PI) / 6,             // Top-Left: Core
    ];

    // Grid web polygons
    const gridLevels = [0.33, 0.66, 1.0];
    const gridPolygons = gridLevels.map(lvl => {
      const pts = angles.map(a => {
        const x = cx + lvl * R * Math.cos(a);
        const y = cy + lvl * R * Math.sin(a);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      return { lvl, points: pts };
    });

    // Axis lines
    const axisLines = angles.map(a => ({
      x2: (cx + R * Math.cos(a)).toFixed(1),
      y2: (cy + R * Math.sin(a)).toFixed(1),
    }));

    // Data polygon points
    const dataVertices = RADAR_GROUPS.map((g, idx) => {
      const a = angles[idx];
      const count = muscleCounts[g.name] || 0;
      const ratio = count > 0 ? (0.22 + 0.78 * (count / scaleMax)) : 0.08;
      const x = cx + ratio * R * Math.cos(a);
      const y = cy + ratio * R * Math.sin(a);
      return { x, y, count, group: g, angle: a };
    });

    const dataPointsString = dataVertices.map(v => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' ');
    const totalTicked = Object.values(muscleCounts).reduce((a, b) => a + b, 0);

    return (
      <View style={styles.spiderChartBox}>
        <Svg width={280} height={220} viewBox="0 0 280 220">
          {/* Concentric Hexagons */}
          {gridPolygons.map(({ lvl, points }) => (
            <Polygon
              key={lvl}
              points={points}
              fill={lvl === 1.0 ? 'rgba(255,255,255,0.02)' : 'none'}
              stroke="#333338"
              strokeWidth={lvl === 1.0 ? 1.5 : 1}
              strokeDasharray={lvl < 1.0 ? "2,3" : undefined}
            />
          ))}

          {/* Radial Axis Lines */}
          {axisLines.map((line, idx) => (
            <Line
              key={idx}
              x1={cx}
              y1={cy}
              x2={parseFloat(line.x2)}
              y2={parseFloat(line.y2)}
              stroke="#333338"
              strokeWidth={1}
            />
          ))}

          {/* Filled Data Polygon */}
          {totalTicked > 0 ? (
            <>
              <Polygon
                points={dataPointsString}
                fill={theme.accentSoftBg || "rgba(0, 210, 255, 0.28)"}
                stroke={theme.accent || "#00D2FF"}
                strokeWidth={2.5}
              />
              {/* Vertex Dots */}
              {dataVertices.map((v, idx) => (
                <Circle
                  key={idx}
                  cx={v.x}
                  cy={v.y}
                  r={v.count > 0 ? 4.5 : 2.5}
                  fill={v.count > 0 ? (theme.accent || "#00D2FF") : "#555555"}
                  stroke={v.count > 0 ? "#FFFFFF" : "transparent"}
                  strokeWidth={1.5}
                />
              ))}
            </>
          ) : (
            <Circle cx={cx} cy={cy} r={4} fill="#555555" />
          )}

          {/* Labels & Set Counters */}
          {RADAR_GROUPS.map((g, idx) => {
            const a = angles[idx];
            const count = muscleCounts[g.name] || 0;
            let lx = cx + labelR * Math.cos(a);
            let ly = cy + labelR * Math.sin(a);

            let anchor: 'middle' | 'start' | 'end' = 'middle';
            if (idx === 0) {
              ly -= 6;
            } else if (idx === 3) {
              ly += 8;
            } else if (idx === 1 || idx === 2) {
              anchor = 'start';
              lx += 4;
              ly -= 2;
            } else {
              anchor = 'end';
              lx -= 4;
              ly -= 2;
            }

            return (
              <G key={g.name}>
                <SvgText
                  x={lx}
                  y={ly}
                  fill={count > 0 ? (theme.accent || '#00D2FF') : '#8E8E93'}
                  fontSize="11"
                  fontWeight={count > 0 ? '900' : '600'}
                  textAnchor={anchor}
                >
                  {g.label.toUpperCase()}
                </SvgText>
                <SvgText
                  x={lx}
                  y={ly + 12}
                  fill={count > 0 ? '#30D158' : '#555555'}
                  fontSize="10"
                  fontWeight="700"
                  textAnchor={anchor}
                >
                  {count > 0 ? `${count} sets` : '0'}
                </SvgText>
              </G>
            );
          })}
        </Svg>

        {/* Targeted Muscles Summary Chips */}
        {totalTicked > 0 ? (
          <View style={styles.musclePillsRow}>
            {RADAR_GROUPS.filter(g => (muscleCounts[g.name] || 0) > 0).map(g => (
              <View key={g.name} style={styles.musclePill}>
                <Text style={styles.musclePillName}>{g.label}</Text>
                <Text style={styles.musclePillCount}>
                  {muscleCounts[g.name]} {muscleCounts[g.name] === 1 ? 'set' : 'sets'}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyMuscleNotice}>
            <MaterialCommunityIcons name="information-outline" size={15} color="#777777" />
            <Text style={styles.emptyMuscleNoticeText}>No completed sets checked during this workout</Text>
          </View>
        )}
      </View>
    );
  };

  // Active Program Workouts
  const activeProgramData = workoutPrograms.find(p => p.id === viewingProgramId) || workoutPrograms.find(p => p.isActive) || workoutPrograms[0];
  const currentWorkouts = activeProgramData?.workouts || [];
  
  // A workout is "unassigned" if it has no daysOfWeek array or it's empty
  const assignedWorkouts = currentWorkouts.filter(w => Array.isArray(w.daysOfWeek) && w.daysOfWeek.length > 0);
  const unassignedWorkouts = currentWorkouts.filter(w => !Array.isArray(w.daysOfWeek) || w.daysOfWeek.length === 0);

  const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DAY_SHORT_DE: Record<string, string> = {
    Monday: 'Mo', Tuesday: 'Di', Wednesday: 'Mi', Thursday: 'Do', Friday: 'Fr', Saturday: 'Sa', Sunday: 'So'
  };
  const DAY_FULL_DE: Record<string, string> = {
    Monday: 'MONTAG', Tuesday: 'DIENSTAG', Wednesday: 'MITTWOCH', Thursday: 'DONNERSTAG', Friday: 'FREITAG', Saturday: 'SAMSTAG', Sunday: 'SONNTAG'
  };
  const currentDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

  // Weekly Stats Calculation (Monday 00:00 to Sunday 23:59)
  const nowDate = new Date();
  const dayIdxMondayZero = (nowDate.getDay() + 6) % 7;
  const startOfCurrentWeek = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - dayIdxMondayZero, 0, 0, 0, 0);
  const workoutsThisWeek = (workoutHistory || []).filter(w => new Date(w.date).getTime() >= startOfCurrentWeek.getTime());

  let weeklyVolumeKg = 0;
  let completedSetsThisWeek = 0;
  workoutsThisWeek.forEach(w => {
    (w.exercises || []).forEach(ex => {
      (ex.sets || []).forEach(s => {
        completedSetsThisWeek += 1;
        const repsTotal = (s.reps || 0) + (s.repsRight || 0);
        weeklyVolumeKg += (s.weight || 0) * repsTotal;
      });
    });
  });
  const formattedWeeklyVolume = weeklyVolumeKg >= 1000
    ? `${(weeklyVolumeKg / 1000).toFixed(1)}t`
    : `${Math.round(weeklyVolumeKg)} kg`;

  const plannedDaysWithWorkouts = WEEK_DAYS.filter(d =>
    assignedWorkouts.some(p => p.daysOfWeek.some(dw => dw.toLowerCase() === d.toLowerCase()))
  );
  const plannedDaysCount = plannedDaysWithWorkouts.length > 0
    ? plannedDaysWithWorkouts.length
    : Math.max(1, currentWorkouts.length || 4);

  let plannedSetsPerWeek = 0;
  let plannedVolumePerWeek = 0;
  if (assignedWorkouts.length > 0) {
    WEEK_DAYS.forEach(d => {
      const dayPlans = assignedWorkouts.filter(p => p.daysOfWeek.some(dw => dw.toLowerCase() === d.toLowerCase()));
      dayPlans.forEach(p => {
        (p.exercises || []).forEach(ex => {
          const sets = ex.sets || 3;
          const def = getSmartExerciseDefaults(ex.name);
          const w = ex.weight || def.weight || 0;
          const r = ex.reps || def.reps || 10;
          plannedSetsPerWeek += sets;
          plannedVolumePerWeek += sets * r * w;
        });
      });
    });
  } else {
    currentWorkouts.forEach(p => {
      (p.exercises || []).forEach(ex => {
        plannedSetsPerWeek += (ex.sets || 3);
      });
    });
  }
  if (plannedSetsPerWeek <= 0) plannedSetsPerWeek = 60;
  if (plannedVolumePerWeek <= 0) plannedVolumePerWeek = 25000;

  const completedWorkoutsCountThisWeek = workoutsThisWeek.length;
  const weekProgressPct = Math.min(100, Math.round((completedWorkoutsCountThisWeek / Math.max(1, plannedDaysCount)) * 100));
  const volumeProgressPct = Math.min(100, Math.round((weeklyVolumeKg / Math.max(1, plannedVolumePerWeek)) * 100));
  const setsProgressPct = Math.min(100, Math.round((completedSetsThisWeek / Math.max(1, plannedSetsPerWeek)) * 100));

  let weekStreak = 0;
  for (let wOffset = 0; wOffset < 52; wOffset++) {
    const wStart = startOfCurrentWeek.getTime() - wOffset * 7 * 24 * 3600 * 1000;
    const wEnd = wStart + 7 * 24 * 3600 * 1000;
    const hasWorkoutInWeek = (workoutHistory || []).some(w => {
      const t = new Date(w.date).getTime();
      return t >= wStart && t < wEnd;
    });
    if (hasWorkoutInWeek) {
      weekStreak += 1;
    } else if (wOffset === 0) {
      continue;
    } else {
      break;
    }
  }

  // Muscle Recovery Calculation (Volume & Time Based)
  const MUSCLE_GROUPS_META: Array<{ key: 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core'; label: string }> = [
    { key: 'Chest', label: 'Brust' },
    { key: 'Shoulders', label: 'Schulter' },
    { key: 'Arms', label: 'Arme' },
    { key: 'Back', label: 'Rücken' },
    { key: 'Legs', label: 'Beine' },
    { key: 'Core', label: 'Core' },
  ];
  const sortedHistoryForRecovery = [...(workoutHistory || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const muscleRecoveryMap: Record<string, { pct: number; timeAgoLabel: string }> = {};
  MUSCLE_GROUPS_META.forEach(({ key }) => {
    let foundSessionSets = 0;
    let foundTimestamp: number | null = null;
    for (const w of sortedHistoryForRecovery) {
      let setsForMuscle = 0;
      (w.exercises || []).forEach(ex => {
        if (getExerciseMuscleGroup(ex.name) === key) {
          setsForMuscle += (ex.sets?.length || 0);
        }
      });
      if (setsForMuscle > 0) {
        foundSessionSets = setsForMuscle;
        foundTimestamp = new Date(w.date).getTime();
        break;
      }
    }
    if (foundTimestamp === null) {
      muscleRecoveryMap[key] = { pct: 100, timeAgoLabel: 'frisch' };
    } else {
      const hoursElapsed = Math.max(0, (Date.now() - foundTimestamp) / (1000 * 3600));
      const requiredHours = foundSessionSets >= 12 ? 72 : foundSessionSets >= 6 ? 56 : 40;
      const pct = Math.min(100, Math.max(8, Math.round((hoursElapsed / requiredHours) * 100)));
      const daysAgo = Math.floor(hoursElapsed / 24);
      const timeAgoLabel = hoursElapsed < 16 ? 'heute' : daysAgo <= 1 ? 'gestern' : `vor ${daysAgo}T`;
      muscleRecoveryMap[key] = { pct, timeAgoLabel };
    }
  });

  const plansForSelectedDay = assignedWorkouts.filter(p =>
    p.daysOfWeek.some(d => d.toLowerCase() === selectedDayOfWeek.toLowerCase())
  );
  const safePlanIdx = plansForSelectedDay.length > 0 ? Math.min(selectedDayPlanIdx, plansForSelectedDay.length - 1) : 0;
  const selectedDayPlan = plansForSelectedDay[safePlanIdx] || null;

  const isDayDoneThisWeek = (dayName: string) => {
    const dayIdx = WEEK_DAYS.indexOf(dayName);
    if (dayIdx < 0) return false;
    const dStart = new Date(
      startOfCurrentWeek.getFullYear(),
      startOfCurrentWeek.getMonth(),
      startOfCurrentWeek.getDate() + dayIdx,
      0, 0, 0, 0
    ).getTime();
    const dEnd = dStart + 24 * 3600 * 1000;
    return workoutsThisWeek.some(w => {
      const t = new Date(w.date).getTime();
      return t >= dStart && t < dEnd;
    });
  };

  const selectedDayIsDone = isDayDoneThisWeek(selectedDayOfWeek);
  const selectedDayTotalSets = selectedDayPlan
    ? (selectedDayPlan.exercises || []).reduce((acc, ex) => acc + (ex.sets || 3), 0)
    : 0;
  const selectedDayEstMinutes = selectedDayPlan
    ? Math.max(15, Math.round(selectedDayTotalSets * 3.2))
    : 0;

  let recoveryInlineText = '';
  let recoveryInlineColor = '#30D158';
  if (selectedDayPlan && (selectedDayPlan.exercises || []).length > 0) {
    const targetMuscles = Array.from(new Set((selectedDayPlan.exercises || []).map(ex => getExerciseMuscleGroup(ex.name))));
    const avgPct = Math.round(
      targetMuscles.reduce((sum, m) => sum + (muscleRecoveryMap[m]?.pct ?? 100), 0) / targetMuscles.length
    );
    recoveryInlineText = `Zielmuskeln ${avgPct}% erholt`;
    recoveryInlineColor = avgPct >= 85 ? '#30D158' : avgPct >= 55 ? '#00D2FF' : '#FF9500';
  } else {
    const allAvg = Math.round(
      MUSCLE_GROUPS_META.reduce((sum, m) => sum + (muscleRecoveryMap[m.key]?.pct ?? 100), 0) / MUSCLE_GROUPS_META.length
    );
    recoveryInlineText = `Gesamtkörper ${allAvg}% erholt`;
    recoveryInlineColor = allAvg >= 85 ? '#30D158' : allAvg >= 55 ? '#00D2FF' : '#FF9500';
  }

  const allExercises = [...PRELOADED_EXERCISES, ...(customExercises || [])]
    .filter(ex => !(hiddenExercises || []).includes(ex.name));
  
  const displayedExercises = allExercises.filter(ex => {
    if (filterEquip !== 'All' && (ex as any).equipmentType !== filterEquip) return false;
    const matchesCategory = filterCategory === 'All' || ex.category === filterCategory;
    const info = getExerciseMuscleInfo(ex.name);
    const exTarget = (ex as any).targetMuscle || info.targetMuscle;
    const matchesTarget = filterTargetMuscle === 'All' || exTarget === filterTargetMuscle;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      ex.name.toLowerCase().includes(query) ||
      (exTarget && exTarget.toLowerCase().includes(query)) ||
      (info.majorGroup && (MAJOR_MUSCLE_LABELS_DE[info.majorGroup] || '').toLowerCase().includes(query));
    return matchesCategory && matchesTarget && matchesSearch;
  });

  const handleTriggerPowerSong = async () => {
    if (!powerSong) return;
    const { playlists, setCurrentSong } = useMusicStore.getState();
    const playlist = playlists.find(p => p.id === powerSong.playlistId);
    if (!playlist) return;
    const song = playlist.songs.find(s => s.id === powerSong.songId);
    if (!song) return;

    setCurrentSong(powerSong.playlistId, powerSong.songId);
    
    setTimeout(async () => {
      try {
        await TrackPlayer.seekTo(powerSong.startPosition);
      } catch (e) {
        // player might not be fully ready, ignore
      }
    }, 1000);
  };

  const handleSelectExerciseForLiveWorkout = (selectedEx: any) => {
    if (swapExerciseIndex !== null) {
      const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      if (swapExerciseIndex === -1) {
        const defaultData = getSmartExerciseDefaults(selectedEx.name);
        const isUni = defaultData.isUnilateral ?? false;
        const newEx: Exercise = {
          id: newId,
          name: selectedEx.name,
          sets: 3,
          reps: defaultData.reps,
          weight: defaultData.weight,
          isUnilateral: isUni,
          lastCompletedSets: defaultData.lastCompletedSets,
        };
        if (isUni) {
          setUnilateralExercises(prev => [...Array.from(prev), newId]);
        }
        setLiveExercises(prev => [...prev, newEx]);
        try {
          useAutoChessStore.getState().addExerciseToLivePool({
            name: newEx.name,
            equipmentType: (selectedEx as any)?.equipmentType,
            imageUri: (selectedEx as any)?.imageUri
          });
        } catch (e) {}
        setSetLogs(prev => {
          const newLogs = { ...prev };
          for (let i = 0; i < 3; i++) {
            const setDefaults = getSmartSetDefaults(newEx, i);
            newLogs[`${newId}_${i}`] = { 
              weight: setDefaults.weight.toString(), 
              reps: setDefaults.reps.toString(), 
              repsRight: (setDefaults.repsRight !== undefined ? setDefaults.repsRight : setDefaults.reps).toString(),
              checked: false 
            };
          }
          return newLogs;
        });
      } else {
        const oldEx = liveExercises[swapExerciseIndex];
        const defaultData = getSmartExerciseDefaults(selectedEx.name);
        const isUni = defaultData.isUnilateral ?? false;
        const newEx: Exercise = {
          id: newId,
          name: selectedEx.name,
          sets: oldEx.sets,
          reps: defaultData.reps,
          weight: defaultData.weight,
          isUnilateral: isUni,
          lastCompletedSets: defaultData.lastCompletedSets,
        };
        setUnilateralExercises(prev => {
          const arr = Array.from(prev).filter(id => id !== oldEx.id);
          if (isUni) arr.push(newId);
          return arr;
        });
        
        setLiveExercises(prev => {
          const copy = [...prev];
          copy[swapExerciseIndex] = newEx;
          return copy;
        });
        try {
          useAutoChessStore.getState().addExerciseToLivePool({
            name: newEx.name,
            equipmentType: (selectedEx as any)?.equipmentType,
            imageUri: (selectedEx as any)?.imageUri
          });
        } catch (e) {}

        setSetLogs(prev => {
          const newLogs = { ...prev };
          const setCount = newEx.sets || 3;
          for (let i = 0; i < setCount; i++) {
            const setDefaults = getSmartSetDefaults(newEx, i);
            const oldKey = `${oldEx.id}_${i}`;
            const newKey = `${newEx.id}_${i}`;
            const isChecked = newLogs[oldKey] ? newLogs[oldKey].checked : false;
            newLogs[newKey] = { 
              weight: setDefaults.weight.toString(), 
              reps: setDefaults.reps.toString(), 
              repsRight: (setDefaults.repsRight !== undefined ? setDefaults.repsRight : setDefaults.reps).toString(),
              checked: isChecked 
            };
          }
          return newLogs;
        });
      }
      setSwapExerciseIndex(null);
    }
  };

  const [themePickerVisible, setThemePickerVisible] = useState(false);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 44) + 12 }]}>
      {/* 1. CLEAN HEADER (Analog zu NutritionScreen) */}
      <View style={styles.v2HeaderRow}>
        <Text style={styles.header}>Training</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.v2HeaderIconBtn, { backgroundColor: theme.cardBg, borderColor: theme.accentBorderSoft }]}
            onPress={() => setThemePickerVisible(true)}
          >
            <MaterialCommunityIcons name="palette-outline" size={20} color={theme.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.v2HeaderIconBtn, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}
            onPress={() => {
              setExerciseLibraryModalVisible(true);
            }}
          >
            <MaterialCommunityIcons name="dumbbell" size={20} color={theme.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.v2HeaderIconBtn, { backgroundColor: theme.cardBg, borderColor: 'rgba(255, 149, 0, 0.35)' }]}
            onPress={() => setProgramsModalVisible(true)}
          >
            <MaterialCommunityIcons name="folder-multiple-outline" size={20} color="#FF9500" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.v2HeaderIconBtn, { backgroundColor: theme.cardBg, borderColor: 'rgba(168, 85, 247, 0.35)' }]}
            onPress={() => navigation.navigate('WorkoutHistory' as never)}
          >
            <MaterialCommunityIcons name="history" size={20} color="#A855F7" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(bottomSpacing, 100) }}
      >
        {/* 2. PROGRAMM-LEISTE (Genau wie im Nutrition Tab) */}
        <View style={styles.v2ActiveProgramRow}>
          <TouchableOpacity
            style={[styles.v2ActiveProgramPill, { backgroundColor: theme.accentBgSoft, borderColor: theme.accentBorderSoft }]}
            activeOpacity={0.8}
            onPress={() => setProgramsModalVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <View style={[styles.v2ActiveDot, { backgroundColor: activeProgramData?.isActive ? '#30D158' : theme.accent }]} />
              <Text style={[styles.v2ActiveProgramText, { color: theme.accent }]} numberOfLines={1}>
                {activeProgramData ? activeProgramData.name : 'Programm auswählen / erstellen'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-down" size={18} color={theme.accent} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.v2AddSplitBtn}
            activeOpacity={0.8}
            onPress={() => handleOpenCreatePlan(selectedDayOfWeek)}
          >
            <MaterialCommunityIcons name="plus" size={16} color="#30D158" />
            <Text style={styles.v2AddSplitBtnText}>Split</Text>
          </TouchableOpacity>
        </View>

        {/* 3. ALL-IN-ONE HERO WIDGET */}
        <View style={[styles.v2HeroCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          {/* A) Top: Gewählter Tag, Split-Titel & Wochen-Kreis */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.v2HeroDayLabel}>
                {selectedDayOfWeek.toLowerCase() === currentDayName.toLowerCase() ? 'HEUTE • ' : ''}
                {DAY_FULL_DE[selectedDayOfWeek] || selectedDayOfWeek.toUpperCase()}
              </Text>
              <Text style={styles.v2HeroTitle} numberOfLines={1}>
                {selectedDayPlan ? selectedDayPlan.name : 'Rest Day 💤'}
              </Text>
              <Text
                style={[
                  styles.v2HeroSub,
                  selectedDayIsDone
                    ? { color: '#30D158' }
                    : selectedDayPlan
                    ? { color: '#30D158' }
                    : { color: '#8E9DA8' },
                ]}
                numberOfLines={1}
              >
                {selectedDayIsDone
                  ? `Heute erledigt ✓ • ${selectedDayPlan ? `${selectedDayPlan.exercises.length} Übungen` : 'Workout geloggt'}`
                  : selectedDayPlan
                  ? `${selectedDayPlan.exercises.length} Übungen • ${selectedDayTotalSets} Sätze • ~${selectedDayEstMinutes} Min`
                  : 'Ruhetag • Erholung & Muskelwachstum'}
              </Text>
            </View>

            <View style={[styles.v2WeekCircleBox, { backgroundColor: theme.subCardBg, borderColor: theme.accentBorderSoft }]}>
              <Text style={styles.v2WeekCircleVal}>{completedWorkoutsCountThisWeek}/{plannedDaysCount}</Text>
              <Text style={styles.v2WeekCircleSub}>Wo.</Text>
            </View>
          </View>

          {/* Dezente Wochen-Fortschrittslinie */}
          <View style={styles.v2HeroProgressTrack}>
            <View
              style={[
                styles.v2HeroProgressFill,
                {
                  width: `${weekProgressPct}%`,
                  backgroundColor: weekProgressPct >= 100 ? '#30D158' : theme.accent,
                },
              ]}
            />
          </View>

          {/* B) 3 Cleane Stat-Pills mit Mini-Bars */}
          <View style={styles.v2StatsRow}>
            <View style={[styles.v2StatPill, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
              <Text style={styles.v2StatLabel}>VOLUMEN</Text>
              <Text style={[styles.v2StatVal, { color: '#30D158' }]} numberOfLines={1}>
                {formattedWeeklyVolume}
              </Text>
              <View style={styles.v2MiniBarTrack}>
                <View style={[styles.v2MiniBarFill, { backgroundColor: '#30D158', width: `${volumeProgressPct}%` }]} />
              </View>
            </View>

            <View style={[styles.v2StatPill, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
              <Text style={styles.v2StatLabel}>SÄTZE</Text>
              <Text style={[styles.v2StatVal, { color: theme.accent }]} numberOfLines={1}>
                {completedSetsThisWeek} / {plannedSetsPerWeek}
              </Text>
              <View style={styles.v2MiniBarTrack}>
                <View style={[styles.v2MiniBarFill, { backgroundColor: theme.accent, width: `${setsProgressPct}%` }]} />
              </View>
            </View>

            <View style={[styles.v2StatPill, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
              <Text style={styles.v2StatLabel}>STREAK</Text>
              <Text style={[styles.v2StatVal, { color: '#FF9500' }]} numberOfLines={1}>
                🔥 {weekStreak} Wo.
              </Text>
              <View style={styles.v2MiniBarTrack}>
                <View
                  style={[
                    styles.v2MiniBarFill,
                    { backgroundColor: '#FF9500', width: `${Math.min(100, Math.max(15, weekStreak * 20))}%` },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* C) REGENERATIONS-METER (Kompakt & Aufklappbar) */}
          <View style={{ marginTop: 10 }}>
            <TouchableOpacity
              style={[styles.v2RecoveryBar, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
              activeOpacity={0.75}
              onPress={() => setRecoveryExpanded(prev => !prev)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <MaterialCommunityIcons name="battery-charging-high" size={16} color={recoveryInlineColor} />
                <Text style={styles.v2RecoveryBarLabel} numberOfLines={1}>
                  Regeneration: <Text style={{ color: recoveryInlineColor, fontWeight: '900' }}>{recoveryInlineText}</Text>
                </Text>
              </View>
              <Text style={[styles.v2RecoveryToggleText, { color: theme.accent }]}>
                {recoveryExpanded ? 'Schließen ▴' : 'Details ▾'}
              </Text>
            </TouchableOpacity>

            {recoveryExpanded && (
              <View style={[styles.v2RecoveryDrawer, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                <View style={styles.v2RecoveryGrid}>
                  {MUSCLE_GROUPS_META.map(m => {
                    const info = muscleRecoveryMap[m.key] || { pct: 100, timeAgoLabel: 'frisch' };
                    const barColor = info.pct >= 85 ? '#30D158' : info.pct >= 55 ? theme.accent : '#FF9500';
                    return (
                      <View key={m.key} style={styles.v2RecoveryGridItem}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={styles.v2RecoveryMuscleName}>
                            {m.label} <Text style={styles.v2RecoveryMuscleTime}>({info.timeAgoLabel})</Text>
                          </Text>
                          <Text style={[styles.v2RecoveryMusclePct, { color: barColor }]}>{info.pct}%</Text>
                        </View>
                        <View style={styles.v2RecoveryBarTrack}>
                          <View style={[styles.v2RecoveryBarFill, { width: `${info.pct}%`, backgroundColor: barColor }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* D) MINIMALISTISCHE WOCHENTAGS-LEISTE + ÜBUNGS-KARUSSELL */}
          <View style={[styles.v2ScheduleSubSection, { borderTopColor: theme.subtleBorder }]}>
            <View style={styles.v2WeekDaysBar}>
              {WEEK_DAYS.map(day => {
                const isSelected = day.toLowerCase() === selectedDayOfWeek.toLowerCase();
                const dayPlans = assignedWorkouts.filter(p =>
                  p.daysOfWeek.some(dw => dw.toLowerCase() === day.toLowerCase())
                );
                const done = isDayDoneThisWeek(day);
                const dotColor = done ? '#30D158' : dayPlans.length > 0 ? theme.accent : '#555555';

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.v2DayPill,
                      { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                      isSelected && { backgroundColor: theme.accentBgSoft, borderColor: theme.accent },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => {
                      setSelectedDayOfWeek(day);
                      setSelectedDayPlanIdx(0);
                    }}
                  >
                    <Text style={[styles.v2DayPillText, isSelected && { color: '#FFF' }]}>
                      {DAY_SHORT_DE[day]}
                    </Text>
                    <View style={[styles.v2DayDot, { backgroundColor: dotColor }]} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Falls mehrere Splits am selben Wochentag zugewiesen sind */}
            {plansForSelectedDay.length > 1 && (
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {plansForSelectedDay.map((p, idx) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.v2MultiPlanChip,
                      idx === safePlanIdx && { backgroundColor: theme.accent, borderColor: theme.accent },
                    ]}
                    onPress={() => setSelectedDayPlanIdx(idx)}
                  >
                    <Text
                      style={[
                        styles.v2MultiPlanChipText,
                        idx === safePlanIdx && { color: '#000', fontWeight: '900' },
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Horizontales Übungs-Karussell */}
            {selectedDayPlan && selectedDayPlan.exercises && selectedDayPlan.exercises.length > 0 ? (
              <NativeScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
              >
                {selectedDayPlan.exercises.map(ex => {
                  const def = getSmartExerciseDefaults(ex.name);
                  const displayWeight = ex.weight && ex.weight > 0 ? ex.weight : def.weight;
                  const displayReps = ex.reps && ex.reps > 0 ? ex.reps : def.reps;
                  return (
                    <TouchableOpacity
                      key={ex.id}
                      style={[
                        styles.v2ExerciseCard,
                        { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder },
                        selectedDayIsDone && { opacity: 0.65 },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleStartLiveWorkout(selectedDayPlan, false)}
                    >
                      <Text style={styles.v2ExerciseCardName} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      <View style={{ marginTop: 8 }}>
                        <Text style={[styles.v2ExerciseCardSets, { color: theme.accent }]}>
                          {ex.sets || 3} × {displayReps}
                        </Text>
                        <Text style={styles.v2ExerciseCardWeight} numberOfLines={1}>
                          {displayWeight > 0 ? `${displayWeight} kg` : 'Bodyweight'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </NativeScrollView>
            ) : selectedDayPlan ? (
              <View style={[styles.v2RestDayNoticeBox, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                <Text style={styles.v2RestDayNoticeText}>Noch keine Übungen in diesem Split hinterlegt</Text>
              </View>
            ) : (
              <View style={[styles.v2RestDayNoticeBox, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                <Text style={styles.v2RestDayNoticeText}>Kein festes Training an diesem Tag geplant</Text>
              </View>
            )}

            {/* Haupt-Aktion für den gewählten Tag */}
            {selectedDayPlan ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.v2MainStartBtn, { backgroundColor: theme.accent }, selectedDayIsDone && { backgroundColor: '#30D158' }]}
                  activeOpacity={0.85}
                  onPress={() => handleStartLiveWorkout(selectedDayPlan, true)}
                >
                  <MaterialCommunityIcons name="play" size={18} color="#000" />
                  <Text style={styles.v2MainStartBtnText} numberOfLines={1}>
                    {selectedDayIsDone ? `${selectedDayPlan.name} (Erneut starten)` : `${selectedDayPlan.name} starten`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.v2IconActionBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                  onPress={() => handleOpenEditPlan(selectedDayPlan)}
                >
                  <MaterialCommunityIcons name="pencil" size={18} color={theme.accent} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.v2IconActionBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                  onPress={() => handleDeletePlan(selectedDayPlan)}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF453A" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.v2AssignDayBtn, { marginTop: 10, backgroundColor: theme.accentBgSoft, borderColor: theme.accentBorderSoft }]}
                activeOpacity={0.8}
                onPress={() => handleOpenCreatePlan(selectedDayOfWeek)}
              >
                <MaterialCommunityIcons name="plus" size={16} color={theme.accent} />
                <Text style={[styles.v2AssignDayBtnText, { color: theme.accent }]}>
                  Workout für {DAY_SHORT_DE[selectedDayOfWeek]} zuweisen
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 4. FREESTYLE QUICK-ACTION BANNER */}
        <TouchableOpacity
          style={[styles.v2FreestyleBanner, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
          activeOpacity={0.8}
          onPress={() => setFreestyleNameModalVisible(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <View style={[styles.v2FreestyleIconBox, { backgroundColor: theme.accent }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={20} color="#000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.v2FreestyleTitle}>Freestyle Workout starten</Text>
              <Text style={styles.v2FreestyleSub}>Spontanes Training ohne festen Plan</Text>
            </View>
          </View>
          <Text style={[styles.v2FreestyleStartLink, { color: theme.accent }]}>Start ›</Text>
        </TouchableOpacity>

        {/* 5. 2-WEGE UMSCHALTER UNTEN: PROGRAMM-SPLITS | GESPEICHERTE FREESTYLE */}
        <View style={[styles.v2BottomTabsBar, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
          <TouchableOpacity
            style={[
              styles.v2BottomTabBtn,
              bottomTab === 'splits' && { backgroundColor: theme.accentBgSoft, borderWidth: 1, borderColor: theme.accentBorderSoft },
            ]}
            onPress={() => setBottomTab('splits')}
          >
            <Text style={[styles.v2BottomTabText, bottomTab === 'splits' && { color: theme.accent }]}>
              Programm-Splits ({currentWorkouts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.v2BottomTabBtn,
              bottomTab === 'freestyle' && { backgroundColor: theme.accentBgSoft, borderWidth: 1, borderColor: theme.accentBorderSoft },
            ]}
            onPress={() => setBottomTab('freestyle')}
          >
            <Text style={[styles.v2BottomTabText, bottomTab === 'freestyle' && { color: theme.accent }]}>
              Gespeicherte Freestyle ({spontaneousWorkouts.length})
            </Text>
          </TouchableOpacity>
        </View>

        {bottomTab === 'splits' ? (
          <View style={{ gap: 8 }}>
            {currentWorkouts.length > 0 ? (
              currentWorkouts.map(plan => {
                const days = Array.isArray(plan.daysOfWeek) && plan.daysOfWeek.length > 0 ? plan.daysOfWeek : [];
                const totalSets = (plan.exercises || []).reduce((acc, e) => acc + (e.sets || 3), 0);
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={[styles.v2CompactListCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
                    activeOpacity={0.8}
                    onPress={() => handleStartLiveWorkout(plan, false)}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {days.length > 0 ? (
                          days.map(d => (
                            <View key={d} style={[styles.v2SmallDayTag, { backgroundColor: theme.accentBgSoft, borderColor: theme.accentBorderSoft }]}>
                              <Text style={[styles.v2SmallDayTagText, { color: theme.accent }]}>{DAY_SHORT_DE[d] || d.substring(0, 2)}</Text>
                            </View>
                          ))
                        ) : (
                          <View style={[styles.v2SmallDayTag, { borderColor: '#444', backgroundColor: '#1E242B' }]}>
                            <Text style={[styles.v2SmallDayTagText, { color: '#999' }]}>Flex</Text>
                          </View>
                        )}
                        <Text style={styles.v2CompactCardTitle} numberOfLines={1}>
                          {plan.name}
                        </Text>
                      </View>
                      <Text style={styles.v2CompactCardSub}>
                        {plan.exercises ? plan.exercises.length : 0} Übungen • {totalSets} Sätze
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.v2SmallIconBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                        onPress={() => handleOpenEditPlan(plan)}
                      >
                        <MaterialCommunityIcons name="pencil" size={16} color={theme.accent} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.v2SmallIconBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                        onPress={() => handleDeletePlan(plan)}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color="#FF453A" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.v2SmallStartBtn}
                        onPress={() => handleStartLiveWorkout(plan, true)}
                      >
                        <MaterialCommunityIcons name="play" size={15} color="#000" />
                        <Text style={styles.v2SmallStartBtnText}>Start</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={[styles.v2EmptyListBox, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}>
                <Text style={styles.v2EmptyListText}>Noch keine Splits im aktuellen Programm.</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.v2DashedAddBtn, { backgroundColor: theme.subCardBg, borderColor: theme.accentBorderSoft }]}
              onPress={() => handleOpenCreatePlan(selectedDayOfWeek)}
            >
              <MaterialCommunityIcons name="plus" size={16} color={theme.accent} />
              <Text style={[styles.v2DashedAddBtnText, { color: theme.accent }]}>Neuen Split zum Programm hinzufügen</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {spontaneousWorkouts.length > 0 ? (
              spontaneousWorkouts.map(plan => (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.v2CompactListCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
                  activeOpacity={0.8}
                  onPress={() => handleStartLiveWorkout(plan, false)}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.v2CompactCardTitle} numberOfLines={1}>
                      {plan.name}
                    </Text>
                    <Text style={styles.v2CompactCardSub}>
                      {plan.exercises.length} Übungen • Freestyle-Vorlage
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity
                      style={[styles.v2SmallIconBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                      onPress={() => useAppStore.getState().deleteSpontaneousWorkout(plan.id)}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={16} color="#FF453A" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.v2SmallStartBtn}
                      onPress={() => handleStartLiveWorkout(plan, true)}
                    >
                      <MaterialCommunityIcons name="play" size={15} color="#000" />
                      <Text style={styles.v2SmallStartBtnText}>Start</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={[styles.v2EmptyListBox, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}>
                <Text style={styles.v2EmptyListText}>Keine gespeicherten Freestyle-Workouts vorhanden.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* TRAININGSPROGRAMME VERWALTEN & WECHSELN MODAL */}
      <Modal
        visible={programsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setProgramsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modernDialogCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, width: '92%', maxWidth: 440 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="folder-multiple-outline" size={20} color={theme.accent} />
                <Text style={styles.modernDialogTitle}>Trainingsprogramme</Text>
              </View>
              <TouchableOpacity onPress={() => setProgramsModalVisible(false)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={22} color="#AAA" />
              </TouchableOpacity>
            </View>

            <NativeScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: 8 }}>
              {workoutPrograms.length === 0 ? (
                <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>
                  Noch kein Trainingsprogramm erstellt.
                </Text>
              ) : (
                workoutPrograms.map(prog => {
                  const isSelected = prog.id === activeProgramData?.id;
                  return (
                    <TouchableOpacity
                      key={prog.id}
                      style={[
                        styles.v2ProgramModalItem,
                        {
                          backgroundColor: isSelected ? theme.accentSoftBg : theme.subCardBg,
                          borderColor: isSelected ? theme.accent : theme.subtleBorder,
                        }
                      ]}
                      onPress={() => {
                        setViewingProgramId(prog.id);
                        if (!prog.isActive) toggleProgramActive(prog.id);
                        setProgramsModalVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.v2CompactCardTitle}>{prog.name}</Text>
                          {prog.isActive && (
                            <View style={[styles.v2ActiveBadgeTiny, { backgroundColor: theme.accentSoftBg, borderColor: theme.accent, borderWidth: 1 }]}>
                              <Text style={[styles.v2ActiveBadgeTinyText, { color: theme.accent }]}>Aktiv</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.v2CompactCardSub}>{prog.workouts.length} Splits</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <TouchableOpacity
                          style={[styles.v2SmallIconBtn, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}
                          onPress={() => toggleProgramActive(prog.id)}
                        >
                          <MaterialCommunityIcons
                            name={prog.isActive ? 'pause' : 'play'}
                            size={16}
                            color={prog.isActive ? theme.accent : '#888'}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.v2SmallIconBtn, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}
                          onPress={() => {
                            showCustomAlert(
                              "Programm löschen",
                              `Möchtest du "${prog.name}" und alle zugehörigen Splits wirklich löschen?`,
                              [
                                { text: "Abbrechen", style: "cancel" },
                                { text: "Löschen", style: "destructive", onPress: () => deleteWorkoutProgram(prog.id) }
                              ]
                            );
                          }}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={16} color="#FF453A" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </NativeScrollView>

            <TouchableOpacity
              style={[styles.v2MainStartBtn, { backgroundColor: theme.accent, marginTop: 16, flex: 0 }]}
              onPress={() => {
                setProgramsModalVisible(false);
                setNewProgramName('');
                setProgramEditorModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="folder-plus-outline" size={18} color="#000" />
              <Text style={styles.v2MainStartBtnText}>Neues Programm erstellen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* NEW PROGRAM MODAL */}
      <Modal
        visible={programEditorModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setProgramEditorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modernDialogCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={[styles.modernDialogIconCircle, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorderSoft }]}>
                <MaterialCommunityIcons name="folder-plus-outline" size={28} color={theme.accent} />
              </View>
              <Text style={styles.modernDialogTitle}>Neues Trainingsprogramm</Text>
              <Text style={styles.modernDialogSub}>
                Erstelle ein übergeordnetes Programm für deine Splits (z.B. Push/Pull/Legs).
              </Text>
            </View>

            <View style={[styles.modernInputContainer, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder, marginBottom: 20 }]}>
              <MaterialCommunityIcons name="folder-outline" size={20} color={theme.accent} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.modernInput}
                placeholder="z.B. Push / Pull / Legs, Summer Cut"
                placeholderTextColor="#666"
                value={newProgramName}
                onChangeText={setNewProgramName}
                autoFocus
              />
              {newProgramName.length > 0 && (
                <TouchableOpacity onPress={() => setNewProgramName('')} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.modernDialogActions}>
              <TouchableOpacity 
                style={[styles.modernDialogCancelBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]} 
                onPress={() => setProgramEditorModalVisible(false)}
              >
                <Text style={styles.modernDialogCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modernDialogSubmitBtn, 
                  { backgroundColor: theme.accent },
                  !newProgramName.trim() && { opacity: 0.4 }
                ]} 
                disabled={!newProgramName.trim()}
                onPress={() => {
                  if (newProgramName.trim()) {
                    const newId = Date.now().toString();
                    addWorkoutProgram({
                      id: newId,
                      name: newProgramName.trim(),
                      isActive: true,
                      workouts: []
                    });
                    setViewingProgramId(newId);
                    setProgramEditorModalVisible(false);
                  }
                }}
              >
                <Text style={styles.modernDialogSubmitText}>Erstellen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FULL-SCREEN MODAL: LIVE WORKOUT MODE */}
      <Modal
        visible={liveWorkoutModalVisible}
        animationType="none"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          if (workoutStartTime === null) {
            setActivePlan(null);
            setWorkoutStartTime(null);
            setLiveExercises([]);
            setSetLogs({});
            setLiveWorkoutModalVisible(false);
            setGlobalLiveWorkoutModalVisible(false);
          } else {
            setLiveWorkoutModalVisible(false);
            setGlobalLiveWorkoutModalVisible(false);
          }
        }}
      >
        <View style={[
          styles.fullPageModal, 
          { paddingTop: Math.max(insets.top + 10, 36), backgroundColor: '#090B0E' }
        ]}>
          {/* Live Workout Top Bar */}
          <View style={[styles.liveWorkoutHeaderV2, { borderBottomColor: theme.subtleBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={{ paddingRight: 10 }}
                onPress={() => {
                  if (workoutStartTime === null) {
                    setActivePlan(null);
                    setWorkoutStartTime(null);
                    setLiveExercises([]);
                    setSetLogs({});
                    setLiveWorkoutModalVisible(false);
                    setGlobalLiveWorkoutModalVisible(false);
                  } else {
                    setLiveWorkoutModalVisible(false);
                    setGlobalLiveWorkoutModalVisible(false); // allow mini-player to show
                  }
                }}
              >
                <MaterialCommunityIcons 
                  name={workoutStartTime === null ? "close" : "chevron-down"} 
                  size={26} 
                  color={theme.accent} 
                />
              </TouchableOpacity>
              <View>
                <Text style={styles.liveWorkoutPlanTitle}>{activePlan?.name}</Text>
                {workoutStartTime !== null ? (
                  <View style={styles.liveStopwatchRow}>
                    <View style={styles.pulsingDot} />
                    <Text style={[styles.liveStopwatchText, { color: theme.accent }]}>
                      {formatTime(workoutDuration)}
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <MaterialCommunityIcons name="eye-outline" size={13} color="#888" style={{ marginRight: 4 }} />
                    <Text style={{ color: '#888', fontSize: 12, fontWeight: '600' }}>Vorschau • Nicht gestartet</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {powerSong && (
                <TouchableOpacity 
                  style={[styles.powerSongQuickBtn, { borderColor: 'rgba(255, 214, 10, 0.4)' }]}
                  onPress={handleTriggerPowerSong}
                >
                  <MaterialCommunityIcons name="lightning-bolt" size={18} color="#FFD60A" />
                </TouchableOpacity>
              )}
              {workoutStartTime === null ? (
                <TouchableOpacity 
                  style={[styles.finishWorkoutButton, { backgroundColor: '#30D158' }]}
                  onPress={() => {
                    const now = Date.now();
                    setWorkoutStartTime(now);
                    if (activePlan) {
                      setGlobalActivePlan(activePlan);
                      setGlobalWorkoutDuration(0);
                      useAppStore.getState().setGlobalWorkoutStartTime(now);
                    }
                    Vibration.vibrate(40);
                  }}
                >
                  <MaterialCommunityIcons name="play" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.finishWorkoutButtonText}>Start</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.finishWorkoutButton}
                  onPress={() => {
                    if (!activePlan) return;
                    handleFinishLiveWorkout(false);
                  }}
                >
                  <MaterialCommunityIcons name="flag-checkered" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.finishWorkoutButtonText}>Finish</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Top In-Workout Bar: MP3 Player */}
          <InWorkoutMusicWidget 
            onExpandChange={(exp) => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setMusicExpanded(exp);
            }}
          />

          {/* Iron Tactics Quick Launch */}
          {!musicExpanded && (
            <TouchableOpacity
              style={[styles.headerAutoChessBtnV2, { marginHorizontal: 10, marginBottom: 8 }]}
              activeOpacity={0.8}
              onPress={() => {
                if (useAutoChessStore.getState().pool.length === 0) {
                  useAutoChessStore.getState().initSession(
                    workoutPrograms,
                    legacyWorkoutPlans || [],
                    customExercises,
                    workoutHistory,
                    liveExercises
                  );
                }
                setAutoChessModalVisible(true);
              }}
            >
              <View style={styles.headerAutoChessInner}>
                <View style={styles.headerAutoChessIconCircle}>
                  <Text style={{ fontSize: 15 }}>♟️</Text>
                </View>
                <View style={{ marginLeft: 6, justifyContent: 'center' }}>
                  <Text style={styles.headerAutoChessTitle}>Iron Tactics</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                    <WeightPlateIcon size={12} color="#FFD700" />
                    <Text style={styles.headerAutoChessCoins}>{autoChessCoins}</Text>
                    {autoChessPendingBonus > 0 && (
                      <View style={styles.headerAutoChessBonusBadge}>
                        <Text style={styles.headerAutoChessBonusText}>⭐+{autoChessPendingBonus}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#FFD700" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}

          {/* Rest Countdown Banner with -30s, +30s, Skip */}
          {restTimeLeft !== null && (
            <View style={[styles.restBannerV2, { backgroundColor: theme.cardBg, borderColor: 'rgba(48, 209, 88, 0.45)' }]}>
              <View style={styles.restBannerInfo}>
                <View style={styles.restTimerIconCircle}>
                  <MaterialCommunityIcons name="timer-outline" size={20} color="#30D158" />
                </View>
                <View style={{ marginLeft: 8 }}>
                  <Text style={[styles.restBannerTitle, { color: '#30D158' }]}>REST COUNTDOWN</Text>
                  <Text style={styles.restBannerClock}>{formatTime(restTimeLeft)}</Text>
                </View>
              </View>
              <View style={styles.restBannerActions}>
                {/* -30s Button */}
                <TouchableOpacity 
                  style={[styles.restActionButton, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]} 
                  onPress={() => {
                    setRestTimeLeft(prev => prev ? Math.max(0, prev - 30) : 0);
                    setRestEndTime(prev => prev ? prev - 30000 : Date.now());
                    Vibration.vibrate(25);
                  }}
                >
                  <Text style={styles.restActionText}>-30s</Text>
                </TouchableOpacity>
                {/* +30s Button */}
                <TouchableOpacity 
                  style={[styles.restActionButton, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]} 
                  onPress={() => {
                    setRestTimeLeft(prev => (prev ? prev + 30 : 30));
                    setRestEndTime(prev => (prev ? prev + 30000 : Date.now() + 30000));
                    Vibration.vibrate(25);
                  }}
                >
                  <Text style={styles.restActionText}>+30s</Text>
                </TouchableOpacity>
                {/* Skip Button */}
                <TouchableOpacity 
                  style={[styles.restActionButton, { backgroundColor: 'rgba(255, 69, 58, 0.15)', borderColor: 'rgba(255, 69, 58, 0.4)' }]} 
                  onPress={() => {
                    setRestTimeLeft(null);
                    setRestEndTime(null);
                    Vibration.vibrate(30);
                  }}
                >
                  <Text style={[styles.restActionText, { color: '#FF453A' }]}>Skip</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Exercise Sets Tracking View */}
          <ScrollView 
            nestedScrollEnabled={true} 
            enableOnAndroid={true} 
            extraScrollHeight={Platform.select({ android: 40, ios: 20 })} 
            keyboardShouldPersistTaps="handled" 
            keyboardDismissMode="on-drag"
            enableResetScrollToCoords={false}
            enableAutomaticScroll={true}
            keyboardOpeningTime={0}
            style={{ flex: 1 }} 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={{ paddingBottom: bottomSpacing + 40, flexGrow: 1 }}
          >
            {liveExercises.map((ex, exIdx) => {
              const count = ex.sets || 3;
              const isUnilateral = unilateralExercises.has(ex.id);
              const exImageUri = getExerciseImage(ex.name);
              const muscleCategory = getExerciseMuscleGroup(ex.name);
              const defaults = getSmartExerciseDefaults(ex.name);
              const prWeight = defaults.weight > 0 ? defaults.weight : 0;
              const noteKey = ex.id;
              const currentNote = exerciseNotes[noteKey] || exerciseNotes[ex.name] || (ex as any).note || '';
              const hasNote = Boolean(currentNote && currentNote.trim().length > 0);
              const showNoteRow = hasNote || editingNoteExId === ex.id;

              return (
                <View 
                  key={ex.id} 
                  style={[
                    styles.liveExerciseCardV2, 
                    { 
                      backgroundColor: theme.cardBg, 
                      borderColor: theme.cardBorder,
                      shadowColor: theme.accent,
                    }
                  ]}
                >
                  {/* Compact Multi-Row Exercise Header */}
                  <View style={[styles.liveExHeaderV2, { borderBottomColor: theme.subtleBorder, backgroundColor: theme.subCardBg }]}>
                    {/* Left Section: Reorder, Photo, Name & Muscle Info */}
                    <View style={styles.liveExHeaderLeftColV2}>
                      {/* Reorder Up/Down */}
                      <View style={styles.liveExReorderColV2}>
                        <TouchableOpacity 
                          onPress={() => {
                            if (exIdx > 0) {
                              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                              const newEx = [...liveExercises];
                              [newEx[exIdx - 1], newEx[exIdx]] = [newEx[exIdx], newEx[exIdx - 1]];
                              setLiveExercises(newEx);
                            }
                          }}
                          hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
                        >
                          <MaterialCommunityIcons name="chevron-up" size={17} color={exIdx === 0 ? "#444" : theme.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => {
                            if (exIdx < liveExercises.length - 1) {
                              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                              const newEx = [...liveExercises];
                              [newEx[exIdx], newEx[exIdx + 1]] = [newEx[exIdx + 1], newEx[exIdx]];
                              setLiveExercises(newEx);
                            }
                          }}
                          hitSlop={{ top: 4, bottom: 8, left: 8, right: 8 }}
                        >
                          <MaterialCommunityIcons name="chevron-down" size={17} color={exIdx === liveExercises.length - 1 ? "#444" : theme.accent} />
                        </TouchableOpacity>
                      </View>

                      {/* Exercise Photo Thumbnail */}
                      <TouchableOpacity 
                        style={[
                          styles.liveExThumbWrap, 
                          { borderColor: theme.accentBorderSoft, backgroundColor: theme.cardBg }
                        ]}
                        onPress={() => pickExerciseImage(ex.name)}
                        activeOpacity={0.8}
                      >
                        {exImageUri ? (
                          <Image source={{ uri: exImageUri }} style={styles.liveExThumbImg} />
                        ) : (
                          <View style={[styles.liveExThumbPlaceholder, { backgroundColor: theme.accentSoftBg }]}>
                            <MaterialCommunityIcons name="dumbbell" size={18} color={theme.accent} />
                          </View>
                        )}
                        <View style={styles.liveExThumbCamBadge}>
                          <MaterialCommunityIcons name="camera" size={8} color="#FFF" />
                        </View>
                      </TouchableOpacity>

                      {/* Name & Muscle Info (flex: 1, minWidth: 0 to guarantee full visibility) */}
                      <View style={styles.liveExTitleColV2}>
                        <View style={styles.liveExNameRowV2}>
                          <Text style={[styles.liveExIndexV2, { color: theme.accent }]}>{exIdx + 1}.</Text>
                          <Text style={styles.liveExNameV2} numberOfLines={2}>
                            {ex.name}
                          </Text>
                        </View>
                        <View style={styles.liveExBadgesRowV2}>
                          <View style={[styles.liveExCatBadge, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorderSoft }]}>
                            <Text style={[styles.liveExCatText, { color: theme.accent }]}>
                              {MAJOR_MUSCLE_LABELS_DE[muscleCategory] || muscleCategory}
                            </Text>
                          </View>
                          {prWeight > 0 && (
                            <Text style={styles.liveExPrText} numberOfLines={1}>🏆 PR: {prWeight} kg</Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Right Section: Multi-row action cluster */}
                    <View style={styles.liveExRightClusterV2}>
                      {/* Row 1: Set Adjusters (+ Satz, - Satz) & Unilateral toggle */}
                      <View style={styles.liveExActionRowV2}>
                        <TouchableOpacity 
                          style={[styles.liveSetAdjustBtnV2, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorderSoft }]}
                          onPress={() => handleAddLiveSet(ex.id)}
                        >
                          <MaterialCommunityIcons name="plus" size={12} color={theme.accent} />
                          <Text style={[styles.liveSetAdjustBtnTextV2, { color: theme.accent }]}>Satz</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.liveSetAdjustBtnV2, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}
                          onPress={() => handleRemoveLiveSet(ex.id)}
                        >
                          <MaterialCommunityIcons name="minus" size={12} color="#94A3B8" />
                          <Text style={[styles.liveSetAdjustBtnTextV2, { color: '#94A3B8' }]}>Satz</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[
                            styles.liveMiniToolBtnV2, 
                            isUnilateral 
                              ? { backgroundColor: theme.accentSoftBg, borderColor: theme.accent } 
                              : { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }
                          ]}
                          onPress={() => toggleUnilateral(ex.id)}
                        >
                          <MaterialCommunityIcons 
                            name="arrow-split-vertical" 
                            size={11} 
                            color={isUnilateral ? theme.accent : "#94A3B8"} 
                          />
                          <Text style={[styles.liveMiniToolTextV2, { color: isUnilateral ? theme.accent : "#94A3B8" }]}>Uni</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Row 2: Management tools (Tauschen, Bearbeiten, Notiz, Löschen) */}
                      <View style={[styles.liveExActionRowV2, { marginTop: 4 }]}>
                        <TouchableOpacity 
                          style={[styles.liveMiniSquareBtnV2, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}
                          onPress={() => setSwapExerciseIndex(exIdx)}
                        >
                          <MaterialCommunityIcons name="swap-horizontal" size={13} color={theme.accent} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                          style={[styles.liveMiniSquareBtnV2, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}
                          onPress={() => {
                            const match = allExercises.find(e => e.name.toLowerCase() === ex.name.toLowerCase());
                            setEditingExercise({
                              name: ex.name,
                              category: match?.category || getExerciseMuscleGroup(ex.name),
                              equipmentType: (match as any)?.equipmentType || 'Freie Übung',
                              brand: (match as any)?.brand || 'Keine',
                              isUnilateral: isUnilateral || ex.isUnilateral,
                              weight: ex.weight,
                              reps: ex.reps,
                              sets: ex.sets,
                            });
                            setManagerVisible(true);
                          }}
                        >
                          <MaterialCommunityIcons name="pencil-outline" size={13} color="#94A3B8" />
                        </TouchableOpacity>

                        {/* Note Trigger Button */}
                        <TouchableOpacity 
                          style={[
                            styles.liveMiniSquareBtnV2, 
                            hasNote 
                              ? { backgroundColor: theme.accentSoftBg, borderColor: theme.accent } 
                              : { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }
                          ]}
                          onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setEditingNoteExId(editingNoteExId === ex.id ? null : ex.id);
                          }}
                        >
                          <MaterialCommunityIcons 
                            name={hasNote ? "notebook" : "notebook-outline"} 
                            size={13} 
                            color={hasNote ? theme.accent : "#94A3B8"} 
                          />
                        </TouchableOpacity>

                        {/* Delete Button */}
                        <TouchableOpacity 
                          style={[styles.liveMiniSquareBtnV2, { backgroundColor: 'rgba(255, 69, 58, 0.12)', borderColor: 'rgba(255, 69, 58, 0.3)' }]}
                          onPress={() => {
                            Alert.alert(
                              "Übung entfernen",
                              `Möchtest du "${ex.name}" aus diesem Workout entfernen?`,
                              [
                                { text: "Abbrechen", style: "cancel" },
                                { 
                                  text: "Entfernen", 
                                  style: "destructive", 
                                  onPress: () => {
                                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                    setLiveExercises(liveExercises.filter((_, i) => i !== exIdx));
                                  }
                                }
                              ]
                            );
                          }}
                        >
                          <MaterialCommunityIcons name="delete-outline" size={13} color="#FF453A" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Note / Machine Pin Bar - ONLY shown when note is present or actively opened */}
                  {showNoteRow && (
                    <View style={[styles.livePinRowV2, { backgroundColor: 'rgba(0,0,0,0.25)', borderBottomColor: theme.subtleBorder }]}>
                      <MaterialCommunityIcons name="pin" size={13} color={theme.accent} style={{ marginRight: 6 }} />
                      <TextInput
                        style={styles.livePinInputV2}
                        placeholder="Notiz / Maschineneinstellung eingeben..."
                        placeholderTextColor="#64748B"
                        value={currentNote}
                        onChangeText={(text) => {
                          setExerciseNotes(prev => ({ ...prev, [noteKey]: text }));
                        }}
                        autoFocus={editingNoteExId === ex.id && !hasNote}
                      />
                      {hasNote && (
                        <TouchableOpacity
                          onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setExerciseNotes(prev => {
                              const next = { ...prev };
                              delete next[noteKey];
                              delete next[ex.name];
                              return next;
                            });
                            if (editingNoteExId === ex.id) setEditingNoteExId(null);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={{ padding: 4 }}
                        >
                          <MaterialCommunityIcons name="close-circle-outline" size={15} color="#94A3B8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Sets Table */}
                  <View style={styles.liveSetsTableV2}>
                    <View style={styles.liveSetTableHeaderV2}>
                      <Text style={[styles.liveHeaderColV2, { width: 38 }]}>SET</Text>
                      <Text style={[styles.liveHeaderColV2, { flex: 1, textAlign: 'center' }]}>GEWICHT (KG)</Text>
                      <Text style={[styles.liveHeaderColV2, { flex: 1.2, textAlign: 'center' }]}>
                        {isUnilateral ? 'WDHLG (L | R)' : 'WDHLG'}
                      </Text>
                      <Text style={[styles.liveHeaderColV2, { width: 44, textAlign: 'center' }]}>FERTIG</Text>
                    </View>

                    {Array.from({ length: count }).map((_, setIndex) => {
                      const logKey = `${ex.id}_${setIndex}`;
                      const setDefaults = getSmartSetDefaults(ex, setIndex);
                      const log = setLogs[logKey] || { 
                        weight: setDefaults.weight.toString(), 
                        reps: setDefaults.reps.toString(), 
                        repsRight: (setDefaults.repsRight !== undefined ? setDefaults.repsRight : setDefaults.reps).toString(),
                        checked: false 
                      };
                      const setType = setTypes[logKey] || 'normal';

                      const cycleSetType = () => {
                        const types: Array<'normal' | 'warmup' | 'drop' | 'failure'> = ['normal', 'warmup', 'drop', 'failure'];
                        const currentIdx = types.indexOf(setType);
                        const nextType = types[(currentIdx + 1) % types.length];
                        setSetTypes(prev => ({ ...prev, [logKey]: nextType }));
                        Vibration.vibrate(25);
                      };

                      const tagLabel = setType === 'warmup' ? 'W' : setType === 'drop' ? 'D' : setType === 'failure' ? 'F' : `${setIndex + 1}`;
                      const tagColor = setType === 'warmup' ? '#FFD60A' : setType === 'drop' ? '#C084FC' : setType === 'failure' ? '#FF453A' : (log.checked ? '#30D158' : '#CBD5E1');

                      return (
                        <View 
                          key={setIndex}
                          style={[
                            styles.liveSetRowV2,
                            log.checked && styles.liveSetRowCheckedV2,
                            { backgroundColor: log.checked ? 'rgba(48, 209, 88, 0.08)' : '#0E1318', borderColor: log.checked ? 'rgba(48, 209, 88, 0.35)' : theme.subtleBorder }
                          ]}
                        >
                          {/* Set Type / Tag Chip */}
                          <TouchableOpacity 
                            style={[
                              styles.setTagChipV2, 
                              { borderColor: log.checked ? 'rgba(48, 209, 88, 0.4)' : theme.subtleBorder }
                            ]}
                            onPress={cycleSetType}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Text style={[styles.setTagChipTextV2, { color: tagColor }]}>{tagLabel}</Text>
                          </TouchableOpacity>

                          {/* Weight Input + Ghost Hint */}
                          <View style={{ flex: 1, marginHorizontal: 4 }}>
                            <TextInput 
                              style={[
                                styles.liveSetInputV2, 
                                { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }
                              ]} 
                              keyboardType="numeric"
                              value={log.weight}
                              onChangeText={(val) => updateSetLog(ex.id, setIndex, 'weight', val)} 
                            />
                            {setDefaults.weight > 0 && (
                              <Text style={styles.liveGhostHintV2} numberOfLines={1}>
                                Letztes Mal: {setDefaults.weight}kg
                              </Text>
                            )}
                          </View>

                          {/* Reps Input + Ghost Hint */}
                          {isUnilateral ? (
                            <View style={{ flex: 1.2, marginHorizontal: 4 }}>
                              <View style={{ flexDirection: 'row', gap: 4 }}>
                                <TextInput 
                                  style={[
                                    styles.liveSetInputV2, 
                                    { flex: 1, textAlign: 'center', backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }
                                  ]} 
                                  keyboardType="numeric"
                                  placeholder="L"
                                  placeholderTextColor="#555"
                                  value={log.reps}
                                  onChangeText={(val) => updateSetLog(ex.id, setIndex, 'reps', val)} 
                                />
                                <TextInput 
                                  style={[
                                    styles.liveSetInputV2, 
                                    { flex: 1, textAlign: 'center', backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }
                                  ]} 
                                  keyboardType="numeric"
                                  placeholder="R"
                                  placeholderTextColor="#555"
                                  value={log.repsRight ?? log.reps}
                                  onChangeText={(val) => updateSetLog(ex.id, setIndex, 'repsRight', val)} 
                                />
                              </View>
                              <Text style={styles.liveGhostHintV2} numberOfLines={1}>
                                Ziel: {setDefaults.reps} Wdh
                              </Text>
                            </View>
                          ) : (
                            <View style={{ flex: 1.2, marginHorizontal: 4 }}>
                              <TextInput 
                                style={[
                                  styles.liveSetInputV2, 
                                  { textAlign: 'center', backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }
                                ]} 
                                keyboardType="numeric"
                                value={log.reps}
                                onChangeText={(val) => updateSetLog(ex.id, setIndex, 'reps', val)} 
                              />
                              <Text style={styles.liveGhostHintV2} numberOfLines={1}>
                                Ziel: {setDefaults.reps} Wdh
                              </Text>
                            </View>
                          )}

                          {/* Done Checkbox */}
                          <TouchableOpacity 
                            style={[
                              styles.checkCircleV2, 
                              log.checked && styles.checkCircleActiveV2
                            ]} 
                            onPress={() => handleCheckSet(ex.id, setIndex)}
                          >
                            <MaterialCommunityIcons 
                              name="check" 
                              size={19} 
                              color={log.checked ? "#000000" : "#4A5568"} 
                            />
                          </TouchableOpacity>
                        </View>
                      );
                    })}

                    {/* Add Set Footer Bar */}
                    <View style={{ alignItems: 'center', marginTop: 4 }}>
                      <TouchableOpacity 
                        style={[
                          styles.addSetFooterBtn, 
                          { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorderSoft }
                        ]}
                        onPress={() => handleAddLiveSet(ex.id)}
                      >
                        <MaterialCommunityIcons name="plus" size={14} color={theme.accent} style={{ marginRight: 4 }} />
                        <Text style={[styles.addSetFooterText, { color: theme.accent }]}>Satz hinzufügen</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity 
              style={[
                styles.addSetPill, 
                { 
                  alignSelf: 'center', 
                  marginVertical: 18, 
                  paddingHorizontal: 20, 
                  paddingVertical: 11, 
                  backgroundColor: theme.accentSoftBg,
                  borderColor: theme.accentBorderSoft,
                  borderWidth: 1.2,
                  borderRadius: 14,
                }
              ]}
              onPress={() => setSwapExerciseIndex(-1)}
            >
              <MaterialCommunityIcons name="plus" size={18} color={theme.accent} style={{ marginRight: 8 }} />
              <Text style={[styles.addSetPillText, { fontSize: 15, color: theme.accent }]}>Übung zum Workout hinzufügen</Text>
            </TouchableOpacity>

            {workoutStartTime === null && (
              <TouchableOpacity
                style={{
                  backgroundColor: '#30D158',
                  borderRadius: 16,
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginHorizontal: 16,
                  marginBottom: 10,
                  shadowColor: '#30D158',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
                onPress={() => {
                  const now = Date.now();
                  setWorkoutStartTime(now);
                  if (activePlan) {
                    setGlobalActivePlan(activePlan);
                    setGlobalWorkoutDuration(0);
                    useAppStore.getState().setGlobalWorkoutStartTime(now);
                  }
                  Vibration.vibrate(40);
                }}
              >
                <MaterialCommunityIcons name="play" size={22} color="#000" style={{ marginRight: 8 }} />
                <Text style={{ color: '#000', fontSize: 18, fontWeight: '800' }}>Training Jetzt Starten</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 80 }} />
          </ScrollView>
        </View>
      </Modal>

          {/* Swap / Add Exercise Modal (Live Workout) */}
          <Modal
            visible={swapExerciseIndex !== null}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => setSwapExerciseIndex(null)}
          >
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#101014' }}>
              <View style={[styles.fullPageModal, { flex: 1, width: '100%', paddingTop: Math.max(insets.top + 8, 36), backgroundColor: '#101014' }]}>
                {/* Header */}
                <View style={[styles.fullPageHeader, { borderBottomColor: theme.subtleBorder }]}>
                  <TouchableOpacity 
                    style={styles.modernHeaderBackBtn} 
                    onPress={() => setSwapExerciseIndex(null)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="arrow-left" size={18} color="#FFF" />
                    <Text style={styles.modernHeaderBackText}>Abbrechen</Text>
                  </TouchableOpacity>

                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.modernHeaderTitle}>
                      {swapExerciseIndex === -1 ? 'Übung hinzufügen' : 'Übung tauschen'}
                    </Text>
                    <Text style={[styles.modernHeaderSub, { color: theme.accent }]}>
                      {swapExerciseIndex === -1 ? 'Live Workout' : 'Alternative wählen'}
                    </Text>
                  </View>

                  <TouchableOpacity 
                    style={[styles.modernHeaderActionPill, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorderSoft }]}
                    onPress={() => {
                      setEditingExercise(null);
                      setManagerVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="plus" size={15} color={theme.accent} />
                    <Text style={[styles.modernHeaderActionPillText, { color: theme.accent }]}>Neu</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  nestedScrollEnabled={true} 
                  enableOnAndroid={true} 
                  extraScrollHeight={20} 
                  keyboardShouldPersistTaps="handled" 
                  keyboardDismissMode="on-drag"
                  enableResetScrollToCoords={false}
                  style={{ paddingTop: 14 }} 
                  contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
                >
                {/* Context Banner */}
                {swapExerciseIndex !== null && swapExerciseIndex >= 0 && liveExercises[swapExerciseIndex] && (
                  <View style={[styles.swapContextBanner, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorderSoft }]}>
                    <MaterialCommunityIcons name="swap-horizontal" size={22} color={theme.accent} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.swapContextTitle, { color: theme.accent }]}>Aktuelle Übung wird ersetzt:</Text>
                      <Text style={styles.swapContextName} numberOfLines={1}>
                        {liveExercises[swapExerciseIndex]?.name}
                      </Text>
                    </View>
                  </View>
                )}
                {swapExerciseIndex === -1 && (
                  <View style={[styles.swapContextBanner, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorderSoft }]}>
                    <MaterialCommunityIcons name="plus-circle-outline" size={22} color={theme.accent} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.swapContextTitle, { color: theme.accent }]}>Übung anhängen</Text>
                      <Text style={styles.swapContextDesc}>
                        Wähle eine Übung aus der Bibliothek, um sie direkt an dein laufendes Workout anzuhängen.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Modern Search Bar */}
                <View style={[styles.modernSearchContainer, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder, marginBottom: 12 }]}>
                  <MaterialCommunityIcons name="magnify" size={20} color="#888" style={{ marginRight: 8 }} />
                  <TextInput 
                    style={styles.modernSearchInput}
                    placeholder="Übung suchen..."
                    placeholderTextColor="#666666"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                      <MaterialCommunityIcons name="close-circle" size={18} color="#888" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Filters: Major Muscle Groups */}
                <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'].map(cat => {
                    const isSelected = filterCategory === cat;
                    return (
                      <TouchableOpacity 
                        key={cat}
                        style={[
                          styles.categoryPill,
                          {
                            backgroundColor: isSelected ? theme.accent : theme.subCardBg,
                            borderColor: isSelected ? theme.accent : theme.subtleBorder,
                          }
                        ]}
                        onPress={() => {
                          setFilterCategory(cat as BodyPart);
                          setFilterTargetMuscle('All');
                        }}
                      >
                        <Text style={[styles.categoryPillText, { color: isSelected ? '#000' : '#AAA', fontWeight: isSelected ? '800' : '700' }]}>
                          {MAJOR_MUSCLE_LABELS_DE[cat] || cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </GHScrollView>

                {/* Secondary Target Muscle Filters */}
                {filterCategory !== 'All' && (
                  <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    {['All', ...(TARGET_MUSCLES_BY_CATEGORY[filterCategory] || [])].map(tm => {
                      const isSelected = filterTargetMuscle === tm;
                      return (
                        <TouchableOpacity 
                          key={tm}
                          style={[
                            styles.categoryPill,
                            {
                              backgroundColor: isSelected ? theme.accentSoftBg : theme.subCardBg,
                              borderColor: isSelected ? theme.accent : theme.subtleBorder,
                            }
                          ]}
                          onPress={() => setFilterTargetMuscle(tm)}
                        >
                          <Text style={[styles.categoryPillText, isSelected && { color: theme.accent, fontWeight: '800' }]}>
                            {tm === 'All' ? `Alle ${MAJOR_MUSCLE_LABELS_DE[filterCategory] || filterCategory}` : tm}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </GHScrollView>
                )}

                {/* Equipment Filters */}
                <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {['All', ...(useAppStore.getState().equipmentTypes || ['Freie Übung', 'Maschine', 'Kabelturm', 'Multipresse', 'Bodyweight', 'Sonstiges'])].map(eq => {
                    const isSelected = filterEquip === eq;
                    return (
                      <TouchableOpacity 
                        key={eq}
                        style={[
                          styles.categoryPill,
                          {
                            backgroundColor: isSelected ? theme.accentSoftBg : theme.subCardBg,
                            borderColor: isSelected ? theme.accent : theme.subtleBorder,
                          }
                        ]}
                        onPress={() => setFilterEquip(eq)}
                      >
                        <Text style={[styles.categoryPillText, isSelected && { color: theme.accent, fontWeight: '800' }]}>{eq}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </GHScrollView>

                {/* Exercise Cards */}
                {displayedExercises.map((ex, idx) => {
                  const info = getExerciseMuscleInfo(ex.name);
                  const exTarget = (ex as any).targetMuscle || info.targetMuscle;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.modernSelectExCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
                      onPress={() => handleSelectExerciseForLiveWorkout(ex)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.modernSelectExName}>{ex.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          <View style={[styles.categoryBadgeSmall, { backgroundColor: `${theme.accent}14`, borderColor: `${theme.accent}40`, borderWidth: 1 }]}>
                            <Text style={[styles.categoryBadgeSmallText, { color: theme.accent, fontSize: 10, fontWeight: '800' }]}>
                              {MAJOR_MUSCLE_LABELS_DE[info.majorGroup] || ex.category}
                            </Text>
                          </View>
                          <View style={[styles.categoryBadgeSmall, { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' }]}>
                            <Text style={[styles.categoryBadgeSmallText, { color: '#CCC', fontSize: 10, fontWeight: '700' }]}>
                              {exTarget}
                            </Text>
                          </View>
                          {((ex as any).equipmentType || (ex as any).brand) && (
                            <Text style={{ color: '#888', fontSize: 11 }}>
                              {[((ex as any).brand && (ex as any).brand !== 'Keine') ? (ex as any).brand : null, (ex as any).equipmentType].filter(Boolean).join(' • ')}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity 
                          style={[styles.modernIconMiniBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            setEditingExercise(ex);
                            setManagerVisible(true);
                          }}
                        >
                          <MaterialCommunityIcons name="pencil" size={15} color="#AAA" />
                        </TouchableOpacity>

                        <View style={[styles.modernSelectBadge, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorderSoft }]}>
                          <Text style={[styles.modernSelectBadgeText, { color: theme.accent }]}>
                            {swapExerciseIndex === -1 ? 'Hinzufügen' : 'Wählen'}
                          </Text>
                          <MaterialCommunityIcons name="chevron-right" size={16} color={theme.accent} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            </GestureHandlerRootView>
          </Modal>

          {/* Program Editor Modal */}
          <Modal
            visible={editorModalVisible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => {
              if (planPickerVisible) {
                setPlanPickerVisible(false);
              } else {
                setEditorModalVisible(false);
              }
            }}
          >
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#101014' }}>
            <View style={[styles.fullPageModal, { paddingTop: Math.max(insets.top + 8, 36), backgroundColor: '#101014' }]}>
              {/* Header Bar */}
              <View style={[styles.fullPageHeader, { borderBottomColor: theme.subtleBorder }]}>
                <TouchableOpacity 
                  style={styles.modernHeaderBackBtn} 
                  onPress={() => setEditorModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="arrow-left" size={18} color="#FFF" />
                  <Text style={styles.modernHeaderBackText}>Abbrechen</Text>
                </TouchableOpacity>

                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.modernHeaderTitle}>
                    {editingPlanId ? 'Plan bearbeiten' : 'Neuen Plan erstellen'}
                  </Text>
                  <Text style={[styles.modernHeaderSub, { color: theme.accent }]}>
                    {activeProgramData?.name ? `Programm: ${activeProgramData.name}` : 'Trainingsplan'}
                  </Text>
                </View>

                <TouchableOpacity 
                  style={[
                    styles.modernSaveBtn, 
                    { backgroundColor: theme.accent },
                    !planName.trim() && { opacity: 0.4 }
                  ]} 
                  onPress={handleSavePlan}
                  activeOpacity={0.8}
                  disabled={!planName.trim()}
                >
                  <MaterialCommunityIcons name="check" size={18} color="#000" />
                  <Text style={styles.modernSaveBtnText}>Speichern</Text>
                </TouchableOpacity>
              </View>

              <DraggableFlatList
                data={editorExercises}
                onDragEnd={({ data }) => setEditorExercises(data)}
                keyExtractor={(item) => item.id}
                containerStyle={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ListHeaderComponent={
                  <View style={{ paddingBottom: 16 }}>
                    {/* Plan Name Input */}
                    <View style={styles.formSection}>
                      <View style={styles.modernSectionHeaderRow}>
                        <View style={[styles.sectionBullet, { backgroundColor: theme.accent }]} />
                        <Text style={styles.modernSectionHeaderTitle}>NAME DES PLANS</Text>
                      </View>
                      <View style={[styles.modernInputContainer, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                        <MaterialCommunityIcons name="dumbbell" size={20} color={theme.accent} style={{ marginRight: 10 }} />
                        <TextInput 
                          style={styles.modernInput}
                          placeholder="z.B. Push A - Brust & Trizeps"
                          placeholderTextColor="#666"
                          value={planName}
                          onChangeText={setPlanName}
                        />
                        {planName.length > 0 && (
                          <TouchableOpacity onPress={() => setPlanName('')} style={{ padding: 4 }}>
                            <MaterialCommunityIcons name="close-circle" size={18} color="#888" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    {/* Training Days */}
                    <View style={styles.formSection}>
                      <View style={[styles.modernSectionHeaderRow, { marginTop: 4 }]}>
                        <View style={[styles.sectionBullet, { backgroundColor: theme.accent }]} />
                        <Text style={styles.modernSectionHeaderTitle}>TRAININGSTAGE (MEHRFACHAUSWAHL)</Text>
                      </View>
                      <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                          const isSelected = selectedDays.includes(day);
                          const shortName = DAY_SHORT_DE[day] || day.substring(0, 2);
                          return (
                            <GHTouchableOpacity 
                              key={day}
                              style={[
                                styles.modernDayChip,
                                { 
                                  backgroundColor: isSelected ? theme.accent : theme.subCardBg, 
                                  borderColor: isSelected ? theme.accent : theme.subtleBorder 
                                },
                                { marginRight: 8 }
                              ]}
                              onPress={() => handleToggleDay(day)}
                            >
                              <Text style={[styles.modernDayChipText, { color: isSelected ? '#000' : '#AAA', fontWeight: isSelected ? '900' : '700' }]}>
                                {shortName}
                              </Text>
                            </GHTouchableOpacity>
                          );
                        })}
                      </GHScrollView>
                    </View>

                    {/* Top Action Buttons: Übung hinzufügen & Übung erstellen */}
                    <View style={styles.modernPlanTopActionRow}>
                      <TouchableOpacity 
                        style={[styles.modernTopAddBtn, { backgroundColor: theme.accent }]}
                        onPress={() => setPlanPickerVisible(true)}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="plus" size={19} color="#000" />
                        <Text style={styles.modernTopAddBtnText}>Übung hinzufügen</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[styles.modernTopCreateBtn, { backgroundColor: theme.subCardBg, borderColor: theme.accentBorderSoft }]}
                        onPress={() => {
                          setEditingExercise(null);
                          setManagerVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <MaterialCommunityIcons name="plus-circle-outline" size={17} color={theme.accent} />
                        <Text style={[styles.modernTopCreateBtnText, { color: theme.accent }]}>Übung erstellen</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Current Exercises Header */}
                    <View style={[styles.modernSectionHeaderRow, { marginTop: 20, justifyContent: 'space-between' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.sectionBullet, { backgroundColor: theme.accent }]} />
                        <Text style={styles.modernSectionHeaderTitle}>ÜBUNGEN IM PLAN</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.counterBadge, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorderSoft }]}>
                          <Text style={[styles.counterBadgeText, { color: theme.accent }]}>{editorExercises.length} Übungen</Text>
                        </View>
                        <TouchableOpacity 
                          style={[styles.modernMiniAddPill, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorderSoft }]}
                          onPress={() => setPlanPickerVisible(true)}
                        >
                          <MaterialCommunityIcons name="plus" size={14} color={theme.accent} />
                          <Text style={[styles.modernMiniAddPillText, { color: theme.accent }]}>Hinzufügen</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {editorExercises.length > 0 ? (
                      <Text style={styles.dragReorderHint}>
                        <MaterialCommunityIcons name="gesture-tap-hold" size={13} color="#888" /> Halte eine Übung gedrückt, um sie frei zu sortieren
                      </Text>
                    ) : (
                      <View style={[styles.modernEmptyPlanCard, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                        <MaterialCommunityIcons name="dumbbell" size={32} color={theme.accent} style={{ marginBottom: 6 }} />
                        <Text style={styles.modernEmptyPlanTitle}>Noch keine Übungen im Plan</Text>
                        <Text style={styles.modernEmptyPlanSub}>
                          Füge Übungen aus der Bibliothek hinzu oder erstelle deine eigene neue Übung.
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                          <TouchableOpacity 
                            style={[styles.modernEmptyActionBtn, { backgroundColor: theme.accent }]}
                            onPress={() => setPlanPickerVisible(true)}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons name="plus" size={16} color="#000" />
                            <Text style={styles.modernEmptyActionBtnText}>Übung hinzufügen</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.modernEmptyActionBtn, { backgroundColor: 'transparent', borderColor: theme.accentBorderSoft, borderWidth: 1 }]}
                            onPress={() => {
                              setEditingExercise(null);
                              setManagerVisible(true);
                            }}
                            activeOpacity={0.8}
                          >
                            <MaterialCommunityIcons name="plus-circle-outline" size={16} color={theme.accent} />
                            <Text style={[styles.modernEmptyActionBtnText, { color: theme.accent }]}>Übung erstellen</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                }
                renderItem={({ item: ex, drag, isActive, getIndex }) => {
                  const idx = getIndex() || 0;
                  const info = getExerciseMuscleInfo(ex.name);
                  return (
                    <ScaleDecorator>
                      <View style={[
                        styles.modernEditorCard, 
                        { 
                          backgroundColor: isActive ? '#242432' : theme.cardBg, 
                          borderColor: isActive ? theme.accent : theme.cardBorder,
                          borderWidth: 1.5,
                        }
                      ]}>
                        {/* Top Header Row of the Exercise Card */}
                        <View style={styles.modernEditorCardHeader}>
                          {/* Drag Grip */}
                          <TouchableOpacity 
                            onLongPress={drag} 
                            disabled={isActive} 
                            style={styles.modernDragHandle}
                          >
                            <MaterialCommunityIcons name="drag" size={24} color={isActive ? theme.accent : "#777"} />
                            <View style={[styles.modernIndexBadge, { backgroundColor: theme.accentSoftBg }]}>
                              <Text style={[styles.modernIndexBadgeText, { color: theme.accent }]}>
                                {String(idx + 1).padStart(2, '0')}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.modernEditorExName} numberOfLines={1}>{ex.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                              <View style={[styles.categoryBadgeSmall, { backgroundColor: `${theme.accent}14`, borderColor: `${theme.accent}40`, borderWidth: 1 }]}>
                                <Text style={[styles.categoryBadgeSmallText, { color: theme.accent, fontSize: 10, fontWeight: '800' }]}>
                                  {MAJOR_MUSCLE_LABELS_DE[info.majorGroup] || (ex as any).category || 'Übung'}
                                </Text>
                              </View>
                              {ex.isUnilateral && (
                                <View style={[styles.categoryBadgeSmall, { backgroundColor: 'rgba(255, 215, 0, 0.12)', borderColor: 'rgba(255, 215, 0, 0.3)', borderWidth: 1 }]}>
                                  <Text style={[styles.categoryBadgeSmallText, { color: '#FFD700', fontSize: 10, fontWeight: '800' }]}>
                                    Unilateral
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>

                          {/* Quick Edit & Uni Toggle & Reorder & Trash */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <TouchableOpacity 
                              style={[styles.modernSmallPillBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                              onPress={() => {
                                const match = allExercises.find(e => e.name.toLowerCase() === ex.name.toLowerCase());
                                setEditingExercise({
                                  name: ex.name,
                                  category: match?.category || getExerciseMuscleGroup(ex.name),
                                  equipmentType: (match as any)?.equipmentType || 'Freie Übung',
                                  brand: (match as any)?.brand || 'Keine',
                                  isUnilateral: ex.isUnilateral,
                                  weight: ex.weight,
                                  reps: ex.reps,
                                  sets: ex.sets,
                                });
                                setManagerVisible(true);
                              }}
                            >
                              <MaterialCommunityIcons name="pencil" size={13} color={theme.accent} />
                              <Text style={[styles.modernSmallPillText, { color: theme.accent }]}>Edit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                              style={[
                                styles.modernSmallPillBtn, 
                                { 
                                  backgroundColor: ex.isUnilateral ? theme.accentSoftBg : theme.subCardBg, 
                                  borderColor: ex.isUnilateral ? theme.accent : theme.subtleBorder 
                                }
                              ]}
                              onPress={() => {
                                setEditorExercises(prev => prev.map(e => e.id === ex.id ? { ...e, isUnilateral: !e.isUnilateral } : e));
                              }}
                            >
                              <MaterialCommunityIcons name="scale-balance" size={13} color={ex.isUnilateral ? theme.accent : "#888"} />
                              <Text style={[styles.modernSmallPillText, { color: ex.isUnilateral ? theme.accent : "#888" }]}>Uni</Text>
                            </TouchableOpacity>

                            {/* Up / Down chevrons */}
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <TouchableOpacity 
                                style={[styles.modernIconMiniBtn, { padding: 4, opacity: idx === 0 ? 0.3 : 1 }]}
                                onPress={() => moveEditorExercise(idx, -1)}
                                disabled={idx === 0}
                              >
                                <Ionicons name="chevron-up" size={18} color={idx === 0 ? "#555" : theme.accent} />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={[styles.modernIconMiniBtn, { padding: 4, opacity: idx === editorExercises.length - 1 ? 0.3 : 1 }]}
                                onPress={() => moveEditorExercise(idx, 1)}
                                disabled={idx === editorExercises.length - 1}
                              >
                                <Ionicons name="chevron-down" size={18} color={idx === editorExercises.length - 1 ? "#555" : theme.accent} />
                              </TouchableOpacity>
                            </View>

                            <TouchableOpacity 
                              style={styles.modernTrashBtn}
                              onPress={() => {
                                setEditorExercises(prev => prev.filter(e => e.id !== ex.id));
                                setEditorInputValues(prev => {
                                  const newVals = { ...prev };
                                  delete newVals[ex.id];
                                  return newVals;
                                });
                              }}
                            >
                              <MaterialCommunityIcons name="trash-can-outline" size={17} color="#FF453A" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Targets Inputs Row (Sets, Reps, Weight) */}
                        <View style={[styles.modernTargetsRow, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                          <View style={styles.modernTargetBox}>
                            <Text style={styles.modernTargetLabel}>SÄTZE</Text>
                            <TextInput 
                              style={styles.modernTargetNumInput}
                              keyboardType="numeric"
                              placeholder="3"
                              placeholderTextColor="#555"
                              value={editorInputValues[ex.id]?.sets !== undefined ? editorInputValues[ex.id].sets : (ex.sets ?? 3).toString()}
                              onChangeText={(val) => updateEditorExerciseTarget(ex.id, 'sets', val)}
                            />
                          </View>

                          <View style={styles.targetDivider} />

                          <View style={styles.modernTargetBox}>
                            <Text style={styles.modernTargetLabel}>WDH.</Text>
                            <TextInput 
                              style={styles.modernTargetNumInput}
                              keyboardType="numeric"
                              placeholder="10"
                              placeholderTextColor="#555"
                              value={editorInputValues[ex.id]?.reps !== undefined ? editorInputValues[ex.id].reps : (ex.reps ?? 10).toString()}
                              onChangeText={(val) => updateEditorExerciseTarget(ex.id, 'reps', val)}
                            />
                          </View>

                          <View style={styles.targetDivider} />

                          <View style={styles.modernTargetBox}>
                            <Text style={styles.modernTargetLabel}>GEWICHT (KG)</Text>
                            <TextInput 
                              style={styles.modernTargetNumInput}
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor="#555"
                              value={editorInputValues[ex.id]?.weight !== undefined ? editorInputValues[ex.id].weight : (ex.weight ?? 0).toString()}
                              onChangeText={(val) => updateEditorExerciseTarget(ex.id, 'weight', val)}
                            />
                          </View>
                        </View>
                      </View>
                    </ScaleDecorator>
                  );
                }}
                ListFooterComponent={
                  <View style={{ paddingTop: 10 }}>
                    {/* Add Exercises From Library Header */}
                    <View style={[styles.modernSectionHeaderRow, { marginTop: 14, justifyContent: 'space-between' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.sectionBullet, { backgroundColor: theme.accent }]} />
                        <Text style={styles.modernSectionHeaderTitle}>ÜBUNGEN AUS BIBLIOTHEK HINZUFÜGEN</Text>
                      </View>
                      <View style={[styles.counterBadge, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}>
                        <Text style={[styles.counterBadgeText, { color: '#AAA' }]}>{displayedExercises.length} verfügbar</Text>
                      </View>
                    </View>

                    {/* Quick Create Custom Exercise Action at top of Library */}
                    <TouchableOpacity 
                      style={[
                        styles.modernTopCreateBtn, 
                        { 
                          backgroundColor: theme.subCardBg, 
                          borderColor: theme.accentBorderSoft,
                          marginVertical: 10,
                          paddingVertical: 12,
                        }
                      ]}
                      onPress={() => {
                        setEditingExercise(null);
                        setManagerVisible(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="plus-circle-outline" size={17} color={theme.accent} />
                      <Text style={[styles.modernTopCreateBtnText, { color: theme.accent }]}>Neue eigene Übung erstellen</Text>
                    </TouchableOpacity>

                    {/* Modern Search Bar */}
                    <View style={[styles.modernSearchContainer, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder, marginBottom: 12, marginTop: 6 }]}>
                      <MaterialCommunityIcons name="magnify" size={20} color="#888" style={{ marginRight: 8 }} />
                      <TextInput 
                        style={styles.modernSearchInput}
                        placeholder="Bibliothek durchsuchen..."
                        placeholderTextColor="#666666"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                      />
                      {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                          <MaterialCommunityIcons name="close-circle" size={18} color="#888" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Filters: Major Muscle Groups */}
                    <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'].map(cat => {
                        const isSelected = filterCategory === cat;
                        return (
                          <TouchableOpacity 
                            key={cat}
                            style={[
                              styles.categoryPill,
                              {
                                backgroundColor: isSelected ? theme.accent : theme.subCardBg,
                                borderColor: isSelected ? theme.accent : theme.subtleBorder,
                              }
                            ]}
                            onPress={() => {
                              setFilterCategory(cat as BodyPart);
                              setFilterTargetMuscle('All');
                            }}
                          >
                            <Text style={[styles.categoryPillText, { color: isSelected ? '#000' : '#AAA', fontWeight: isSelected ? '800' : '700' }]}>
                              {MAJOR_MUSCLE_LABELS_DE[cat] || cat}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </GHScrollView>

                    {/* Secondary Target Muscle Filters */}
                    {filterCategory !== 'All' && (
                      <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                        {['All', ...(TARGET_MUSCLES_BY_CATEGORY[filterCategory] || [])].map(tm => {
                          const isSelected = filterTargetMuscle === tm;
                          return (
                            <TouchableOpacity 
                              key={tm}
                              style={[
                                styles.categoryPill,
                                {
                                  backgroundColor: isSelected ? theme.accentSoftBg : theme.subCardBg,
                                  borderColor: isSelected ? theme.accent : theme.subtleBorder,
                                }
                              ]}
                              onPress={() => setFilterTargetMuscle(tm)}
                            >
                              <Text style={[styles.categoryPillText, isSelected && { color: theme.accent, fontWeight: '800' }]}>
                                {tm === 'All' ? `Alle ${MAJOR_MUSCLE_LABELS_DE[filterCategory] || filterCategory}` : tm}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </GHScrollView>
                    )}

                    {/* Equipment Filters */}
                    <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                      {['All', ...(useAppStore.getState().equipmentTypes || ['Freie Übung', 'Maschine', 'Kabelturm', 'Multipresse', 'Bodyweight', 'Sonstiges'])].map(eq => {
                        const isSelected = filterEquip === eq;
                        return (
                          <TouchableOpacity 
                            key={eq}
                            style={[
                              styles.categoryPill,
                              {
                                backgroundColor: isSelected ? theme.accentSoftBg : theme.subCardBg,
                                borderColor: isSelected ? theme.accent : theme.subtleBorder,
                              }
                            ]}
                            onPress={() => setFilterEquip(eq)}
                          >
                            <Text style={[styles.categoryPillText, isSelected && { color: theme.accent, fontWeight: '800' }]}>{eq}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </GHScrollView>

                    {/* Exercise Selection Cards List */}
                    <View style={{ gap: 6, marginTop: 4 }}>
                      {displayedExercises.map(ex => {
                        const isChecked = editorExercises.some(e => e.name === ex.name);
                        const info = getExerciseMuscleInfo(ex.name);
                        const exTarget = (ex as any).targetMuscle || info.targetMuscle;
                        return (
                          <TouchableOpacity 
                            key={ex.name}
                            style={[
                              styles.modernSelectExCard, 
                              { 
                                backgroundColor: isChecked ? theme.accentSoftBg : theme.cardBg, 
                                borderColor: isChecked ? theme.accent : theme.cardBorder,
                                borderWidth: 1.5,
                              }
                            ]}
                            activeOpacity={0.7}
                            onPress={() => handleToggleExerciseInEditor(ex.name)}
                          >
                            <View style={[styles.checkboxBox, isChecked && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                              {isChecked && (
                                <MaterialCommunityIcons name="check" size={16} color="#000000" />
                              )}
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={[styles.modernSelectExName, isChecked && { color: '#FFFFFF', fontWeight: '800' }]}>
                                {ex.name}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                                <View style={[styles.categoryBadgeSmall, { backgroundColor: `${theme.accent}14`, borderColor: `${theme.accent}40`, borderWidth: 1 }]}>
                                  <Text style={[styles.categoryBadgeSmallText, { color: theme.accent, fontSize: 10, fontWeight: '800' }]}>
                                    {MAJOR_MUSCLE_LABELS_DE[info.majorGroup] || ex.category}
                                  </Text>
                                </View>
                                <View style={[styles.categoryBadgeSmall, { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' }]}>
                                  <Text style={[styles.categoryBadgeSmallText, { color: '#CCC', fontSize: 10, fontWeight: '700' }]}>
                                    {exTarget}
                                  </Text>
                                </View>
                                {((ex as any).equipmentType || (ex as any).brand) && (
                                  <Text style={{ color: '#888', fontSize: 11 }}>
                                    {[((ex as any).brand && (ex as any).brand !== 'Keine') ? (ex as any).brand : null, (ex as any).equipmentType].filter(Boolean).join(' • ')}
                                  </Text>
                                )}
                              </View>
                            </View>
                            <TouchableOpacity 
                              style={[styles.modernIconMiniBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                              onPress={(e) => {
                                 e.stopPropagation();
                                 setEditingExercise(ex);
                                 setManagerVisible(true);
                              }}
                            >
                              <MaterialCommunityIcons name="pencil" size={16} color="#888" />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    
                    {/* Open Exercise Manager Button */}
                    <TouchableOpacity 
                      style={[
                        styles.v2DashedAddBtn, 
                        { 
                          backgroundColor: theme.subCardBg, 
                          borderColor: theme.accentBorderSoft,
                          marginVertical: 20, 
                          paddingVertical: 14,
                        }
                      ]}
                      onPress={() => {
                        setEditingExercise(null);
                        setManagerVisible(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="plus" size={18} color={theme.accent} style={{ marginRight: 6 }} />
                      <Text style={[styles.v2DashedAddBtnText, { color: theme.accent, fontSize: 14 }]}>Neue Übung erstellen</Text>
                    </TouchableOpacity>

                    <View style={{ height: 60 }} />
                  </View>
                }
              />
            </View>

            {/* Full-Screen Plan Exercise Picker Overlay */}
            {planPickerVisible && (
              <View style={[styles.planPickerOverlay, { paddingTop: Math.max(insets.top + 8, 36), backgroundColor: '#101014' }]}>
                {/* Header */}
                <View style={[styles.fullPageHeader, { borderBottomColor: theme.subtleBorder, paddingHorizontal: 16 }]}>
                  <TouchableOpacity 
                    style={styles.modernHeaderBackBtn} 
                    onPress={() => setPlanPickerVisible(false)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="arrow-left" size={18} color="#FFF" />
                    <Text style={styles.modernHeaderBackText}>Fertig</Text>
                  </TouchableOpacity>

                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.modernHeaderTitle}>Übungen hinzufügen</Text>
                    <Text style={[styles.modernHeaderSub, { color: theme.accent }]}>
                      {editorExercises.length} im Plan ausgewählt
                    </Text>
                  </View>

                  <TouchableOpacity 
                    style={[styles.modernHeaderActionPill, { backgroundColor: theme.accentSoftBg, borderColor: theme.accentBorderSoft }]}
                    onPress={() => {
                      setEditingExercise(null);
                      setManagerVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="plus" size={15} color={theme.accent} />
                    <Text style={[styles.modernHeaderActionPillText, { color: theme.accent }]}>Neu</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView 
                  nestedScrollEnabled={true} 
                  enableOnAndroid={true} 
                  extraScrollHeight={20} 
                  keyboardShouldPersistTaps="handled" 
                  keyboardDismissMode="on-drag"
                  enableResetScrollToCoords={false}
                  style={{ paddingTop: 14 }} 
                  contentContainerStyle={{ flexGrow: 1, paddingBottom: 110, paddingHorizontal: 16 }}
                >
                  {/* Modern Search Bar */}
                  <View style={[styles.modernSearchContainer, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder, marginBottom: 12 }]}>
                    <MaterialCommunityIcons name="magnify" size={20} color="#888" style={{ marginRight: 8 }} />
                    <TextInput 
                      style={styles.modernSearchInput}
                      placeholder="Bibliothek durchsuchen..."
                      placeholderTextColor="#666666"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                        <MaterialCommunityIcons name="close-circle" size={18} color="#888" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Filters: Major Muscle Groups */}
                  <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    {['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'].map(cat => {
                      const isSelected = filterCategory === cat;
                      return (
                        <TouchableOpacity 
                          key={cat}
                          style={[
                            styles.categoryPill,
                            {
                              backgroundColor: isSelected ? theme.accent : theme.subCardBg,
                              borderColor: isSelected ? theme.accent : theme.subtleBorder,
                            }
                          ]}
                          onPress={() => {
                            setFilterCategory(cat as BodyPart);
                            setFilterTargetMuscle('All');
                          }}
                        >
                          <Text style={[styles.categoryPillText, { color: isSelected ? '#000' : '#AAA', fontWeight: isSelected ? '800' : '700' }]}>
                            {MAJOR_MUSCLE_LABELS_DE[cat] || cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </GHScrollView>

                  {/* Secondary Target Muscle Filters */}
                  {filterCategory !== 'All' && (
                    <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                      {['All', ...(TARGET_MUSCLES_BY_CATEGORY[filterCategory] || [])].map(tm => {
                        const isSelected = filterTargetMuscle === tm;
                        return (
                          <TouchableOpacity 
                            key={tm}
                            style={[
                              styles.categoryPill,
                              {
                                backgroundColor: isSelected ? theme.accentSoftBg : theme.subCardBg,
                                borderColor: isSelected ? theme.accent : theme.subtleBorder,
                              }
                            ]}
                            onPress={() => setFilterTargetMuscle(tm)}
                          >
                            <Text style={[styles.categoryPillText, isSelected && { color: theme.accent, fontWeight: '800' }]}>
                              {tm === 'All' ? `Alle ${MAJOR_MUSCLE_LABELS_DE[filterCategory] || filterCategory}` : tm}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </GHScrollView>
                  )}

                  {/* Equipment Filters */}
                  <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {['All', ...(useAppStore.getState().equipmentTypes || ['Freie Übung', 'Maschine', 'Kabelturm', 'Multipresse', 'Bodyweight', 'Sonstiges'])].map(eq => {
                      const isSelected = filterEquip === eq;
                      return (
                        <TouchableOpacity 
                          key={eq}
                          style={[
                            styles.categoryPill,
                            {
                              backgroundColor: isSelected ? theme.accentSoftBg : theme.subCardBg,
                              borderColor: isSelected ? theme.accent : theme.subtleBorder,
                            }
                          ]}
                          onPress={() => setFilterEquip(eq)}
                        >
                          <Text style={[styles.categoryPillText, isSelected && { color: theme.accent, fontWeight: '800' }]}>{eq}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </GHScrollView>

                  {/* Exercise Selection Cards List */}
                  <View style={{ gap: 6, marginTop: 4 }}>
                    {displayedExercises.map(ex => {
                      const isChecked = editorExercises.some(e => e.name === ex.name);
                      const info = getExerciseMuscleInfo(ex.name);
                      const exTarget = (ex as any).targetMuscle || info.targetMuscle;
                      return (
                        <TouchableOpacity 
                          key={ex.name}
                          style={[
                            styles.modernSelectExCard, 
                            { 
                              backgroundColor: isChecked ? theme.accentSoftBg : theme.cardBg, 
                              borderColor: isChecked ? theme.accent : theme.cardBorder,
                              borderWidth: 1.5,
                            }
                          ]}
                          activeOpacity={0.7}
                          onPress={() => handleToggleExerciseInEditor(ex.name)}
                        >
                          <View style={[styles.checkboxBox, isChecked && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                            {isChecked && (
                              <MaterialCommunityIcons name="check" size={16} color="#000000" />
                            )}
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.modernSelectExName, isChecked && { color: '#FFFFFF', fontWeight: '800' }]}>
                              {ex.name}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                              <View style={[styles.categoryBadgeSmall, { backgroundColor: `${theme.accent}14`, borderColor: `${theme.accent}40`, borderWidth: 1 }]}>
                                <Text style={[styles.categoryBadgeSmallText, { color: theme.accent, fontSize: 10, fontWeight: '800' }]}>
                                  {MAJOR_MUSCLE_LABELS_DE[info.majorGroup] || ex.category}
                                </Text>
                              </View>
                              <View style={[styles.categoryBadgeSmall, { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' }]}>
                                <Text style={[styles.categoryBadgeSmallText, { color: '#CCC', fontSize: 10, fontWeight: '700' }]}>
                                  {exTarget}
                                </Text>
                              </View>
                              {((ex as any).equipmentType || (ex as any).brand) && (
                                <Text style={{ color: '#888', fontSize: 11 }}>
                                  {[((ex as any).brand && (ex as any).brand !== 'Keine') ? (ex as any).brand : null, (ex as any).equipmentType].filter(Boolean).join(' • ')}
                                </Text>
                              )}
                            </View>
                          </View>
                          <TouchableOpacity 
                            style={[styles.modernIconMiniBtn, { backgroundColor: theme.subCardBg, borderColor: theme.subtleBorder }]}
                            onPress={(e) => {
                               e.stopPropagation();
                               setEditingExercise(ex);
                               setManagerVisible(true);
                            }}
                          >
                            <MaterialCommunityIcons name="pencil" size={16} color="#888" />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Bottom Sticky Action Bar */}
                <View style={[styles.planPickerBottomBar, { backgroundColor: '#141419', borderTopColor: theme.subtleBorder }]}>
                  <TouchableOpacity 
                    style={[styles.planPickerDoneBtn, { backgroundColor: theme.accent }]}
                    onPress={() => setPlanPickerVisible(false)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="check" size={19} color="#000" />
                    <Text style={styles.planPickerDoneBtnText}>
                      Fertig ({editorExercises.length} Übungen im Plan)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            </GestureHandlerRootView>
          </Modal>

        {/* END OF WORKOUT CELEBRATION MODAL */}
      <Modal
        visible={celebrationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCelebrationModalVisible(false)}
      >
        <View style={styles.celebrationBackdrop}>
          <View style={styles.celebrationCard}>
            <ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" 
              style={styles.celebrationScroll} 
              contentContainerStyle={styles.celebrationScrollContent}
              showsVerticalScrollIndicator={true}
              bounces={true}
            >
              <View style={styles.trophyCircle}>
                <MaterialCommunityIcons name="trophy" size={40} color="#FFD60A" />
              </View>

              <Text style={styles.celebrationTitle}>Workout Crushed!</Text>
              <Text style={styles.celebrationSub}>
                {lastCompletedWorkout?.planName} • {lastCompletedWorkout?.formattedDate}
              </Text>

              {/* Metrics Overview Grid */}
              <View style={styles.celebrationGrid}>
                <View style={styles.celebrationMetric}>
                  <MaterialCommunityIcons name="timer-outline" size={20} color={theme.accent || "#00D2FF"} />
                  <Text style={styles.metricVal}>
                    {lastCompletedWorkout ? formatTime(lastCompletedWorkout.durationSeconds) : '--'}
                  </Text>
                  <Text style={styles.metricLabel}>DURATION</Text>
                </View>

                <View style={styles.celebrationMetric}>
                  <MaterialCommunityIcons name="fire" size={20} color="#FF9F0A" />
                  <Text style={styles.metricVal}>
                    ~{lastCompletedWorkout?.caloriesBurned || 0}
                  </Text>
                  <Text style={styles.metricLabel}>EST. KCAL</Text>
                </View>

                <View style={styles.celebrationMetric}>
                  <MaterialCommunityIcons name="dumbbell" size={20} color="#30D158" />
                  <Text style={styles.metricVal}>
                    {lastCompletedWorkout?.exercises.length || 0}
                  </Text>
                  <Text style={styles.metricLabel}>EXERCISES</Text>
                </View>
              </View>

              {/* Iron Tactics Reward Banner */}
              <View style={styles.ironTacticsRewardCard}>
                <View style={styles.ironTacticsRewardHeader}>
                  <MaterialCommunityIcons name="sword-cross" size={18} color="#FFD700" style={{ marginRight: 6 }} />
                  <Text style={styles.ironTacticsRewardTitle}>IRON TACTICS TREIBSTOFF</Text>
                </View>
                <View style={styles.ironTacticsRewardRow}>
                  <View style={styles.ironTacticsRewardPill}>
                    <Text style={styles.ironTacticsRewardPillVal}>⚡ +3</Text>
                    <Text style={styles.ironTacticsRewardPillLbl}>Pump (Überpump)</Text>
                  </View>
                  <View style={styles.ironTacticsRewardPill}>
                    <Text style={styles.ironTacticsRewardPillVal}>🥤 +3</Text>
                    <Text style={styles.ironTacticsRewardPillLbl}>Shakes</Text>
                  </View>
                  <View style={styles.ironTacticsRewardPill}>
                    <Text style={styles.ironTacticsRewardPillVal}>🎖️ +80</Text>
                    <Text style={styles.ironTacticsRewardPillLbl}>Tactician XP</Text>
                  </View>
                </View>
              </View>

              {/* Workout Custom Name, Training Partner & Favorite Toggle */}
              <View style={styles.celebrationMetaCard}>
                <Text style={styles.celebrationMetaLabel}>WORKOUT NAME</Text>
                <View style={styles.celebrationInputRow}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={theme.accent || "#00D2FF"} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.celebrationTextInput}
                    placeholder="Workout Name (z.B. Brust & Trizeps Fokus)"
                    placeholderTextColor="#666666"
                    value={completedWorkoutCustomName}
                    onChangeText={setCompletedWorkoutCustomName}
                  />
                </View>

                <Text style={[styles.celebrationMetaLabel, { marginTop: 12 }]}>TRAININGSPARTNER</Text>
                <View style={styles.celebrationInputRow}>
                  <MaterialCommunityIcons name="account-multiple-outline" size={18} color="#30D158" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.celebrationTextInput}
                    placeholder="z.B. Marc, Coach Alex (optional)"
                    placeholderTextColor="#666666"
                    value={completedWorkoutPartner}
                    onChangeText={setCompletedWorkoutPartner}
                  />
                </View>

                <TouchableOpacity 
                  style={[
                    styles.celebrationFavoriteToggle,
                    completedWorkoutIsFavorite && styles.celebrationFavoriteToggleActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setCompletedWorkoutIsFavorite(!completedWorkoutIsFavorite)}
                >
                  <MaterialCommunityIcons 
                    name={completedWorkoutIsFavorite ? "star" : "star-outline"} 
                    size={20} 
                    color={completedWorkoutIsFavorite ? "#FFD700" : "#888888"} 
                    style={{ marginRight: 8 }} 
                  />
                  <Text style={[
                    styles.celebrationFavoriteText,
                    completedWorkoutIsFavorite && { color: '#FFD700', fontWeight: 'bold' }
                  ]}>
                    {completedWorkoutIsFavorite ? 'Als Highlight gespeichert' : 'Als Highlight zu Top Workouts pinnen'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Heart Rate Stats if Watch was connected */}
              {lastCompletedWorkout?.avgHeartRate ? (
                <View style={styles.celebrationHrCard}>
                  <View style={styles.celebrationHrItem}>
                    <MaterialCommunityIcons name="heart-pulse" size={20} color="#FF453A" />
                    <Text style={styles.celebrationHrVal}>{lastCompletedWorkout.avgHeartRate} BPM</Text>
                    <Text style={styles.celebrationHrLabel}>AVG HEART RATE</Text>
                  </View>
                  <View style={styles.celebrationHrDivider} />
                  <View style={styles.celebrationHrItem}>
                    <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FF9F0A" />
                    <Text style={styles.celebrationHrVal}>
                      {lastCompletedWorkout.maxHeartRate || lastCompletedWorkout.avgHeartRate} BPM
                    </Text>
                    <Text style={styles.celebrationHrLabel}>PEAK HEART RATE</Text>
                  </View>
                </View>
              ) : null}

              {/* Sets Box */}
              <View style={styles.celebrationSetsBox}>
                <Text style={styles.celebrationSetsText}>
                  Total Sets Completed: <Text style={{ color: '#30D158', fontWeight: '800' }}>
                    {lastCompletedWorkout?.exercises.reduce((s, e) => s + e.sets.length, 0) || 0}
                  </Text>
                </Text>
                <Text style={styles.celebrationSaveNotice}>
                  ✓ Only ticked sets logged in Workout History
                </Text>
              </View>

              {/* Scroll Down Hint to see Spider Chart */}
              <View style={styles.chartDividerRow}>
                <View style={styles.chartDividerLine} />
                <View style={styles.chartScrollHintBadge}>
                  <MaterialCommunityIcons name="chevron-down" size={14} color={theme.accent || "#00D2FF"} />
                  <Text style={styles.chartScrollHintText}>SCROLL FOR MUSCLE BREAKDOWN</Text>
                  <MaterialCommunityIcons name="chevron-down" size={14} color={theme.accent || "#00D2FF"} />
                </View>
                <View style={styles.chartDividerLine} />
              </View>

              {/* Muscle Focus Spider / Radar Chart Section */}
              <View style={styles.spiderChartContainer}>
                <Text style={styles.spiderChartTitle}>MUSCLE FOCUS OVERVIEW</Text>
                <Text style={styles.spiderChartSubtitle}>Ticked sets distribution across muscle groups</Text>
                {renderSpiderChart(lastCompletedWorkout?.exercises || [])}
              </View>
              {/* Save Plan Changes Checkbox */}
              {pendingPlanChangesToSave && (pendingPlanChangesToSave.addedExercises.length > 0 || pendingPlanChangesToSave.removedExercises.length > 0) && (
                <View style={{ marginTop: 24, padding: 16, backgroundColor: theme.accentSoftBg || 'rgba(0, 210, 255, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: theme.accentBorder || 'rgba(0, 210, 255, 0.3)' }}>
                  <Text style={{ color: theme.accent || '#00D2FF', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
                    Plan-Anpassungen gefunden!
                  </Text>
                  <Text style={{ color: '#CCCCCC', fontSize: 13, marginBottom: 16 }}>
                    {pendingPlanChangesToSave.addedExercises.length > 0 && pendingPlanChangesToSave.removedExercises.length > 0
                      ? `Du hast während dem Workout ${pendingPlanChangesToSave.addedExercises.length} Übung(en) hinzugefügt und ${pendingPlanChangesToSave.removedExercises.length} Übung(en) entfernt. Sollen diese Änderungen dauerhaft im Plan gespeichert werden?`
                      : pendingPlanChangesToSave.addedExercises.length > 0
                      ? `Du hast während dem Workout ${pendingPlanChangesToSave.addedExercises.length} neue Übung${pendingPlanChangesToSave.addedExercises.length > 1 ? 'en' : ''} hinzugefügt. Sollen diese für das nächste Mal dauerhaft im Plan gespeichert werden?`
                      : `Du hast während dem Workout ${pendingPlanChangesToSave.removedExercises.length} Übung${pendingPlanChangesToSave.removedExercises.length > 1 ? 'en' : ''} entfernt. Sollen diese dauerhaft aus dem Plan gelöscht werden?`
                    }
                  </Text>
                  
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                    activeOpacity={0.7}
                    onPress={() => setSavePlanChangesChecked(!savePlanChangesChecked)}
                  >
                    <View style={[{
                      width: 24, 
                      height: 24, 
                      borderRadius: 6, 
                      borderWidth: 2, 
                      borderColor: savePlanChangesChecked ? (theme.accent || '#00D2FF') : '#555',
                      backgroundColor: savePlanChangesChecked ? (theme.accent || '#00D2FF') : 'transparent',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: 12
                    }]}>
                      {savePlanChangesChecked && <MaterialCommunityIcons name="check" size={16} color="#000" />}
                    </View>
                    <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '500' }}>
                      Änderungen im Trainingsplan speichern
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity 
              style={styles.celebrationCloseBtn}
              activeOpacity={0.8}
              onPress={() => {
                if (lastCompletedWorkout) {
                  const finalCustomName = completedWorkoutCustomName.trim() || lastCompletedWorkout.planName;
                  const finalPartner = completedWorkoutPartner.trim() || undefined;
                  const updatedWorkout: CompletedWorkout = {
                    ...lastCompletedWorkout,
                    customName: finalCustomName,
                    trainingPartner: finalPartner,
                    isFavorite: completedWorkoutIsFavorite,
                  };
                  updateCompletedWorkout(updatedWorkout);
                }
                if (pendingPlanChangesToSave && savePlanChangesChecked) {
                  const parentProgram = workoutPrograms.find(p => p.workouts.some(w => w.id === pendingPlanChangesToSave.planId));
                  if (parentProgram) {
                    const plan = parentProgram.workouts.find(w => w.id === pendingPlanChangesToSave.planId);
                    if (plan) {
                      const updatedPlan = {
                        ...plan,
                        exercises: pendingPlanChangesToSave.finalLiveExercises
                      };
                      const updatedWorkouts = parentProgram.workouts.map(w => w.id === plan.id ? updatedPlan : w);
                      updateWorkoutProgram({ ...parentProgram, workouts: updatedWorkouts });
                    }
                  } else {
                    const plan = spontaneousWorkouts.find(w => w.id === pendingPlanChangesToSave.planId);
                    if (plan) {
                      const updatedPlan = {
                        ...plan,
                        exercises: pendingPlanChangesToSave.finalLiveExercises
                      };
                      updateSpontaneousWorkout(updatedPlan);
                    }
                  }
                }
                setPendingPlanChangesToSave(null);
                setCelebrationModalVisible(false);
              }}
            >
              <Text style={styles.celebrationCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* GALAXY WATCH 5 CONNECTION MODAL */}
      <SwipeableModal
        visible={watchModalVisible}
        onClose={() => setWatchModalVisible(false)}
        maxHeight="82%"
      >
        <View style={styles.watchModalHeader}>
          <View style={styles.watchModalIconCircle}>
            <MaterialCommunityIcons name="watch" size={26} color={theme.accent || "#00D2FF"} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.watchModalTitle}>Galaxy Watch 5</Text>
            <Text style={styles.watchModalSub}>Wear OS Heart Rate Monitor</Text>
          </View>
          <TouchableOpacity 
            style={styles.watchCloseBtn}
            onPress={() => setWatchModalVisible(false)}
          >
            <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Current Connection Status Card */}
        <View style={[styles.watchStatusBox, isWatchConnected && styles.watchStatusBoxConnected]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.statusDotLarge, { backgroundColor: isWatchConnected ? '#30D158' : '#666666' }]} />
              <Text style={styles.watchStatusText}>
                {isWatchConnected ? "Connected & Streaming Live" : "Not Connected"}
              </Text>
            </View>
            {isWatchConnected && (
              <View style={styles.batteryPill}>
                <MaterialCommunityIcons name="bluetooth-connect" size={14} color="#30D158" />
                <Text style={styles.batteryText}>BLE Active</Text>
              </View>
            )}
          </View>

          {isWatchConnected ? (
            <View style={styles.liveWatchTelemetry}>
              <View style={styles.telemetryStat}>
                <Text style={styles.telemetryLabel}>LIVE PULSE</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
                  <Text style={[styles.telemetryValue, { color: currentHrZone.color }]}>{heartRate}</Text>
                  <Text style={styles.telemetryUnit}> BPM</Text>
                </View>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryStat}>
                <Text style={styles.telemetryLabel}>ZONE</Text>
                <Text style={[styles.telemetryValue, { color: currentHrZone.color, fontSize: 14, marginTop: 4 }]}>
                  {currentHrZone.label}
                </Text>
              </View>
              <View style={styles.telemetryDivider} />
              <View style={styles.telemetryStat}>
                <Text style={styles.telemetryLabel}>PEAK HR</Text>
                <Text style={[styles.telemetryValue, { color: '#FF9500', fontSize: 17, marginTop: 2 }]}>
                  {hrHistory.length > 0 ? Math.max(...hrHistory) : heartRate}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.watchStatusDesc}>
              Connect your Galaxy Watch 5 to stream live beats per minute (BPM), track training intensity zones, and calculate accurate calorie burn.
            </Text>
          )}

          <TouchableOpacity 
            style={[styles.watchToggleBtn, isWatchConnected ? styles.watchDisconnectBtn : styles.watchConnectActionBtn]}
            activeOpacity={0.8}
            onPress={() => {
              Vibration.vibrate(30);
              toggleConnection();
            }}
          >
            <MaterialCommunityIcons 
              name={isWatchConnected ? "bluetooth-off" : "bluetooth"} 
              size={18} 
              color={isWatchConnected ? "#FF453A" : "#000000"} 
              style={{ marginRight: 6 }} 
            />
            <Text style={[styles.watchToggleBtnText, isWatchConnected && { color: '#FF453A' }]}>
              {isWatchConnected ? "Disconnect Watch" : "Connect Galaxy Watch 5"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* How It Works Guide */}
        <View style={styles.watchGuideCard}>
          <Text style={styles.watchGuideTitle}>💡 How to use with Galaxy Watch 5:</Text>
          <View style={styles.watchGuideStep}>
            <Text style={styles.stepNum}>1.</Text>
            <Text style={styles.stepDesc}>
              <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>Run Samsung Health:</Text> Start your workout in Samsung Health on your watch to keep sensors active.
            </Text>
          </View>
          <View style={styles.watchGuideStep}>
            <Text style={styles.stepNum}>2.</Text>
            <Text style={styles.stepDesc}>
              <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>Open "Heart for Bluetooth":</Text> On your watch, open the app to broadcast your live pulse via BLE.
            </Text>
          </View>
          <View style={styles.watchGuideStep}>
            <Text style={styles.stepNum}>3.</Text>
            <Text style={styles.stepDesc}>
              <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>Both run together:</Text> Samsung Health and Bluetooth stream simultaneously with zero interference!
            </Text>
          </View>
        </View>
        <View style={{ height: 24 }} />
      </SwipeableModal>
      {/* Freestyle Name Modal */}
      <Modal visible={freestyleNameModalVisible} transparent={true} animationType="fade" onRequestClose={() => setFreestyleNameModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Freestyle Workout</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Name deines Workouts (z.B. Chest Day)"
              placeholderTextColor="#888"
              value={freestyleName}
              onChangeText={setFreestyleName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setFreestyleNameModalVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 10 }}>
                <Text style={[styles.modalBtnText, { color: '#888' }]}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtn} onPress={handleStartFreestyle}>
                <Text style={styles.modalBtnText}>Starten</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* EXERCISE LIBRARY & BROWSER MODAL */}
      <Modal
        visible={exerciseLibraryModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setExerciseLibraryModalVisible(false)}
      >
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#101014' }}>
          <View style={[styles.fullPageModal, { width: '100%', flex: 1, paddingTop: Math.max(insets.top + 8, 36), backgroundColor: '#101014' }]}>
            <View style={styles.fullPageHeader}>
              <TouchableOpacity onPress={() => setExerciseLibraryModalVisible(false)}>
                <Text style={styles.navCancelText}>Schließen</Text>
              </TouchableOpacity>
              <Text style={styles.navHeaderTitle}>Übungs-Bibliothek</Text>
              <TouchableOpacity 
                style={{ width: 60, alignItems: 'flex-end', justifyContent: 'center' }}
                onPress={() => {
                  setEditingExercise(null);
                  setManagerVisible(true);
                }}
              >
                <MaterialCommunityIcons name="plus" size={28} color={theme.accent} />
              </TouchableOpacity>
            </View>

            <ScrollView
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              style={{ paddingTop: 14 }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
              showsVerticalScrollIndicator={false}
            >
            {/* Search Bar */}
            <View style={[styles.formSection, { marginBottom: 14 }]}>
              <TextInput 
                style={styles.fullPageInput}
                placeholder="Übung suchen..."
                placeholderTextColor="#666666"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Category Pills */}
            <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'].map(cat => (
                <TouchableOpacity 
                  key={cat}
                  style={[styles.categoryPill, filterCategory === cat && styles.categoryPillActive]}
                  onPress={() => {
                    setFilterCategory(cat as BodyPart);
                    setFilterTargetMuscle('All');
                  }}
                >
                  <Text style={[styles.categoryPillText, filterCategory === cat && styles.categoryPillTextActive]}>
                    {MAJOR_MUSCLE_LABELS_DE[cat] || cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </GHScrollView>

            {/* Target Muscle Sub-Filter Pills */}
            {filterCategory !== 'All' && (
              <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {['All', ...(TARGET_MUSCLES_BY_CATEGORY[filterCategory] || [])].map(tm => (
                  <TouchableOpacity 
                    key={tm}
                    style={[
                      styles.categoryPill,
                      filterTargetMuscle === tm && styles.categoryPillActive,
                      {
                        backgroundColor: filterTargetMuscle === tm ? theme.accentBgSoft : 'rgba(255,255,255,0.04)',
                        borderColor: filterTargetMuscle === tm ? theme.accent : 'rgba(255,255,255,0.1)',
                      }
                    ]}
                    onPress={() => setFilterTargetMuscle(tm)}
                  >
                    <Text style={[styles.categoryPillText, filterTargetMuscle === tm && { color: theme.accent, fontWeight: '800' }]}>
                      {tm === 'All' ? `Alle ${MAJOR_MUSCLE_LABELS_DE[filterCategory] || filterCategory}` : tm}
                    </Text>
                  </TouchableOpacity>
                ))}
              </GHScrollView>
            )}

            {/* Equipment Pills */}
            <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.categoryScroll, { marginBottom: 14 }]}>
              {['All', ...(useAppStore.getState().equipmentTypes || ['Freie Übung', 'Maschine', 'Kabelturm', 'Multipresse', 'Bodyweight', 'Sonstiges'])].map(eq => (
                <TouchableOpacity 
                  key={eq}
                  style={[styles.categoryPill, filterEquip === eq && styles.categoryPillActive]}
                  onPress={() => setFilterEquip(eq)}
                >
                  <Text style={[styles.categoryPillText, filterEquip === eq && styles.categoryPillTextActive]}>{eq}</Text>
                </TouchableOpacity>
              ))}
            </GHScrollView>

            <View style={{ marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#8E96A0', fontSize: 12, fontWeight: '700' }}>
                {displayedExercises.length} ÜBUNGEN ({customExercises?.length || 0} EIGENE)
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setEditingExercise(null);
                  setManagerVisible(true);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <MaterialCommunityIcons name="plus-circle" size={16} color={theme.accent} />
                <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '800' }}>Neue Übung</Text>
              </TouchableOpacity>
            </View>

            {displayedExercises.map((ex, idx) => {
              const isPre = PRELOADED_EXERCISES.some(p => p.name.toLowerCase() === ex.name.toLowerCase());
              const defaults = exerciseDefaults?.[ex.name];
              const info = getExerciseMuscleInfo(ex.name);
              const exTarget = (ex as any).targetMuscle || info.targetMuscle;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.exerciseSelectRow, { paddingVertical: 12 }]}
                  onPress={() => {
                    setEditingExercise({
                      ...ex,
                      targetMuscle: exTarget,
                      isUnilateral: defaults?.isUnilateral,
                      weight: defaults?.weight,
                      reps: defaults?.reps,
                    });
                    setManagerVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.exerciseSelectName, { fontSize: 16 }]}>{ex.name}</Text>
                      {isPre ? (
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ color: '#888', fontSize: 9, fontWeight: '800' }}>STD</Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: `${theme.accent}1F`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ color: theme.accent, fontSize: 9, fontWeight: '800' }}>EIGEN</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <View style={[styles.categoryBadgeSmall, { backgroundColor: `${theme.accent}14`, borderColor: `${theme.accent}40`, borderWidth: 1 }]}>
                        <Text style={[styles.categoryBadgeSmallText, { color: theme.accent, fontSize: 10, fontWeight: '800' }]}>
                          {MAJOR_MUSCLE_LABELS_DE[info.majorGroup] || ex.category}
                        </Text>
                      </View>
                      {exTarget ? (
                        <View style={[styles.categoryBadgeSmall, { backgroundColor: 'rgba(255, 255, 255, 0.06)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' }]}>
                          <Text style={[styles.categoryBadgeSmallText, { color: '#CCC', fontSize: 10, fontWeight: '700' }]}>
                            {exTarget}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                      {[((ex as any).brand && (ex as any).brand !== 'Keine') ? (ex as any).brand : null, (ex as any).equipmentType].filter(Boolean).join(' • ')}
                      {defaults && (defaults.weight > 0 || defaults.reps > 0) ? ` • ${defaults.weight} kg × ${defaults.reps}` : ''}
                      {defaults?.isUnilateral ? ' • Uni' : ''}
                    </Text>
                  </View>

                  <TouchableOpacity 
                    style={{ padding: 8, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 }}
                    onPress={(e) => {
                      e.stopPropagation();
                      setEditingExercise({
                        ...ex,
                        targetMuscle: exTarget,
                        isUnilateral: defaults?.isUnilateral,
                        weight: defaults?.weight,
                        reps: defaults?.reps,
                      });
                      setManagerVisible(true);
                    }}
                  >
                    <MaterialCommunityIcons name="pencil" size={18} color={theme.accent} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        </GestureHandlerRootView>
      </Modal>

      {/* EXERCISE MANAGER & EDITOR MODAL */}
      <ExerciseManagerModal 
        visible={managerVisible} 
        onClose={() => {
          setManagerVisible(false);
          setEditingExercise(null);
        }} 
        initialExercise={editingExercise}
        isPreloaded={
          editingExercise
            ? PRELOADED_EXERCISES.some((p) => p.name.toLowerCase() === editingExercise.name.toLowerCase())
            : false
        }
        onSaved={(updatedEx, oldName) => {
          const actualOldName = oldName || editingExercise?.name;

          // 1. If currently in the Plan Editor, update matching exercise in editorExercises
          if (actualOldName) {
            setEditorExercises((prev) =>
              prev.map((e) => {
                if (e.name.toLowerCase() === actualOldName.toLowerCase()) {
                  return {
                    ...e,
                    name: updatedEx.name,
                    isUnilateral: updatedEx.isUnilateral !== undefined ? updatedEx.isUnilateral : e.isUnilateral,
                    weight: updatedEx.weight !== undefined ? updatedEx.weight : e.weight,
                    reps: updatedEx.reps !== undefined ? updatedEx.reps : e.reps,
                    sets: updatedEx.sets !== undefined ? updatedEx.sets : e.sets,
                  };
                }
                return e;
              })
            );

            // Also update liveExercises if currently running a live workout
            setLiveExercises((prev) =>
              prev.map((e) => {
                if (e.name.toLowerCase() === actualOldName.toLowerCase()) {
                  return { ...e, name: updatedEx.name };
                }
                return e;
              })
            );
          }

          // 2. If user was creating a new exercise during swap in live workout:
          if (!editingExercise && swapExerciseIndex !== null) {
            handleSelectExerciseForLiveWorkout(updatedEx);
          }

          // 3. If user was creating a new exercise while in Plan Editor:
          if (!editingExercise && editorModalVisible) {
            handleToggleExerciseInEditor(updatedEx.name);
          }

          setManagerVisible(false);
          setEditingExercise(null);
        }}
        onDeleted={(deletedName) => {
          setEditorExercises((prev) => prev.filter((e) => e.name.toLowerCase() !== deletedName.toLowerCase()));
          setLiveExercises((prev) => prev.filter((e) => e.name.toLowerCase() !== deletedName.toLowerCase()));
          setManagerVisible(false);
          setEditingExercise(null);
        }}
      />
      <RestAutoChessModal 
        visible={autoChessModalVisible}
        onClose={() => setAutoChessModalVisible(false)}
        restTimeLeft={restTimeLeft}
        onAdd30s={() => {
          setRestTimeLeft(prev => (prev ? prev + 30 : 30));
          setRestEndTime(prev => (prev ? prev + 30000 : Date.now() + 30000));
        }}
      />
      <AccentThemePickerModal
        visible={themePickerVisible}
        onClose={() => setThemePickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  miniPlayerContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  miniPlayerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  miniPlayerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  miniPlayerIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniPlayerTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  miniPlayerTime: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  miniPlayerRestBar: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  miniPlayerRestText: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1E1E1E', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 16 },
  modalInput: { backgroundColor: '#2C2C2E', color: '#FFF', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtn: { backgroundColor: '#00D2FF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  modalBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#121212' },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16,
  },
  header: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  subHeader: { fontSize: 13, color: '#888888', marginTop: 2 },
  addPlanIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A'
  },
  addPlanText: { color: '#00D2FF', fontWeight: '800', fontSize: 13, marginLeft: 4 },

  sectionHeaderRow: { marginBottom: 10, marginTop: 6 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#888888', letterSpacing: 0.5 },

  // DAY SECTION & REST DAY STYLES
  daySectionContainer: {
    marginBottom: 20,
  },
  daySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  daySectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#A0A0A0',
    letterSpacing: 0.8,
  },
  daySectionTitleToday: {
    color: '#00D2FF',
  },
  todayBadge: {
    backgroundColor: 'rgba(0, 210, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#00D2FF',
  },
  todayBadgeText: {
    color: '#00D2FF',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  dayStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dayStatusRest: {
    backgroundColor: '#222224',
  },
  dayStatusWorkout: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
  },
  dayStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Rest Day Card
  restDayCard: {
    backgroundColor: '#18181A',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242428',
    borderStyle: 'dashed',
  },
  restDayIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222226',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restDayTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#CCCCCC',
  },
  restDaySubtitle: {
    fontSize: 12,
    color: '#777777',
    marginTop: 2,
  },
  assignWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
  },
  assignWorkoutBtnText: {
    color: '#00D2FF',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },

  // Inactive section styles
  inactiveSectionContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#252528',
  },
  noInactiveBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#181818',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222222',
  },
  noInactiveText: {
    fontSize: 12,
    color: '#777777',
    marginTop: 8,
    textAlign: 'center',
  },

  planCardTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  planCardSub: { fontSize: 13, color: '#00D2FF', marginTop: 4, fontWeight: '600' },
  playButton: { 
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#2C2C2E', 
    alignItems: 'center', justifyContent: 'center'
  },
  planCard: { 
    backgroundColor: '#1E1E1E', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#2A2A2A',
  },
  planCardInactive: {
    opacity: 0.65,
    backgroundColor: '#181818',
    borderColor: '#222222',
  },
  planCardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 12
  },
  planName: { fontSize: 19, fontWeight: '800', color: '#FFFFFF', flex: 1 },
  statusToggleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8
  },
  statusActiveBadge: { backgroundColor: 'rgba(48, 209, 88, 0.15)' },
  statusPausedBadge: { backgroundColor: '#282828' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusToggleText: { fontSize: 11, fontWeight: '800' },
  trashBtn: { padding: 4 },

  planDaysRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  planDayBadge: {
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  planDayBadgeText: { color: '#00D2FF', fontWeight: '800', fontSize: 11 },

  planCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#282828',
    marginTop: 6
  },
  planSub: { color: '#888888', fontSize: 13 },
  planActionButtons: { flexDirection: 'row', alignItems: 'center' },
  editPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#282828',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  editPlanBtnText: { color: '#00D2FF', fontWeight: '700', fontSize: 13, marginLeft: 4 },
  startPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#30D158',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  startPlanBtnText: { color: '#000000', fontWeight: '800', fontSize: 13, marginLeft: 2 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 36, backgroundColor: '#181818', borderRadius: 16 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
  emptySubText: { fontSize: 13, color: '#888888', textAlign: 'center', marginTop: 4 },

  // FULL-SCREEN LIVE WORKOUT STYLES
  fullPageModal: { flex: 1, backgroundColor: '#121212', paddingHorizontal: 16 },
  liveWorkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
    marginBottom: 12
  },
  liveWorkoutPlanTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  liveStopwatchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF453A', marginRight: 6 },
  liveStopwatchText: { fontSize: 18, fontWeight: '800', color: '#FF453A' },
  finishWorkoutButton: {
    backgroundColor: '#FF453A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  finishWorkoutButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  inWorkoutTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: -4,
  },
  headerAutoChessBtn: {
    backgroundColor: '#16161F',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFD70040',
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 46,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  headerAutoChessInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAutoChessIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD70020',
    borderWidth: 1,
    borderColor: '#FFD70060',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAutoChessTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerAutoChessCoins: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '900',
  },
  headerAutoChessBonusBadge: {
    backgroundColor: '#30D15820',
    borderWidth: 0.8,
    borderColor: '#30D158',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  headerAutoChessBonusText: {
    color: '#30D158',
    fontSize: 9.5,
    fontWeight: '800',
  },

  restBanner: {
    backgroundColor: '#192C1D',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D6A4F',
  },
  restBannerInfo: { flexDirection: 'row', alignItems: 'center' },
  restTimerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  restBannerTitle: { color: '#30D158', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  restBannerClock: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  restBannerActions: { flexDirection: 'row' },
  restActionButton: {
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 6
  },
  restActionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  liveExerciseCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  liveExerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  liveExerciseIndex: { fontSize: 18, fontWeight: '800', color: '#00D2FF', marginRight: 6 },
  liveExerciseName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', flex: 1 },
  addSetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#282828',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addSetPillText: { color: '#00D2FF', fontWeight: '700', fontSize: 11, marginLeft: 2 },

  liveSetTableHeader: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  liveHeaderCol: { fontSize: 11, fontWeight: '700', color: '#888888' },
  liveSetRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: '#282828' 
  },
  liveSetRowChecked: { backgroundColor: 'rgba(48, 209, 88, 0.1)', borderRadius: 8 },
  liveSetNumberText: { width: 50, fontWeight: '700', color: '#FFFFFF' },
  liveSetInput: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: '#383838', 
    borderRadius: 8, 
    padding: 8, 
    textAlign: 'center', 
    fontWeight: '700',
    marginRight: 8,
    backgroundColor: '#252525',
    color: '#FFFFFF',
    fontSize: 15
  },
  checkCircle: { 
    width: 38, 
    height: 38, 
    borderRadius: 19, 
    borderWidth: 2, 
    borderColor: '#444444', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#252525' 
  },
  checkCircleActive: { backgroundColor: '#30D158', borderColor: '#30D158' },

  liveWorkoutHeaderV2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  powerSongQuickBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 214, 10, 0.15)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inWorkoutTopRowV2: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  headerAutoChessBtnV2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1917',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  restBannerV2: {
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.2,
  },
  liveExerciseCardV2: {
    borderRadius: 16,
    marginBottom: 10,
    marginHorizontal: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  liveExHeaderV2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  liveExHeaderLeftColV2: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    minWidth: 0,
  },
  liveExReorderColV2: {
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveExThumbWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.2,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveExThumbImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  liveExThumbPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveExThumbCamBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderTopLeftRadius: 5,
  },
  liveExTitleColV2: {
    flex: 1,
    marginLeft: 8,
    minWidth: 0,
    justifyContent: 'center',
  },
  liveExNameRowV2: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  liveExIndexV2: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 0.5,
  },
  liveExNameV2: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    flexWrap: 'wrap',
    lineHeight: 18,
  },
  liveExBadgesRowV2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  liveExCatBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 0.8,
  },
  liveExCatText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  liveExPrText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
  },
  liveExRightClusterV2: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  liveExActionRowV2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveSetAdjustBtnV2: {
    paddingHorizontal: 6,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  liveSetAdjustBtnTextV2: {
    fontSize: 10,
    fontWeight: '800',
  },
  liveMiniToolBtnV2: {
    paddingHorizontal: 5,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  liveMiniToolTextV2: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  liveMiniSquareBtnV2: {
    width: 26,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveToolBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4.5,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  liveToolBtnText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  livePinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  livePinInput: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 10.5,
    fontWeight: '600',
    paddingVertical: 2,
  },
  livePinRowV2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderBottomWidth: 1,
  },
  livePinInputV2: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 2,
  },
  liveSetsTableV2: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  liveSetTableHeaderV2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
  },
  liveHeaderColV2: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.4,
  },
  liveSetRowV2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 5,
  },
  liveSetRowCheckedV2: {
    backgroundColor: 'rgba(48, 209, 88, 0.08)',
  },
  setTagChipV2: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141820',
  },
  setTagChipTextV2: {
    fontSize: 11,
    fontWeight: '900',
  },
  liveSetInputV2: {
    height: 34,
    borderWidth: 1,
    borderRadius: 7,
    paddingVertical: 4,
    paddingHorizontal: 6,
    textAlign: 'center',
    fontWeight: '800',
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  liveGhostHintV2: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },
  checkCircleV2: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
  },
  checkCircleActiveV2: {
    backgroundColor: '#30D158',
    borderColor: '#30D158',
  },
  addSetFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
    marginTop: 2,
  },
  addSetFooterText: {
    fontSize: 10.5,
    fontWeight: '800',
  },

  // FULL-SCREEN PLAN EDITOR STYLES
  fullPageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  navCancelBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  navCancelText: { color: '#888888', fontSize: 15, fontWeight: '600' },
  navHeaderTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  navSaveBtn: { 
    backgroundColor: '#00D2FF', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 10 
  },
  navSaveBtnDisabled: { backgroundColor: '#2C2C2E', opacity: 0.5 },
  navSaveText: { color: '#000000', fontWeight: '800', fontSize: 13 },

  formSection: { marginTop: 20 },
  formSectionLabel: { fontSize: 11, fontWeight: '800', color: '#888888', letterSpacing: 0.5, marginBottom: 8 },
  fullPageInput: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  daysScroll: { flexDirection: 'row', marginTop: 4 },
  dayChip: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2E2E32',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
  },
  dayChipActive: { backgroundColor: '#00D2FF', borderColor: '#00D2FF' },
  dayChipText: { color: '#AAAAAA', fontWeight: '700', fontSize: 13 },
  dayChipTextActive: { color: '#000000', fontWeight: '800' },

  // Editor current exercises
  editorExerciseRow: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    flexDirection: 'row',
    alignItems: 'center',
  },
  editorExName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
  editorInputsRow: { flexDirection: 'row', alignItems: 'center' },
  editorInputItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  editorInputLabel: { fontSize: 11, color: '#888888', marginRight: 4 },
  editorNumInput: {
    backgroundColor: '#282828',
    color: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    width: 44,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 13,
  },
  editorActionButtons: { flexDirection: 'row', alignItems: 'center' },
  moveButtons: { flexDirection: 'column', marginRight: 8 },
  moveBtn: { padding: 4 },
  removeExBtn: { padding: 8 },

  // Exercise Library
  exerciseSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedCountBadge: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  selectedCountBadgeText: { color: '#00D2FF', fontWeight: '800', fontSize: 12 },

  categoryScroll: { flexDirection: 'row', marginBottom: 12 },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2E2E32',
  },
  categoryPillActive: { backgroundColor: '#30D158', borderColor: '#30D158' },
  categoryPillText: { color: '#888888', fontWeight: '700', fontSize: 12 },
  categoryPillTextActive: { color: '#000000', fontWeight: '800' },

  exerciseListCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  exerciseSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#252528',
  },
  exerciseSelectRowActive: { backgroundColor: 'rgba(0, 210, 255, 0.08)' },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#555558',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxActive: { backgroundColor: '#00D2FF', borderColor: '#00D2FF' },
  exerciseSelectName: { color: '#DDDDDD', fontSize: 15, fontWeight: '600' },
  categoryBadgeSmall: {
    backgroundColor: '#282828',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeSmallText: { fontSize: 10, fontWeight: '700', color: '#888888' },

  customAddCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  customAddTitle: { fontSize: 12, fontWeight: '700', color: '#888888', marginBottom: 8 },
  customRow: { flexDirection: 'row', alignItems: 'center' },
  customInput: {
    flex: 1,
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 10,
    padding: 10,
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 8,
  },
  customAddBtn: {
    backgroundColor: '#00D2FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  customAddBtnText: { color: '#000000', fontWeight: '800', fontSize: 13 },

  // CELEBRATION MODAL STYLES
  celebrationBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  celebrationCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    width: '100%',
    maxHeight: 520,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },
  celebrationScroll: {
    width: '100%',
  },
  celebrationScrollContent: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  trophyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 214, 10, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  celebrationTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
  celebrationSub: { fontSize: 13, color: '#888888', marginTop: 4, textAlign: 'center' },

  celebrationGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#252525',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  celebrationMetaCard: {
    width: '100%',
    backgroundColor: '#1E1E20',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  celebrationMetaLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#888888',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  celebrationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141416',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#303034',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  celebrationTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  celebrationFavoriteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252528',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#38383E',
  },
  celebrationFavoriteToggleActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: '#FFD700',
  },
  celebrationFavoriteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#CCCCCC',
  },
  celebrationMetric: { flex: 1, alignItems: 'center' },
  metricVal: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginTop: 4 },
  metricLabel: { fontSize: 10, fontWeight: '800', color: '#888888', marginTop: 2, letterSpacing: 0.5 },

  celebrationSetsBox: { marginTop: 14, alignItems: 'center' },
  celebrationSetsText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  celebrationSaveNotice: { fontSize: 12, color: '#00D2FF', marginTop: 4, fontWeight: '600' },

  // Scroll Down Indicator
  chartDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 18,
    marginBottom: 10,
  },
  chartDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#303035',
  },
  chartScrollHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.25)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginHorizontal: 8,
    gap: 4,
  },
  chartScrollHintText: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Spider / Radar Chart Container
  spiderChartContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#161618',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#2A2A2E',
    marginTop: 4,
  },
  spiderChartTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  spiderChartSubtitle: {
    color: '#888888',
    fontSize: 11,
    marginTop: 2,
    marginBottom: 6,
    textAlign: 'center',
  },
  spiderChartBox: {
    alignItems: 'center',
    width: '100%',
  },
  musclePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  musclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242428',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#36363C',
    gap: 6,
  },
  musclePillName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  musclePillCount: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyMuscleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
  },
  emptyMuscleNoticeText: {
    color: '#777777',
    fontSize: 11,
    fontWeight: '600',
  },

  celebrationCloseBtn: {
    backgroundColor: '#30D158',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#30D158',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  celebrationCloseBtnText: { color: '#000000', fontWeight: '900', fontSize: 16 },

  // CELEBRATION HR ROW
  celebrationHrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#252525',
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  celebrationHrItem: { alignItems: 'center' },
  celebrationHrVal: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginTop: 3 },
  celebrationHrLabel: { fontSize: 9, fontWeight: '800', color: '#888888', marginTop: 2, letterSpacing: 0.5 },
  celebrationHrDivider: { width: 1, height: 28, backgroundColor: '#383838' },

  // LIVE HR BAR
  liveHrBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  watchBadgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  watchBadgeDisconnected: {
    backgroundColor: '#1E1E1E',
    borderColor: '#2C2C2E',
  },
  connectWatchText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  tapToPairBadge: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  tapToPairText: { color: '#00D2FF', fontSize: 10, fontWeight: '800' },
  liveBpmNumber: { fontSize: 16, fontWeight: '900' },
  liveBpmUnit: { fontSize: 11, fontWeight: '700', color: '#888888' },
  hrZonePill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  hrZonePillText: { fontSize: 10, fontWeight: '800' },

  liveCaloriesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  liveCaloriesVal: { color: '#FF9500', fontSize: 13, fontWeight: '800' },

  // GALAXY WATCH 5 MODAL STYLES
  watchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  watchModalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 210, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchModalTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  watchModalSub: { fontSize: 12, color: '#888888', marginTop: 2 },
  watchCloseBtn: {
    backgroundColor: '#282828',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  watchStatusBox: {
    backgroundColor: '#252528',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#333333',
  },
  watchStatusBoxConnected: {
    borderColor: '#30D158',
    backgroundColor: '#1A241D',
  },
  statusDotLarge: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  watchStatusText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  batteryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  batteryText: { color: '#30D158', fontSize: 11, fontWeight: '700', marginLeft: 4 },

  liveWatchTelemetry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#161616',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 14,
    marginBottom: 14,
  },
  telemetryStat: { alignItems: 'center' },
  telemetryLabel: { fontSize: 10, fontWeight: '800', color: '#888888', letterSpacing: 0.5 },
  telemetryValue: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  telemetryUnit: { fontSize: 11, fontWeight: '700', color: '#888888' },
  telemetryDivider: { width: 1, height: 28, backgroundColor: '#2C2C2E' },

  watchStatusDesc: { fontSize: 13, color: '#AAAAAA', lineHeight: 18, marginTop: 8, marginBottom: 14 },

  watchToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  watchConnectActionBtn: { backgroundColor: '#00D2FF' },
  watchDisconnectBtn: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    borderWidth: 1,
    borderColor: '#FF453A',
  },
  watchToggleBtnText: { fontSize: 14, fontWeight: '800', color: '#000000' },

  watchGuideCard: {
    backgroundColor: '#1E1E20',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2E',
  },
  watchGuideTitle: { fontSize: 13, fontWeight: '800', color: '#00D2FF', marginBottom: 10 },
  watchGuideStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  stepNum: { fontSize: 13, fontWeight: '800', color: '#00D2FF', width: 20 },
  stepDesc: { flex: 1, fontSize: 12, color: '#CCCCCC', lineHeight: 17 },

  ironTacticsRewardCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    padding: 12,
    marginBottom: 16,
  },
  ironTacticsRewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ironTacticsRewardTitle: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  ironTacticsRewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ironTacticsRewardPill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#1C1C24',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 3,
  },
  ironTacticsRewardPillVal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  ironTacticsRewardPillLbl: {
    color: '#A0A0B0',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },

  // --- V2 CLEAN REDESIGN STYLES ---
  v2HeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginBottom: 14,
  },
  v2HeaderIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#161E26',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  v2ActiveProgramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  v2ActiveProgramPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#12202B',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.35)',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  v2ActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  v2ActiveProgramText: {
    color: '#00D2FF',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  v2AddSplitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  v2AddSplitBtnText: {
    color: '#30D158',
    fontSize: 13,
    fontWeight: '800',
  },
  v2HeroCard: {
    backgroundColor: '#161C22',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.28)',
    borderRadius: 20,
    padding: 15,
    marginBottom: 14,
  },
  v2HeroDayLabel: {
    color: '#8E9DA8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  v2HeroTitle: {
    color: '#00D2FF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  v2HeroSub: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  v2WeekCircleBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#11171D',
    borderWidth: 2,
    borderColor: 'rgba(0, 210, 255, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  v2WeekCircleVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  v2WeekCircleSub: {
    color: '#8E9DA8',
    fontSize: 9,
    fontWeight: '700',
  },
  v2HeroProgressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#222B33',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 10,
  },
  v2HeroProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  v2StatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  v2StatPill: {
    flex: 1,
    backgroundColor: '#12171C',
    borderWidth: 1,
    borderColor: '#232E38',
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  v2StatLabel: {
    color: '#8E9DA8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  v2StatVal: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  v2MiniBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#222B33',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 6,
  },
  v2MiniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  v2RecoveryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#12181F',
    borderWidth: 1,
    borderColor: '#263442',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  v2RecoveryBarLabel: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  v2RecoveryToggleText: {
    color: '#00D2FF',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 8,
  },
  v2RecoveryDrawer: {
    marginTop: 8,
    backgroundColor: '#11161C',
    borderWidth: 1,
    borderColor: '#23303C',
    borderRadius: 12,
    padding: 12,
  },
  v2RecoveryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  v2RecoveryGridItem: {
    width: '48%',
  },
  v2RecoveryMuscleName: {
    color: '#E5E7EB',
    fontSize: 11,
    fontWeight: '700',
  },
  v2RecoveryMuscleTime: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '500',
  },
  v2RecoveryMusclePct: {
    fontSize: 11,
    fontWeight: '800',
  },
  v2RecoveryBarTrack: {
    width: '100%',
    height: 5,
    backgroundColor: '#1E2730',
    borderRadius: 3,
    overflow: 'hidden',
  },
  v2RecoveryBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  v2ScheduleSubSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#25303B',
  },
  v2WeekDaysBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  v2DayPill: {
    flex: 1,
    backgroundColor: '#12171D',
    borderWidth: 1,
    borderColor: '#222C36',
    borderRadius: 11,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  v2DayPillActive: {
    backgroundColor: 'rgba(0, 210, 255, 0.16)',
    borderColor: '#00D2FF',
  },
  v2DayPillText: {
    color: '#8E9DA8',
    fontSize: 11,
    fontWeight: '800',
  },
  v2DayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  v2MultiPlanChip: {
    backgroundColor: '#12171D',
    borderWidth: 1,
    borderColor: '#263442',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  v2MultiPlanChipActive: {
    backgroundColor: '#00D2FF',
    borderColor: '#00D2FF',
  },
  v2MultiPlanChipText: {
    color: '#CCCCCC',
    fontSize: 11,
    fontWeight: '700',
  },
  v2ExerciseCard: {
    width: 128,
    backgroundColor: '#12171D',
    borderWidth: 1,
    borderColor: '#23303D',
    borderRadius: 13,
    padding: 10,
    justifyContent: 'space-between',
  },
  v2ExerciseCardName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  v2ExerciseCardSets: {
    color: '#00D2FF',
    fontSize: 12,
    fontWeight: '900',
  },
  v2ExerciseCardWeight: {
    color: '#8E9DA8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  v2RestDayNoticeBox: {
    backgroundColor: '#12171D',
    borderWidth: 1,
    borderColor: '#222C36',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  v2RestDayNoticeText: {
    color: '#8E9DA8',
    fontSize: 12,
    fontWeight: '600',
  },
  v2MainStartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00D2FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  v2MainStartBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },
  v2IconActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1B242D',
    borderWidth: 1,
    borderColor: '#2F3E4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  v2AssignDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1B242D',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.4)',
    borderRadius: 12,
    paddingVertical: 11,
  },
  v2AssignDayBtnText: {
    color: '#00D2FF',
    fontSize: 13,
    fontWeight: '800',
  },
  v2FreestyleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141C24',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.35)',
    borderRadius: 16,
    padding: 13,
    marginBottom: 14,
  },
  v2FreestyleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#00D2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  v2FreestyleTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  v2FreestyleSub: {
    color: '#8E9DA8',
    fontSize: 11,
    marginTop: 1,
  },
  v2FreestyleStartLink: {
    color: '#00D2FF',
    fontSize: 13,
    fontWeight: '900',
  },
  v2BottomTabsBar: {
    flexDirection: 'row',
    backgroundColor: '#13181E',
    borderWidth: 1,
    borderColor: '#222B34',
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
  },
  v2BottomTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  v2BottomTabBtnActive: {
    backgroundColor: '#00D2FF',
  },
  v2BottomTabText: {
    color: '#8E9DA8',
    fontSize: 12,
    fontWeight: '800',
  },
  v2BottomTabTextActive: {
    color: '#000000',
    fontWeight: '900',
  },
  v2CompactListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161C22',
    borderWidth: 1,
    borderColor: '#232E38',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  v2SmallDayTag: {
    backgroundColor: 'rgba(0, 210, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.35)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  v2SmallDayTagText: {
    color: '#00D2FF',
    fontSize: 10,
    fontWeight: '800',
  },
  v2CompactCardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  v2CompactCardSub: {
    color: '#8E9DA8',
    fontSize: 11,
    marginTop: 3,
  },
  v2SmallIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#1E2730',
    alignItems: 'center',
    justifyContent: 'center',
  },
  v2SmallStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00D2FF',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9,
  },
  v2SmallStartBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
  v2EmptyListBox: {
    backgroundColor: '#14191F',
    borderWidth: 1,
    borderColor: '#222B34',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  v2EmptyListText: {
    color: '#8E9DA8',
    fontSize: 12,
  },
  v2DashedAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 210, 255, 0.45)',
    borderRadius: 12,
    paddingVertical: 11,
    marginTop: 2,
  },
  v2DashedAddBtnText: {
    color: '#00D2FF',
    fontSize: 12,
    fontWeight: '800',
  },
  v2ProgramModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#13181E',
    borderWidth: 1,
    borderColor: '#242F3A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  v2ProgramModalItemActive: {
    backgroundColor: '#11222E',
    borderColor: 'rgba(0, 210, 255, 0.55)',
  },
  v2ActiveBadgeTiny: {
    backgroundColor: 'rgba(48, 209, 88, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  v2ActiveBadgeTinyText: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: '800',
  },

  // MODERN PROGRAM & PLAN EDITOR STYLES
  modernHeaderBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E24',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E2E38',
  },
  modernHeaderBackText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  modernHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modernHeaderSub: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  modernSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  modernSaveBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 13,
    marginLeft: 4,
  },
  modernSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionBullet: {
    width: 4,
    height: 14,
    borderRadius: 2,
    marginRight: 8,
  },
  modernSectionHeaderTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#AAAAAA',
    letterSpacing: 0.8,
  },
  modernInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modernInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modernDayChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernDayChipText: {
    fontSize: 12.5,
  },
  counterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  counterBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dragReorderHint: {
    color: '#777782',
    fontSize: 11.5,
    marginBottom: 10,
    marginTop: 2,
  },
  modernEmptyPlanCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  modernEmptyPlanTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  modernEmptyPlanSub: {
    color: '#888892',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  modernEditorCard: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  modernEditorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modernDragHandle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 8,
  },
  modernIndexBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 2,
  },
  modernIndexBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  modernEditorExName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modernSmallPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  modernSmallPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  modernTrashBtn: {
    padding: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernTargetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  modernTargetBox: {
    flex: 1,
    alignItems: 'center',
  },
  modernTargetLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#888892',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  modernTargetNumInput: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    paddingVertical: 2,
    textAlign: 'center',
    minWidth: 40,
  },
  targetDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modernSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modernSearchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modernHeaderActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  modernHeaderActionPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  swapContextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  swapContextTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  swapContextName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  swapContextDesc: {
    color: '#CCCCCC',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  modernSelectExCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  modernSelectExName: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  modernIconMiniBtn: {
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  modernSelectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modernSelectBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  modernDialogCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 22,
    width: '100%',
    maxWidth: 400,
  },
  modernDialogIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modernDialogTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  modernDialogSub: {
    color: '#8E8E93',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  modernDialogActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  modernDialogCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernDialogCancelText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '700',
  },
  modernDialogSubmitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernDialogSubmitText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },
  modernPlanTopActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 4,
  },
  modernTopAddBtn: {
    flex: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 7,
  },
  modernTopAddBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  modernTopCreateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  modernTopCreateBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  modernMiniAddPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  modernMiniAddPillText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  modernEmptyActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  modernEmptyActionBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  planPickerOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
  },
  planPickerBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  planPickerDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  planPickerDoneBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
