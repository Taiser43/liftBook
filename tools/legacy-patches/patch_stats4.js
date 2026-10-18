const fs = require('fs');
let code = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8');

code = code.replace(
  `  } = useAppStore();`,
  `  workoutPrograms,
  nutritionHistory,
  consumedToday,
  targets
  } = useAppStore();
  const streaks = calculateStreaks(workoutHistory, workoutPrograms, nutritionHistory, consumedToday, targets);`
);

fs.writeFileSync('src/screens/StatsScreen.tsx', code);
