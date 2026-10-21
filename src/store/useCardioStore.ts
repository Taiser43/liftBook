import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CardioActivityType = 'Running' | 'Cycling' | 'Boxing' | 'Swimming' | 'Paddle' | 'Football' | 'Walking';

export interface RouteWaypoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude?: number;
  speed?: number;
  heartRate?: number;
  cadence?: number;
}

export interface KmSplit {
  splitIndex: number;
  distanceMeters: number;
  durationSeconds: number;
  averagePaceMinKm: string;
  averageSpeedKmh: number;
  elevationDeltaMeters: number;
  averageHeartRate: number;
  averageCadence?: number;
  averageWatts?: number;
  isFastestSplit?: boolean;
}

export interface CardioSession {
  id: string;
  type: CardioActivityType;
  date: string; // ISO string
  durationSeconds: number;
  movingDurationSeconds?: number;
  distanceMeters: number;
  caloriesBurned: number;
  averageHeartRate: number;
  maxHeartRate: number;
  routeCoordinates?: RouteWaypoint[];
  elevationGain?: number;
  elevationLoss?: number;
  maxSpeed?: number;
  averagePace?: string;
  bestPace?: string;
  averageWatts?: number;
  splits?: KmSplit[];
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
    elevationLoss: 310,
    averageWatts: 235,
    routeCoordinates: cyclingRoute,
    splits: [
      { splitIndex: 1, distanceMeters: 5000, durationSeconds: 610, averagePaceMinKm: '2:02', averageSpeedKmh: 29.5, elevationDeltaMeters: 65, averageHeartRate: 138, averageWatts: 215 },
      { splitIndex: 2, distanceMeters: 5000, durationSeconds: 690, averagePaceMinKm: '2:18', averageSpeedKmh: 26.1, elevationDeltaMeters: 140, averageHeartRate: 152, averageWatts: 275 },
      { splitIndex: 3, distanceMeters: 5000, durationSeconds: 520, averagePaceMinKm: '1:44', averageSpeedKmh: 34.6, elevationDeltaMeters: -120, averageHeartRate: 132, averageWatts: 165, isFastestSplit: true },
      { splitIndex: 4, distanceMeters: 3500, durationSeconds: 460, averagePaceMinKm: '2:11', averageSpeedKmh: 27.4, elevationDeltaMeters: 35, averageHeartRate: 148, averageWatts: 220 },
    ],
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
    elevationLoss: 40,
    routeCoordinates: runningRoute,
    splits: [
      { splitIndex: 1, distanceMeters: 1000, durationSeconds: 312, averagePaceMinKm: '5:12', averageSpeedKmh: 11.5, elevationDeltaMeters: 12, averageHeartRate: 146 },
      { splitIndex: 2, distanceMeters: 1000, durationSeconds: 305, averagePaceMinKm: '5:05', averageSpeedKmh: 11.8, elevationDeltaMeters: 8, averageHeartRate: 152 },
      { splitIndex: 3, distanceMeters: 1000, durationSeconds: 298, averagePaceMinKm: '4:58', averageSpeedKmh: 12.1, elevationDeltaMeters: -4, averageHeartRate: 158, isFastestSplit: true },
      { splitIndex: 4, distanceMeters: 1000, durationSeconds: 318, averagePaceMinKm: '5:18', averageSpeedKmh: 11.3, elevationDeltaMeters: 18, averageHeartRate: 164 },
      { splitIndex: 5, distanceMeters: 1000, durationSeconds: 310, averagePaceMinKm: '5:10', averageSpeedKmh: 11.6, elevationDeltaMeters: 11, averageHeartRate: 168 },
    ],
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
