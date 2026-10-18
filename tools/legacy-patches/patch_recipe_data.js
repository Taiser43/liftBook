const fs = require('fs');
const p = 'src/screens/StatsScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  /: savedMeals\.map\(m => \(\{ id: \`recipe_\$\{m\.name\}\`, name: m\.name, type: 'recipe', category: 'Nutrition' \}\)\);/g,
  ": savedMeals.map(m => ({ id: `recipe_${m.name}`, name: m.name, type: 'recipe', category: 'Nutrition', recipeData: m }));"
);

fs.writeFileSync(p, c);
console.log('Added recipeData to collectionItems');
