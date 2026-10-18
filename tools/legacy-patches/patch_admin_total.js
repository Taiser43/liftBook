const fs = require('fs');
const p = 'src/components/AdminPanelModal.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /juggernautXP, aestheticXP, rangerXP, monkXP/,
  "totalXP, juggernautXP, aestheticXP, rangerXP, monkXP"
);

c = c.replace(
  /const \[streakVal, setStreakVal\] = useState\(adminStreakOverride \? adminStreakOverride\.toString\(\) : ''\);/,
  "const [streakVal, setStreakVal] = useState(adminStreakOverride ? adminStreakOverride.toString() : '');\n  const [totXp, setTotXp] = useState(totalXP.toString());"
);

c = c.replace(
  /setStreakVal\(adminStreakOverride \? adminStreakOverride\.toString\(\) : ''\);/,
  "setStreakVal(adminStreakOverride ? adminStreakOverride.toString() : '');\n      setTotXp(totalXP.toString());"
);

c = c.replace(
  /adminStreakOverride, juggernautXP,/,
  "adminStreakOverride, totalXP, juggernautXP,"
);

c = c.replace(
  /juggernautXP: parseInt\(juggXp\) \|\| 0,/,
  "totalXP: parseInt(totXp) || 0,\n      juggernautXP: parseInt(juggXp) || 0,"
);

c = c.replace(
  /<Text style=\{styles\.sectionTitle\}>Hero Class XP<\/Text>/,
  "<Text style={styles.sectionTitle}>Master Profile</Text>\n          <View style={styles.inputGroup}>\n            <Text style={styles.label}>Total XP (Changes Master Level)</Text>\n            <TextInput style={styles.input} keyboardType=\"number-pad\" value={totXp} onChangeText={setTotXp} />\n          </View>\n\n          <Text style={styles.sectionTitle}>Hero Class XP</Text>"
);

fs.writeFileSync(p, c);
console.log('Added totalXP override to Admin Panel');
