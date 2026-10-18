import React, { useState, useEffect, useRef } from 'react';
import { Buffer } from 'buffer';
import { View, Text, StyleSheet, TouchableOpacity, AppState, AppStateStatus, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import haversine from 'haversine';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppStore } from '../store/store';
import { useCardioStore, CardioActivityType, CardioSession } from '../store/useCardioStore';
import { getHeartRateZoneColor } from '../utils/heartRate';
import { getCardioLevelData } from '../utils/gamification';
import { useHeartRateMonitor } from '../hooks/useHeartRateMonitor';

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


  // ── Session state ────────────────────────────────────────────────────────────
  const [isTracking, setIsTracking] = useState(false);
  const [coordinates, setCoordinates] = useState<BgCoord[]>([]);
  const [distance, setDistance] = useState(0);       // metres
  const [duration, setDuration] = useState(0);       // seconds
  const [calories, setCalories] = useState(0);

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

  // ── Haversine helper ─────────────────────────────────────────────────────────
  const calcDistanceBetween = (a: BgCoord, b: BgCoord): number =>
    haversine(
      { latitude: a.latitude, longitude: a.longitude },
      { latitude: b.latitude, longitude: b.longitude },
      { unit: 'meter' }
    ) || 0;

  // ── Foreground location fallback (when app is open) ─────────────────────────
  const fgSubRef = useRef<Location.LocationSubscription | null>(null);

  // ── App foreground: sync BG coords ──────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active' &&
        isTracking
      ) {
        // App came back to foreground – pull background coords
        await syncBgCoords();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [isTracking]);

  const syncBgCoords = async () => {
    const bgCoords = await readBgCoords();
    if (bgCoords.length === 0) return;
    setCoordinates(prev => {
      const merged = [...prev];
      let extra = 0;
      for (const c of bgCoords) {
        const last = merged[merged.length - 1];
        if (last) extra += calcDistanceBetween(last, c);
        merged.push(c);
      }
      setDistance(d => d + extra);
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
    if (duration === 0) {
      setCoordinates([]);
      setDistance(0);
      setDuration(0);
      setCalories(0);
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
        const newCoord: BgCoord = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp,
          speed: loc.coords.speed,
          heartRate: currentHRRef.current,
        };
        setCoordinates(prev => {
          if (prev.length > 0) {
            const dist = calcDistanceBetween(prev[prev.length - 1], newCoord);
            setDistance(d => d + dist);
          }
          return [...prev, newCoord];
        });
      }
    );
    fgSubRef.current = sub;

    // Also start background task so GPS continues when screen goes off
    await startBgLocationTracking();
    
    lastTickTimeRef.current = Date.now();

    // Seconds timer – also syncs global state for mini-player
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const deltaSeconds = (now - lastTickTimeRef.current) / 1000;
      lastTickTimeRef.current = now;
      
      const newDur = Math.floor((now - startTimestampRef.current!) / 1000) + pausedDurationRef.current;
      setDuration(newDur);
      
      setDistance(d => {
        const spd = newDur > 0 ? (d / 1000) / (newDur / 3600) : 0;
        setGlobalCardioSession(true, newDur, d, spd);
        return d;
      });
      
      // Calculate calories based on time passed since last tick, so background suspensions don't lose calories
      const hr = currentHRRef.current;
      const currentCalRatePerSecond = (hr > 80 ? hr * 0.06 : 10) / 60; // Slightly increased multiplier for realistic values (e.g. ~140bpm = ~8.4 kcal/min)
      setCalories(prev => prev + (deltaSeconds * currentCalRatePerSecond));
      
      if (hr > 0) {
        setHrHistory(h => [...h.slice(-180), hr]);
      }
    }, 1000);
  };


  // ── Pause tracking ───────────────────────────────────────────────────────────
  const pauseTracking = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (fgSubRef.current) { fgSubRef.current.remove(); fgSubRef.current = null; }
    if (startTimestampRef.current) {
      pausedDurationRef.current += Math.floor((Date.now() - startTimestampRef.current!) / 1000);
      startTimestampRef.current = null;
    }
    // Note: background task keeps running so GPS coords still accumulate
    setIsTracking(false);
  };


  const finishWorkout = async (skipNavigation = false) => {
    pauseTracking();
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

    const session: CardioSession = {
      id: Date.now().toString(),
      type: activityType,
      date: new Date().toISOString(),
      durationSeconds: duration,
      distanceMeters: distance,
      caloriesBurned: Math.floor(calories),
      averageHeartRate: trueAvgHR,
      maxHeartRate: trueMaxHR,
      maxSpeed: trueMaxSpeed > 0 ? (trueMaxSpeed * 3.6) : undefined, // Convert m/s to km/h
      routeCoordinates: coordinates.map(c => ({
        latitude: c.latitude,
        longitude: c.longitude,
        timestamp: c.timestamp,
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
        (currentHR > 0) && {
          borderWidth: 4,
          borderColor: getHeartRateZoneColor(currentHR, maxHeartRateSetting) || 'transparent',
          shadowColor: getHeartRateZoneColor(currentHR, maxHeartRateSetting) || 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 15,
          elevation: 10,
        }
      ]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setGlobalCardioModalVisible(false)} style={{ padding: 8 }}>
          <MaterialCommunityIcons name="chevron-down" size={28} color="#00D2FF" />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>{activityType}</Text>
          {isTracking && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#30D158', marginRight: 5 }} />
              <Text style={{ color: '#30D158', fontSize: 11, fontWeight: '700' }}>LIVE</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={connectToHRMonitor} style={styles.btButton}>
          <MaterialCommunityIcons
            name="watch-variant"
            size={24}
            color={isWatchConnected ? '#30D158' : 'white'}
          />
        </TouchableOpacity>
      </View>


      {/* Map */}
      <View style={styles.mapContainer}>
        {coordinates.length > 0 ? (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: coordinates[0].latitude,
              longitude: coordinates[0].longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation
            followsUserLocation
            customMapStyle={darkMapStyle}
          >
            <Polyline
              coordinates={coordinates.map(c => ({ latitude: c.latitude, longitude: c.longitude }))}
              strokeColor="#00D2FF"
              strokeWidth={5}
            />
          </MapView>
        ) : (
          <View style={styles.noMap}>
            {isTracking ? (
              <>
                <MaterialCommunityIcons name="satellite-uplink" size={40} color="#00D2FF" />
                <Text style={styles.noMapText}>Acquiring GPS signal…</Text>
              </>
            ) : (
              <Text style={styles.noMapText}>Press START to begin tracking</Text>
            )}
          </View>
        )}
      </View>

      {/* Metrics */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{formatTime(duration)}</Text>
            <Text style={styles.metricLabel}>TIME</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{(distance / 1000).toFixed(2)}</Text>
            <Text style={styles.metricLabel}>KM</Text>
          </View>
        </View>
        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{paceStr}</Text>
            <Text style={styles.metricLabel}>MIN/KM</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{speedKmH.toFixed(1)}</Text>
            <Text style={styles.metricLabel}>KM/H</Text>
          </View>
          <View style={styles.metric}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              {currentHR > 0 ? (
                <>
                  <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                    <MaterialCommunityIcons name="heart" color="#FF3B30" size={22} />
                  </Animated.View>
                  <Text style={styles.metricValue}>{' '}{currentHR}</Text>
                </>
              ) : <Text style={styles.metricValue}>--</Text>}
            </View>
            <Text style={styles.metricLabel}>BPM</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{Math.floor(calories)}</Text>
            <Text style={styles.metricLabel}>KCAL</Text>
          </View>
        </View>


        {/* Controls */}
        <View style={styles.controls}>
          {!isTracking && duration === 0 && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#30D158' }]} onPress={startTracking}>
              <Text style={styles.btnText}>START</Text>
            </TouchableOpacity>
          )}
          {isTracking && (
            <>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: '#FF9500', flex: 1, marginRight: 10 }]}
                onPress={pauseTracking}
              >
                <Text style={styles.btnText}>PAUSE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: '#1E1E1E', flex: 1 }]}
                onPress={() => finishWorkout()}
              >
                <Text style={styles.btnText}>FINISH</Text>
              </TouchableOpacity>
            </>
          )}
          {!isTracking && duration > 0 && (
            <>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: '#30D158', flex: 1, marginRight: 10 }]}
                onPress={startTracking}
              >
                <Text style={styles.btnText}>RESUME</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: '#1E1E1E', flex: 1 }]}
                onPress={() => finishWorkout()}
              >
                <Text style={styles.btnText}>FINISH</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Background indicator */}
        {isTracking && (
          <View style={styles.bgBadge}>
            <MaterialCommunityIcons name="wifi" size={12} color="#30D158" />
            <Text style={styles.bgBadgeText}> GPS tracking active in background</Text>
          </View>
        )}
      </View>

      {/* CELEBRATION MODAL */}
      <Modal visible={celebrationModalVisible} animationType="slide" transparent={true}>
        <View style={styles.celebrationOverlay}>
          <View style={styles.celebrationCard}>
            {lastCompletedSession && (
              <>
                <MaterialCommunityIcons name="party-popper" size={48} color="#FFD700" style={{ marginBottom: 16 }} />
                <Text style={styles.celebrationTitle}>Workout Complete!</Text>
                
                <View style={styles.celebrationStatsGrid}>
                  <View style={styles.celebrationStat}>
                    <Text style={styles.celebrationStatVal}>{Math.floor(lastCompletedSession.durationSeconds / 60)}</Text>
                    <Text style={styles.celebrationStatLabel}>Min</Text>
                  </View>
                  <View style={styles.celebrationStat}>
                    <Text style={styles.celebrationStatVal}>{(lastCompletedSession.distanceMeters / 1000).toFixed(2)}</Text>
                    <Text style={styles.celebrationStatLabel}>Km</Text>
                  </View>
                  <View style={styles.celebrationStat}>
                    <Text style={styles.celebrationStatVal}>{lastCompletedSession.averageHeartRate}</Text>
                    <Text style={styles.celebrationStatLabel}>BPM</Text>
                  </View>
                  <View style={styles.celebrationStat}>
                    <Text style={styles.celebrationStatVal}>{lastCompletedSession.caloriesBurned}</Text>
                    <Text style={styles.celebrationStatLabel}>kcal</Text>
                  </View>
                </View>

                {lastCompletedSession.xpEarned && lastCompletedSession.xpEarned > 0 && (
                  <View style={styles.celebrationXpBox}>
                    <Text style={styles.celebrationXpText}>+{lastCompletedSession.xpEarned} {lastCompletedSession.type} XP</Text>
                    
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

                <TouchableOpacity style={styles.celebrationCloseBtn} onPress={closeCelebrationAndExit}>
                  <Text style={styles.celebrationCloseText}>Continue</Text>
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
  safeArea: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center' },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  btButton: { padding: 10, backgroundColor: '#1E1E1E', borderRadius: 50 , marginBottom: 12 },
  mapContainer: { flex: 1, backgroundColor: '#1E1E1E' },
  map: { width: '100%', height: '100%' },
  noMap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  noMapText: { color: '#888', fontSize: 15 },
  metricsContainer: { padding: 20, backgroundColor: '#121212', borderTopWidth: 1, borderColor: '#282828' },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metric: { alignItems: 'center', flex: 1 },
  metricValue: { color: 'white', fontSize: 28, fontWeight: 'bold' },
  metricLabel: { color: '#888', fontSize: 12, marginTop: 4, fontWeight: '600' },
  controls: { flexDirection: 'row', justifyContent: 'center' },
  btn: { paddingVertical: 18, paddingHorizontal: 40, borderRadius: 100, alignItems: 'center', minWidth: 150 },
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  bgBadge: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  bgBadgeText: { color: '#30D158', fontSize: 11, fontWeight: '600' },
  celebrationOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  celebrationCard: { backgroundColor: '#1E1E1E', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  celebrationTitle: { color: 'white', fontSize: 24, fontWeight: '800', marginBottom: 24 },
  celebrationStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', marginBottom: 24 },
  celebrationStat: { width: '48%', backgroundColor: '#121212', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  celebrationStatVal: { color: 'white', fontSize: 24, fontWeight: '800' },
  celebrationStatLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginTop: 4 },
  celebrationXpBox: { width: '100%', backgroundColor: '#2A2A2A', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#444' },
  celebrationXpText: { color: '#00D2FF', fontSize: 20, fontWeight: '800' },
  celebrationProgressBar: { width: '100%', height: 8, backgroundColor: '#121212', borderRadius: 4, overflow: 'hidden' },
  celebrationProgressFill: { height: '100%', borderRadius: 4 },
  celebrationCloseBtn: { backgroundColor: '#00D2FF', width: '100%', padding: 16, borderRadius: 100, alignItems: 'center' , marginBottom: 12 },
  celebrationCloseText: { color: '#000', fontSize: 16, fontWeight: '800' },
});
