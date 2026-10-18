const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

code = code.replace(
  `    setGlobalLiveWorkoutModalVisible
  } = useAppStore();`,
  `    setGlobalLiveWorkoutModalVisible,
    setFinishCurrentStrength,
    finishCurrentCardio,
    globalCardioActive,
    globalActivePlan
  } = useAppStore();`
);

fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log('Done');
