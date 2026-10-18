const fs = require('fs');
const p = 'src/utils/gamification.ts';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('thresholds: number[];')) {
  c = c.replace(
    /tierColor: string;\n\}/,
    "tierColor: string;\n  thresholds: number[];\n}"
  );
  
  c = c.replace(
    /tierColor: t\.color, max: t\.next \}\);/g,
    "tierColor: t.color, max: t.next, thresholds: a.th });"
  );
  
  fs.writeFileSync(p, c);
  console.log('Added thresholds to AchievementBadge');
}
