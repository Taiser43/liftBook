const fs = require('fs');
let code = fs.readFileSync('src/screens/StatsScreen.tsx', 'utf8');

code = code.replace(
  `<View style={[styles.container, { paddingTop: insets.top }]}>`,
  `<ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}>`
);

// We must also change the closing </View> for the root container to </ScrollView>
// Let's find the closing tag for the main component.
const regex = /<\/View>\n  \);\n\}/;
code = code.replace(regex, `</ScrollView>\n  );\n}`);

fs.writeFileSync('src/screens/StatsScreen.tsx', code);
