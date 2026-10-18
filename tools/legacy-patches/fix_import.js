const fs = require('fs');
let content = fs.readFileSync('src/screens/TrainingScreen.tsx', 'utf8');

content = content.replace(
  "import SwipeableModal from '../components/SwipeableModal';",
  "import SwipeableModal from '../components/SwipeableModal';\nimport InWorkoutMusicWidget from '../components/InWorkoutMusicWidget';"
);

fs.writeFileSync('src/screens/TrainingScreen.tsx', content);
