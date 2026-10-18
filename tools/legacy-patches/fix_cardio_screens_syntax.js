const fs = require('fs');

let homeCode = fs.readFileSync('src/screens/CardioHomeScreen.tsx', 'utf8');
homeCode = homeCode.replace(/\n      \}\);\n    \} else if/g, '\n    } else if');
homeCode = homeCode.replace(/\n      \}\);\n    \} else \{/g, '\n    } else {');
fs.writeFileSync('src/screens/CardioHomeScreen.tsx', homeCode);

let testsCode = fs.readFileSync('src/screens/CardioTestsScreen.tsx', 'utf8');
testsCode = testsCode.replace(/\n      \}\);\n    \} else if/g, '\n    } else if');
testsCode = testsCode.replace(/\n      \}\);\n    \} else \{/g, '\n    } else {');
fs.writeFileSync('src/screens/CardioTestsScreen.tsx', testsCode);

console.log('Done');
