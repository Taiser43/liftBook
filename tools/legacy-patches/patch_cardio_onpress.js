const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /onPress=\{\(\) => setDetailNode\(\{ type: 'cardio', name: cardio\.type, xp: cardio\.totalXP \|\| cardio\.progressXP \+ cardio\.neededXP \}\)\}/g,
  `onPress={() => {
                  setSelectedCardioType(cardio.type);
                  setDetailNode({ type: 'cardio', name: cardio.type, xp: cardio.totalXP || cardio.progressXP + cardio.neededXP });
                }}`
);
fs.writeFileSync(p, c);
