const fs = require('fs');
const p = 'src/screens/NutritionScreen.tsx';
let c = fs.readFileSync(p, 'utf8');
let lines = c.split('\n');

[289, 320, 356].forEach(l => {
  lines[l-1] = lines[l-1].replace('</Modal>', '</BottomSheetWrapper>');
});

fs.writeFileSync(p, lines.join('\n'));
