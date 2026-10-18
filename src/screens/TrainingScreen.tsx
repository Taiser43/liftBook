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
  ScrollView as NativeScrollView
} from 'react-native';
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
import { PRELOADED_EXERCISES, PreloadedExercise, RADAR_GROUPS, DAYS_OF_WEEK } from '../data/exercises';
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
import { 
  showActiveWorkoutNotification, 
  hideActiveWorkoutNotification,
  scheduleRestNotification,
  cancelRestNotification
} from '../services/notificationService';

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

export default function TrainingScreen({ route, navigation }: any) {
  const bottomSpacing = useBottomSpacing();
  const insets = useSafeAreaInsets();
  const maxHeartRateSetting = useCardioStore(state => state.maxHeartRateSetting);
  const { powerSong, currentSongId, currentPlaylistId, playlists: musicPlaylists, currentQueueSong } = useMusicStore();
  const currentMusicPlaylist = musicPlaylists?.find(p => p.id === currentPlaylistId);
  const hasActiveSong = !!(currentQueueSong || currentMusicPlaylist?.songs?.some(s => s.id === currentSongId));
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
  
  // Folder Navigation State
  const [viewingProgramId, setViewingProgramId] = useState<string | null>(null);
  const [programEditorModalVisible, setProgramEditorModalVisible] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');

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
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Monday']);
  const [editorExercises, setEditorExercises] = useState<Exercise[]>([]);
  const [editorInputValues, setEditorInputValues] = useState<Record<string, { sets: string; reps: string; weight: string }>>({});
  const [filterCategory, setFilterCategory] = useState<BodyPart>('All');
  const [searchQuery, setSearchQuery] = useState("");
  const [managerVisible, setManagerVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any>(null);
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
  // Live Workout State from Persistent Store
  const {
    activePlan, setActivePlan,
    workoutStartTime, setWorkoutStartTime,
    liveExercises, setLiveExercises,
    setLogs, setSetLogs,
    unilateralExercises: unilateralArr, setUnilateralExercises: setUnilateralArr,
    restEndTime, setRestEndTime
  } = useLiveWorkoutStore();

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
    setCustomExerciseInput('');
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
    setCustomExerciseInput('');
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

    if (!viewingProgramId) {
      showCustomAlert("Error", "No program selected.");
      return;
    }

    const activeProgram = workoutPrograms.find(p => p.id === viewingProgramId);
    if (!activeProgram) return;

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
                fill="rgba(0, 210, 255, 0.28)"
                stroke="#00D2FF"
                strokeWidth={2.5}
              />
              {/* Vertex Dots */}
              {dataVertices.map((v, idx) => (
                <Circle
                  key={idx}
                  cx={v.x}
                  cy={v.y}
                  r={v.count > 0 ? 4.5 : 2.5}
                  fill={v.count > 0 ? "#00D2FF" : "#555555"}
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
                  fill={count > 0 ? '#00D2FF' : '#8E8E93'}
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
  const activeProgramData = workoutPrograms.find(p => p.id === viewingProgramId);
  const currentWorkouts = activeProgramData?.workouts || [];
  
  // A workout is "unassigned" if it has no daysOfWeek array or it's empty
  const assignedWorkouts = currentWorkouts.filter(w => Array.isArray(w.daysOfWeek) && w.daysOfWeek.length > 0);
  const unassignedWorkouts = currentWorkouts.filter(w => !Array.isArray(w.daysOfWeek) || w.daysOfWeek.length === 0);

  const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const currentDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

  const allExercises = [...PRELOADED_EXERCISES, ...(customExercises || [])]
    .filter(ex => !(hiddenExercises || []).includes(ex.name));
  
  const displayedExercises = allExercises.filter(ex => {
    if (filterEquip !== 'All' && (ex as any).equipmentType !== filterEquip) return false;
    const matchesCategory = filterCategory === 'All' || ex.category === filterCategory;
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderPlanCard = (item: WorkoutPlan, keySuffix: string = '') => {
    const days = Array.isArray(item.daysOfWeek) && item.daysOfWeek.length > 0 
      ? item.daysOfWeek 
      : [];

    return (
      <View key={`${item.id}_${keySuffix}`} style={styles.planCard}>
        <View style={styles.planCardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.planName}>{item.name}</Text>
            </View>

            {/* Days Chips */}
            <View style={styles.planDaysRow}>
              {days.map(d => (
                <View key={d} style={styles.planDayBadge}>
                  <Text style={styles.planDayBadgeText}>{d.substring(0, 3)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Delete Icon */}
          <TouchableOpacity 
            style={styles.trashBtn}
            onPress={() => handleDeletePlan(item)}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FF453A" />
          </TouchableOpacity>
        </View>

        <View style={styles.planCardFooter}>
          <Text style={styles.planSub}>
            <MaterialCommunityIcons name="dumbbell" size={14} color="#777777" /> {item.exercises ? item.exercises.length : 0} Exercises
          </Text>

          <View style={styles.planActionButtons}>
            {/* Edit Plan Button */}
            <TouchableOpacity 
              style={styles.editPlanBtn}
              onPress={() => handleOpenEditPlan(item)}
            >
              <MaterialCommunityIcons name="pencil" size={16} color="#00D2FF" />
              <Text style={styles.editPlanBtnText}>Edit</Text>
            </TouchableOpacity>

            {/* Start Live Workout Button */}
            <TouchableOpacity 
              style={styles.startPlanBtn}
              activeOpacity={0.8}
              onPress={() => handleStartLiveWorkout(item)}
            >
              <MaterialCommunityIcons name="play" size={18} color="#000000" />
              <Text style={styles.startPlanBtnText}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const handleTriggerPowerSong = async () => {
    if (!powerSong) return;
    const { playlists, setCurrentSong } = useMusicStore.getState();
    const playlist = playlists.find(p => p.id === powerSong.playlistId);
    if (!playlist) return;
    const song = playlist.songs.find(s => s.id === powerSong.songId);
    if (!song) return;

    // Set the current song in the store, which will trigger MediaPlayerWidget to load it
    setCurrentSong(powerSong.playlistId, powerSong.songId);
    
    // Once it loads, MediaPlayerWidget will auto-play it. 
    // To seek to the specific start position, we skip ahead using TrackPlayer directly.
    setTimeout(async () => {
      try {
        await TrackPlayer.seekTo(powerSong.startPosition);
      } catch (e) {
        // player might not be fully ready, ignore
      }
    }, 1000); // 1s delay to let the song load
  };

  const handleSelectExerciseForLiveWorkout = (selectedEx: any) => {
    if (swapExerciseIndex !== null) {
      const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      if (swapExerciseIndex === -1) {
        // Add brand new exercise to Live Workout
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
        // Swap existing exercise
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

        // Initialize with smart defaults per set for the swapped exercise
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

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top + 8, 28) }]}>
      {/* Top Header */}
      {viewingProgramId ? (
        <View style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <View>
              <TouchableOpacity onPress={() => setViewingProgramId(null)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="chevron-back" size={20} color="#00D2FF" />
                <Text style={{ color: '#00D2FF', fontSize: 16, fontWeight: '600', marginLeft: 4 }}>Back to Programs</Text>
              </TouchableOpacity>
              <Text style={styles.header}>{activeProgramData?.name || 'Program'}</Text>
              <Text style={styles.subHeader}>Program Workouts & Weekly Schedule</Text>
            </View>
            <TouchableOpacity 
              style={styles.addPlanIconButton}
              activeOpacity={0.8}
              onPress={() => handleOpenCreatePlan()}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#00D2FF" />
              <Text style={styles.addPlanText}>New Day</Text>
            </TouchableOpacity>
          </View>

          <ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomSpacing }}>
            {/* WEEKLY SCHEDULE: MONDAY TO SUNDAY */}
            {WEEK_DAYS.map(day => {
              const isToday = day.toLowerCase() === currentDayName.toLowerCase();
              const plansForDay = assignedWorkouts.filter(p => p.daysOfWeek.some(d => d.toLowerCase() === day.toLowerCase()));

              return (
                <View key={day} style={styles.daySectionContainer}>
                  <View style={styles.daySectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.daySectionTitle, isToday && styles.daySectionTitleToday]}>
                        {day.toUpperCase()}
                      </Text>
                      {isToday && (
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>TODAY</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.dayStatusPill, plansForDay.length === 0 ? styles.dayStatusRest : styles.dayStatusWorkout]}>
                      <Text style={[styles.dayStatusText, plansForDay.length === 0 ? { color: '#888888' } : { color: '#30D158' }]}>
                        {plansForDay.length === 0 ? 'Rest Day' : `${plansForDay.length} Active Plan${plansForDay.length > 1 ? 's' : ''}`}
                      </Text>
                    </View>
                  </View>

                  {plansForDay.length > 0 ? (
                    plansForDay.map(plan => renderPlanCard(plan, day))
                  ) : (
                    <View style={styles.restDayCard}>
                      <View style={styles.restDayIconCircle}>
                        <MaterialCommunityIcons name="sleep" size={22} color="#888888" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.restDayTitle}>Scheduled Rest Day</Text>
                        <Text style={styles.restDaySubtitle}>Recovery & Muscle Growth • Take time to recharge</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.assignWorkoutBtn}
                        activeOpacity={0.8}
                        onPress={() => handleOpenCreatePlan(day)}
                      >
                        <MaterialCommunityIcons name="plus" size={16} color="#00D2FF" />
                        <Text style={styles.assignWorkoutBtnText}>Assign</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}

            {/* UNASSIGNED WORKOUTS AT THE VERY BOTTOM */}
            {unassignedWorkouts.length > 0 && (
              <View style={styles.inactiveSectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: '#777777' }]}>
                    UNASSIGNED WORKOUT DAYS ({unassignedWorkouts.length})
                  </Text>
                </View>
                {unassignedWorkouts.map(plan => renderPlanCard(plan, 'unassigned'))}
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.header}>Training Programs</Text>
              <Text style={styles.subHeader}>Select a program to view its workouts</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity 
                style={{ marginRight: 12, backgroundColor: 'rgba(0, 210, 255, 0.1)', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => navigation.navigate('WorkoutHistory' as never)}
              >
                <MaterialCommunityIcons name="history" size={24} color="#00D2FF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.addPlanIconButton}
                activeOpacity={0.8}
                onPress={() => {
                  setNewProgramName('');
                  setProgramEditorModalVisible(true);
                }}
              >
                <MaterialCommunityIcons name="folder-plus" size={20} color="#00D2FF" />
                <Text style={styles.addPlanText}>New</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView enableOnAndroid={true} extraScrollHeight={20} keyboardShouldPersistTaps="handled" style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
            
            {/* Spontaneous Workout Section */}
            <TouchableOpacity 
              style={{ backgroundColor: 'rgba(0, 210, 255, 0.1)', borderWidth: 1, borderColor: '#00D2FF', borderRadius: 16, padding: 20, marginBottom: 24, flexDirection: 'row', alignItems: 'center' }}
              activeOpacity={0.8}
              onPress={() => setFreestyleNameModalVisible(true)}
            >
              <View style={{ backgroundColor: '#00D2FF', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                <MaterialCommunityIcons name="lightning-bolt" size={24} color="#000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>Freestyle Workout</Text>
                <Text style={{ color: '#00D2FF', fontSize: 13, marginTop: 4 }}>Start an empty workout & add exercises on the fly</Text>
              </View>
            </TouchableOpacity>

            {spontaneousWorkouts && spontaneousWorkouts.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>Saved Freestyle Workouts</Text>
                {spontaneousWorkouts.map(plan => (
                  <TouchableOpacity
                    key={plan.id}
                    style={[styles.planCard, { backgroundColor: '#1E1E1E', borderColor: '#333' }]}
                    onPress={() => handleStartLiveWorkout(plan, false)}
                  >
                    <View style={styles.planCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.planCardTitle}>{plan.name}</Text>
                        <Text style={styles.planCardSub}>{plan.exercises.length} Exercises</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.playButton, { backgroundColor: '#333', marginLeft: 8 }]}
                        onPress={() => {
                          useAppStore.getState().deleteSpontaneousWorkout(plan.id);
                        }}
                      >
                        <MaterialCommunityIcons name="trash-can" size={20} color="#FF453A" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.playButton, { backgroundColor: '#00D2FF', marginLeft: 8 }]}
                        onPress={() => handleStartLiveWorkout(plan, true)}
                      >
                        <MaterialCommunityIcons name="play" size={20} color="#000" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>Training Programs</Text>

            {workoutPrograms.length === 0 && (
              <View style={styles.noInactiveBox}>
                <Text style={styles.noInactiveText}>No training programs. Create one to get started.</Text>
              </View>
            )}
            {workoutPrograms.map(prog => (
              <TouchableOpacity
                key={prog.id}
                style={[styles.planCard, !prog.isActive && { opacity: 0.6 }]}
                onPress={() => setViewingProgramId(prog.id)}
              >
                <View style={styles.planCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planCardTitle}>{prog.name}</Text>
                    <Text style={styles.planCardSub}>{prog.workouts.length} Workout Days</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.playButton, !prog.isActive && { backgroundColor: '#333' }]}
                    onPress={() => toggleProgramActive(prog.id)}
                  >
                    <MaterialCommunityIcons 
                      name={prog.isActive ? 'pause' : 'play'} 
                      size={20} 
                      color={prog.isActive ? '#00D2FF' : '#888'} 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.playButton, { backgroundColor: '#333', marginLeft: 8 }]}
                    onPress={() => {
                      showCustomAlert(
                        "Delete Program",
                        `Delete "${prog.name}" and all its workouts?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: () => deleteWorkoutProgram(prog.id) }
                        ]
                      )
                    }}
                  >
                    <MaterialCommunityIcons name="trash-can" size={20} color="#FF453A" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* NEW PROGRAM MODAL */}
      <Modal
        visible={programEditorModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setProgramEditorModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Training Program</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Bulk 2026, Summer Cut"
              placeholderTextColor="#555"
              value={newProgramName}
              onChangeText={setNewProgramName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: '#333' }]} 
                onPress={() => setProgramEditorModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalBtn} 
                onPress={() => {
                  if (newProgramName.trim()) {
                    addWorkoutProgram({
                      id: Date.now().toString(),
                      name: newProgramName.trim(),
                      isActive: true,
                      workouts: []
                    });
                    setProgramEditorModalVisible(false);
                  }
                }}
              >
                <Text style={styles.modalBtnText}>Create</Text>
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
          { paddingTop: Math.max(insets.top + 10, 36) },
          (isWatchConnected && heartRate > 0) && {
            borderWidth: 4,
            borderColor: getHeartRateZoneColor(heartRate, maxHeartRateSetting) || 'transparent',
            shadowColor: getHeartRateZoneColor(heartRate, maxHeartRateSetting) || 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 15,
            elevation: 10,
          }
        ]}>
          {/* Live Workout Top Bar */}
          <View style={styles.liveWorkoutHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={{ paddingRight: 12 }}
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
                  size={28} 
                  color="#00D2FF" 
                />
              </TouchableOpacity>
              <View>
                <Text style={styles.liveWorkoutPlanTitle}>{activePlan?.name}</Text>
                {workoutStartTime !== null ? (
                  <View style={styles.liveStopwatchRow}>
                    <View style={styles.pulsingDot} />
                    <Text style={styles.liveStopwatchText}>{formatTime(workoutDuration)}</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <MaterialCommunityIcons name="eye-outline" size={13} color="#888" style={{ marginRight: 4 }} />
                    <Text style={{ color: '#888', fontSize: 12, fontWeight: '600' }}>Vorschau • Nicht gestartet</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {powerSong && (
              <TouchableOpacity 
                style={[styles.finishWorkoutButton, { backgroundColor: 'rgba(255, 214, 10, 0.2)', marginRight: 10, paddingHorizontal: 10 }]}
                onPress={handleTriggerPowerSong}
              >
                <MaterialCommunityIcons name="lightning-bolt" size={20} color="#FFD60A" />
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
                <MaterialCommunityIcons name="play" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.finishWorkoutButtonText}>Start</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.finishWorkoutButton}
                onPress={() => {
                  if (!activePlan) return;
                  handleFinishLiveWorkout(false); // Removed the second param, it doesn't matter anymore
                }}
              >
                <MaterialCommunityIcons name="flag-checkered" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.finishWorkoutButtonText}>Finish</Text>
              </TouchableOpacity>
            )}
            </View>
          </View>

          {/* Top In-Workout Bar: MP3 Player & Iron Tactics Quick Launch */}
          <View style={styles.inWorkoutTopRow}>
            {hasActiveSong ? (
              <View style={{ flex: 1, marginRight: musicExpanded ? 0 : 8 }}>
                <InWorkoutMusicWidget 
                  onExpandChange={(exp) => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setMusicExpanded(exp);
                  }}
                />
              </View>
            ) : null}

            {(!musicExpanded || !hasActiveSong) && (
              <TouchableOpacity
                style={[
                  styles.headerAutoChessBtn,
                  !hasActiveSong && { flex: 1 }
                ]}
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
                    <Text style={{ fontSize: 16 }}>♟️</Text>
                  </View>
                  <View style={{ marginLeft: 8, justifyContent: 'center' }}>
                    <Text style={styles.headerAutoChessTitle}>Iron Tactics</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                      <WeightPlateIcon size={13} color="#FFD700" />
                      <Text style={styles.headerAutoChessCoins}>{autoChessCoins}</Text>
                      {autoChessPendingBonus > 0 && (
                        <View style={styles.headerAutoChessBonusBadge}>
                          <Text style={styles.headerAutoChessBonusText}>⭐+{autoChessPendingBonus}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={16} color="#FFD700" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}
          </View>

          {/* 3-Minute Rest Countdown Banner */}
          {restTimeLeft !== null && (
            <View style={styles.restBanner}>
              <View style={styles.restBannerInfo}>
                <View style={styles.restTimerIconCircle}>
                  <MaterialCommunityIcons name="timer-outline" size={24} color="#30D158" />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.restBannerTitle}>REST COUNTDOWN</Text>
                  <Text style={styles.restBannerClock}>{formatTime(restTimeLeft)}</Text>
                </View>
              </View>
              <View style={styles.restBannerActions}>
                <TouchableOpacity 
                  style={styles.restActionButton} 
                  onPress={() => {
                    setRestTimeLeft(prev => (prev ? prev + 30 : 30));
                    setRestEndTime(prev => (prev ? prev + 30000 : Date.now() + 30000));
                  }}
                >
                  <Text style={styles.restActionText}>+30s</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.restActionButton, { backgroundColor: '#333333' }]} 
                  onPress={() => {
                    setRestTimeLeft(null);
                    setRestEndTime(null);
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
              return (
                <View key={ex.id} style={styles.liveExerciseCard}>
                  <View style={styles.liveExerciseHeader}>
                    <View style={{ marginRight: 6 }}>
                      <TouchableOpacity 
                        onPress={() => {
                          if (exIdx > 0) {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            const newEx = [...liveExercises];
                            [newEx[exIdx - 1], newEx[exIdx]] = [newEx[exIdx], newEx[exIdx - 1]];
                            setLiveExercises(newEx);
                          }
                        }}
                        hitSlop={{ top: 10, bottom: 5, left: 10, right: 10 }}
                      >
                        <MaterialCommunityIcons name="chevron-up" size={20} color={exIdx === 0 ? "#333333" : "#00D2FF"} />
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
                        hitSlop={{ top: 5, bottom: 10, left: 10, right: 10 }}
                      >
                        <MaterialCommunityIcons name="chevron-down" size={20} color={exIdx === liveExercises.length - 1 ? "#333333" : "#00D2FF"} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.liveExerciseIndex}>{exIdx + 1}.</Text>
                    <Text style={styles.liveExerciseName}>{ex.name}</Text>
                    <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                      <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                        <TouchableOpacity 
                          style={[styles.addSetPill, { marginRight: 6, backgroundColor: 'rgba(255, 69, 58, 0.15)', paddingHorizontal: 8 }]}
                          onPress={() => {
                            Alert.alert(
                              "Remove Exercise",
                              `Remove ${ex.name} from this workout?`,
                              [
                                { text: "Cancel", style: "cancel" },
                                { text: "Remove", style: "destructive", onPress: () => {
                                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                  setLiveExercises(liveExercises.filter((_, i) => i !== exIdx));
                                }}
                              ]
                            );
                          }}
                        >
                          <MaterialCommunityIcons name="delete" size={14} color="#FF453A" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.addSetPill, { marginRight: 6 }]}
                          onPress={() => setSwapExerciseIndex(exIdx)}
                        >
                          <MaterialCommunityIcons name="swap-horizontal" size={14} color="#00D2FF" />
                          <Text style={styles.addSetPillText}>Swap</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.addSetPill}
                          onPress={() => handleAddLiveSet(ex.id)}
                        >
                          <MaterialCommunityIcons name="plus" size={14} color="#00D2FF" />
                          <Text style={styles.addSetPillText}>Set</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity 
                          style={[styles.addSetPill, { marginRight: 6, backgroundColor: isUnilateral ? 'rgba(0, 210, 255, 0.2)' : '#282828' }]}
                          onPress={() => toggleUnilateral(ex.id)}
                        >
                          <MaterialCommunityIcons name="arrow-split-vertical" size={14} color={isUnilateral ? "#00D2FF" : "#888888"} />
                          <Text style={[styles.addSetPillText, { color: isUnilateral ? "#00D2FF" : "#888888" }]}>Uni</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.addSetPill}
                          onPress={() => handleRemoveLiveSet(ex.id)}
                        >
                          <MaterialCommunityIcons name="minus" size={14} color="#00D2FF" />
                          <Text style={styles.addSetPillText}>Set</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Set Table Header */}
                  <View style={styles.liveSetTableHeader}>
                    <Text style={[styles.liveHeaderCol, { width: 45 }]}>SET</Text>
                    <Text style={[styles.liveHeaderCol, { flex: 1 }]}>WEIGHT (KG)</Text>
                    <Text style={[styles.liveHeaderCol, { flex: 1.2 }]}>{isUnilateral ? 'REPS (L | R)' : 'REPS'}</Text>
                    <Text style={[styles.liveHeaderCol, { width: 44, textAlign: 'center' }]}>DONE</Text>
                  </View>

                  {/* Set Rows */}
                  {Array.from({ length: count }).map((_, setIndex) => {
                    const logKey = `${ex.id}_${setIndex}`;
                    const setDefaults = getSmartSetDefaults(ex, setIndex);
                    const log = setLogs[logKey] || { 
                      weight: setDefaults.weight.toString(), 
                      reps: setDefaults.reps.toString(), 
                      repsRight: (setDefaults.repsRight !== undefined ? setDefaults.repsRight : setDefaults.reps).toString(),
                      checked: false 
                    };

                    return (
                      <View 
                        key={setIndex} 
                        style={[
                          styles.liveSetRow, 
                          log.checked && styles.liveSetRowChecked
                        ]}
                      >
                        <Text style={[styles.liveSetNumberText, log.checked && { color: '#30D158' }]}>
                          {setIndex + 1}
                        </Text>
                        <TextInput 
                          style={[styles.liveSetInput, { marginRight: 8 }]} 
                          keyboardType="numeric"
                          value={log.weight}
                          onChangeText={(val) => updateSetLog(ex.id, setIndex, 'weight', val)} 
                        />
                        {isUnilateral ? (
                          <View style={{ flex: 1.2, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <TextInput 
                              style={[styles.liveSetInput, { flex: 1, marginRight: 4, textAlign: 'center' }]} 
                              keyboardType="numeric"
                              value={log.reps}
                              onChangeText={(val) => updateSetLog(ex.id, setIndex, 'reps', val)} 
                            />
                            <TextInput 
                              style={[styles.liveSetInput, { flex: 1, marginLeft: 4, textAlign: 'center' }]} 
                              keyboardType="numeric"
                              value={log.repsRight ?? log.reps}
                              onChangeText={(val) => updateSetLog(ex.id, setIndex, 'repsRight', val)} 
                            />
                          </View>
                        ) : (
                          <TextInput 
                            style={[styles.liveSetInput, { flex: 1.2 }]} 
                            keyboardType="numeric"
                            value={log.reps}
                            onChangeText={(val) => updateSetLog(ex.id, setIndex, 'reps', val)} 
                          />
                        )}
                        <TouchableOpacity 
                          style={[
                            styles.checkCircle, 
                            log.checked && styles.checkCircleActive
                          ]} 
                          onPress={() => handleCheckSet(ex.id, setIndex)}
                        >
                          <MaterialCommunityIcons 
                            name="check" 
                            size={20} 
                            color={log.checked ? "#000000" : "#555555"} 
                          />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              );
            })}

            <TouchableOpacity 
              style={[styles.addSetPill, { alignSelf: 'center', marginVertical: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: 'rgba(0, 210, 255, 0.15)' }]}
              onPress={() => setSwapExerciseIndex(-1)}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#00D2FF" style={{ marginRight: 8 }} />
              <Text style={[styles.addSetPillText, { fontSize: 16 }]}>Add Exercise to Workout</Text>
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

            {/* Swap Exercise Modal */}
          <Modal
            visible={swapExerciseIndex !== null}
            animationType="slide"
            presentationStyle="formSheet"
            onRequestClose={() => setSwapExerciseIndex(null)}
          >
            <View style={[styles.fullPageModal, { paddingTop: Math.max(insets.top + 10, 36) }]}>
              <View style={styles.fullPageHeader}>
                <TouchableOpacity onPress={() => setSwapExerciseIndex(null)}>
                  <Text style={styles.navCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.navHeaderTitle}>Swap Exercise</Text>
                <TouchableOpacity 
                  style={{ width: 60, alignItems: 'flex-end', justifyContent: 'center' }}
                  onPress={() => {
                    setEditingExercise(null);
                    setManagerVisible(true);
                  }}
                >
                  <MaterialCommunityIcons name="plus" size={28} color="#00D2FF" />
                </TouchableOpacity>
              </View>
              <ScrollView 
                nestedScrollEnabled={true} 
                enableOnAndroid={true} 
                extraScrollHeight={20} 
                keyboardShouldPersistTaps="handled" 
                keyboardDismissMode="on-drag"
                enableResetScrollToCoords={false}
                style={{ padding: 16 }} 
                contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
              >
                {/* Search Bar */}
                <View style={[styles.formSection, { marginBottom: 16 }]}>
                  <TextInput 
                    style={styles.fullPageInput}
                    placeholder="Search exercises..."
                    placeholderTextColor="#666666"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                {/* Filters */}
                <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'].map(cat => (
                    <TouchableOpacity 
                      key={cat}
                      style={[styles.categoryPill, filterCategory === cat && styles.categoryPillActive]}
                      onPress={() => setFilterCategory(cat as BodyPart)}
                    >
                      <Text style={[styles.categoryPillText, filterCategory === cat && styles.categoryPillTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </GHScrollView>
                <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
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

                {displayedExercises.map((ex, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.exerciseSelectRow}
                    onPress={() => handleSelectExerciseForLiveWorkout(ex)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exerciseSelectName}>{ex.name}</Text>
                      {((ex as any).equipmentType || (ex as any).brand) && (
                        <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                          {[((ex as any).brand && (ex as any).brand !== 'Keine') ? (ex as any).brand : null, (ex as any).equipmentType].filter(Boolean).join(' • ')}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity 
        style={{ padding: 8, marginRight: 8 }}
        onPress={(e) => {
           e.stopPropagation();
           setEditingExercise(ex);
           setManagerVisible(true);
        }}
      >
        <MaterialCommunityIcons name="pencil" size={18} color="#888" />
      </TouchableOpacity>
                    <View style={styles.categoryBadgeSmall}>
                      <Text style={styles.categoryBadgeSmallText}>{ex.category}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Modal>

          {/* Program Editor Modal */}
          <Modal
            visible={editorModalVisible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => setEditorModalVisible(false)}
          >
            <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.fullPageModal, { paddingTop: Math.max(insets.top + 10, 36) }]}>
              <View style={styles.fullPageHeader}>
                <TouchableOpacity onPress={() => setEditorModalVisible(false)}>
                  <Text style={styles.navCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.navHeaderTitle}>Edit Program</Text>
                <TouchableOpacity onPress={handleSavePlan}>
                  <MaterialCommunityIcons name="content-save" size={26} color="#00D2FF" />
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
                  <View style={{ paddingBottom: 20 }}>
                    <View style={styles.formSection}>
                      <Text style={styles.formSectionLabel}>PROGRAM NAME</Text>
                      <TextInput 
                        style={styles.fullPageInput}
                        placeholder="e.g. Push, Pull, Legs"
                        placeholderTextColor="#666"
                        value={planName}
                        onChangeText={setPlanName}
                      />
                    </View>
                    <View style={styles.formSection}>
                      <Text style={styles.formSectionLabel}>TRAINING DAYS</Text>
                      <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                          <GHTouchableOpacity 
                            key={day}
                            style={[styles.categoryPill, selectedDays.includes(day) && styles.categoryPillActive, { marginRight: 8 }]}
                            onPress={() => handleToggleDay(day)}
                          >
                            <Text style={[styles.categoryPillText, selectedDays.includes(day) && styles.categoryPillTextActive]}>
                              {day.substring(0, 3)}
                            </Text>
                          </GHTouchableOpacity>
                        ))}
                      </GHScrollView>
                    </View>
                    {editorExercises.length > 0 && (
                      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                        <Text style={styles.formSectionLabel}>CURRENT EXERCISES IN PLAN ({editorExercises.length})</Text>
                      </View>
                    )}
                  </View>
                }
                renderItem={({ item: ex, drag, isActive, getIndex }) => {
                  const idx = getIndex() || 0;
                  return (
                    <ScaleDecorator>
                      <View style={[styles.editorExerciseRow, isActive && { backgroundColor: '#2C2C2E' }]}>
                        <TouchableOpacity 
                          onLongPress={drag} 
                          disabled={isActive} 
                          style={{ padding: 12, justifyContent: 'center' }}
                        >
                          <MaterialCommunityIcons name="drag" size={28} color={isActive ? "#00D2FF" : "#555"} />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 8 }}>
                            <Text style={[styles.editorExName, { flex: 1, marginRight: 6 }]} numberOfLines={1}>{idx + 1}. {ex.name}</Text>
                            <TouchableOpacity 
                              style={[styles.addSetPill, { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: ex.isUnilateral ? 'rgba(0, 210, 255, 0.2)' : '#282828' }]}
                              onPress={() => {
                                setEditorExercises(prev => prev.map(e => e.id === ex.id ? { ...e, isUnilateral: !e.isUnilateral } : e));
                              }}
                            >
                              <MaterialCommunityIcons name="arrow-split-vertical" size={12} color={ex.isUnilateral ? "#00D2FF" : "#888"} />
                              <Text style={[styles.addSetPillText, { fontSize: 10, color: ex.isUnilateral ? "#00D2FF" : "#888", marginLeft: 2 }]}>Uni</Text>
                            </TouchableOpacity>
                          </View>
                          <View style={styles.editorInputsRow}>
                            <View style={styles.editorInputItem}>
                              <Text style={styles.editorInputLabel}>Sets</Text>
                              <TextInput 
                                style={styles.editorNumInput}
                                keyboardType="numeric"
                                placeholder="3"
                                placeholderTextColor="#555555"
                                value={editorInputValues[ex.id]?.sets !== undefined ? editorInputValues[ex.id].sets : (ex.sets ?? 3).toString()}
                                onChangeText={(val) => updateEditorExerciseTarget(ex.id, 'sets', val)}
                              />
                            </View>
                            <View style={styles.editorInputItem}>
                              <Text style={styles.editorInputLabel}>Reps</Text>
                              <TextInput 
                                style={styles.editorNumInput}
                                keyboardType="numeric"
                                placeholder="10"
                                placeholderTextColor="#555555"
                                value={editorInputValues[ex.id]?.reps !== undefined ? editorInputValues[ex.id].reps : (ex.reps ?? 10).toString()}
                                onChangeText={(val) => updateEditorExerciseTarget(ex.id, 'reps', val)}
                              />
                            </View>
                            <View style={styles.editorInputItem}>
                              <Text style={styles.editorInputLabel}>Weight (kg)</Text>
                              <TextInput 
                                style={styles.editorNumInput}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#555555"
                                value={editorInputValues[ex.id]?.weight !== undefined ? editorInputValues[ex.id].weight : (ex.weight ?? 0).toString()}
                                onChangeText={(val) => updateEditorExerciseTarget(ex.id, 'weight', val)}
                              />
                            </View>
                          </View>
                        </View>
                        <View style={styles.editorActionButtons}>
                          <View style={styles.moveButtons}>
                            <TouchableOpacity 
                              style={styles.moveBtn}
                              onPress={() => moveEditorExercise(idx, -1)}
                              disabled={idx === 0}
                            >
                              <Ionicons name="chevron-up" size={20} color={idx === 0 ? "#555" : "#0A84FF"} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.moveBtn}
                              onPress={() => moveEditorExercise(idx, 1)}
                              disabled={idx === editorExercises.length - 1}
                            >
                              <Ionicons name="chevron-down" size={20} color={idx === editorExercises.length - 1 ? "#555" : "#0A84FF"} />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity 
                            style={styles.removeExBtn}
                            onPress={() => {
                              setEditorExercises(prev => prev.filter(e => e.id !== ex.id));
                              setEditorInputValues(prev => {
                                const newVals = { ...prev };
                                delete newVals[ex.id];
                                return newVals;
                              });
                            }}
                          >
                            <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FF453A" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </ScaleDecorator>
                  );
                }}
                ListFooterComponent={
                  <View>
                    <View style={styles.formSection}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.formSectionLabel}>ADD EXERCISES FROM LIBRARY</Text>
                      </View>

                      {/* Search Bar */}
                      <View style={[styles.formSection, { marginBottom: 16, marginTop: 8 }]}>
                        <TextInput 
                          style={styles.fullPageInput}
                          placeholder="Search exercises..."
                          placeholderTextColor="#666666"
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                        />
                      </View>

                      {/* Filters */}
                      <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                        {['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'].map(cat => (
                          <TouchableOpacity 
                            key={cat}
                            style={[styles.categoryPill, filterCategory === cat && styles.categoryPillActive]}
                            onPress={() => setFilterCategory(cat as BodyPart)}
                          >
                            <Text style={[styles.categoryPillText, filterCategory === cat && styles.categoryPillTextActive]}>{cat}</Text>
                          </TouchableOpacity>
                        ))}
                      </GHScrollView>
                      <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
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

                      {/* Exercise List */}
                      <View style={styles.exerciseListCard}>
                        {displayedExercises.map(ex => {
                          const isChecked = editorExercises.some(e => e.name === ex.name);
                          return (
                            <TouchableOpacity 
                              key={ex.name}
                              style={[styles.exerciseSelectRow, isChecked && styles.exerciseSelectRowActive]}
                              activeOpacity={0.7}
                              onPress={() => handleToggleExerciseInEditor(ex.name)}
                            >
                              <View style={[styles.checkboxBox, isChecked && styles.checkboxBoxActive]}>
                                {isChecked && (
                                  <MaterialCommunityIcons name="check" size={16} color="#000000" />
                                )}
                              </View>
                              <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.exerciseSelectName, isChecked && { color: '#FFFFFF', fontWeight: '700' }]}>
                                  {ex.name}
                                </Text>
                                {((ex as any).equipmentType || (ex as any).brand) && (
                                  <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                                    {[((ex as any).brand && (ex as any).brand !== 'Keine') ? (ex as any).brand : null, (ex as any).equipmentType].filter(Boolean).join(' • ')}
                                  </Text>
                                )}
                              </View>
                              <TouchableOpacity 
        style={{ padding: 8, marginRight: 8 }}
        onPress={(e) => {
           e.stopPropagation();
           setEditingExercise(ex);
           setManagerVisible(true);
        }}
      >
        <MaterialCommunityIcons name="pencil" size={18} color="#888" />
      </TouchableOpacity>
                              <View style={styles.categoryBadgeSmall}>
                                <Text style={styles.categoryBadgeSmallText}>{ex.category}</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      
                      {/* Open Exercise Manager Button */}
                      <TouchableOpacity 
                        style={[styles.addSetPill, { alignSelf: 'center', marginVertical: 20, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'rgba(0, 210, 255, 0.15)' }]}
                        onPress={() => {
                          setEditingExercise(null);
                          setManagerVisible(true);
                        }}
                      >
                        <MaterialCommunityIcons name="plus" size={18} color="#00D2FF" style={{ marginRight: 8 }} />
                        <Text style={[styles.addSetPillText, { fontSize: 16 }]}>Create New Exercise</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ height: 60 }} />
                  </View>
                }
              />
            </View>
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
                  <MaterialCommunityIcons name="timer-outline" size={20} color="#00D2FF" />
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

              {/* Workout Custom Name, Training Partner & Favorite Toggle */}
              <View style={styles.celebrationMetaCard}>
                <Text style={styles.celebrationMetaLabel}>WORKOUT NAME</Text>
                <View style={styles.celebrationInputRow}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color="#00D2FF" style={{ marginRight: 8 }} />
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
                  <MaterialCommunityIcons name="chevron-down" size={14} color="#00D2FF" />
                  <Text style={styles.chartScrollHintText}>SCROLL FOR MUSCLE BREAKDOWN</Text>
                  <MaterialCommunityIcons name="chevron-down" size={14} color="#00D2FF" />
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
                <View style={{ marginTop: 24, padding: 16, backgroundColor: 'rgba(0, 210, 255, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.3)' }}>
                  <Text style={{ color: '#00D2FF', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
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
                      borderColor: savePlanChangesChecked ? '#00D2FF' : '#555',
                      backgroundColor: savePlanChangesChecked ? '#00D2FF' : 'transparent',
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
            <MaterialCommunityIcons name="watch" size={26} color="#00D2FF" />
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
      <ExerciseManagerModal 
        visible={managerVisible} 
        onClose={() => setManagerVisible(false)} 
        onSaved={(newEx) => {
          handleSelectExerciseForLiveWorkout(newEx);
          setManagerVisible(false);
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
  header: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
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
});
