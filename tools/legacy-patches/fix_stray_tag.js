const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /\s*<\/>\)}\n\s*<\/ScrollView>/,
  "\n    </ScrollView>"
);

fs.writeFileSync(p, c);
console.log('Removed stray </>)} tag');
