const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');

code = code.replace(
  `import { useCardioStore, CardioActivityType, CardioSession } from '../store/useCardioStore';`,
  `import { useCardioStore, CardioActivityType, CardioSession } from '../store/useCardioStore';\nimport { getHeartRateZoneColor } from '../utils/heartRate';`
);

code = code.replace(
  `  const setGlobalCardioModalVisible = useAppStore(state => state.setGlobalCardioModalVisible);`,
  `  const setGlobalCardioModalVisible = useAppStore(state => state.setGlobalCardioModalVisible);\n  const maxHeartRateSetting = useCardioStore(state => state.maxHeartRateSetting);`
);

code = code.replace(
  `<SafeAreaView style={styles.safeArea}>`,
  `<SafeAreaView style={[
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
      ]}>`
);

fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', code);
console.log('Done');
