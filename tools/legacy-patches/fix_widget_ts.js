const fs = require('fs');
let content = fs.readFileSync('src/components/InWorkoutMusicWidget.tsx', 'utf8');

content = content.replace(
  "return \\`\\${mins}:\\${secs < 10 ? '0' : ''}\\${secs}\\`;",
  "return `${mins}:${secs < 10 ? '0' : ''}${secs}`;"
);

fs.writeFileSync('src/components/InWorkoutMusicWidget.tsx', content);
