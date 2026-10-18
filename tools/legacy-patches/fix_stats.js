const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Remove the misplaced </>)} </ScrollView>
c = c.replace(
  /<\/>\)}\n    <\/ScrollView>\n\n              \{\/\* Sorting \*\/\}/,
  "</ScrollView>\n\n              {/* Sorting */}"
);

// 2. Put it at the correct end
c = c.replace(
  /        <\/View>\n      <\/View>\n    <\/ScrollView>\n  \);\n\}/,
  "        </View>\n      </View>\n      </>)}\n    </ScrollView>\n  );\n}"
);

fs.writeFileSync(p, c);
console.log('Fixed StatsScreen closing tags');
