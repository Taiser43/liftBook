const fs = require('fs');

let code = fs.readFileSync('src/store/store.ts', 'utf8');

if (!code.includes('pinnedAchievements: string[]')) {
  // Add to AppState interface
  code = code.replace(
    'fitCoins: number;',
    'fitCoins: number;\n  pinnedAchievements?: string[];'
  );
  
  // Add to AppActions interface
  code = code.replace(
    'useRestDayToken: () => void;',
    'useRestDayToken: () => void;\n  setPinnedAchievements: (badges: string[]) => void;'
  );

  // Add to initial state
  code = code.replace(
    'fitCoins: 0,',
    'fitCoins: 0,\n      pinnedAchievements: [],'
  );

  // Add to actions implementation
  code = code.replace(
    'useRestDayToken: () => set((state) => {',
    'setPinnedAchievements: (badges) => set({ pinnedAchievements: badges }),\n      useRestDayToken: () => set((state) => {'
  );

  fs.writeFileSync('src/store/store.ts', code);
  console.log('Patched store.ts');
} else {
  console.log('pinnedAchievements already exists');
}
