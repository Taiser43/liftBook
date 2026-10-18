const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /thresholds\?: number\[\] \} \| null;/,
  "thresholds?: number[]; desc?: string } | null;"
);

// Add description to achievement touchable
c = c.replace(
  /setDetailNode\(\{ type: 'achievement', name: ach\.title, xp: ach\.progress, thresholds: \(ach as any\)\.thresholds \}\)/g,
  "setDetailNode({ type: 'achievement', name: ach.title, xp: ach.progress, thresholds: (ach as any).thresholds, desc: ach.description })"
);

// Pass description to Modal
c = c.replace(
  /type=\{detailNode\.type\} \n          thresholds=\{detailNode\.thresholds\}/,
  "type={detailNode.type} \n          thresholds={detailNode.thresholds}\n          description={detailNode.desc}"
);

fs.writeFileSync(p, c);
console.log('Patched DetailNode');
