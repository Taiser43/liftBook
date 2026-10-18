const fs = require('fs');
let code = fs.readFileSync('src/store/store.ts', 'utf8');

code = code.replace(
  'useRestDayToken: () => {',
  'setPinnedAchievements: (badges) => set({ pinnedAchievements: badges }),\n  useRestDayToken: () => {'
);

fs.writeFileSync('src/store/store.ts', code);
