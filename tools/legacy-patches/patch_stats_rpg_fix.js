const fs = require('fs');
let code = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8');

code = code.replace(
  `deepStatLabel: { color: '#888', fontSize: 12, fontWeight: '700', marginTop: 4 }
});`,
  `deepStatLabel: { color: '#888', fontSize: 12, fontWeight: '700', marginTop: 4 },
});`
);

fs.writeFileSync('src/screens/StatsScreen.tsx', code);
