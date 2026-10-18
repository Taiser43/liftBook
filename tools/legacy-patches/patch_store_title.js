const fs = require('fs');
const p = 'src/store/store.ts';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('equippedTitle')) {
  c = c.replace(
    /unlockedAchievements: string\[\];/,
    "unlockedAchievements: string[];\n  equippedTitle: string | null;\n  setEquippedTitle: (title: string | null) => void;"
  );
  
  c = c.replace(
    /unlockedAchievements: \[\],/,
    "unlockedAchievements: [],\n  equippedTitle: null,\n  setEquippedTitle: (title) => set({ equippedTitle: title }),"
  );
  
  fs.writeFileSync(p, c);
  console.log('Added equippedTitle to store');
} else {
  console.log('equippedTitle already exists');
}
