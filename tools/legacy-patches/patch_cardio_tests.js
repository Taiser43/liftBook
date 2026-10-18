const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTestsScreen.tsx', 'utf8');

// Add import
code = code.replace(
  `import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';`,
  `import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';\nimport { useAppStore } from '../store/store';`
);

// Replace navigate
code = code.replace(
  `navigation.navigate('CardioTracking', { activityType: 'Running', testType });`,
  `useAppStore.getState().setGlobalCardioSessionInfo('Running', testType);\n    useAppStore.getState().setGlobalCardioModalVisible(true);`
);

fs.writeFileSync('src/screens/CardioTestsScreen.tsx', code);
console.log('Done');
