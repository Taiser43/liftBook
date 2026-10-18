const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTestsScreen.tsx', 'utf8');

if (!code.includes('Alert,')) {
  code = code.replace(
    `import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';`,
    `import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';`
  );
}

fs.writeFileSync('src/screens/CardioTestsScreen.tsx', code);
console.log('Done');
