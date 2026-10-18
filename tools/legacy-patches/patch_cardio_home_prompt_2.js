const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioHomeScreen.tsx', 'utf8');

code = code.replace(
  `    if (store.globalCardioActive) {
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
    } else {`,
  `    if (store.globalCardioActive) {
      Alert.alert(
        "Active Session",
        "You already have a cardio session running. Do you want to finish and save it before starting a new one?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Finish & Start New", 
            onPress: () => {
              if (store.finishCurrentCardio) store.finishCurrentCardio();
              setTimeout(() => {
                store.setGlobalCardioSessionInfo(selectedActivity, null);
                store.setGlobalCardioModalVisible(true);
              }, 300);
            } 
          }
        ]
      );
    } else if (store.globalActivePlan) {
      Alert.alert(
        "Active Strength Workout",
        "You have a strength workout running. Do you want to finish and save it first?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Finish & Start New", 
            onPress: () => {
              if (store.finishCurrentStrength) store.finishCurrentStrength();
              setTimeout(() => {
                store.setGlobalCardioSessionInfo(selectedActivity, null);
                store.setGlobalCardioModalVisible(true);
              }, 300);
            } 
          }
        ]
      );
    } else {`
);

fs.writeFileSync('src/screens/CardioHomeScreen.tsx', code);
console.log('Done');
