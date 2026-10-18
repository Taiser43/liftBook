const fs = require('fs');
const p = 'src/components/LevelProgressionModal.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /reqXP = Math\.floor\(base \* Math\.pow\(t\.startLevel - 1, 1\.5\)\);/g,
  "reqXP = Math.round(Math.floor(base * Math.pow(t.startLevel - 1, 1.5)) / 100) * 100;"
);

c = c.replace(
  /const prevReqXP = index > 0 \? Math\.floor\(base \* Math\.pow\(tiers\[index-1\]\.startLevel - 1, 1\.5\)\) : 0;/g,
  "const prevReqXP = index > 0 ? Math.round(Math.floor(base * Math.pow(tiers[index-1].startLevel - 1, 1.5)) / 100) * 100 : 0;"
);

fs.writeFileSync(p, c);
console.log('Rounded reqXP in Modal');
