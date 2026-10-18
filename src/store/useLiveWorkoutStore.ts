import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutPlan, Exercise } from './store';

interface LiveWorkoutState {
  activePlan: WorkoutPlan | null;
  workoutStartTime: number | null;
  liveExercises: Exercise[];
  setLogs: Record<string, { weight: string; reps: string; repsRight?: string; checked: boolean }>;
  unilateralExercises: string[];
  restEndTime: number | null;
  
  // Direct setters to match old useState
  setActivePlan: (plan: WorkoutPlan | null) => void;
  setWorkoutStartTime: (time: number | null) => void;
  setLiveExercises: (exercises: Exercise[] | ((prev: Exercise[]) => Exercise[])) => void;
  setSetLogs: (logs: Record<string, { weight: string; reps: string; repsRight?: string; checked: boolean }> | ((prev: any) => any)) => void;
  setUnilateralExercises: (exercises: string[]) => void;
  setRestEndTime: (time: number | null | ((prev: number | null) => number | null)) => void;
}

export const useLiveWorkoutStore = create<LiveWorkoutState>()(
  persist(
    (set) => ({
      activePlan: null,
      workoutStartTime: null,
      liveExercises: [],
      setLogs: {},
      unilateralExercises: [],
      restEndTime: null,

      setActivePlan: (plan) => set({ activePlan: plan }),
      setWorkoutStartTime: (time) => set({ workoutStartTime: time }),
      setLiveExercises: (exercises) => set((state) => ({ liveExercises: typeof exercises === 'function' ? exercises(state.liveExercises) : exercises })),
      setSetLogs: (logs) => set((state) => ({ 
        setLogs: typeof logs === 'function' ? logs(state.setLogs) : logs 
      })),
      setUnilateralExercises: (exercises) => set({ unilateralExercises: exercises }),
      setRestEndTime: (time) => set((state) => ({ restEndTime: typeof time === 'function' ? time(state.restEndTime) : time })),
    }),
    {
      name: 'pt-nutrition-live-workout-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
