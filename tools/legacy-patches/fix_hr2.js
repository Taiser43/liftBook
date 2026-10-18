const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

code = code.replace(/useHeartRateMonitor\.getState\(\)\.currentHR/g, "useAppStore.getState().currentHeartRate || 0");

fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log("Fixed useAppStore currentHeartRate");
