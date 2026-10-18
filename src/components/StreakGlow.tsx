import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { getLevelTierInfo } from '../utils/levels';

interface Props {
  streak: number;
  children: React.ReactNode;
}

export const StreakGlow: React.FC<Props> = ({ streak, children }) => {
  const months = Math.floor(streak / 30);
  
  // No glow if less than 30 days
  if (months < 1) {
    return <View>{children}</View>;
  }

  // Determine color based on months
  let color = '#CD7F32'; // Default Bronze
  if (months >= 5) color = '#E51400'; // Challenger
  else if (months === 4) color = '#50C878'; // Emerald
  else if (months === 3) color = '#FFD700'; // Gold
  else if (months === 2) color = '#C0C0C0'; // Silver

  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    top: -10, left: -10, right: -10, bottom: -10,
    backgroundColor: color,
    borderRadius: 100,
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 10,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={animatedStyle} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
