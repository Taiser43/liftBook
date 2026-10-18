const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/unlockedAchievements,\n\s*unlockedAchievements,/g, "unlockedAchievements,");

fs.writeFileSync(p, c);
console.log('Fixed unlockedAchievements redeclaration');
