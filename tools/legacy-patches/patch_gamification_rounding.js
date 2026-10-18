const fs = require('fs');
const p = 'src/utils/gamification.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /const currentLevelXP = Math\.floor\(LEVEL_BASE \* Math\.pow\(level - 1, 1\.5\)\);/g,
  "const currentLevelXP = Math.round(Math.floor(LEVEL_BASE * Math.pow(level - 1, 1.5)) / 100) * 100;"
);
c = c.replace(
  /const nextLevelXP = Math\.floor\(LEVEL_BASE \* Math\.pow\(level, 1\.5\)\);/g,
  "const nextLevelXP = Math.round(Math.floor(LEVEL_BASE * Math.pow(level, 1.5)) / 100) * 100;"
);
c = c.replace(
  /const currentLevelXP = Math\.floor\(CARDIO_LEVEL_BASE \* Math\.pow\(level - 1, 1\.5\)\);/g,
  "const currentLevelXP = Math.round(Math.floor(CARDIO_LEVEL_BASE * Math.pow(level - 1, 1.5)) / 100) * 100;"
);
c = c.replace(
  /const nextLevelXP = Math\.floor\(CARDIO_LEVEL_BASE \* Math\.pow\(level, 1\.5\)\);/g,
  "const nextLevelXP = Math.round(Math.floor(CARDIO_LEVEL_BASE * Math.pow(level, 1.5)) / 100) * 100;"
);

fs.writeFileSync(p, c);
console.log('Rounded level boundaries in gamification.ts to nearest 100');
