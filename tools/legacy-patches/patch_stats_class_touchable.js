const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /return \(\n\s*<View key=\{cls\.name\} style=\{styles\.deepStatBox\}>/,
  `return (
            <TouchableOpacity key={cls.name} style={styles.deepStatBox} onPress={() => setDetailNode({ type: 'class', name: cls.name, xp: cls.xp })}> `
);
// replace closing </View> of deepStatBox with </TouchableOpacity>
// Wait, regex might be tricky. Let's just find the closing </View> for deepStatBox.
// It's followed by `</View>\n        })}\n      </View>`
c = c.replace(
  /              <Text style=\{styles\.xpToNext\}>\{lData\.neededXP \- lData\.progressXP\} XP to Lv \{lData\.level \+ 1\}<\/Text>\n            <\/View>\n          \);\n        \}\)/,
  `              <Text style={styles.xpToNext}>{lData.neededXP - lData.progressXP} XP to Lv {lData.level + 1}</Text>
            </TouchableOpacity>
          );
        })`
);

fs.writeFileSync(p, c);
console.log('Patched Hero Classes with TouchableOpacity');
