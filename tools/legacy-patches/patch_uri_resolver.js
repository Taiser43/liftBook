const fs = require('fs');
let content = fs.readFileSync('src/utils/uriResolver.ts', 'utf8');

content = content.replace(
  "return FileSystem.documentDirectory + filename;",
  "return (FileSystem as any).documentDirectory + filename;"
);

fs.writeFileSync('src/utils/uriResolver.ts', content);
