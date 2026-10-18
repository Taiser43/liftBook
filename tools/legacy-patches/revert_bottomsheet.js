const fs = require('fs');
const p = 'src/screens/NutritionScreen.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(/<BottomSheetWrapper visible=\{managerVisible === 'ingredients'\} onClose=\{\(\) => setManagerVisible\(null\)\} scrollable=\{false\}>/g, '<Modal visible={managerVisible === \'ingredients\'} animationType="slide">');
c = c.replace(/<BottomSheetWrapper visible=\{managerVisible === 'recipes'\} onClose=\{\(\) => setManagerVisible\(null\)\} scrollable=\{false\}>/g, '<Modal visible={managerVisible === \'recipes\'} animationType="slide">');
c = c.replace(/<BottomSheetWrapper visible=\{recipeBuilderVisible\} onClose=\{\(\) => setRecipeBuilderVisible\(false\)\} scrollable=\{false\}>/g, '<Modal visible={recipeBuilderVisible} animationType="slide">');
c = c.replace(/<\/BottomSheetWrapper>/g, '</Modal>');

fs.writeFileSync(p, c);
console.log('Reverted BottomSheets in NutritionScreen');
