const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

// Also register finishCurrentStrength
code = code.replace(
  `  const setGlobalRestTimeLeft = useAppStore(state => state.setGlobalRestTimeLeft);`,
  `  const setGlobalRestTimeLeft = useAppStore(state => state.setGlobalRestTimeLeft);
  const setFinishCurrentStrength = useAppStore(state => state.setFinishCurrentStrength);
  const finishCurrentCardio = useAppStore(state => state.finishCurrentCardio);
  const globalCardioActive = useAppStore(state => state.globalCardioActive);
  const globalActivePlan = useAppStore(state => state.globalActivePlan);`
);

// Register it
code = code.replace(
  `  // Sync to Global Store for Mini-Player everywhere and update persistent notification`,
  `  // Register finish to global store
  useEffect(() => {
    setFinishCurrentStrength(() => handleFinishLiveWorkout);
  });

  // Sync to Global Store for Mini-Player everywhere and update persistent notification`
);

// Replace handleStartLiveWorkout
code = code.replace(
  `  // START LIVE WORKOUT FULL-SCREEN
  const handleStartLiveWorkout = (plan: WorkoutPlan) => {
    setActivePlan(plan);
    setWorkoutDuration(0);
    setWorkoutStartTime(Date.now());
    setRestTimeLeft(null);
    setRestEndTime(null);`,
  `  // START LIVE WORKOUT FULL-SCREEN
  const handleStartLiveWorkout = (plan: WorkoutPlan) => {
    if (globalActivePlan && globalActivePlan.id !== plan.id) {
      Alert.alert(
        "Active Strength Workout",
        "You already have a strength workout running. Finish and save it first?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Finish & Start New", onPress: () => {
              handleFinishLiveWorkout();
              setTimeout(() => startFreshStrengthWorkout(plan), 300);
            }
          }
        ]
      );
      return;
    } else if (globalCardioActive) {
      Alert.alert(
        "Active Cardio Session",
        "You have a cardio session running. Finish and save it first?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Finish & Start New", onPress: () => {
              if (finishCurrentCardio) finishCurrentCardio();
              setTimeout(() => startFreshStrengthWorkout(plan), 300);
            }
          }
        ]
      );
      return;
    }
    
    startFreshStrengthWorkout(plan);
  };

  const startFreshStrengthWorkout = (plan: WorkoutPlan) => {
    setActivePlan(plan);
    setWorkoutDuration(0);
    setWorkoutStartTime(Date.now());
    setRestTimeLeft(null);
    setRestEndTime(null);`
);

fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log('Done');
