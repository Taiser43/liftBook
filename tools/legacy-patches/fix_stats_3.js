const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/import \{ getLevelData \} from '\.\.\/utils\/gamification';/, '');
// put it back once at the top
c = c.replace(/import \{ getLevelTierInfo \} from '\.\.\/utils\/levels';/, "import { getLevelTierInfo } from '../utils/levels';\nimport { getLevelData } from '../utils/gamification';");

fs.writeFileSync(p, c);
