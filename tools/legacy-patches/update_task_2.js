const fs = require('fs');
const taskPath = '/Users/davidbachmann/.gemini/antigravity/brain/0d33c19a-c0cb-4e63-8c78-46d27351a403/task.md';
let content = fs.readFileSync(taskPath, 'utf8');

content = content.replace(/-\s\[\s\]/g, '- [x]');

fs.writeFileSync(taskPath, content, 'utf8');
