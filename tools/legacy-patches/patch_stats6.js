const fs = require('fs');
let lines = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8').split('\n');

// Clean up lines 26 to 31
const startIdx = lines.findIndex(l => l.includes('setCollectibleImage,'));
const endIdx = lines.findIndex(l => l.includes('} = useAppStore();'));

if (startIdx !== -1 && endIdx !== -1) {
  const newLines = [
    "    setCollectibleImage,",
    "    workoutPrograms,",
    "    nutritionHistory,",
    "    consumedToday,",
    "    targets"
  ];
  lines.splice(startIdx, endIdx - startIdx, ...newLines);
}

fs.writeFileSync('src/screens/StatsScreen.tsx', lines.join('\n'));
