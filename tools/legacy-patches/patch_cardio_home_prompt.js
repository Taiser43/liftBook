const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioHomeScreen.tsx', 'utf8');

code = code.replace(
  `import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';`,
  `import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';`
);

code = code.replace(
  `  const startTracking = () => {
    if (!selectedActivity) return;
    useAppStore.getState().setGlobalCardioSessionInfo(selectedActivity, null);
    useAppStore.getState().setGlobalCardioModalVisible(true);
  };`,
  `  const startTracking = () => {
    if (!selectedActivity) return;
    
    const store = useAppStore.getState();
    if (store.globalCardioActive) {
      Alert.alert(
        "Active Session",
        "You already have a cardio session running. Do you want to finish and save it before starting a new one?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Finish & Start New", 
            onPress: () => {
              if (store.finishCurrentCardio) {
                store.finishCurrentCardio();
              }
              // Wait a bit for the state to clear, then start new
              setTimeout(() => {
                store.setGlobalCardioSessionInfo(selectedActivity, null);
                store.setGlobalCardioModalVisible(true);
              }, 300);
            } 
          }
        ]
      );
    } else {
      store.setGlobalCardioSessionInfo(selectedActivity, null);
      store.setGlobalCardioModalVisible(true);
    }
  };`
);

fs.writeFileSync('src/screens/CardioHomeScreen.tsx', code);
console.log('Done');
