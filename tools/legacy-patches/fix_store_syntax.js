const fs = require('fs');
const p = 'src/store/store.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /triggerXPEvent: \(sourceX, sourceY, amount, type = 'XP'\) => set\(\{ xpEvent: \{ id: Date\.now\(\), sourceX, sourceY, amount, type \} \}\),/g,
  ""
);

c = c.replace(
  /adminStreakOverride: null,/,
  "xpEvent: null,\n      triggerXPEvent: (sourceX, sourceY, amount, type = 'XP') => set({ xpEvent: { id: Date.now(), sourceX, sourceY, amount, type } }),\n      adminStreakOverride: null,"
);

fs.writeFileSync(p, c);
console.log('Fixed triggerXPEvent placement');
