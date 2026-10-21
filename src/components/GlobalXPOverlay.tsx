import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, runOnJS, Easing } from 'react-native-reanimated';
import { useAppStore } from '../store/store';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getLevelData } from '../utils/gamification';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAppTheme } from '../utils/theme';

const { width, height } = Dimensions.get('window');

// Particles flying to the banner
const XPParticle = ({ id, startX, startY, amount, targetY, onComplete }: any) => {
  const translateX = useSharedValue(startX);
  const translateY = useSharedValue(startY);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    // Initial pop
    scale.value = withSpring(1.5, { damping: 10, stiffness: 100 });
    
    // Target is the top banner center
    const targetX = width / 2;

    translateX.value = withDelay(300, withTiming(targetX, { duration: 600, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }));
    translateY.value = withDelay(300, withTiming(targetY, { duration: 600, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }));
    scale.value = withDelay(300, withTiming(0.5, { duration: 600 }));
    opacity.value = withDelay(800, withTiming(0, { duration: 100 }, () => {
      runOnJS(onComplete)(id, amount);
    }));
  }, []);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 1000,
  }));

  return (
    <Animated.View style={style}>
      <MaterialCommunityIcons name="star" size={16} color="#000" />
      <Text style={styles.xpText}>+{amount} XP</Text>
    </Animated.View>
  );
};

export const GlobalXPOverlay = () => {
  const xpEvent = useAppStore(state => state.xpEvent);
  const totalXP = useAppStore(state => state.totalXP) || 0;
  const accentThemeId = useAppStore(state => state.accentThemeId);
  const theme = getAppTheme(accentThemeId);
  const insets = useSafeAreaInsets();
  const [particles, setParticles] = useState<any[]>([]);
  
  // Banner State
  const [bannerVisible, setBannerVisible] = useState(false);
  const [visualXP, setVisualXP] = useState(totalXP);
  const bannerTranslateY = useSharedValue(-150);
  
  const levelData = getLevelData(visualXP);
  
  // Hide timer
  useEffect(() => {
    let timeout: any;
    if (bannerVisible && particles.length === 0) {
       timeout = setTimeout(() => {
          bannerTranslateY.value = withTiming(-150, { duration: 400 });
          setTimeout(() => setBannerVisible(false), 400);
       }, 2000);
    }
    return () => clearTimeout(timeout);
  }, [bannerVisible, particles.length]);

  useEffect(() => {
    if (xpEvent) {
      if (!bannerVisible) {
        setVisualXP(totalXP - xpEvent.amount); // Show old XP before particles hit
        setBannerVisible(true);
        bannerTranslateY.value = withSpring(insets.top + 10, { damping: 15, stiffness: 100 });
      }
      setParticles(prev => [...prev, xpEvent]);
    }
  }, [xpEvent]);

  const onParticleComplete = (id: number, amount: number) => {
    setParticles(prev => prev.filter(p => p.id !== id));
    setVisualXP(prev => prev + amount);
  };

  const bannerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bannerTranslateY.value }],
    opacity: bannerTranslateY.value > -50 ? 1 : 0,
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {bannerVisible && (
        <Animated.View style={[styles.banner, { backgroundColor: theme.cardBg || '#1E1E20', borderColor: theme.cardBorder || '#333', shadowColor: theme.accent || '#000' }, bannerStyle]}>
          <View style={styles.bannerRow}>
            <View style={[styles.badge, { borderColor: levelData.rankColor }]}>
              <MaterialCommunityIcons name="shield-star" size={24} color={levelData.rankColor} />
            </View>
            <View style={styles.bannerInfo}>
              <Text style={[styles.rankText, { color: levelData.rankColor }]}>{levelData.title}</Text>
              <Text style={styles.levelText}>Level {levelData.level}</Text>
              <View style={styles.barContainer}>
                <View style={[styles.barFill, { backgroundColor: levelData.rankColor, width: `${Math.min(100, (levelData.progressXP / levelData.neededXP) * 100)}%` }]} />
              </View>
              <Text style={styles.progressText}>{levelData.progressXP} / {levelData.neededXP} XP</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {particles.map(p => (
        <XPParticle 
          key={p.id} 
          id={p.id} 
          startX={p.sourceX} 
          startY={p.sourceY} 
          amount={p.amount} 
          targetY={insets.top + 30}
          onComplete={onParticleComplete} 
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    backgroundColor: '#1E1E20',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 900,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A2A',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerInfo: {
    flex: 1,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  levelText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  barContainer: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: '#888',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },
  xpText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 14,
  }
});
