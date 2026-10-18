import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CardioActivityType = 'Running' | 'Cycling' | 'Boxing' | 'Swimming' | 'Paddle' | 'Football' | 'Walking';

export interface CardioSession {
  id: string;
  type: CardioActivityType;
  date: string; // ISO string
  durationSeconds: number;
  distanceMeters: number;
  caloriesBurned: number;
  averageHeartRate: number;
  maxHeartRate: number;
  routeCoordinates?: { latitude: number; longitude: number; timestamp: number; altitude?: number; speed?: number; heartRate?: number }[];
  elevationGain?: number;
  maxSpeed?: number;
  splits?: { distance: number; time: number }[]; // seconds per split
  source: 'in-app' | 'health-connect';
  testType?: 'Cooper' | '1.5Mile' | 'Rockport';
  xpEarned?: number; // Added to track highest XP sessions
}

interface CardioState {
  history: CardioSession[];
  cardioXP: Record<string, number>;
  maxHeartRateSetting: number;
  setMaxHeartRateSetting: (hr: number) => void;
  addSession: (session: CardioSession) => void;
  removeSession: (id: string) => void;
  addCardioXP: (type: CardioActivityType, amount: number) => void;
}

export const useCardioStore = create<CardioState>()(
  persist(
    (set) => ({
      history: [],
      cardioXP: {},
      maxHeartRateSetting: 190, // Default estimate
      setMaxHeartRateSetting: (hr) => set({ maxHeartRateSetting: hr }),
      addSession: (session) =>
        set((state) => ({ history: [session, ...state.history] })),
      removeSession: (id) =>
        set((state) => ({ history: state.history.filter((s) => s.id !== id) })),
      addCardioXP: (type, amount) =>
        set((state) => {
          const currentXP = state.cardioXP || {};
          return {
            cardioXP: {
              ...currentXP,
              [type]: (currentXP[type] || 0) + amount
            }
          };
        }),
    }),
    {
      name: 'cardio-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);


export const generateMockCardioSessions = () => {
  const now = Date.now();
  
  const generateRoute = (lat: number, lon: number, count: number, speedMultiplier: number, baseHr: number) => {
    let route = [];
    let currentLat = lat;
    let currentLon = lon;
    let currentAlt = 400;
    
    for (let i = 0; i < count; i++) {
      currentLat += (Math.random() - 0.4) * 0.001 * speedMultiplier;
      currentLon += (Math.random() - 0.4) * 0.001 * speedMultiplier;
      currentAlt += (Math.random() - 0.5) * 5;
      
      route.push({
        latitude: currentLat,
        longitude: currentLon,
        timestamp: now - (count - i) * 10000,
        altitude: currentAlt,
        speed: (Math.random() * 5 + 8) * speedMultiplier, // km/h
        heartRate: baseHr + Math.sin(i / 10) * 30 + (Math.random() * 10)
      });
    }
    return route;
  };

  const cyclingRoute = generateRoute(47.3769, 8.5417, 120, 2.5, 140);
  const runningRoute = generateRoute(47.3769, 8.5417, 60, 1.0, 155);
  const boxingRoute = generateRoute(47.3769, 8.5417, 40, 0.1, 160); // mostly stationary

  const cycling: CardioSession = {
    id: 'mock-cycling-' + now,
    type: 'Cycling',
    date: new Date(now - 86400000).toISOString(), // yesterday
    durationSeconds: 120 * 10,
    distanceMeters: 18500, // 18.5 km
    caloriesBurned: 540,
    averageHeartRate: 145,
    maxHeartRate: 178,
    maxSpeed: 38.5,
    elevationGain: 320,
    routeCoordinates: cyclingRoute,
    source: 'in-app'
  };

  const running: CardioSession = {
    id: 'mock-running-' + now,
    type: 'Running',
    date: new Date(now - 172800000).toISOString(), // 2 days ago
    durationSeconds: 60 * 10,
    distanceMeters: 5200, // 5.2 km
    caloriesBurned: 380,
    averageHeartRate: 158,
    maxHeartRate: 185,
    maxSpeed: 14.2,
    elevationGain: 45,
    routeCoordinates: runningRoute,
    source: 'in-app'
  };
  
  const boxing: CardioSession = {
    id: 'mock-boxing-' + now,
    type: 'Boxing',
    date: new Date(now - 259200000).toISOString(), // 3 days ago
    durationSeconds: 45 * 60,
    distanceMeters: 0,
    caloriesBurned: 600,
    averageHeartRate: 165,
    maxHeartRate: 192,
    maxSpeed: 0,
    elevationGain: 0,
    routeCoordinates: boxingRoute,
    source: 'in-app'
  };

  useCardioStore.getState().addSession(cycling);
  useCardioStore.getState().addSession(running);
  useCardioStore.getState().addSession(boxing);
};
