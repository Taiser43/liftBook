const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTestsScreen.tsx', 'utf8');
code = code.replace(
  `import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';\\nimport { useAppStore } from '../store/store';`,
  `import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';\nimport { useAppStore } from '../store/store';`
);
fs.writeFileSync('src/screens/CardioTestsScreen.tsx', code);
