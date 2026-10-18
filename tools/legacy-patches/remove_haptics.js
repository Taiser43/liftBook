const fs = require('fs');
const p = 'src/screens/NutritionScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/triggerSuccess\(\);\n\s*/g, '');
fs.writeFileSync(p, c);
console.log('Removed triggerSuccess from NutritionScreen');
