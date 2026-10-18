const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/\{cls\.xp\} XP/g, "{Math.round(cls.xp)} XP");
c = c.replace(/\{lData\.neededXP - lData\.progressXP\} XP/g, "{Math.round(lData.neededXP - lData.progressXP)} XP");

fs.writeFileSync(p, c);
console.log('Rounded XP display in StatsScreen');
