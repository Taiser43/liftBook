const fs = require('fs');
const p = 'src/navigation/AppNavigator.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /import \{ MaterialCommunityIcons \} from '@expo\/vector-icons';/,
  "import { MaterialCommunityIcons } from '@expo/vector-icons';\nimport { GlobalNotepad } from '../components/GlobalNotepad';"
);

fs.writeFileSync(p, c);
console.log('Fixed AppNavigator import');
