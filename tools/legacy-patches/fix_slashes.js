const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioSessionDetailScreen.tsx', 'utf8');

code = code.replace(/\\\$/g, '$');
code = code.replace(/\\`/g, '`');

fs.writeFileSync('src/screens/CardioSessionDetailScreen.tsx', code);
