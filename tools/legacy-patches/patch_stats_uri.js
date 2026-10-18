const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/const imageUri = collectibleImages\[item\.id\];/g, "const { resolveLocalUri } = require('../utils/fileResolver');\n              const imageUri = resolveLocalUri(collectibleImages[item.id]);");

// Wait, I should import it at the top ideally.
// Let's just do an inline require where needed since it's easy.

fs.writeFileSync(p, c);
console.log('Patched StatsScreen');
