const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src/screens/NutritionScreen.tsx');
let content = fs.readFileSync(p, 'utf8');

if (!content.includes('triggerSuccess')) {
  content = content.replace(
    /import \{ useBottomSpacing \} from '\.\.\/hooks\/useBottomSpacing';/,
    "import { useBottomSpacing } from '../hooks/useBottomSpacing';\nimport { triggerSuccess, triggerLight } from '../utils/haptics';"
  );
  
  // Replace calls to addLoggedMeal
  content = content.replace(
    /addLoggedMeal\(\{/g,
    "triggerSuccess();\n    addLoggedMeal({"
  );

  // Replace calls to addIngredient
  content = content.replace(
    /addIngredient\(\{/g,
    "triggerSuccess();\n    addIngredient({"
  );
  
  // Replace calls to addSavedMeal
  content = content.replace(
    /addSavedMeal\(\{/g,
    "triggerSuccess();\n    addSavedMeal({"
  );

  fs.writeFileSync(p, content);
  console.log('Patched haptics in NutritionScreen');
}
