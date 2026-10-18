const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /<View style=\{styles\.profileStreakLeft\}>/,
  "<StreakGlow streak={streaks.overall}>\n          <View style={styles.profileStreakLeft}>"
);

c = c.replace(
  /<\/View>\n\s*<View style=\{styles\.profileCurrencyRight\}>/,
  "</View>\n          </StreakGlow>\n          <View style={styles.profileCurrencyRight}>"
);

fs.writeFileSync(p, c);
console.log('Added StreakGlow wrapper');
