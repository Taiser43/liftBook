const fs = require('fs');
let lines = fs.readFileSync('src/screens/NutritionScreen.tsx', 'utf8').split('\n');

const styleIndex = lines.findIndex(l => l.includes('managerBtn: {'));

const styleCode = `
  actionMenuBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#333' },
  actionMenuBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 12 },
`;

lines.splice(styleIndex, 0, styleCode);
fs.writeFileSync('src/screens/NutritionScreen.tsx', lines.join('\n'));
