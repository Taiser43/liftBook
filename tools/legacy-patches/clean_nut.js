const fs = require('fs');
let lines = fs.readFileSync('src/screens/NutritionScreen.tsx', 'utf8').split('\n');

let inModal = false;
let newLines = [];
let deleteCount = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<SwipeableModal visible={!!actionMealId}')) {
    inModal = true;
  }
  
  if (!inModal) {
    newLines.push(lines[i]);
  }
  
  if (inModal && lines[i].includes('</SwipeableModal>')) {
    inModal = false;
    deleteCount++;
  }
}

fs.writeFileSync('src/screens/NutritionScreen.tsx', newLines.join('\n'));
console.log('Removed ' + deleteCount + ' modal blocks');
