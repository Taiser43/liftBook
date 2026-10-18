const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

// unifiedStreakCard
code = code.replace(/backgroundColor: '#1E1E20'/g, "backgroundColor: '#111214'");
code = code.replace(/borderColor: '#333'/g, "borderColor: '#1E2024'");

// masterStreakTitle
code = code.replace(/color: '#FFD60A'/g, "color: '#00D2FF'");

// masterBadgeActive
code = code.replace(/backgroundColor: '#FFD60A'/g, "backgroundColor: '#00D2FF'");

// activityCard
code = code.replace(/activityCard: \{ backgroundColor: '#1E1E20'/g, "activityCard: { backgroundColor: '#111214'");
code = code.replace(/borderColor: '#333'/g, "borderColor: '#1E2024'");

fs.writeFileSync('src/screens/HomeScreen.tsx', code);
console.log('Applied additional theme overrides');
