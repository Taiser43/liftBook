const fs = require('fs');
const p = 'src/screens/TrainingScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /<View style=\{\[styles\.fullPageModal, \{ paddingTop: Math\.max\(insets\.top \+ 10, 36\) \}\]\}>/,
  `<GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.fullPageModal, { paddingTop: Math.max(insets.top + 10, 36) }]}>`
);

fs.writeFileSync(p, c);
console.log('Added GestureHandlerRootView opening tag');
