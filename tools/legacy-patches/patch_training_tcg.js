const fs = require('fs');
const p = 'src/screens/TrainingScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Import
if (!c.includes('ExerciseTCGCard')) {
  c = c.replace(
    /import \{ ExerciseManagerModal \} from '\.\.\/components\/ExerciseManagerModal';/,
    "import { ExerciseManagerModal } from '../components/ExerciseManagerModal';\nimport { ExerciseTCGCard } from '../components/ExerciseTCGCard';"
  );
}

// 2. State
if (!c.includes('const [tcgExerciseName')) {
  c = c.replace(
    /const \[managerVisible, setManagerVisible\] = useState\(false\);/,
    `const [managerVisible, setManagerVisible] = useState(false);
  const [tcgExerciseName, setTcgExerciseName] = useState<string | null>(null);`
  );
}

// 3. Inject Eye Icon in the Exercise list items.
// They look like:
// <TouchableOpacity style={{ padding: 8, marginRight: 8 }} onPress={(e) => { e.stopPropagation(); setEditingExercise(ex); setManagerVisible(true); }}>
// We can replace the pencil touchable with a wrapped view containing BOTH.
c = c.replace(
  /<TouchableOpacity \s*style=\{\{ padding: 8, marginRight: 8 \}\}\s*onPress=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*setEditingExercise\(ex\);\s*setManagerVisible\(true\);\s*\}\}\s*>\s*<MaterialCommunityIcons name="pencil" size=\{18\} color="#888" \/>\s*<\/TouchableOpacity>/g,
  `<View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity 
        style={{ padding: 8 }}
        onPress={(e) => {
           e.stopPropagation();
           setTcgExerciseName(ex.name);
        }}
      >
        <MaterialCommunityIcons name="eye" size={20} color="#00D2FF" />
      </TouchableOpacity>
      <TouchableOpacity 
        style={{ padding: 8, marginRight: 8 }}
        onPress={(e) => {
           e.stopPropagation();
           setEditingExercise(ex);
           setManagerVisible(true);
        }}
      >
        <MaterialCommunityIcons name="pencil" size={18} color="#888" />
      </TouchableOpacity>
    </View>`
);

// 4. Inject the component at the bottom of the file
if (!c.includes('<ExerciseTCGCard')) {
  c = c.replace(
    /<ExerciseManagerModal/,
    `<ExerciseTCGCard 
        visible={!!tcgExerciseName} 
        onClose={() => setTcgExerciseName(null)} 
        exerciseName={tcgExerciseName || ''} 
      />
      <ExerciseManagerModal`
  );
}

fs.writeFileSync(p, c);
console.log('Injected TCG card into TrainingScreen');
