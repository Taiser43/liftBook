const fs = require('fs');

// 1. CardioHistoryScreen
let code = fs.readFileSync('src/screens/CardioHistoryScreen.tsx', 'utf8');
code = code.replace(/source: 'Health Connect'/g, "source: 'health-connect'");
fs.writeFileSync('src/screens/CardioHistoryScreen.tsx', code);

// 2. CardioTrackingScreen
code = fs.readFileSync('src/screens/CardioTrackingScreen.tsx', 'utf8');
code = code.replace(/source: 'Health Connect'/g, "source: 'health-connect'");
fs.writeFileSync('src/screens/CardioTrackingScreen.tsx', code);

// 3. HomeScreen
code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');
code = code.replace(/let nextScheduledMeal = null;/g, "let nextScheduledMeal: any = null;");
code = code.replace(/styles\.emptyChartBoxText/g, "styles.emptyChartText");
fs.writeFileSync('src/screens/HomeScreen.tsx', code);

// 4. TrainingScreen
code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');
code = code.replace(/setHeartRate\(prevBpm =>/g, "setHeartRate((prevBpm: number) =>");
code = code.replace(/setHeartRate\(prev =>/g, "setHeartRate((prev: number) =>");
fs.writeFileSync('src/screens/TrainingScreen.tsx', code);

// 5. cardioBackgroundTask
code = fs.readFileSync('src/services/cardioBackgroundTask.ts', 'utf8');
code = code.replace(/heartRate: hr,/g, "heartRate: hr === null ? undefined : hr,");
fs.writeFileSync('src/services/cardioBackgroundTask.ts', code);

console.log("Fixed extra TS errors");
