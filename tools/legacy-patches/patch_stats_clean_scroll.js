const fs = require('fs');
let code = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8');

// Ensure root is ScrollView
code = code.replace(
  /return \(\s*<View style=\{\[styles\.container, \{ paddingTop: insets\.top \}\]\}>/,
  `return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ paddingBottom: 100 }}>`
);

code = code.replace(
  /return \(\s*<ScrollView style=\{\[styles\.container, \{ paddingTop: insets\.top \}\]\} contentContainerStyle=\{\{ paddingBottom: 100, paddingHorizontal: 16 \}\}>/,
  `return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ paddingBottom: 100 }}>`
);

fs.writeFileSync('src/screens/StatsScreen.tsx', code);
