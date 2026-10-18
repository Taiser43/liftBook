const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /<View key=\{ach\.id\} style=\{\[styles\.achievementBadge, \{ borderColor: isCompleted \? tierColor : '#333', backgroundColor: '#161618' \}\]\}>/g,
  `<TouchableOpacity key={ach.id} onPress={() => setDetailNode({ type: 'achievement', name: ach.title, xp: ach.progress, thresholds: (ach as any).thresholds })} style={[styles.achievementBadge, { borderColor: isCompleted ? tierColor : '#333', backgroundColor: '#161618' }]}>`
);
// replace closing </View> of achievementBadge with </TouchableOpacity>
c = c.replace(
  /              <\/View>\n            <\/View>\n          <\/View>\n        \)/g,
  `              </View>\n            </View>\n          </TouchableOpacity>\n        )`
);

fs.writeFileSync(p, c);
console.log('Patched achievements touchable');
