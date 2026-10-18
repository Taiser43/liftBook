const fs = require('fs');
let code = fs.readFileSync('src/hooks/useBottomSpacing.ts', 'utf8');

code = code.replace(
  "const { globalCardioSessionActive } = require(\"../store/store\").useAppStore();",
  "const globalCardioSessionActive = false;"
);

code = code.replace(
  "const miniPlayerHeight = activeSession ? 70 : 0; // Assuming mini-player is ~70px height",
  "const miniPlayerHeight = globalCardioSessionActive ? 70 : 0;"
);

fs.writeFileSync('src/hooks/useBottomSpacing.ts', code);
