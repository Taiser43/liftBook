const fs = require('fs');
const p = 'src/screens/TrainingScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

// Revert the wrong one
c = c.replace(
  /<GestureHandlerRootView style=\{\{ flex: 1 \}\}>\n\s*<View style=\{\[styles\.fullPageModal, \{ paddingTop: Math\.max\(insets\.top \+ 10, 36\) \}\]\}>/,
  `<View style={[styles.fullPageModal, { paddingTop: Math.max(insets.top + 10, 36) }]}>`
);

// Inject into Editor Modal
const editorStart = c.indexOf('{/* Program Editor Modal */}');
if (editorStart !== -1) {
  const target = '<View style={[styles.fullPageModal, { paddingTop: Math.max(insets.top + 10, 36) }]}>';
  const targetIndex = c.indexOf(target, editorStart);
  if (targetIndex !== -1) {
    c = c.slice(0, targetIndex) + '<GestureHandlerRootView style={{ flex: 1 }}>\n            ' + c.slice(targetIndex);
  }
}

fs.writeFileSync(p, c);
console.log('Fixed GestureHandlerRootView');
