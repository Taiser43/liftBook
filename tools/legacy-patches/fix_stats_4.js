const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/<\/>\)}\n    <\/>\)}\n    <\/ScrollView>/g, "</>)}\n    </ScrollView>");

fs.writeFileSync(p, c);
console.log('Fixed StatsScreen closing tags again');
