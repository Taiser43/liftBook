const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

code = code.replace(
  `    setLiveWorkoutToStart,
  } = useAppStore();`,
  `    setLiveWorkoutToStart,
    addIngredient,
  } = useAppStore();`
);

fs.writeFileSync('src/screens/HomeScreen.tsx', code);
