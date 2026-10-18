const fs = require('fs');

const files = [
  'src/screens/StatsScreen.tsx',
  'src/screens/CardioHistoryScreen.tsx',
  'src/screens/NutritionScreen.tsx',
  'src/screens/TrainingScreen.tsx',
  'src/screens/HomeScreen.tsx',
  'src/components/GlobalNotepad.tsx',
  'src/components/MediaPlayerWidget.tsx',
  'src/components/MusicSettingsModal.tsx'
];

files.forEach(p => {
  let c = fs.readFileSync(p, 'utf8');
  
  if (p.includes('NutritionScreen.tsx')) {
    c = c.replace(/toLocaleDateString\('en-US',/g, "toLocaleDateString('de-DE',");
  } else if (p.includes('TrainingScreen.tsx')) {
    c = c.replace(/toLocaleDateString\('en-US',/g, "toLocaleDateString('de-DE',");
  } else {
    c = c.replace(/\.toLocaleDateString\(\)/g, ".toLocaleDateString('de-DE')");
  }

  fs.writeFileSync(p, c);
});

console.log('Patched all dates to de-DE');
