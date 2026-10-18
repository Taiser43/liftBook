const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /setTimeout\(\(\) => if \(selectedCardioType\) setDetailNode\(\{ type: 'cardio', name: selectedCardioType, xp: cardioXP\[selectedCardioType\] \|\| 0 \}\), 300\);/,
  "setTimeout(() => { if (selectedCardioType) setDetailNode({ type: 'cardio', name: selectedCardioType, xp: cardioXP[selectedCardioType] || 0 }); }, 300);"
);

fs.writeFileSync(p, c);
console.log('Fixed setTimeout syntax');
