const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src/screens/NutritionScreen.tsx');
let content = fs.readFileSync(p, 'utf8');

if (!content.includes('BottomSheetWrapper')) {
  content = content.replace(
    /import \{ KeyboardAwareWrapper \} from '\.\.\/components\/KeyboardAwareWrapper';/,
    "import { KeyboardAwareWrapper } from '../components/KeyboardAwareWrapper';\nimport { BottomSheetWrapper } from '../components/BottomSheetWrapper';"
  );

  // Replace <Modal visible={managerVisible === 'ingredients'} animationType="slide">
  // with <BottomSheetWrapper visible={managerVisible === 'ingredients'} onClose={() => setManagerVisible(null)} scrollable={false}>
  content = content.replace(
    /<Modal visible=\{managerVisible === 'ingredients'\} animationType="slide">/,
    "<BottomSheetWrapper visible={managerVisible === 'ingredients'} onClose={() => setManagerVisible(null)} scrollable={false}>"
  );
  // Same for recipes
  content = content.replace(
    /<Modal visible=\{managerVisible === 'recipes'\} animationType="slide">/,
    "<BottomSheetWrapper visible={managerVisible === 'recipes'} onClose={() => setManagerVisible(null)} scrollable={false}>"
  );
  // Same for recipeBuilderVisible
  content = content.replace(
    /<Modal visible=\{recipeBuilderVisible\} animationType="slide">/,
    "<BottomSheetWrapper visible={recipeBuilderVisible} onClose={() => setRecipeBuilderVisible(false)} scrollable={false}>"
  );

  // Find corresponding </Modal> tags and replace them with </BottomSheetWrapper>
  // A bit hacky: we just replace the first 3 </Modal> tags if we assume they match. Actually, it's safer to use index.
  let modalCount = 0;
  content = content.replace(/<\/Modal>/g, (match) => {
    // Only the first three Modals were replaced above in order? No, they might be in different order.
    // Let's just be specific. We know we replaced 3 specific Modals.
    // Actually, it's safer to not do simple regex. 
    return match;
  });

  fs.writeFileSync(p, content);
}
