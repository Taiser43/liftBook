const fs = require('fs');
const p = 'src/navigation/AppNavigator.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /import \{ GlobalXPOverlay \} from '\.\.\/components\/GlobalXPOverlay';/,
  "import { GlobalXPOverlay } from '../components/GlobalXPOverlay';\nimport { GlobalNotepad } from '../components/GlobalNotepad';"
);

c = c.replace(
  /<\/View>\n  \);\n\}/,
  "      <GlobalNotepad navigationRef={navigationRef} />\n    </View>\n  );\n}"
);

fs.writeFileSync(p, c);
console.log('Mounted GlobalNotepad in AppNavigator');
