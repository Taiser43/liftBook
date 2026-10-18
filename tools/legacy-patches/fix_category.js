const fs = require('fs');
let code = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

code = code.replace(/weight: 0,\n\s*category: ex\.category/g, "weight: 0");
code = code.replace(/weight: oldEx\.weight,\n\s*category: ex\.category/g, "weight: oldEx.weight");

fs.writeFileSync('src/screens/TrainingScreen.tsx', code);
console.log("Fixed category error");
