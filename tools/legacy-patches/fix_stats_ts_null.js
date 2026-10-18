const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /setDetailNode\(\{ type: 'cardio', name: selectedCardioType, xp: cardioXP\[selectedCardioType\] \|\| 0 \}\)/,
  "if (selectedCardioType) setDetailNode({ type: 'cardio', name: selectedCardioType, xp: cardioXP[selectedCardioType] || 0 })"
);

fs.writeFileSync(p, c);
console.log('Fixed TS null error');
