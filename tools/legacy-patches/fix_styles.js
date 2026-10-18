const fs = require('fs');
let code = fs.readFileSync('src/components/MediaPlayerWidget.tsx', 'utf8');

code = code.replace(
  "width: 70, height: 70, borderRadius: 12, overflow: 'hidden',",
  "borderRadius: 12, overflow: 'hidden',"
);

fs.writeFileSync('src/components/MediaPlayerWidget.tsx', code);
console.log("Fixed duplicate properties");
