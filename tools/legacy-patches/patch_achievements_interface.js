const fs = require('fs');
const p = 'src/utils/gamification.ts';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('thresholds?: number[];')) {
  c = c.replace(
    /tierColor: string;\n\}/,
    "tierColor: string;\n  thresholds?: number[];\n}"
  );
  
  c = c.replace(
    /return \{ tier: t\.tier, tierColor: t\.color, max: t\.next \};/g,
    "return { tier: t.tier, tierColor: t.color, max: t.next, thresholds: arguments[1] };"
  );
  
  // Actually, wait, `arguments[1]` won't work in an arrow function because arguments is not bound, or it refers to the outer function.
  // The thresholds are passed directly in the array!
  // It's better to just regex replace the specific array definitions.
}
