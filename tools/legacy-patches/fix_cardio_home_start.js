const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioHomeScreen.tsx', 'utf8');
code = code.replace(
  `  const handleStart = () => {
    useAppStore.getState().setGlobalCardioSessionInfo(selectedActivity, null);
    useAppStore.getState().setGlobalCardioModalVisible(true);
  };`,
  `  const handleStart = () => {
    const store = useAppStore.getState();
    if (store.globalCardioActive) {
      // If same activity, just open the modal to resume
      if (store.globalCardioActivityType === selectedActivity) {
        store.setGlobalCardioModalVisible(true);
        return;
      }
      
      import('react-native').then(({ Alert }) => {
        Alert.alert(
          "Active Session",
          "You already have a cardio session running. Do you want to finish and save it before starting a new one?",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Finish & Start New", 
              onPress: () => {
                if (store.finishCurrentCardio) store.finishCurrentCardio(true);
                setTimeout(() => {
                  store.setGlobalCardioSessionInfo(selectedActivity, null);
                  store.setGlobalCardioModalVisible(true);
                }, 300);
              } 
            }
          ]
        );
      });
    } else if (store.globalActivePlan) {
      import('react-native').then(({ Alert }) => {
        Alert.alert(
          "Active Strength Workout",
          "You have a strength workout running. Do you want to finish and save it first?",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Finish & Start New", 
              onPress: () => {
                if (store.finishCurrentStrength) store.finishCurrentStrength(true);
                setTimeout(() => {
                  store.setGlobalCardioSessionInfo(selectedActivity, null);
                  store.setGlobalCardioModalVisible(true);
                }, 300);
              } 
            }
          ]
        );
      });
    } else {
      store.setGlobalCardioSessionInfo(selectedActivity, null);
      store.setGlobalCardioModalVisible(true);
    }
  };`
);
fs.writeFileSync('src/screens/CardioHomeScreen.tsx', code);
console.log('Done');
