const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

code = code.replace(
  `  // START LIVE WORKOUT FULL-SCREEN
  const handleStartLiveWorkout = (plan: WorkoutPlan) => {
    if (globalActivePlan && globalActivePlan.id !== plan.id) {
      Alert.alert(`,
  `  // START LIVE WORKOUT FULL-SCREEN
  const handleStartLiveWorkout = (plan: WorkoutPlan) => {
    // Resume if it's the exact same plan already running
    if (globalActivePlan && globalActivePlan.id === plan.id) {
      setLiveWorkoutModalVisible(true);
      return;
    }

    if (globalActivePlan && globalActivePlan.id !== plan.id) {
      Alert.alert(`
);

fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log('Done');
