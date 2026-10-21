import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CardioHomeScreen from '../screens/CardioHomeScreen';
import CardioTrackingScreen from '../screens/CardioTrackingScreen';
import { getHeartRateZoneColor } from '../utils/heartRate';
import CardioHistoryScreen from '../screens/CardioHistoryScreen';
import CardioSessionDetailScreen from '../screens/CardioSessionDetailScreen';
import WorkoutHistoryScreen from '../screens/WorkoutHistoryScreen';
import CoreLibraryScreen from '../screens/CoreLibraryScreen';
import CoreDetailScreen from '../screens/CoreDetailScreen';
import StretchingLibraryScreen from '../screens/StretchingLibraryScreen';
import StretchingDetailScreen from '../screens/StretchingDetailScreen';
import CustomAlert from '../components/CustomAlert';
import { getAppTheme } from '../utils/theme';
import CardioTestsScreen from '../screens/CardioTestsScreen';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlobalNotepad } from '../components/GlobalNotepad';
import { GlobalActivityBar } from '../components/GlobalActivityBar';
import { View, StyleSheet, Platform, Dimensions, TouchableOpacity, Text, Alert, AppState, Linking } from 'react-native';
import { useAppStore } from '../store/store';
import { useCardioStore } from '../store/useCardioStore';
import { useEffect } from 'react';
import ConfettiCannon from 'react-native-confetti-cannon';

import HomeScreen from '../screens/HomeScreen';
import TrainingScreen from '../screens/TrainingScreen';
import NutritionScreen from '../screens/NutritionScreen';
import SupplementsScreen from '../screens/SupplementsScreen';
import SupplementLibraryScreen from '../screens/SupplementLibraryScreen';
import SupplementPlansScreen from '../screens/SupplementPlansScreen';
import StatsScreen from '../screens/StatsScreen';
import LevelUpModal from '../components/LevelUpModal';
import { IronTacticsShell } from '../screens/ironTactics/IronTacticsShell';


const Stack = createNativeStackNavigator();
const Tab = createMaterialTopTabNavigator();

