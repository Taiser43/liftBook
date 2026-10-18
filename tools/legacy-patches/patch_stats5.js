const fs = require('fs');
let lines = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('} = useAppStore();')) {
    // Add comma to previous line if it doesn't have one
    if (!lines[i-1].trim().endsWith(',')) {
      lines[i-1] = lines[i-1] + ',';
    }
    break;
  }
}

fs.writeFileSync('src/screens/StatsScreen.tsx', lines.join('\n'));
