const fs = require('fs');
let code = fs.readFileSync('src/navigation/AppNavigator.tsx', 'utf8');

// Inject imports
if (!code.includes('useAppStore')) {
  code = code.replace(
    `import { View, StyleSheet, Platform } from 'react-native';`,
    `import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { useAppStore } from '../store/store';
import { useEffect } from 'react';
import ConfettiCannon from 'react-native-confetti-cannon';`
  );
}

// Inject hooks inside component
if (!code.includes('checkDailyReset')) {
  code = code.replace(
    `export default function AppNavigator() {`,
    `export default function AppNavigator() {
  const checkDailyReset = useAppStore(state => state.checkDailyReset);
  const triggerMacroConfetti = useAppStore(state => state.triggerMacroConfetti);
  const setTriggerMacroConfetti = useAppStore(state => state.setTriggerMacroConfetti);
  const triggerStreakConfetti = useAppStore(state => state.triggerStreakConfetti);
  const setTriggerStreakConfetti = useAppStore(state => state.setTriggerStreakConfetti);

  useEffect(() => {
    checkDailyReset();
  }, []);`
  );
}

fs.writeFileSync('src/navigation/AppNavigator.tsx', code);
