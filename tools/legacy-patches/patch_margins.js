const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'src', 'screens');
const files = fs.readdirSync(screensDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(screensDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // We'll find some typical button style names and add marginBottom: 12 if not present
  const buttonStyles = [
    'saveWeightBtn', 'editBtn', 'scanBarcodeModalBtn', 'closeRecipeModalBtn', 
    'homeStartWorkoutBtn', 'resetBtn', 'managerBtn', 'actionBtn', 'fullBtn', 
    'addIngBtn', 'collectionBtn', 'closeBtn', 'playBtn', 'toggleBtn', 
    'btButton', 'startButton', 'segmentBtn', 'celebrationCloseBtn'
  ];

  for (const styleName of buttonStyles) {
    const regex = new RegExp(`(${styleName}\\s*:\\s*\\{)([^}]+)\\}`, 'g');
    content = content.replace(regex, (match, p1, p2) => {
      if (!p2.includes('margin') && !p2.includes('marginVertical') && !p2.includes('marginBottom')) {
        return `${p1}${p2}, marginBottom: 12 }`;
      }
      return match;
    });
  }

  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Patched margins');
