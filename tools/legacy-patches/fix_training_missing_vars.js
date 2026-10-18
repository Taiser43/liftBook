const fs = require('fs');
const p = 'src/screens/TrainingScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('ExerciseManagerModal')) {
  c = c.replace(
    /import \{ useAppStore \} from '\.\.\/store\/store';/,
    "import { useAppStore } from '../store/store';\nimport { ExerciseManagerModal } from '../components/ExerciseManagerModal';"
  );
}

if (!c.includes('const [managerVisible')) {
  c = c.replace(
    /const \[searchQuery, setSearchQuery\] = useState\(''\);/,
    `const [searchQuery, setSearchQuery] = useState('');
  const [managerVisible, setManagerVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [filterEquip, setFilterEquip] = useState('All');`
  );
}

// Ensure filterEquip is used correctly: update the displayedExercises logic
if (c.includes('const displayedExercises = allExercises.filter(ex => {') && !c.includes('filterEquip !== \'All\'')) {
  c = c.replace(
    /const displayedExercises = allExercises\.filter\(ex => \{/,
    `const displayedExercises = allExercises.filter(ex => {
    if (filterEquip !== 'All' && (ex as any).equipmentType !== filterEquip) return false;`
  );
} else if (!c.includes('const displayedExercises = allExercises.filter(ex => {')) {
  c = c.replace(
    /const displayedExercises = allExercises\.filter\(ex => \{/,
    `const displayedExercises = allExercises.filter(ex => {
    if (filterEquip !== 'All' && (ex as any).equipmentType !== filterEquip) return false;`
  );
}

// Rename handleSaveProgram to handleSavePlan
c = c.replace(/onPress=\{handleSaveProgram\}/g, 'onPress={handleSavePlan}');

// Remove the `updateWorkoutProgram` line error: `updateWorkoutProgram(activePlan.id, { name: val });` -> the store doesn't support partial updates like that, we should use setPlanName(val)
c = c.replace(
  /onChangeText=\{\(val\) => \{\s*if \(activePlan\) \{\s*useAppStore\.getState\(\)\.updateWorkoutProgram\(activePlan\.id, \{ name: val \}\);\s*\}\s*\}\}/g,
  `onChangeText={setPlanName}`
);

// We need to pass the planName instead of activePlan?.name
c = c.replace(
  /value=\{activePlan\?\.name \|\| ''\}/g,
  `value={planName}`
);

// We also need to add ExerciseManagerModal to the end
if (!c.includes('<ExerciseManagerModal')) {
  c = c.replace(
    /\{triggerMacroConfetti &&/,
    `<ExerciseManagerModal 
        visible={managerVisible} 
        onClose={() => setManagerVisible(false)} 
        initialExercise={editingExercise} 
      />
      {triggerMacroConfetti &&`
  );
}

fs.writeFileSync(p, c);
console.log('Fixed missing vars and names');
