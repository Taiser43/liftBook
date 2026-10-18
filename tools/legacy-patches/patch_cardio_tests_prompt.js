const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioTestsScreen.tsx', 'utf8');

code = code.replace(
  `import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';`,
  `import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';`
);

code = code.replace(
  `  const startTest = (testType: string) => {
    useAppStore.getState().setGlobalCardioSessionInfo('Running', testType);
    useAppStore.getState().setGlobalCardioModalVisible(true);
  };`,
  `  const startTest = (testType: string) => {
    const store = useAppStore.getState();
    if (store.globalCardioActive) {
      Alert.alert(
        "Active Session",
        "You already have a cardio session running. Do you want to finish and save it before starting a new test?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Finish & Start New", 
            onPress: () => {
              if (store.finishCurrentCardio) {
                store.finishCurrentCardio();
              }
              setTimeout(() => {
                store.setGlobalCardioSessionInfo('Running', testType);
                store.setGlobalCardioModalVisible(true);
              }, 300);
            } 
          }
        ]
      );
    } else {
      store.setGlobalCardioSessionInfo('Running', testType);
      store.setGlobalCardioModalVisible(true);
    }
  };`
);

fs.writeFileSync('src/screens/CardioTestsScreen.tsx', code);
console.log('Done');
