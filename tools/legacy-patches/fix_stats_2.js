const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

// The original file is super broken.
// I will just use a regex to find all unclosed stuff and fix it.
// Actually, it's easier to remove my bad insertions.
c = c.replace(/<\/>\)}\n    <\/ScrollView>\n  \);\n\}/g, '');
c = c.replace(/<\/View>\n      <\/View>\n      <\/>\)}\n    <\/ScrollView>\n  \);\n\}/g, '');
c = c.replace(/<\/>\)}\n    <\/ScrollView>\n\n              \{\/\* Sorting \*\/\}/, "</ScrollView>\n\n              {/* Sorting */}");

// Let's ensure the end of the return statement looks correct:
if (c.includes("</ScrollView>\n  );\n}")) {
  c = c.replace("</ScrollView>\n  );\n}", "</>)}\n    </ScrollView>\n  );\n}");
}

fs.writeFileSync(p, c);
console.log('Fixed StatsScreen closing tags properly');
