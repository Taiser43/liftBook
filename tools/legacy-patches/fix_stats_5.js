const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/return \(\n    <ScrollView/g, "return (\n    <>\n    <ScrollView");
c = c.replace(/      <\/Modal>\n  \);\n\}/, "      </Modal>\n    </>\n  );\n}");

fs.writeFileSync(p, c);
console.log('Fixed fragment wrap in StatsScreen');
