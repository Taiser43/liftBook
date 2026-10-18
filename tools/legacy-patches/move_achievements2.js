const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

const achStart = `      {/* ACHIEVEMENTS`;
const achEnd = `      {/* QUESTS PLACEHOLDER */}`;

const achIdx1 = c.indexOf(achStart);
const achIdx2 = c.indexOf(achEnd);

if (achIdx1 !== -1 && achIdx2 !== -1) {
  let achBlock = c.substring(achIdx1, achIdx2);
  // Clean up the weird comment
  achBlock = achBlock.replace(/\{\/\* ACHIEVEMENTS\{\/\* ACHIEVEMENTS SECTION \*\/\}/, "{/* ACHIEVEMENTS SECTION */}");
  
  c = c.substring(0, achIdx1) + c.substring(achIdx2);
  
  // Insert at the end of Dashboard
  const dashEnd = `      </>)}\n\n      {activeTab === 'Quests'`;
  c = c.replace(dashEnd, "\n" + achBlock + dashEnd);
  console.log('Moved achievements to Dashboard');
}

fs.writeFileSync(p, c);
