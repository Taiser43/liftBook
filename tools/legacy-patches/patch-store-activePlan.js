const fs = require('fs');
const file = 'src/store/store.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'const baseTargets = state.activeDietPlan ? {\\n            calories: state.activeDietPlan.targetCalories || 0,\\n            protein: state.activeDietPlan.targetProtein || 0,\\n            carbs: state.activeDietPlan.targetCarbs || 0,\\n            fat: state.activeDietPlan.targetFat || 0\\n        } : (state.targets || { calories: 2500, protein: 150, carbs: 250, fat: 80 });',
  'const activePlan = state.dietPlans?.find(p => p.isActive);\\n        const baseTargets = activePlan?.targetCalories ? {\\n            calories: activePlan.targetCalories,\\n            protein: activePlan.targetProtein || 0,\\n            carbs: activePlan.targetCarbs || 0,\\n            fat: activePlan.targetFat || 0\\n        } : (state.targets || { calories: 2500, protein: 150, carbs: 250, fat: 80 });'
);
fs.writeFileSync(file, code);
