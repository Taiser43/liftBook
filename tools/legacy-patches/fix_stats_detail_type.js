const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /type DetailNode = \{ type: 'class' \| 'cardio'; name: string; iconName\?: string; xp: number \} \| null;/,
  "type DetailNode = { type: 'class' | 'cardio' | 'achievement'; name: string; iconName?: string; xp: number; thresholds?: number[] } | null;"
);

c = c.replace(
  /<LevelProgressionModal \n          visible=\{!!detailNode\} \n          onClose=\{\(\) => setDetailNode\(null\)\} \n          title=\{detailNode\.name\} \n          currentXP=\{detailNode\.xp\} \n          type=\{detailNode\.type\} \n        \/>/g,
  `<LevelProgressionModal 
          visible={!!detailNode} 
          onClose={() => setDetailNode(null)} 
          title={detailNode.name} 
          currentXP={detailNode.xp} 
          type={detailNode.type} 
          thresholds={detailNode.thresholds}
        />`
);

fs.writeFileSync(p, c);
console.log('Fixed DetailNode type');
