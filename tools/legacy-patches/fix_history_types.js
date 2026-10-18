const fs = require('fs');
let code = fs.readFileSync('src/screens/WorkoutHistoryScreen.tsx', 'utf8');

code = code.replace(/ex\.lastCompletedSets\?/g, 'ex.sets?');
code = code.replace(/reduce\(\(max, s\) =>/g, 'reduce((max: number, s: any) =>');

fs.writeFileSync('src/screens/WorkoutHistoryScreen.tsx', code);
console.log('Fixed');
