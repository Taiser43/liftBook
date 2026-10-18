const fs = require('fs');
let code = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8');

if (!code.includes('import { calculateStreaks }')) {
  code = code.replace(
    `import { useAppStore, Exercise } from '../store/store';`,
    `import { useAppStore, Exercise } from '../store/store';\nimport { calculateStreaks } from '../utils/streakEngine';`
  );
}

fs.writeFileSync('src/screens/StatsScreen.tsx', code);
