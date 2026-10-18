const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

code = code.replace(
  `import { PRELOADED_EXERCISES`,
  `import { getHeartRateZoneColor } from '../utils/heartRate';\nimport { useCardioStore } from '../store/useCardioStore';\nimport { PRELOADED_EXERCISES`
);

code = code.replace(
  `  const {
    workoutPrograms,`,
  `  const maxHeartRateSetting = useCardioStore(state => state.maxHeartRateSetting);\n  const {
    workoutPrograms,`
);

code = code.replace(
  `        <View style={[styles.fullPageModal, { paddingTop: Math.max(insets.top + 10, 36) }]}>`,
  `        <View style={[
          styles.fullPageModal, 
          { paddingTop: Math.max(insets.top + 10, 36) },
          (isWatchConnected && heartRate > 0) && {
            borderWidth: 4,
            borderColor: getHeartRateZoneColor(heartRate, maxHeartRateSetting) || 'transparent',
            shadowColor: getHeartRateZoneColor(heartRate, maxHeartRateSetting) || 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 15,
            elevation: 10,
          }
        ]}>`
);

fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log('Done');
