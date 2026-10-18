const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/fileResolver/g, 'uriResolver');
c = c.replace(/resolveLocalUri/g, 'getResolvedUri');

fs.writeFileSync(p, c);
console.log('Patched StatsScreen');
