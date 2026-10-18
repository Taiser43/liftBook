import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CheckInGoal = 'Bulk' | 'Cut' | 'Maintain';

export interface CheckInPhaseConfig {
  id: string;
  goal: CheckInGoal;
  phaseName: string; // z.B. "Lean Bulk 2026"
  startDate: string; // YYYY-MM-DD
  targetWeeks: number; // z.B. 16
  targetDate?: string; // YYYY-MM-DD
  startWeight: number; // kg
  targetWeight?: number; // kg
  weeklyTargetRateKg: number; // z.B. +0.30 kg/Woche für Bulk, -0.50 kg für Cut
  checkInDayOfWeek: number; // 0 = Sonntag, 1 = Montag, ... Default 0
  reminderTime: string; // "08:00"
  isActive: boolean;
}

export interface CheckInBiofeedback {
  sleep: number; // 1 - 10
  energy: number; // 1 - 10
  appetite: number; // 1 - 10
  digestion: number; // 1 - 10
  stress?: number; // 1 - 10
}

export interface CheckInMeasurements {
  waist?: number; // cm (Taille)
  chest?: number; // cm (Brust)
  rightArm?: number; // cm (Oberarm)
  thigh?: number; // cm (Oberschenkel)
  hips?: number; // cm (Hüfte)
}

export interface CheckInPhotos {
  front?: string; // local file URI
  side?: string; // local file URI
  back?: string; // local file URI
  detail?: string; // local file URI
}

export interface CoachVerdict {
  status: 'optimal' | 'warning' | 'alert' | 'neutral';
  headline: string;
  summary: string;
  weightAnalysis: {
    avgWeight: number;
    deltaWeight: number;
    deltaPercent: number;
    targetDelta: number;
    verdictText: string;
  };
  performanceAnalysis: {
    totalVolume: number;
    volumeDeltaPercent: number;
    workoutsCompleted: number;
    plannedWorkouts: number;
    progressedExercisesCount: number;
    totalExercisesEvaluated: number;
    verdictText: string;
  };
  nutritionAnalysis: {
    avgCalories: number;
    targetCalories: number;
    calorieDelta: number;
    adherencePercent: number;
    proteinHitDays: number;
    totalLoggedDays: number;
    verdictText: string;
  };
  recommendation: {
    type: 'maintain' | 'increase_calories' | 'decrease_calories' | 'deload';
    calorieDelta: number; // z.B. +150, -150 oder 0
    explanation: string;
    applied: boolean;
  };
}

export interface CheckInEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weekNumber: number; // 1, 2, ...
  phaseId: string;
  fastingWeight: number; // automatisch aus weightHistory für dieses Datum
  sevenDayAvgWeight: number;
  measurements: CheckInMeasurements;
  photos: CheckInPhotos;
  biofeedback: CheckInBiofeedback;
  notes?: string;
  coachVerdict: CoachVerdict;
  createdAt: string;
}

interface CheckInState {
  phaseConfig: CheckInPhaseConfig;
  checkInHistory: CheckInEntry[];
  setPhaseConfig: (config: Partial<CheckInPhaseConfig>) => void;
  addCheckInEntry: (entry: CheckInEntry) => void;
  updateCheckInEntry: (id: string, entry: Partial<CheckInEntry>) => void;
  deleteCheckInEntry: (id: string) => void;
  markRecommendationApplied: (entryId: string) => void;
}

const defaultPhaseConfig: CheckInPhaseConfig = {
  id: 'default-bulk-phase',
  goal: 'Bulk',
  phaseName: 'Lean Bulk 2026',
  startDate: new Date().toISOString().split('T')[0],
  targetWeeks: 16,
  startWeight: 80.0,
  targetWeight: 85.0,
  weeklyTargetRateKg: 0.30,
  checkInDayOfWeek: 0, // Sonntag
  reminderTime: '08:00',
  isActive: true,
};

export const useCheckInStore = create<CheckInState>()(
  persist(
    (set) => ({
      phaseConfig: defaultPhaseConfig,
      checkInHistory: [],

      setPhaseConfig: (config) =>
        set((state) => ({
          phaseConfig: { ...state.phaseConfig, ...config },
        })),

      addCheckInEntry: (entry) =>
        set((state) => {
          const existingIdx = state.checkInHistory.findIndex(
            (c) => c.weekNumber === entry.weekNumber && c.phaseId === entry.phaseId
          );
          if (existingIdx >= 0) {
            const updated = [...state.checkInHistory];
            updated[existingIdx] = entry;
            return { checkInHistory: updated };
          }
          return {
            checkInHistory: [entry, ...state.checkInHistory].sort(
              (a, b) => b.weekNumber - a.weekNumber
            ),
          };
        }),

      updateCheckInEntry: (id, partial) =>
        set((state) => ({
          checkInHistory: state.checkInHistory.map((c) =>
            c.id === id ? { ...c, ...partial } : c
          ),
        })),

      deleteCheckInEntry: (id) =>
        set((state) => ({
          checkInHistory: state.checkInHistory.filter((c) => c.id !== id),
        })),

      markRecommendationApplied: (entryId) =>
        set((state) => ({
          checkInHistory: state.checkInHistory.map((c) => {
            if (c.id === entryId) {
              return {
                ...c,
                coachVerdict: {
                  ...c.coachVerdict,
                  recommendation: {
                    ...c.coachVerdict.recommendation,
                    applied: true,
                  },
                },
              };
            }
            return c;
          }),
        })),
    }),
    {
      name: 'checkin-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
