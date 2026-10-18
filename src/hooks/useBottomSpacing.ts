import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useCardioStore } from '../store/useCardioStore';

export const useBottomSpacing = (extraPadding = 20) => {
  const insets = useSafeAreaInsets();
  
  let tabBarHeight = 60; // fallback
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch (e) {
    // If not inside a bottom tab navigator, ignore.
  }
  
  const globalCardioSessionActive = false;
  const miniPlayerHeight = globalCardioSessionActive ? 70 : 0;
  
  return Math.max(insets.bottom, 20) + tabBarHeight + miniPlayerHeight + extraPadding;
};
