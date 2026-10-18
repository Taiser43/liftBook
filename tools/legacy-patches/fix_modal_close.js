const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src/screens/NutritionScreen.tsx');
let content = fs.readFileSync(p, 'utf8');

// The opening tags are <BottomSheetWrapper ...
// Let's count them and replace the first 3 </Modal> tags. Or find them by structure.
// Actually, I can just find the <BottomSheetWrapper and its corresponding closing tag.
// It's easier: I know which Modals I replaced.
// managerVisible === 'ingredients', managerVisible === 'recipes', recipeBuilderVisible.
// Let's just restore original content and use a better script.
