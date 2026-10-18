const fs = require('fs');
const p = 'src/screens/TrainingScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('const [managerVisible')) {
  c = c.replace(
    /const \[searchQuery, setSearchQuery\] = useState\(""\);/,
    `const [searchQuery, setSearchQuery] = useState("");
  const [managerVisible, setManagerVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [filterEquip, setFilterEquip] = useState('All');`
  );
}

fs.writeFileSync(p, c);
console.log('Fixed double quotes issue');
