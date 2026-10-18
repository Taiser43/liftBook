const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

code = code.replace(
  `  const { 
  const maxHeartRateSetting = useCardioStore(state => state.maxHeartRateSetting);
    workoutPlans: legacyWorkoutPlans, `,
  `  const maxHeartRateSetting = useCardioStore(state => state.maxHeartRateSetting);\n  const { 
    workoutPlans: legacyWorkoutPlans, `
);
fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
