const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/\{Math\.round\(session\.xpEarned\)\} XP/g, "{Math.round(session.xpEarned || 0)} XP");

fs.writeFileSync(p, c);
console.log('Fixed undefined xpEarned');
