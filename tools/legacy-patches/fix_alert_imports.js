const fs = require('fs');
const path = require('path');

const files = [
  'src/screens/CardioHomeScreen.tsx',
  'src/screens/CardioTestsScreen.tsx',
  'src/screens/NutritionScreen.tsx',
  'src/screens/StatsScreen.tsx',
  'src/screens/SupplementsScreen.tsx',
  'src/screens/TrainingScreen.tsx',
  'src/services/notificationService.ts'
];

files.forEach(fullPath => {
  let code = fs.readFileSync(fullPath, 'utf8');
  if (code.includes('showCustomAlert')) {
    if (!code.includes('showCustomAlert } from')) {
      // Find import { ... } from '../store/store' and add it
      if (code.includes('../store/store')) {
        code = code.replace(/import\s+\{([^}]*)\}\s+from\s+['"]\.\.\/store\/store['"]/g, (match, group1) => {
          return `import { ${group1.trim()}, showCustomAlert } from '../store/store'`;
        });
      } else {
        // Add at top
        code = `import { showCustomAlert } from '../store/store';\n` + code;
      }
      fs.writeFileSync(fullPath, code);
      console.log(`Fixed import in ${fullPath}`);
    }
  }
});
