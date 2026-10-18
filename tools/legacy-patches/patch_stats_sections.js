const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

// Dashboard Tab
c = c.replace(
  /\{?\/\* PLAYER PROFILE CARD \*\/\}/,
  "{activeTab === 'Dashboard' && (<>\n      {/* PLAYER PROFILE CARD */}"
);

// We need to close Dashboard and start Quests before Achievements.
// Wait, the prompt says "4 CLASSES PLACEHOLDER". Let's replace that with actual classes and close the tab.
const classesCode = `
      {/* 4 CLASSES */}
      <Text style={[styles.sectionHeader, { marginTop: 0 }]}>Hero Archetypes</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 }}>
        {[
          { name: 'Juggernaut', xp: juggernautXP },
          { name: 'Aesthetic', xp: aestheticXP },
          { name: 'Ranger', xp: rangerXP },
          { name: 'Monk', xp: monkXP }
        ].map(cls => {
          const lData = getLevelData(cls.xp);
          return (
            <View key={cls.name} style={{ width: '48%', backgroundColor: '#1E1E1E', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 12, alignItems: 'center' }}>
              <HeroClassIcon className={cls.name as any} tierColor={lData.rankColor} size={64} />
              <Text style={{ color: '#FFF', fontWeight: 'bold', marginTop: 8 }}>{cls.name}</Text>
              <Text style={{ color: lData.rankColor, fontSize: 12, fontWeight: 'bold' }}>Lv {lData.level}</Text>
              <View style={{ height: 4, backgroundColor: '#333', borderRadius: 2, marginTop: 8, width: '100%' }}>
                <View style={{ height: 4, backgroundColor: lData.rankColor, borderRadius: 2, width: \`\${Math.min(100, (lData.progressXP / lData.neededXP) * 100)}%\` }} />
              </View>
              <Text style={{ color: '#888', fontSize: 10, marginTop: 4 }}>{cls.xp} XP</Text>
            </View>
          );
        })}
      </View>
      </>)}
`;

c = c.replace(/\{?\/\* 4 CLASSES PLACEHOLDER \*\/\}(.|\n)*?(?=\{?\/\* ACHIEVEMENTS)/, classesCode + '\n      {activeTab === \'Legacy\' && (<>\n      {/* ACHIEVEMENTS');

// Close Legacy and start Quests
c = c.replace(
  /\{?\/\* QUESTS \*\/\}/,
  "</>)}\n\n      {activeTab === 'Quests' && (<>\n      {/* QUESTS */}"
);

// Close Quests and start Legacy Collections. Wait, Legacy should include Achievements AND Collections.
// Let's close Quests before CUSTOM EXERCISES COLLECTION, and reopen Legacy.
c = c.replace(
  /\{?\/\* CUSTOM EXERCISES COLLECTION \*\/\}/,
  "</>)}\n\n      {activeTab === 'Legacy' && (<>\n      {/* CUSTOM EXERCISES COLLECTION */}"
);

// Close Legacy at the end of the ScrollView.
// We'll find the end of the Saved Recipes Collection. It ends near the closing `</ScrollView>`
c = c.replace(
  /<\/ScrollView>/,
  "</>)}\n    </ScrollView>"
);

fs.writeFileSync(p, c);
console.log('Wrapped sections in tabs');
