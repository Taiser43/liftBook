const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

code = code.replace(
  'useRestDayToken: () => boolean;',
  'useRestDayToken: () => boolean;\n  setPinnedAchievements: (badges: string[]) => void;'
);

fs.writeFileSync('src/store/store.ts', code);
