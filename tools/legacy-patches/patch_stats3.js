const fs = require('fs');
let code = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8');

// Ensure import is there
if (!code.includes('import { calculateStreaks }')) {
  code = code.replace(
    `import { useAppStore } from '../store/store';`,
    `import { useAppStore } from '../store/store';\nimport { calculateStreaks } from '../utils/streakEngine';`
  );
}

// Find useAppStore destructuring
const storeRegex = /const {[\s\S]*?} = useAppStore\(\);/;
const match = code.match(storeRegex);
if (match) {
  const storeCall = match[0];
  if (!storeCall.includes('workoutPrograms')) {
    const newStoreCall = storeCall.replace(
      '} = useAppStore();',
      '  workoutPrograms,\n  nutritionHistory,\n  consumedToday,\n  targets\n} = useAppStore();'
    );
    code = code.replace(storeCall, newStoreCall + '\n  const streaks = calculateStreaks(workoutHistory, workoutPrograms, nutritionHistory, consumedToday, targets);');
  }
} else {
  console.log("Could not find useAppStore destructuring!");
}

fs.writeFileSync('src/screens/StatsScreen.tsx', code);
