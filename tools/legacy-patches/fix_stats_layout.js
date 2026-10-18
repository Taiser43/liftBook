const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Hero Classes: change View to TouchableOpacity and add onPress
const oldHeroView = `<View key={cls.name} style={{ width: '48%', backgroundColor: '#1E1E1E', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 12, alignItems: 'center' }}>`;
const newHeroView = `<TouchableOpacity key={cls.name} onPress={() => setDetailNode({ type: 'class', name: cls.name, xp: cls.xp })} style={{ width: '48%', backgroundColor: '#1E1E1E', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 12, alignItems: 'center' }}>`;

c = c.replace(oldHeroView, newHeroView);
c = c.replace(/<Text style=\{\{ color: '#888', fontSize: 10, marginTop: 4 \}\}>\{cls\.xp\} XP<\/Text>\n            <\/View>/g, `<Text style={{ color: '#888', fontSize: 10, marginTop: 4 }}>{cls.xp} XP</Text>\n            </TouchableOpacity>`);

// 2. Cardio Badges: replace setCardioModalVisible(true) with setDetailNode
// And let's remove setSelectedCardioType from there to avoid opening CardioModalVisible.
// Actually, it's easier to just replace the onPress entirely.
c = c.replace(
  /onPress=\{\(\) => \{\n                  setSelectedCardioType\(cardio\.type\);\n                  setCardioModalVisible\(true\);\n                \}\}/g,
  `onPress={() => setDetailNode({ type: 'cardio', name: cardio.type, xp: cardio.totalXP || cardio.progressXP + cardio.neededXP })}` // wait, gamification returns totalXP.
);

// wait, let's look at getCardioLevelData returns. It returns totalXP!
// cardio is mapped over topCardio, which has `totalXP` (from getCardioLevelData).
// let's just make it `cardio.totalXP`.

// 3. Move Quests to the Quests Tab!
// Find the Quest block
const questStart = `      {/* QUESTS PLACEHOLDER */}`;
const questEnd = `      <Text style={[styles.subtitle, { marginTop: 24 }]}>History Trends</Text>`;

const questBlockIndex = c.indexOf(questStart);
const questEndIndex = c.indexOf(questEnd);

if (questBlockIndex !== -1 && questEndIndex !== -1) {
  const questBlock = c.substring(questBlockIndex, questEndIndex);
  
  // Remove questBlock from its current position
  c = c.substring(0, questBlockIndex) + c.substring(questEndIndex);
  
  // Find where Quests tab should go.
  // There is a condition `activeTab === 'Quests'` somewhere.
  // Wait, I never added an `activeTab === 'Quests'` block in StatsScreen!
  // Let's add it right after `activeTab === 'Dashboard'` ends.
  const dashboardEnd = `      </>)}\n\n      {activeTab === 'Legacy' && (<>`;
  const newDashboardEnd = `      </>)}\n\n      {activeTab === 'Quests' && (<>\n${questBlock}      </>)}\n\n      {activeTab === 'Legacy' && (<>`;
  
  c = c.replace(dashboardEnd, newDashboardEnd);
}

fs.writeFileSync(p, c);
console.log('Fixed Tabs, Hero, and Cardio taps');
