const fs = require('fs');
const p = 'src/screens/TrainingScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('ExerciseManagerModal')) {
  c = c.replace(
    /import \{ useAppStore \} from '\.\.\/store\/store';/,
    "import { useAppStore } from '../store/store';\nimport { ExerciseManagerModal } from '../components/ExerciseManagerModal';"
  );
}

c = c.replace(
  /const \[searchQuery, setSearchQuery\] = useState\(''\);/,
  `const [searchQuery, setSearchQuery] = useState('');
  const [managerVisible, setManagerVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [filterEquip, setFilterEquip] = useState('All');`
);

c = c.replace(
  /const displayedExercises = allExercises\.filter\(ex => \{/,
  `const displayedExercises = allExercises.filter(ex => {
    if (filterEquip !== 'All' && (ex as any).equipmentType !== filterEquip) return false;`
);

c = c.replace(
  /\{\/\* Bodypart Filter Chips \*\/\}[\s\S]*?<\/GHScrollView>/g,
  `{/* Filters */}
                <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                  {['All', 'Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core'].map(cat => (
                    <TouchableOpacity 
                      key={cat}
                      style={[styles.categoryPill, filterCategory === cat && styles.categoryPillActive]}
                      onPress={() => setFilterCategory(cat as BodyPart)}
                    >
                      <Text style={[styles.categoryPillText, filterCategory === cat && styles.categoryPillTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </GHScrollView>
                <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {['All', ...(useAppStore.getState().equipmentTypes || ['Freie Übung', 'Maschine', 'Kabelturm', 'Multipresse', 'Bodyweight', 'Sonstiges'])].map(eq => (
                    <TouchableOpacity 
                      key={eq}
                      style={[styles.categoryPill, filterEquip === eq && styles.categoryPillActive]}
                      onPress={() => setFilterEquip(eq)}
                    >
                      <Text style={[styles.categoryPillText, filterEquip === eq && styles.categoryPillTextActive]}>{eq}</Text>
                    </TouchableOpacity>
                  ))}
                </GHScrollView>`
);

c = c.replace(
  /<Text style=\{styles\.exerciseSelectName\}>\{ex\.name\}<\/Text>/g,
  `<Text style={styles.exerciseSelectName}>{ex.name}</Text>
                      {((ex as any).equipmentType || (ex as any).brand) && (
                        <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                          {[((ex as any).brand && (ex as any).brand !== 'Keine') ? (ex as any).brand : null, (ex as any).equipmentType].filter(Boolean).join(' • ')}
                        </Text>
                      )}`
);

c = c.replace(
  /<\/View>\s*<View style=\{styles\.categoryBadgeSmall\}>/g,
  `</View>
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
                    <View style={styles.categoryBadgeSmall}>`
);

c = c.replace(
  /\{\/\* Custom Exercise Input \*\/\}[\s\S]*?<\/GHScrollView>\s*<\/View>/g,
  `{/* Open Exercise Manager Button */}
                  <TouchableOpacity 
                    style={[styles.addSetPill, { alignSelf: 'center', marginVertical: 20, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: 'rgba(0, 210, 255, 0.15)' }]}
                    onPress={() => {
                      setEditingExercise(null);
                      setManagerVisible(true);
                    }}
                  >
                    <MaterialCommunityIcons name="plus" size={18} color="#00D2FF" style={{ marginRight: 8 }} />
                    <Text style={[styles.addSetPillText, { fontSize: 16 }]}>Create New Exercise</Text>
                  </TouchableOpacity>`
);

c = c.replace(
  /\{triggerMacroConfetti &&/,
  `<ExerciseManagerModal 
        visible={managerVisible} 
        onClose={() => setManagerVisible(false)} 
        initialExercise={editingExercise} 
      />
      {triggerMacroConfetti &&`
);

fs.writeFileSync(p, c);
console.log('Patched TrainingScreen.tsx correctly');
