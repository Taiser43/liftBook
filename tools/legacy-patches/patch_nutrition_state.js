const fs = require('fs');
let code = fs.readFileSync('src/screens/NutritionScreen.tsx', 'utf8');

// Add Alert import
code = code.replace(
  `import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';`,
  `import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';`
);

// Inject state
code = code.replace(
  `  const [managerVisible, setManagerVisible] = useState<'recipes' | 'ingredients' | null>(null);`,
  `  const [managerVisible, setManagerVisible] = useState<'recipes' | 'ingredients' | null>(null);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [quickScanModalVisible, setQuickScanModalVisible] = useState(false);`
);

// Fix TS implicitly any for 'val' in Alert
code = code.replace(
  `{ text: "Log", onPress: (val) => {`,
  `{ text: "Log", onPress: (val: string | undefined) => {`
);

fs.writeFileSync('src/screens/NutritionScreen.tsx', code);
