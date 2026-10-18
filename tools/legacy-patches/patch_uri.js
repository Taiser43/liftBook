const fs = require('fs');
const p = 'src/utils/uriResolver.ts';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/if \(uri\.includes\('\/Documents\/'\)\) \{/, "if (uri.includes('/Documents/') || uri.includes('/files/')) {");
c = c.replace(/const filename = uri\.split\('\/Documents\/'\)\.pop\(\);/, "const filename = uri.split('/').pop();");

fs.writeFileSync(p, c);
console.log('Patched uriResolver');
