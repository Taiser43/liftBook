const fs = require('fs');
let codeHome = fs.readFileSync('src/screens/CardioHomeScreen.tsx', 'utf8');
let codeTests = fs.readFileSync('src/screens/CardioTestsScreen.tsx', 'utf8');

codeHome = codeHome.replace(/if \(store\.finishCurrentCardio\) store\.finishCurrentCardio\(\);/g, 'if (store.finishCurrentCardio) store.finishCurrentCardio(true);');
codeHome = codeHome.replace(/if \(store\.finishCurrentStrength\) store\.finishCurrentStrength\(\);/g, 'if (store.finishCurrentStrength) store.finishCurrentStrength(true);');

codeTests = codeTests.replace(/if \(store\.finishCurrentCardio\) store\.finishCurrentCardio\(\);/g, 'if (store.finishCurrentCardio) store.finishCurrentCardio(true);');
codeTests = codeTests.replace(/if \(store\.finishCurrentStrength\) store\.finishCurrentStrength\(\);/g, 'if (store.finishCurrentStrength) store.finishCurrentStrength(true);');

fs.writeFileSync('src/screens/CardioHomeScreen.tsx', codeHome);
fs.writeFileSync('src/screens/CardioTestsScreen.tsx', codeTests);
console.log('Done');
