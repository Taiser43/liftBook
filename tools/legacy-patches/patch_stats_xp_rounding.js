const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/\{levelData\.totalXP\} XP/g, "{Math.round(levelData.totalXP)} XP");
c = c.replace(/\{levelData\.neededXP - levelData\.progressXP\} XP/g, "{Math.round(levelData.neededXP - levelData.progressXP)} XP");
c = c.replace(/\{session\.xpEarned\} XP/g, "{Math.round(session.xpEarned)} XP");

fs.writeFileSync(p, c);
console.log('Rounded remaining XP displays in StatsScreen');
