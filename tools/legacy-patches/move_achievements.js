const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Move Achievements to Dashboard
const achStart = `      {/* ACHIEVEMENTS SECTION */}`;
const achEnd = `      {/* QUESTS PLACEHOLDER */}`;

const achIdx1 = c.indexOf(achStart);
const achIdx2 = c.indexOf(achEnd);

if (achIdx1 !== -1 && achIdx2 !== -1) {
  const achBlock = c.substring(achIdx1, achIdx2);
  c = c.substring(0, achIdx1) + c.substring(achIdx2);
  
  // Insert at the end of Dashboard
  const dashEnd = `      </>)}\n\n      {activeTab === 'Quests'`;
  c = c.replace(dashEnd, "\n" + achBlock + dashEnd);
  console.log('Moved achievements to Dashboard');
}

fs.writeFileSync(p, c);
