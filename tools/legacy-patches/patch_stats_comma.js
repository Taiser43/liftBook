const fs = require('fs');
let code = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8');

code = code.replace(
  `addPhotoBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8 }`,
  `addPhotoBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8 },`
);

fs.writeFileSync('src/screens/StatsScreen.tsx', code);
