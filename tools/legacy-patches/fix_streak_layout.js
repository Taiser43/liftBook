const fs = require('fs');
let code = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8');

// Shrink the badges slightly so they take up less space
code = code.replace(/width: 44, height: 44, borderRadius: 22/g, 'width: 36, height: 36, borderRadius: 18');
code = code.replace(/size=\{26\}/g, 'size={20}');
code = code.replace(/size=\{24\} color="\#666"/g, 'size={20} color="#666"');

// Reduce gap in the right container
code = code.replace(/gap: 12, justifyContent: 'flex-end', flex: 1, paddingRight: 8/, 'gap: 8, justifyContent: \'flex-end\', flex: 1, paddingRight: 4');

// Update profileStreakLabel style
code = code.replace(
  /profileStreakLabel: \{ color: '\#FFD60A', fontSize: 10, fontWeight: '800', marginLeft: 8, textTransform: 'uppercase' \}/,
  "profileStreakLabel: { color: '#FFD60A', fontSize: 9, fontWeight: '800', marginLeft: 6, textTransform: 'uppercase', flexShrink: 1 }"
);

fs.writeFileSync('src/screens/StatsScreen.tsx', code);
console.log('Fixed layout');