function MainTabs() {
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);

  return (
    <Tab.Navigator
        tabBarPosition="bottom"
        screenOptions={({ route }) => ({
          swipeEnabled: true,
          animationEnabled: true,
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: '#777777',
          tabBarShowIcon: true,
          tabBarIndicatorStyle: {
            backgroundColor: theme.accent,
            top: 0,
            height: 3,
            borderRadius: 2
          },
          tabBarStyle: {
            backgroundColor: theme.subCardBg || '#181818',
            borderTopWidth: 1,
            borderTopColor: theme.subtleBorder || '#282828',
            elevation: 8,
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 6,
            height: Platform.OS === 'ios' ? 76 : 64,
            paddingBottom: Platform.OS === 'ios' ? 14 : 4,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            textTransform: 'none',
            marginTop: 2,
          },
          tabBarIcon: ({ focused, color }) => {
            let iconName: any = 'home';

            if (route.name === 'Home') {
              iconName = focused ? 'home-variant' : 'home-variant-outline';
            } else if (route.name === 'Training') {
              iconName = 'dumbbell';
            } else if (route.name === 'Nutrition') {
              iconName = focused ? 'food-apple' : 'food-apple-outline';
            } else if (route.name === 'Supplements') {
              iconName = 'pill';
            } else if (route.name === 'Stats') {
              iconName = focused ? 'book-open-variant' : 'book-open-outline';
            } else if (route.name === 'Cardio') {
              iconName = 'run';
            }

            return <MaterialCommunityIcons name={iconName} size={21} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Training" component={TrainingScreen} />
        <Tab.Screen name="Nutrition" component={NutritionScreen} />
        <Tab.Screen name="Cardio" component={CardioHomeScreen} />
        <Tab.Screen name="Supplements" component={SupplementsScreen} />
        <Tab.Screen name="Stats" component={StatsScreen} />
      </Tab.Navigator>
  );
}


export default function AppNavigator() {
  const checkDailyReset = useAppStore(state => state.checkDailyReset);
  const triggerMacroConfetti = useAppStore(state => state.triggerMacroConfetti);
  const setTriggerMacroConfetti = useAppStore(state => state.setTriggerMacroConfetti);
  const triggerStreakConfetti = useAppStore(state => state.triggerStreakConfetti);
  const setTriggerStreakConfetti = useAppStore(state => state.setTriggerStreakConfetti);
  const totalXP = useAppStore(state => state.totalXP);
  const addXP = useAppStore(state => state.addXP);
  const workoutHistory = useAppStore(state => state.workoutHistory);
  const nutritionHistory = useAppStore(state => state.nutritionHistory);

  // Global Workout State
  const globalActivePlan = useAppStore(state => state.globalActivePlan);
  const globalWorkoutDuration = useAppStore(state => state.globalWorkoutDuration);
  const globalRestTimeLeft = useAppStore(state => state.globalRestTimeLeft);
  const globalLiveWorkoutModalVisible = useAppStore(state => state.globalLiveWorkoutModalVisible);
  const setGlobalLiveWorkoutModalVisible = useAppStore(state => state.setGlobalLiveWorkoutModalVisible);
  const setGlobalActivePlan = useAppStore(state => state.setGlobalActivePlan);

  // Global Cardio Mini-Player
  const globalCardioActive = useAppStore(state => state.globalCardioActive);
  const globalCardioActivityType = useAppStore(state => state.globalCardioActivityType);
  const globalCardioDuration = useAppStore(state => state.globalCardioDuration);
  const globalCardioDistance = useAppStore(state => state.globalCardioDistance);
  const globalCardioSpeed = useAppStore(state => state.globalCardioSpeed);
  const setGlobalCardioSession = useAppStore(state => state.setGlobalCardioSession);
  const setGlobalCardioModalVisible = useAppStore(state => state.setGlobalCardioModalVisible);
  const globalCardioModalVisible = useAppStore(state => state.globalCardioModalVisible);
  
  const currentHeartRate = useAppStore(state => state.currentHeartRate) || 0;
  const connectedDeviceId = useAppStore(state => state.connectedDeviceId);
  const isWatchConnected = !!connectedDeviceId;
  const maxHeartRateSetting = useCardioStore(state => state.maxHeartRateSetting) || 190;


  const getCardioIcon = (type: string) => {
    switch (type) {
      case 'Running': return 'run';
      case 'Cycling': return 'bike';
      case 'Walking': return 'walk';
      case 'Swimming': return 'swim';
      case 'Boxing': return 'boxing-glove';
      case 'Football': return 'soccer';
      case 'Paddle': return 'tennis';
      default: return 'heart-pulse';
    }
  };

  useEffect(() => {
    // Check on mount
    checkDailyReset();

    // Check when returning from background
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkDailyReset();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkDailyReset]);
  useEffect(() => {
    import('expo-notifications').then((Notifications) => {
      const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data?.action === 'open_workout') {
          if (navigationRef.isReady()) {
            (navigationRef as any).navigate('MainTabs', { screen: 'Training' } as any);
          }
          useAppStore.getState().setGlobalLiveWorkoutModalVisible(true);
        }
      });
      return () => subscription.remove();
    });
  }, []);

  // Handle Deep Linking from Android Home-Screen Widgets
  useEffect(() => {
    let isMounted = true;
    const handleDeepLink = (url: string | null) => {
      if (!url || !isMounted) return;
      if (url.includes('scan')) {
        useAppStore.getState().setOpenBarcodeScannerOnMount(true);
        if (navigationRef.isReady()) {
          (navigationRef as any).navigate('MainTabs', { screen: 'Nutrition' });
        }
      } else if (url.includes('nutrition')) {
        if (navigationRef.isReady()) {
          (navigationRef as any).navigate('MainTabs', { screen: 'Nutrition' });
        }
      }
    };

    Linking.getInitialURL().then(handleDeepLink);
    const sub = Linking.addEventListener('url', (event: { url: string }) => handleDeepLink(event.url));
    return () => {
      isMounted = false;
      sub.remove();
    };
  }, []);

  const linking = {
    prefixes: ['ironlog://', 'https://ironlog.app'],
    config: {
      screens: {
        MainTabs: {
          screens: {
            Home: 'home',
            Training: 'training',
            Nutrition: 'nutrition',
            Cardio: 'cardio',
            Supplements: 'supplements',
            Stats: 'stats',
          },
        },
      },
    },
  };

  return (
    <View style={{ flex: 1 }}>
      <CustomAlert />
      <LevelUpModal />
      <NavigationContainer theme={DarkTheme} ref={navigationRef} linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="CardioHistory" component={CardioHistoryScreen} />
          <Stack.Screen name="CardioSessionDetail" component={CardioSessionDetailScreen} />
          <Stack.Screen name="WorkoutHistory" component={WorkoutHistoryScreen} />
          <Stack.Screen name="CardioTests" component={CardioTestsScreen} />
          <Stack.Screen name="CoreLibrary" component={CoreLibraryScreen} />
          <Stack.Screen name="CoreDetail" component={CoreDetailScreen} />
          <Stack.Screen name="StretchingLibrary" component={StretchingLibraryScreen} />
          <Stack.Screen name="StretchingDetail" component={StretchingDetailScreen} />
          <Stack.Screen name="SupplementLibrary" component={SupplementLibraryScreen} />
          <Stack.Screen name="SupplementPlans" component={SupplementPlansScreen} />
          <Stack.Screen name="IronTactics" component={IronTacticsShell} options={{ animation: 'slide_from_bottom' }} />
        </Stack.Navigator>
      </NavigationContainer>

      {triggerMacroConfetti && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
          <ConfettiCannon
            count={200}
            origin={{ x: Dimensions.get('window').width / 2, y: -20 }}
            fadeOut={true}
            fallSpeed={3000}
            onAnimationEnd={() => setTriggerMacroConfetti(false)}
          />
        </View>
      )}

      {triggerStreakConfetti && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
          <ConfettiCannon
            count={300}
            origin={{ x: Dimensions.get('window').width / 2, y: -20 }}
            fadeOut={true}
            fallSpeed={3000}
            colors={['#FFD700', '#FF8C00', '#FF3B30', '#00D2FF', '#30D158']}
            onAnimationEnd={() => setTriggerStreakConfetti(false)}
          />
        </View>
      )}

      <CardioTrackingScreen navigation={navigationRef} />
      <GlobalActivityBar navigationRef={navigationRef} />
      <GlobalNotepad navigationRef={navigationRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  miniPlayerContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 74, // Above bottom tab bar
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
  pulsingDot: {
    backgroundColor: '#FF453A',
  },
});
