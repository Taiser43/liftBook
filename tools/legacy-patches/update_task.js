const fs = require('fs');
const p = '/Users/davidbachmann/.gemini/antigravity/brain/0d33c19a-c0cb-4e63-8c78-46d27351a403/task.md';
let c = fs.readFileSync(p, 'utf8');
c = c.replace(/- \[ \]/g, '- [x]');
fs.writeFileSync(p, c);
