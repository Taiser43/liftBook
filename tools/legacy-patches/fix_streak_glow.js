const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /<\/View>\n\s*<View style=\{\{ width: 1, backgroundColor: '#333' \}\}\> /,
  "</View>\n          </StreakGlow>\n          <View style={{ width: 1, backgroundColor: '#333' }} />"
);
// just in case the above fails:
if (!c.includes('</StreakGlow>')) {
  c = c.replace(
    /          <\/View>\n          <View style=\{\{ width: 1, backgroundColor: '#333' \}\} \/>/,
    "          </View>\n          </StreakGlow>\n          <View style={{ width: 1, backgroundColor: '#333' }} />"
  );
}

fs.writeFileSync(p, c);
console.log('Fixed StreakGlow');
