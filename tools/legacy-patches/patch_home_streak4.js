const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

code = code.replace(
  `const workoutPrograms = useAppStore(state => state.workoutPrograms);
  const streaks = calculateStreaks(workoutHistory, workoutPrograms, nutritionHistory, consumedToday, targets);`,
  `const streaks = calculateStreaks(workoutHistory, workoutPrograms, nutritionHistory, consumedToday, targets);`
);

fs.writeFileSync('src/screens/HomeScreen.tsx', code);
