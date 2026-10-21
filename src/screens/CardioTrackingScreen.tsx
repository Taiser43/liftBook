import React, { useState, useEffect, useRef } from 'react';
import { Buffer } from 'buffer';
import { View, Text, StyleSheet, TouchableOpacity, AppState, AppStateStatus, Modal, Animated, Vibration, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Polyline, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import haversine from 'haversine';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/store';
import { useCardioStore, CardioActivityType, CardioSession, KmSplit, RouteWaypoint } from '../store/useCardioStore';
import { getHeartRateZoneColor } from '../utils/heartRate';
import { getCardioLevelData } from '../utils/gamification';
import { useHeartRateMonitor } from '../hooks/useHeartRateMonitor';
import { useIronTacticsMetaStore } from '../store/useIronTacticsMetaStore';
import { getAppTheme } from '../utils/theme';

import {
  startBgLocationTracking,
  stopBgLocationTracking,
  readBgCoords,
  clearBgCoords,
  BgCoord,
} from '../services/cardioBackgroundTask';

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

interface Props {
  navigation: any;
}

export default function CardioTrackingScreen({ navigation }: Props) {
  const activityType = useAppStore(state => state.globalCardioActivityType) ?? 'Running';
  const testType = useAppStore(state => state.globalCardioTestType);
  const modalVisible = useAppStore(state => state.globalCardioModalVisible);
  const setGlobalCardioModalVisible = useAppStore(state => state.setGlobalCardioModalVisible);
  const maxHeartRateSetting = useCardioStore(state => state.maxHeartRateSetting);
  const setFinishCurrentCardio = useAppStore(state => state.setFinishCurrentCardio);

  const addSession = useCardioStore(state => state.addSession);
  const removeSession = useCardioStore(state => state.removeSession);
  const addCardioXP = useCardioStore(state => state.addCardioXP);
  const setGlobalCardioSession = useAppStore(state => state.setGlobalCardioSession);
  const addXP = useAppStore(state => state.addXP);
  const cardioXP = useCardioStore(state => state.cardioXP) || {};
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);

  // ── Session state ────────────────────────────────────────────────────────────
  const [isTracking, setIsTracking] = useState(false);
  const [coordinates, setCoordinates] = useState<BgCoord[]>([]);
  const [distance, setDistance] = useState(0);       // metres
  const [duration, setDuration] = useState(0);       // seconds
  const [calories, setCalories] = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [splits, setSplits] = useState<KmSplit[]>([]);
  const [initialLocation, setInitialLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const mapRef = useRef<MapView | null>(null);
  const lastSplitDistRef = useRef(0);
  const lastSplitTimeRef = useRef(0);
  const lastSplitElevRef = useRef(0);
  const lastAltitudeRef = useRef<number | null>(null);

  const [celebrationModalVisible, setCelebrationModalVisible] = useState(false);
  const [lastCompletedSession, setLastCompletedSession] = useState<CardioSession | null>(null);

  const { currentHR, isWatchConnected, toggleConnection, setCurrentHR, setIsWatchConnected } = useHeartRateMonitor();
  const [hrHistory, setHrHistory] = useState<number[]>([]);
  const heartScale = useRef(new Animated.Value(1)).current;
  

  
  useEffect(() => {
    if (isWatchConnected && currentHR > 0) {
      const beatDuration = Math.max(380, Math.min(1000, Math.round((60 / currentHR) * 1000)));
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(heartScale, { toValue: 1.28, duration: Math.round(beatDuration * 0.35), useNativeDriver: true }),
          Animated.timing(heartScale, { toValue: 1, duration: Math.round(beatDuration * 0.65), useNativeDriver: true })
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      heartScale.setValue(1);
    }
  }, [isWatchConnected, currentHR]);

  // Timer ref – runs in foreground and syncs data from background storage
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimestampRef = useRef<number | null>(null);
  const pausedDurationRef = useRef<number>(0); // accumulated seconds before pause
  const lastTickTimeRef = useRef<number>(Date.now());
  const currentHRRef = useRef<number>(0);

  // Sync currentHR to ref so setInterval can access the latest value
  useEffect(() => {
    currentHRRef.current = currentHR;
  }, [currentHR]);

  // App state watcher – detect foreground/background transitions
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // ── Initial Location Fetch when Modal Opens ───────────────────────────────
  // ── Auto-Center & Initial Location ───────────────────────────────────────────
  useEffect(() => {
    let preSub: Location.LocationSubscription | null = null;
    if (modalVisible && !isTracking) {
      (async () => {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === 'granted') {
            const last = await Location.getLastKnownPositionAsync({});
            if (last) {
              setInitialLocation({
                latitude: last.coords.latitude,
                longitude: last.coords.longitude,
              });
              mapRef.current?.animateToRegion({
                latitude: last.coords.latitude,
                longitude: last.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }, 400);
            }
            // Keep centered before starting
            preSub = await Location.watchPositionAsync(
              { accuracy: Location.Accuracy.Balanced, timeInterval: 2500, distanceInterval: 4 },
              loc => {
                setInitialLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                mapRef.current?.animateToRegion({
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }, 400);
              }
            );
          }
        } catch {
          // ignore
        }
      })();
    }
    return () => {
      if (preSub) preSub.remove();
    };
  }, [modalVisible, isTracking]);

  const recenterMap = async () => {
    try {
      if (coordinates.length > 0) {
        const latest = coordinates[coordinates.length - 1];
        mapRef.current?.animateToRegion({
          latitude: latest.latitude,
          longitude: latest.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 400);
      } else if (initialLocation) {
        mapRef.current?.animateToRegion({
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 400);
      } else {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (pos) {
          setInitialLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          mapRef.current?.animateToRegion({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 400);
        }
      }
    } catch {
      // ignore
    }
  };

  // ── Haversine helper ─────────────────────────────────────────────────────────
  const calcDistanceBetween = (a: BgCoord, b: BgCoord): number =>
    haversine(
      { latitude: a.latitude, longitude: a.longitude },
      { latitude: b.latitude, longitude: b.longitude },
      { unit: 'meter' }
    ) || 0;

  // ── Foreground location fallback (when app is open) ─────────────────────────
  const fgSubRef = useRef<Location.LocationSubscription | null>(null);
  const autoPauseThreshold = activityType === 'Cycling' ? 0.9 : 0.6; // m/s (~3.2 km/h bike, ~2.2 km/h run)

  // ── App foreground: sync BG coords ──────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active' &&
        isTracking
      ) {
        // App came back to foreground – pull background coords accumulated during sleep mode
        await syncBgCoords();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [isTracking, duration, elevationGain]);

  const syncBgCoords = async () => {
    const bgCoords = await readBgCoords();
    if (bgCoords.length === 0) return;
    setCoordinates(prev => {
      const merged = [...prev];
      let extraDist = 0;
      let extraElev = 0;

      for (const c of bgCoords) {
        const last = merged[merged.length - 1];
        if (last) {
          const d = calcDistanceBetween(last, c);
          if (d < 350) extraDist += d; // ignore crazy GPS teleport jumps
        }
        if (c.altitude && lastAltitudeRef.current !== null) {
          const dAlt = c.altitude - lastAltitudeRef.current;
          if (dAlt > 1.2) extraElev += dAlt;
        }
        if (c.altitude) lastAltitudeRef.current = c.altitude;
        merged.push(c);
      }

      if (extraElev > 0) {
        setElevationGain(prevElev => prevElev + extraElev);
      }

      setDistance(d => {
        const updated = d + extraDist;
        // Check for km splits completed while phone was in sleep mode
        while (updated - lastSplitDistRef.current >= 1000) {
          const sDist = 1000;
          const sDur = Math.max(duration - lastSplitTimeRef.current, 60);
          const sSpeed = sDur > 0 ? (sDist / 1000) / (sDur / 3600) : 0;
          const sPace = sSpeed > 0
            ? `${Math.floor(60 / sSpeed)}:${String(Math.round(((60 / sSpeed) % 1) * 60)).padStart(2, '0')}`
            : '--:--';
          const splitItem: KmSplit = {
            splitIndex: Math.floor((lastSplitDistRef.current + 1000) / 1000),
            distanceMeters: sDist,
            durationSeconds: sDur,
            averagePaceMinKm: sPace,
            averageSpeedKmh: Math.round(sSpeed * 10) / 10,
            elevationDeltaMeters: Math.round(elevationGain - lastSplitElevRef.current),
            averageHeartRate: currentHRRef.current || 140,
          };
          setSplits(sp => [...sp, splitItem]);
          lastSplitDistRef.current += 1000;
          lastSplitTimeRef.current = duration;
          lastSplitElevRef.current = elevationGain;
        }
        return updated;
      });

      if (merged.length > 0) {
        const latest = merged[merged.length - 1];
        mapRef.current?.animateToRegion({
          latitude: latest.latitude,
          longitude: latest.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 400);
      }

      return merged;
    });
    await clearBgCoords();
  };

  // ── Start tracking ───────────────────────────────────────────────────────────
  const startTracking = async () => {
    // Request foreground permission first
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== 'granted') {
      alert('Location permission is required to track your route.');
      return;
    }

    setIsTracking(true);
    setIsAutoPaused(false);
    if (duration === 0) {
      setCoordinates([]);
      setDistance(0);
      setDuration(0);
      setCalories(0);
      setElevationGain(0);
      setSplits([]);
      lastSplitDistRef.current = 0;
      lastSplitTimeRef.current = 0;
      lastSplitElevRef.current = 0;
      lastAltitudeRef.current = null;
      pausedDurationRef.current = 0;
    }
    startTimestampRef.current = Date.now();

    // Start foreground watcher (accurate, fast)
    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 3,
      },
      loc => {
        // Always center map on current location
        mapRef.current?.animateToRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 400);

        const speed = loc.coords.speed ?? 0;

        // Auto-pause detection (Traffic lights / rest stop)
        if (speed < autoPauseThreshold && !isAutoPaused) {
          setIsAutoPaused(true);
        } else if (speed >= autoPauseThreshold && isAutoPaused) {
          setIsAutoPaused(false);
          Vibration.vibrate(80); // Subtle haptic tick when moving resumes
        }

        const alt = loc.coords.altitude ?? 0;
        if (alt && lastAltitudeRef.current !== null) {
          const dAlt = alt - lastAltitudeRef.current;
          if (dAlt > 1.2) {
            setElevationGain(e => e + dAlt);
          }
        }
        if (alt) lastAltitudeRef.current = alt;

        const newCoord: BgCoord = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
          altitude: alt,
          speed: speed,
          accuracy: loc.coords.accuracy ?? undefined,
          heartRate: currentHRRef.current,
        };

        setCoordinates(prev => {
          let newDist = 0;
          if (prev.length > 0) {
            const dist = calcDistanceBetween(prev[prev.length - 1], newCoord);
            if (dist < 250) { // filter GPS jitter anomalies
              newDist = dist;
            }
          }
          if (newDist > 0) {
            setDistance(d => {
              const updatedDist = d + newDist;
              // Check 1 km split trigger
              if (updatedDist - lastSplitDistRef.current >= 1000) {
                const sDist = 1000;
                const sDur = duration - lastSplitTimeRef.current;
                const sSpeed = sDur > 0 ? (sDist / 1000) / (sDur / 3600) : 0;
                const sPace = sSpeed > 0
                  ? `${Math.floor(60 / sSpeed)}:${String(Math.round(((60 / sSpeed) % 1) * 60)).padStart(2, '0')}`
                  : '--:--';
                const splitItem: KmSplit = {
                  splitIndex: Math.floor(updatedDist / 1000),
                  distanceMeters: sDist,
                  durationSeconds: sDur,
                  averagePaceMinKm: sPace,
                  averageSpeedKmh: Math.round(sSpeed * 10) / 10,
                  elevationDeltaMeters: Math.round(elevationGain - lastSplitElevRef.current),
                  averageHeartRate: currentHRRef.current || 140,
                };
                setSplits(sp => [...sp, splitItem]);
                lastSplitDistRef.current = Math.floor(updatedDist / 1000) * 1000;
                lastSplitTimeRef.current = duration;
                lastSplitElevRef.current = elevationGain;
                // Subtle haptic vibration for KM split (no voice audio!)
                Vibration.vibrate([0, 150, 80, 150]);
              }
              return updatedDist;
            });
          }
          return [...prev, newCoord];
        });
      }
    );
    fgSubRef.current = sub;

    // Also start background task so GPS continues seamlessly when screen is locked in pocket/bike mount
    await startBgLocationTracking();

    lastTickTimeRef.current = Date.now();

    // Seconds timer – syncs global state for mini-player
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const deltaSeconds = (now - lastTickTimeRef.current) / 1000;
      lastTickTimeRef.current = now;

      setDuration(prevDur => {
        const newDur = prevDur + 1;
        setDistance(d => {
          const spd = newDur > 0 ? (d / 1000) / (newDur / 3600) : 0;
          setGlobalCardioSession(true, newDur, d, spd);
          return d;
        });
        return newDur;
      });

      // Calculate calories based on time passed since last tick
      const hr = currentHRRef.current;
      const currentCalRatePerSecond = (hr > 80 ? hr * 0.06 : 10) / 60;
      setCalories(prev => prev + (deltaSeconds * currentCalRatePerSecond));

      if (hr > 0) {
        setHrHistory(h => [...h.slice(-180), hr]);
      }
    }, 1000);
  };

  // ── Pause tracking ───────────────────────────────────────────────────────────
  const pauseTracking = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (fgSubRef.current) { fgSubRef.current.remove(); fgSubRef.current = null; }
    if (startTimestampRef.current) {
      pausedDurationRef.current += Math.floor((Date.now() - startTimestampRef.current!) / 1000);
      startTimestampRef.current = null;
    }
    // Also pause background task so distance does not accumulate while paused at a rest stop
    await stopBgLocationTracking();
    setIsTracking(false);
  };

  const finishWorkout = async (skipNavigation = false) => {
    await pauseTracking();
    await stopBgLocationTracking();
    // Sync any last coords from background
    await syncBgCoords();

    // XP Calculation
    const durationMinutes = duration / 60;
    const baseXP = Math.floor(durationMinutes * 10);

    // Distance bonus (dependent on activity)
    let distanceBonus = 0;
    const distanceKm = distance / 1000;
    if (activityType === 'Running' || activityType === 'Walking') distanceBonus = distanceKm * 50;
    else if (activityType === 'Cycling') distanceBonus = distanceKm * 15;
    else if (activityType === 'Swimming') distanceBonus = distanceKm * 100;
    else distanceBonus = distanceKm * 20;

    // Intensity bonus (Heart rate)
    let hrMultiplier = 1.0;
    const avgHR = hrHistory.length > 0 ? hrHistory.reduce((a,b) => a+b, 0) / hrHistory.length : currentHR;
    if (avgHR > 0 && maxHeartRateSetting > 0) {
      const percent = avgHR / maxHeartRateSetting;
      if (percent >= 0.9) hrMultiplier = 2.0;       // Zone 5
      else if (percent >= 0.8) hrMultiplier = 1.5;  // Zone 4
      else if (percent >= 0.7) hrMultiplier = 1.3;  // Zone 3
      else if (percent >= 0.6) hrMultiplier = 1.1;  // Zone 2
    }

    const earnedXP = Math.floor((baseXP + distanceBonus) * hrMultiplier);

    // Calculate true max and average stats from all accumulated coordinates
    let trueMaxSpeed = 0;
    let trueMaxHR = 0;
    let hrSum = 0;
    let hrCount = 0;

    coordinates.forEach(c => {
      if (c.speed && c.speed > trueMaxSpeed) trueMaxSpeed = c.speed;
      if (c.heartRate && c.heartRate > 0) {
        if (c.heartRate > trueMaxHR) trueMaxHR = c.heartRate;
        hrSum += c.heartRate;
        hrCount++;
      }
    });

    const trueAvgHR = hrCount > 0 ? Math.round(hrSum / hrCount) : currentHRRef.current || 120;
    if (trueMaxHR === 0) trueMaxHR = currentHRRef.current || 140;

    const sessionSpeedKmH = duration > 0 ? (distance / 1000) / (duration / 3600) : 0;
    const sessionPaceStr = sessionSpeedKmH > 0
      ? `${Math.floor(60 / sessionSpeedKmH)}:${String(Math.round(((60 / sessionSpeedKmH) % 1) * 60)).padStart(2, '0')}`
      : '--:--';

    const session: CardioSession = {
      id: Date.now().toString(),
      type: activityType,
      date: new Date().toISOString(),
      durationSeconds: duration,
      movingDurationSeconds: duration,
      distanceMeters: distance,
      caloriesBurned: Math.floor(calories),
      averageHeartRate: trueAvgHR,
      maxHeartRate: trueMaxHR,
      maxSpeed: trueMaxSpeed > 0 ? (trueMaxSpeed * 3.6) : (sessionSpeedKmH > 0 ? sessionSpeedKmH : undefined),
      elevationGain: Math.round(elevationGain),
      averagePace: sessionPaceStr,
      averageWatts: activityType === 'Cycling' && sessionSpeedKmH > 0 ? Math.round(180 + sessionSpeedKmH * 3.2) : undefined,
      splits: splits,
      routeCoordinates: coordinates.map(c => ({
        latitude: c.latitude,
        longitude: c.longitude,
        timestamp: c.timestamp,
        altitude: c.altitude,
        speed: c.speed || 0,
        heartRate: c.heartRate || 0,
      })),
      source: 'in-app',
      testType,
      xpEarned: earnedXP,
    };

    addSession(session);
    if (earnedXP > 0) {
      addCardioXP(activityType, earnedXP);
      addXP(earnedXP); // Award global XP
    }

    // Award Iron Tactics cardio fitness fuel rewards automatically!
    try {
      useIronTacticsMetaStore.getState().claimFitnessAction('cardio_completed', {
        cardioDurationMinutes: Math.round(duration / 60),
      });
    } catch {
      // ignore
    }

    setLastCompletedSession(session);
    setCelebrationModalVisible(true);
    
    // Attempt automatic Health Connect sync if they used a smartwatch
    setTimeout(async () => {
      try {
        const HealthConnect = require('react-native-health-connect');
        const isInitialized = await HealthConnect.initialize();
        if (!isInitialized) return;
        
        await HealthConnect.requestPermission([{ accessType: 'read', recordType: 'ExerciseSession' }]);
        
        const timeRangeFilter = {
          operator: 'between' as const,
          startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // Look back 30 mins
          endTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        };
        
        const records = await HealthConnect.readRecords('ExerciseSession', { timeRangeFilter });
        if (records.records && records.records.length > 0) {
          // Sort to find the latest
          const latestRecord: any = records.records.sort((a: any, b: any) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime())[0];
          
          // If the record ended recently (within the last 5 minutes), it's highly likely our current workout!
          if (Date.now() - new Date(latestRecord.endTime).getTime() < 5 * 60 * 1000) {
            const hcDuration = (new Date(latestRecord.endTime).getTime() - new Date(latestRecord.startTime).getTime()) / 1000;
            const updatedSession: CardioSession = {
              ...session,
              durationSeconds: hcDuration || session.durationSeconds,
              distanceMeters: latestRecord.distance?.inMeters || session.distanceMeters,
              caloriesBurned: latestRecord.energy?.inKilocalories || session.caloriesBurned,
              averageHeartRate: latestRecord.averageHeartRate || session.averageHeartRate,
              maxHeartRate: latestRecord.maxHeartRate || session.maxHeartRate,
              source: 'health-connect',
            };
            
            // Replace the old session with the updated one
            removeSession(session.id);
            addSession(updatedSession);
            setLastCompletedSession(updatedSession);
          }
        }
      } catch (e) {
        console.warn("Auto-sync Health Connect failed:", e);
      }
    }, 2500); // 2.5 second delay to give Samsung Health time to write to Health Connect

    setGlobalCardioSession(false, 0, 0, 0); // clear mini-player
  };

  const closeCelebrationAndExit = () => {
    setCelebrationModalVisible(false);
    setGlobalCardioModalVisible(false);
    
    // Reset local state completely so next launch is a fresh workout
    setIsTracking(false);
    setDuration(0);
    setDistance(0);
    setCalories(0);
    setCoordinates([]);
    setCurrentHR(0);
    setHrHistory([]);
    setIsWatchConnected(false);
    startTimestampRef.current = null;
    pausedDurationRef.current = 0;
    
    if (navigation && navigation.navigate) {
      navigation.navigate('MainTabs', { screen: 'Cardio' } as any);
      setTimeout(() => navigation.navigate('CardioHistory'), 100);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (fgSubRef.current) fgSubRef.current.remove();
      // Do NOT stop bg task on unmount – user might have navigated away
    };
  }, []);

  // ── Optional BLE HR monitor ──────────────────────────────────────────────────
  const connectToHRMonitor = toggleConnection;
  
  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const speedKmH = duration > 0 ? (distance / 1000) / (duration / 3600) : 0;
  const paceStr =
    speedKmH > 0
      ? `${Math.floor(60 / speedKmH)}:${String(Math.round(((60 / speedKmH) % 1) * 60)).padStart(2, '0')}`
      : '--:--';

  // ── Finish ───────────────────────────────────────────────────────────────────
  const finishCardioRef = useRef(finishWorkout);
  finishCardioRef.current = finishWorkout;

  useEffect(() => {
    setFinishCurrentCardio((skip) => finishCardioRef.current(skip));
    return () => setFinishCurrentCardio(null);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setGlobalCardioModalVisible(false)}>
      <SafeAreaView style={[
        styles.safeArea,
        { backgroundColor: '#0D1117' },
        (currentHR > 0) && {
          borderWidth: 3,
          borderColor: getHeartRateZoneColor(currentHR, maxHeartRateSetting) || 'transparent',
          shadowColor: getHeartRateZoneColor(currentHR, maxHeartRateSetting) || 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 15,
          elevation: 10,
        }
      ]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.subtleBorder }]}>
          <TouchableOpacity onPress={() => setGlobalCardioModalVisible(false)} style={styles.headerBtn}>
            <MaterialCommunityIcons name="chevron-down" size={28} color={theme.accent} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.title}>
              {activityType === 'Running' ? 'Laufen' : activityType === 'Cycling' ? 'Radfahren' : activityType}
            </Text>
            {isTracking ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#30D158', marginRight: 5 }} />
                <Text style={{ color: '#30D158', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>AUFZEICHNUNG LIVE</Text>
              </View>
            ) : (
              <Text style={{ color: '#888', fontSize: 11, fontWeight: '600', marginTop: 2 }}>Bereit</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={connectToHRMonitor}
            style={[styles.btButton, isWatchConnected && { backgroundColor: 'rgba(48,209,88,0.18)', borderColor: '#30D158' }]}
          >
            <MaterialCommunityIcons
              name="watch-variant"
              size={22}
              color={isWatchConnected ? '#30D158' : '#888'}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Hero Pace / Speed Banner */}
          <View style={[styles.heroCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <MaterialCommunityIcons
                name={activityType === 'Cycling' ? 'bike-fast' : 'run-fast'}
                size={16}
                color={theme.accent}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.heroCardLabel, { color: theme.accent }]}>
                {activityType === 'Cycling' ? 'AKTUELLES TEMPO' : 'LIVE PACE'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginVertical: 2 }}>
              <Text style={[styles.heroCardValue, { color: theme.accent }]}>
                {activityType === 'Cycling' ? speedKmH.toFixed(1) : paceStr}
              </Text>
              <Text style={[styles.heroCardUnit, { color: theme.accent }]}>
                {activityType === 'Cycling' ? ' km/h' : ' min/km'}
              </Text>
            </View>
            <Text style={styles.heroCardSub}>
              {activityType === 'Cycling'
                ? `Ø Schnitt: ${speedKmH.toFixed(1)} km/h • Leistung: ~${speedKmH > 0 ? Math.round(180 + speedKmH * 3.2) : 0} W`
                : `Ø Pace: ${paceStr} • Tempo: ${speedKmH.toFixed(1)} km/h`}
            </Text>
          </View>

          {/* 2. Primary High-Readability Telemetry Grid (6 prominent cards) */}
          <View style={styles.telemetryGrid}>
            {/* DISTANZ */}
            <View style={[styles.telemetryCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <View style={styles.telemetryCardHeader}>
                <MaterialCommunityIcons name="map-marker-distance" size={16} color={theme.accent} />
                <Text style={[styles.telemetryCardLabel, { color: theme.accent }]}>STRECKE</Text>
              </View>
              <Text style={[styles.telemetryCardValue, { color: '#FFF' }]}>
                {(distance / 1000).toFixed(2)}
                <Text style={[styles.telemetryCardUnit, { color: theme.accent }]}> km</Text>
              </Text>
            </View>

            {/* ZEIT / DAUER */}
            <View style={[styles.telemetryCard, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}>
              <View style={styles.telemetryCardHeader}>
                <MaterialCommunityIcons name="timer-outline" size={16} color="#FFF" />
                <Text style={styles.telemetryCardLabel}>ZEIT</Text>
              </View>
              <Text style={[styles.telemetryCardValue, { color: '#FFF' }]}>
                {formatTime(duration)}
              </Text>
            </View>

            {/* HÖHE */}
            <View style={[styles.telemetryCard, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}>
              <View style={styles.telemetryCardHeader}>
                <MaterialCommunityIcons name="elevation-rise" size={16} color="#FF9F0A" />
                <Text style={[styles.telemetryCardLabel, { color: '#FF9F0A' }]}>HÖHE</Text>
              </View>
              <Text style={[styles.telemetryCardValue, { color: '#FF9F0A' }]}>
                +{Math.round(elevationGain)}
                <Text style={[styles.telemetryCardUnit, { color: '#FF9F0A' }]}> m</Text>
              </Text>
            </View>

            {/* PULS */}
            <View style={[styles.telemetryCard, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}>
              <View style={styles.telemetryCardHeader}>
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <MaterialCommunityIcons name="heart" size={16} color="#FF3B30" />
                </Animated.View>
                <Text style={[styles.telemetryCardLabel, { color: '#FF3B30' }]}>PULS</Text>
              </View>
              <Text style={[styles.telemetryCardValue, { color: currentHR > 0 ? '#FF3B30' : '#888' }]}>
                {currentHR > 0 ? currentHR : '--'}
                {currentHR > 0 && <Text style={[styles.telemetryCardUnit, { color: '#FF3B30' }]}> bpm</Text>}
              </Text>
            </View>

            {/* KALORIEN */}
            <View style={[styles.telemetryCard, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}>
              <View style={styles.telemetryCardHeader}>
                <MaterialCommunityIcons name="fire" size={16} color="#FF9500" />
                <Text style={[styles.telemetryCardLabel, { color: '#FF9500' }]}>KALORIEN</Text>
              </View>
              <Text style={[styles.telemetryCardValue, { color: '#FFF' }]}>
                {Math.floor(calories)}
                <Text style={styles.telemetryCardUnit}> kcal</Text>
              </Text>
            </View>

            {/* SCHNITT */}
            <View style={[styles.telemetryCard, { backgroundColor: theme.cardBg, borderColor: theme.subtleBorder }]}>
              <View style={styles.telemetryCardHeader}>
                <MaterialCommunityIcons name="speedometer" size={16} color={theme.accent} />
                <Text style={[styles.telemetryCardLabel, { color: theme.accent }]}>
                  {activityType === 'Cycling' ? 'Ø SPEED' : 'Ø PACE'}
                </Text>
              </View>
              <Text style={[styles.telemetryCardValue, { color: '#FFF', fontSize: 18 }]}>
                {activityType === 'Cycling' ? `${speedKmH.toFixed(1)} km/h` : paceStr}
              </Text>
            </View>
          </View>

          {/* 3. Compact Map Card (takes only ~180px instead of dominating the whole screen!) */}
          <View style={[styles.compactMapCard, { borderColor: theme.cardBorder, backgroundColor: theme.cardBg }]}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.compactMap}
              initialRegion={{
                latitude: initialLocation?.latitude || (coordinates[0]?.latitude ?? 47.3769),
                longitude: initialLocation?.longitude || (coordinates[0]?.longitude ?? 8.5417),
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              showsUserLocation
              followsUserLocation={true}
              showsMyLocationButton={false}
              showsCompass={false}
              customMapStyle={darkMapStyle}
            >
              {coordinates.length > 1 && (
                <Polyline
                  coordinates={coordinates.map(c => ({ latitude: c.latitude, longitude: c.longitude }))}
                  strokeColor={theme.accent}
                  strokeWidth={4.5}
                />
              )}
              {coordinates.length > 0 && (
                <Marker
                  coordinate={{ latitude: coordinates[0].latitude, longitude: coordinates[0].longitude }}
                  title="Startpunkt"
                  pinColor="#30D158"
                />
              )}
            </MapView>

            {/* Floating Recenter Button */}
            <TouchableOpacity
              style={[styles.recenterMapBtn, { backgroundColor: 'rgba(13, 17, 23, 0.90)', borderColor: theme.subtleBorder }]}
              onPress={recenterMap}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="crosshairs-gps" size={17} color={theme.accent} />
            </TouchableOpacity>

            {/* Auto-Pause Overlay Banner */}
            {isAutoPaused && (
              <View style={styles.autoPauseBanner}>
                <MaterialCommunityIcons name="pause-circle" size={15} color="#FF9F0A" style={{ marginRight: 6 }} />
                <Text style={styles.autoPauseText}>Auto-Pause (Stillstand erkannt)</Text>
              </View>
            )}

            {/* Floating Route Status Chip */}
            <View style={[styles.floatingMapChip, { borderColor: theme.subtleBorder }]}>
              <MaterialCommunityIcons name="crosshairs-gps" size={12} color={theme.accent} style={{ marginRight: 5 }} />
              <Text style={styles.floatingMapChipText}>
                {isTracking ? `${(distance / 1000).toFixed(2)} km • ${coordinates.length} Wegpunkte` : 'GPS bereit • Tippe auf START'}
              </Text>
            </View>
          </View>

          {/* 4. Split Live Pill */}
          {splits.length > 0 && (
            <View style={[styles.splitLivePill, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              <Text style={styles.splitLivePillText}>
                Letzter Split (KM {splits.length}): <Text style={{ color: theme.accent, fontWeight: '800' }}>{splits[splits.length - 1].averagePaceMinKm} min/km</Text> • ❤️ {splits[splits.length - 1].averageHeartRate} BPM • {splits[splits.length - 1].elevationDeltaMeters >= 0 ? `+${splits[splits.length - 1].elevationDeltaMeters}m` : `${splits[splits.length - 1].elevationDeltaMeters}m`}
              </Text>
            </View>
          )}

          {/* 5. Ergonomic Action Controls */}
          <View style={styles.controls}>
            {!isTracking && duration === 0 && (
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.accent, shadowColor: theme.accent }]}
                onPress={startTracking}
              >
                <MaterialCommunityIcons name="play" size={24} color="#000" style={{ marginRight: 6 }} />
                <Text style={[styles.btnText, { color: '#000' }]}>START</Text>
              </TouchableOpacity>
            )}
            {isTracking && (
              <>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: '#FF9500', flex: 1, marginRight: 10 }]}
                  onPress={pauseTracking}
                >
                  <MaterialCommunityIcons name="pause" size={20} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.btnText}>PAUSE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, flex: 1 }]}
                  onPress={() => finishWorkout()}
                >
                  <MaterialCommunityIcons name="stop" size={20} color="#FF453A" style={{ marginRight: 6 }} />
                  <Text style={[styles.btnText, { color: '#FF453A' }]}>BEENDEN</Text>
                </TouchableOpacity>
              </>
            )}
            {!isTracking && duration > 0 && (
              <>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.accent, flex: 1, marginRight: 10 }]}
                  onPress={startTracking}
                >
                  <MaterialCommunityIcons name="play" size={20} color="#000" style={{ marginRight: 6 }} />
                  <Text style={[styles.btnText, { color: '#000' }]}>WEITER</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, flex: 1 }]}
                  onPress={() => finishWorkout()}
                >
                  <MaterialCommunityIcons name="stop" size={20} color="#FF453A" style={{ marginRight: 6 }} />
                  <Text style={[styles.btnText, { color: '#FF453A' }]}>BEENDEN</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* 6. Standby Tracking Guarantee Badge */}
          {isTracking && (
            <View style={styles.bgBadge}>
              <MaterialCommunityIcons name="shield-check" size={13} color="#30D158" />
              <Text style={styles.bgBadgeText}> Lückenloses Tracking im Ruhezustand aktiv</Text>
            </View>
          )}
        </ScrollView>

        {/* CELEBRATION MODAL */}
        <Modal visible={celebrationModalVisible} animationType="slide" transparent={true}>
          <View style={styles.celebrationOverlay}>
            <View style={[styles.celebrationCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
              {lastCompletedSession && (
                <>
                  <MaterialCommunityIcons name="party-popper" size={48} color="#FFD700" style={{ marginBottom: 14 }} />
                  <Text style={styles.celebrationTitle}>Workout abgeschlossen!</Text>
                  
                  <View style={styles.celebrationStatsGrid}>
                    <View style={[styles.celebrationStat, { backgroundColor: '#10141A', borderColor: theme.subtleBorder }]}>
                      <Text style={styles.celebrationStatVal}>{Math.floor(lastCompletedSession.durationSeconds / 60)}</Text>
                      <Text style={styles.celebrationStatLabel}>Minuten</Text>
                    </View>
                    <View style={[styles.celebrationStat, { backgroundColor: '#10141A', borderColor: theme.subtleBorder }]}>
                      <Text style={[styles.celebrationStatVal, { color: theme.accent }]}>{(lastCompletedSession.distanceMeters / 1000).toFixed(2)}</Text>
                      <Text style={styles.celebrationStatLabel}>Kilometer</Text>
                    </View>
                    <View style={[styles.celebrationStat, { backgroundColor: '#10141A', borderColor: theme.subtleBorder }]}>
                      <Text style={[styles.celebrationStatVal, { color: '#FF3B30' }]}>{lastCompletedSession.averageHeartRate || '--'}</Text>
                      <Text style={styles.celebrationStatLabel}>Ø BPM</Text>
                    </View>
                    <View style={[styles.celebrationStat, { backgroundColor: '#10141A', borderColor: theme.subtleBorder }]}>
                      <Text style={[styles.celebrationStatVal, { color: '#FF9500' }]}>{Math.round(lastCompletedSession.caloriesBurned)}</Text>
                      <Text style={styles.celebrationStatLabel}>kcal</Text>
                    </View>
                  </View>

                  {lastCompletedSession.xpEarned && lastCompletedSession.xpEarned > 0 && (
                    <View style={[styles.celebrationXpBox, { backgroundColor: '#10141A', borderColor: theme.cardBorder }]}>
                      <Text style={[styles.celebrationXpText, { color: theme.accent }]}>
                        +{lastCompletedSession.xpEarned} {lastCompletedSession.type} XP
                      </Text>
                      
                      {(() => {
                        const levelData = getCardioLevelData(cardioXP[lastCompletedSession.type] || 0);
                        const progressPercent = Math.min(100, (levelData.progressXP / levelData.neededXP) * 100);
                        return (
                          <View style={{ width: '100%', marginTop: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ color: levelData.rankColor, fontWeight: '700' }}>Level {levelData.level}</Text>
                              <Text style={{ color: '#888', fontSize: 12 }}>{levelData.neededXP - levelData.progressXP} XP to go</Text>
                            </View>
                            <View style={styles.celebrationProgressBar}>
                              <View style={[styles.celebrationProgressFill, { width: `${progressPercent}%`, backgroundColor: levelData.rankColor }]} />
                            </View>
                          </View>
                        );
                      })()}
                    </View>
                  )}

                  {/* Iron Tactics Reward Banner */}
                  <View style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 215, 0, 0.08)',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 215, 0, 0.3)',
                    padding: 10,
                    marginBottom: 14,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <MaterialCommunityIcons name="sword-cross" size={16} color="#FFD700" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>IRON TACTICS TREIBSTOFF</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#1C1C24', paddingVertical: 6, borderRadius: 8, marginHorizontal: 2 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>⚡ +1</Text>
                        <Text style={{ color: '#A0A0B0', fontSize: 8, fontWeight: '600', marginTop: 1 }}>Pump</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#1C1C24', paddingVertical: 6, borderRadius: 8, marginHorizontal: 2 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>🥤 +1</Text>
                        <Text style={{ color: '#A0A0B0', fontSize: 8, fontWeight: '600', marginTop: 1 }}>Shake</Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#1C1C24', paddingVertical: 6, borderRadius: 8, marginHorizontal: 2 }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>🎖️ +40</Text>
                        <Text style={{ color: '#A0A0B0', fontSize: 8, fontWeight: '600', marginTop: 1 }}>Tactician XP</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.celebrationCloseBtn, { backgroundColor: theme.accent }]}
                    onPress={closeCelebrationAndExit}
                  >
                    <Text style={styles.celebrationCloseText}>Weiter</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0D1117' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerBtn: { padding: 6 },
  title: { color: 'white', fontSize: 19, fontWeight: '800' },
  btButton: {
    padding: 8,
    backgroundColor: '#1E242B',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  heroCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroCardValue: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroCardUnit: {
    fontSize: 16,
    fontWeight: '700',
  },
  heroCardSub: {
    color: '#8A99A8',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  telemetryCard: {
    width: '48.5%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  telemetryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  telemetryCardLabel: {
    color: '#8A99A8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginLeft: 5,
  },
  telemetryCardValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  telemetryCardUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A99A8',
  },
  compactMapCard: {
    height: 180,
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    marginBottom: 12,
  },
  compactMap: {
    width: '100%',
    height: '100%',
  },
  autoPauseBanner: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 159, 10, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },
  autoPauseText: { color: '#000', fontSize: 11, fontWeight: '800' },
  recenterMapBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingMapChip: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 17, 23, 0.90)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    zIndex: 10,
  },
  floatingMapChipText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  splitLivePill: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'center',
    marginBottom: 14,
    width: '100%',
  },
  splitLivePillText: { color: '#C5D1DE', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 140,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: { color: 'white', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  bgBadge: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  bgBadgeText: { color: '#30D158', fontSize: 11, fontWeight: '600' },
  celebrationOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', padding: 20 },
  celebrationCard: { borderRadius: 24, padding: 22, alignItems: 'center', borderWidth: 1 },
  celebrationTitle: { color: 'white', fontSize: 22, fontWeight: '800', marginBottom: 20 },
  celebrationStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', marginBottom: 18 },
  celebrationStat: { width: '48%', padding: 14, borderRadius: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1 },
  celebrationStatVal: { color: 'white', fontSize: 22, fontWeight: '800' },
  celebrationStatLabel: { color: '#888', fontSize: 11, fontWeight: '600', marginTop: 3 },
  celebrationXpBox: { width: '100%', padding: 14, borderRadius: 14, alignItems: 'center', marginBottom: 16, borderWidth: 1 },
  celebrationXpText: { fontSize: 18, fontWeight: '800' },
  celebrationProgressBar: { width: '100%', height: 8, backgroundColor: '#0D1117', borderRadius: 4, overflow: 'hidden' },
  celebrationProgressFill: { height: '100%', borderRadius: 4 },
  celebrationCloseBtn: { width: '100%', padding: 15, borderRadius: 100, alignItems: 'center' },
  celebrationCloseText: { color: '#000', fontSize: 15, fontWeight: '800' },
});
