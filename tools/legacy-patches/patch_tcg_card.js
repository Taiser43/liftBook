const fs = require('fs');
const p = 'src/components/ExerciseTCGCard.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /import \{ useAppStore \} from '\.\.\/store\/store';/,
  "import { useAppStore } from '../store/store';\nimport { PRELOADED_EXERCISES } from '../data/exercises';"
);

c = c.replace(
  /const \{ workoutHistory, allExercises \} = useAppStore\(\);/,
  `const { workoutHistory, customExercises } = useAppStore();
  const allExercises = [...PRELOADED_EXERCISES, ...(customExercises || [])];`
);

fs.writeFileSync(p, c);
console.log('Fixed allExercises error in TCG Card');
