const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let code = fs.readFileSync(fullPath, 'utf8');
      
      if (code.includes('Alert.alert') && !fullPath.includes('CustomAlert.tsx')) {
        // Replace Alert.alert( with showCustomAlert(
        code = code.replace(/Alert\.alert\(/g, 'showCustomAlert(');
        
        // Add import
        const relativeDepth = fullPath.split('/').length - 2; // src/screens = 2 dirs = depth 1? 
        // actually fullPath from cwd: src/screens/X.tsx -> split('/') length = 3
        const depth = fullPath.split(path.sep).length - 2;
        const up = depth > 0 ? '../'.repeat(depth) : './';
        const importPath = `${up}store/store`;
        
        if (!code.includes('showCustomAlert')) {
          code = code.replace(
            `import {`,
            `import { showCustomAlert } from '${importPath}';\nimport {`
          );
        } else if (!code.includes(`} from '${importPath}'`) && !code.includes(`} from "${importPath}"`)) {
          // just inject it if not properly imported
          code = `import { showCustomAlert } from '${importPath}';\n` + code;
        }

        // Also we must ensure that any dynamic import('react-native').then(({ Alert }) => Alert.alert(...)) 
        // gets fixed in CardioHomeScreen and CardioTestsScreen
        code = code.replace(/import\('react-native'\)\.then\(\(\{ Alert \}\) => \{/g, '');
        code = code.replace(/\}\);/g, (match, offset, str) => {
           // this is risky, let's revert those specifically first!
           return match;
        });

        fs.writeFileSync(fullPath, code);
        console.log(`Replaced alerts in ${fullPath}`);
      }
    }
  });
}

processDir('src');
