const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioHomeScreen.tsx', 'utf8');

// Add import
code = code.replace(
  `import { useCardioStore, CardioActivityType } from '../store/useCardioStore';`,
  `import { useCardioStore, CardioActivityType } from '../store/useCardioStore';\nimport { useAppStore } from '../store/store';`
);

// Replace navigate
code = code.replace(
  `navigation.navigate('CardioTracking', { activityType: selectedActivity });`,
  `useAppStore.getState().setGlobalCardioSessionInfo(selectedActivity, null);\n    useAppStore.getState().setGlobalCardioModalVisible(true);`
);

fs.writeFileSync('src/screens/CardioHomeScreen.tsx', code);
console.log('Done');
