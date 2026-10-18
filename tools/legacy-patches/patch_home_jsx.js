const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

// I will just carefully replace `</View>\n      </View>\n\n      {/* Bodyweight Section` with `</View>\n\n      {/* Bodyweight Section`
code = code.replace(
  `      </View>\n      </View>\n\n      {/* Bodyweight Section with Interactive Dark Graph */}`,
  `      </View>\n\n      {/* Bodyweight Section with Interactive Dark Graph */}`
);

fs.writeFileSync('src/screens/HomeScreen.tsx', code);
