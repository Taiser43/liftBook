const fs = require('fs');
const p = 'src/utils/gamification.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /max: t\.next\n    \};\n  \}\)/,
  "max: t.next,\n      thresholds: a.th\n    };\n  })"
);

fs.writeFileSync(p, c);
console.log('Added thresholds to returned object');
