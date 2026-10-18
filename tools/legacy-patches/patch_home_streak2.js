const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

const target = `  const handleSaveWeight = () => {`;
const replacement = `  const streaks = calculateStreaks(workoutHistory, programs, nutritionHistory, consumedToday, targets);
  const workedOutToday = streaks.workedOutToday;

  const handleSaveWeight = () => {`;

code = code.replace(target, replacement);

fs.writeFileSync('src/screens/HomeScreen.tsx', code);
