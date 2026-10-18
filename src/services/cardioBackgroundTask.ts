/**
 * Background GPS tracking service for Cardio workouts.
 * Uses expo-task-manager + expo-location background location.
 *
 * IMPORTANT: defineTask must be called at the module root level (not inside a component).
 * We register this file in index.ts via an import.
 */
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../store/store';

export const CARDIO_LOCATION_TASK = 'CARDIO_BACKGROUND_LOCATION';

export interface BgCoord {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number | null; // m/s or null
  heartRate?: number;
}

const STORAGE_KEY = '@cardio_bg_coords';

/** Append a coordinate to AsyncStorage so the foreground can pick it up */
async function appendCoord(coord: BgCoord) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const arr: BgCoord[] = raw ? JSON.parse(raw) : [];
    arr.push(coord);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch (e) {
    // Silently ignore
  }
}

/** Read all accumulated coords from background */
export async function readBgCoords(): Promise<BgCoord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Clear the background coord buffer */
export async function clearBgCoords(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/** Register the background task definition */
TaskManager.defineTask(CARDIO_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.warn('[CardioTask] Error:', error.message);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const loc = locations[locations.length - 1];
      const hr = useAppStore.getState().currentHeartRate;
      appendCoord({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        timestamp: loc.timestamp,
        speed: loc.coords.speed,
        heartRate: hr === null ? undefined : hr,
      });
    }
  }
});

/** Start background location tracking */
export async function startBgLocationTracking(): Promise<boolean> {
  try {
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') {
      // Background denied in Expo Go, silently fail
      return false;
    }
    const isRunning = await Location.hasStartedLocationUpdatesAsync(CARDIO_LOCATION_TASK);
    if (!isRunning) {
      await clearBgCoords(); // fresh start
      await Location.startLocationUpdatesAsync(CARDIO_LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,        // every 2 seconds
        distanceInterval: 3,       // or every 3 metres, whichever is sooner
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: '🏃 Cardio Tracking',
          notificationBody: 'Your route and pace are being recorded.',
          notificationColor: '#00D2FF',
        },
        activityType: Location.ActivityType.Fitness,
      });
    }
    return true;
  } catch (e) {
    console.warn('[CardioTask] startBgLocationTracking error:', e);
    return false;
  }
}

/** Stop background location tracking */
export async function stopBgLocationTracking(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(CARDIO_LOCATION_TASK);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(CARDIO_LOCATION_TASK);
    }
  } catch (e) {
    console.warn('[CardioTask] stopBgLocationTracking error:', e);
  }
}
