const fs = require('fs');
let code = fs.readFileSync('src/components/EmblemIcon.tsx', 'utf8');

// Remove marginRight: 16
code = code.replace(/marginRight:\s*16,?\s*/, '');

fs.writeFileSync('src/components/EmblemIcon.tsx', code);
console.log('Removed marginRight from EmblemIcon');
