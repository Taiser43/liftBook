const fs = require('fs');
let code = fs.readFileSync('src/screens/CardioHistoryScreen.tsx', 'utf8');

code = code.replace(
  `  const getZoneColor = (index: number) => {
    const colors = ['#888', '#00D2FF', '#30D158', '#FF9F0A', '#FF3B30'];
    return colors[index];
  };`,
  `  const getZoneColor = (index: number) => {
    const colors = ['#00D2FF', '#30D158', '#FFD700', '#FF9500', '#FF3B30'];
    return colors[index];
  };`
);

fs.writeFileSync('src/screens/CardioHistoryScreen.tsx', code);
console.log('Done');
